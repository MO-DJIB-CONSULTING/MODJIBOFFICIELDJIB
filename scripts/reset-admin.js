"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT_DIR = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
    const index = clean.indexOf("=");
    const key = clean.slice(0, index).trim();
    const value = clean.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

loadEnvFile(path.join(ROOT_DIR, ".env"));

const dataDir = path.resolve(ROOT_DIR, process.env.DATA_DIR || "data");
const dbPath = path.resolve(ROOT_DIR, process.env.DATABASE_PATH || path.join(dataDir, "mo-djibconsulting.sqlite"));
const email = (process.env.ADMIN_EMAIL || "admin@modjibconsulting.com").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "ChangeMoi2026!";

fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  );
`);

const stamp = new Date().toISOString();
db.prepare(`
  INSERT INTO users (email, password_hash, role, created_at)
  VALUES (?, ?, 'admin', ?)
  ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin'
`).run(email, hashPassword(password), stamp);

console.log(`Admin reset OK: ${email}`);
console.log(`Database: ${dbPath}`);
