"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

function browserPath() {
  const found = EDGE_PATHS.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Aucun navigateur Chromium trouve.");
  return found;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

async function waitForEndpoint(url, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await fetchJson(url);
    } catch {
      await wait(250);
    }
  }
  throw new Error(`Endpoint indisponible: ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.ws = new WebSocket(wsUrl);
  }

  open() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
      this.ws.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id && this.pending.has(message.id)) {
          const { resolve: done, reject: fail } = this.pending.get(message.id);
          this.pending.delete(message.id);
          if (message.error) fail(new Error(message.error.message));
          else done(message.result);
        }
      });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  const port = 9333 + Math.floor(Math.random() * 300);
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "mo-djib-admin-test-"));
  const screenshotPath = path.join(ROOT_DIR, "admin-login-screenshot.png");
  const browser = spawn(browserPath(), [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "http://localhost:3000/admin"
  ], { stdio: "ignore" });

  let client;
  try {
    await waitForEndpoint(`http://127.0.0.1:${port}/json/version`);
    const pages = await waitForEndpoint(`http://127.0.0.1:${port}/json/list`);
    const page = pages.find((item) => item.type === "page") || pages[0];
    if (!page || !page.webSocketDebuggerUrl) throw new Error("Onglet CDP introuvable.");

    client = new CdpClient(page.webSocketDebuggerUrl);
    await client.open();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await client.send("Runtime.evaluate", {
      expression: "location.href = 'http://localhost:3000/admin'",
      awaitPromise: true
    });

    for (let i = 0; i < 50; i += 1) {
      const ready = await client.send("Runtime.evaluate", {
        expression: "({ ready: document.readyState, hasForm: !!document.querySelector('[data-login-form]'), hasScript: !!document.querySelector('script[src*=admin]') })",
        returnByValue: true
      });
      if (ready.result.value.ready === "complete" && ready.result.value.hasForm) break;
      await wait(250);
    }

    await client.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const email = document.querySelector('input[name="email"]');
          const password = document.querySelector('input[name="password"]');
          const form = document.querySelector('[data-login-form]');
          email.value = 'admin@modjibconsulting.com';
          password.value = 'ChangeMoi2026!';
          email.dispatchEvent(new Event('input', { bubbles: true }));
          password.dispatchEvent(new Event('input', { bubbles: true }));
          form.requestSubmit();
          return true;
        })()
      `
    });

    let result = {};
    for (let i = 0; i < 50; i += 1) {
      const evaluation = await client.send("Runtime.evaluate", {
        awaitPromise: true,
        returnByValue: true,
        expression: `
          (() => {
            const shell = document.querySelector('[data-admin-shell]');
            const login = document.querySelector('[data-login-screen]');
            return {
              url: location.href,
              panelVisible: !!shell && shell.hidden === false,
              loginHidden: !!login && login.hidden === true,
              hasDashboardTitle: document.body.innerText.includes('Gestion MO-DJIB Consulting'),
              hasTabs: ['Apercu','Contenu','Images','Galerie','Services','Tarifs','Blog','Societes','Documents'].every((text) => document.body.innerText.includes(text)),
              status: document.querySelector('[data-login-status]')?.textContent || '',
              text: document.body.innerText.slice(0, 700)
            };
          })()
        `
      });
      result = evaluation.result.value;
      if (result.panelVisible && result.hasDashboardTitle && result.hasTabs) break;
      await wait(300);
    }

    const shot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, "base64"));

    console.log(JSON.stringify({ ...result, screenshotPath }, null, 2));
    if (!result.panelVisible || !result.hasDashboardTitle || !result.hasTabs) process.exitCode = 1;
  } finally {
    if (client) client.close();
    browser.kill();
    await wait(700);
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Edge can keep a profile lock for a moment after headless shutdown.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
