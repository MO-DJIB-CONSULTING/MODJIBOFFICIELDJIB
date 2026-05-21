"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEPLOY_DIR = path.join(ROOT_DIR, "ftp-deploy");
const PRIVATE_DIR = path.join(DEPLOY_DIR, "private-data");
const PRIVATE_DOCS_DIR = path.join(PRIVATE_DIR, "documents");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
    const index = clean.indexOf("=");
    const key = clean.slice(0, index).trim();
    const value = clean.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function readRows(db, table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

function parseJson(value, fallback = []) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    password_salt: salt,
    password_hash: crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex")
  };
}

function exportDatabase() {
  loadEnvFile(path.join(ROOT_DIR, ".env"));
  const dbPath = path.resolve(ROOT_DIR, process.env.DATABASE_PATH || path.join("data", "mo-djibconsulting.sqlite"));
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA wal_checkpoint(FULL);");
  const content = {};
  for (const row of readRows(db, "site_content")) {
    content[row.key] = row.value;
  }
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMoi2026!";
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@modjibconsulting.com").toLowerCase();
  const adminHash = passwordHash(adminPassword);
  const payload = {
    generatedAt: new Date().toISOString(),
    admin: {
      email: adminEmail,
      ...adminHash
    },
    content,
    services: readRows(db, "services").map((row) => ({ ...row, features: parseJson(row.features) })),
    pricing: readRows(db, "pricing").map((row) => ({ ...row, highlighted: Boolean(row.highlighted), features: parseJson(row.features) })),
    posts: readRows(db, "blog_posts"),
    gallery: readRows(db, "gallery_items"),
    companies: readRows(db, "companies"),
    documents: readRows(db, "documents"),
    auditLogs: readRows(db, "audit_logs").sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 300)
      .map((row) => ({ ...row, details: parseJson(row.details, {}) }))
  };
  db.close();
  return payload;
}

function shouldSkipRoot(name) {
  return new Set([
    ".git",
    "data",
    "ftp-deploy",
    "node_modules",
    "scripts",
    "MODJIBOFFICIEL",
    ".env",
    "server.js",
    "server.out.log",
    "server.err.log",
    "package.json",
    "README.md",
    "DEPLOYMENT.md",
    "ecosystem.config.cjs",
    "admin-login-screenshot.png",
    ".env.example",
    ".env.production.example",
    ".gitattributes",
    ".gitignore"
  ]).has(name);
}

function buildDeploy() {
  fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });

  for (const entry of fs.readdirSync(ROOT_DIR)) {
    if (shouldSkipRoot(entry)) continue;
    copyRecursive(path.join(ROOT_DIR, entry), path.join(DEPLOY_DIR, entry));
  }

  fs.mkdirSync(PRIVATE_DOCS_DIR, { recursive: true });
  const dataDocs = path.join(ROOT_DIR, "data", "documents");
  if (fs.existsSync(dataDocs)) {
    for (const entry of fs.readdirSync(dataDocs)) {
      copyRecursive(path.join(dataDocs, entry), path.join(PRIVATE_DOCS_DIR, entry));
    }
  }

  fs.writeFileSync(path.join(PRIVATE_DIR, ".htaccess"), [
    "Options -Indexes",
    "Require all denied",
    ""
  ].join("\n"));
  fs.writeFileSync(path.join(PRIVATE_DIR, "database.json"), JSON.stringify(exportDatabase(), null, 2));

  const countFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .reduce((total, entry) => total + (entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1), 0);
  console.log(JSON.stringify({
    deployDir: DEPLOY_DIR,
    files: countFiles(DEPLOY_DIR),
    privateDocuments: fs.existsSync(PRIVATE_DOCS_DIR) ? fs.readdirSync(PRIVATE_DOCS_DIR).length : 0
  }, null, 2));
}

buildDeploy();
