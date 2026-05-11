"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { DatabaseSync } = require("node:sqlite");

const ROOT_DIR = __dirname;

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

loadEnvFile(path.join(ROOT_DIR, ".env"));

const DATA_DIR = path.resolve(ROOT_DIR, process.env.DATA_DIR || "data");
const UPLOAD_DIR = path.join(DATA_DIR, "documents");
const MEDIA_DIR = path.join(ROOT_DIR, "images", "admin-uploads");
const DB_PATH = path.resolve(ROOT_DIR, process.env.DATABASE_PATH || path.join(DATA_DIR, "mo-djibconsulting.sqlite"));
const SESSION_COOKIE = "mo_admin_session";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@modjibconsulting.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMoi2026!";
const PORT = Number(process.env.PORT || 3000);
const SYNC_ADMIN_PASSWORD = process.env.SYNC_ADMIN_PASSWORD !== "false";

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(MEDIA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

const sessions = new Map();
const documentTokens = new Map();

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || `post-${Date.now()}`;
}

function safeFileName(value) {
  const fallback = `document-${Date.now()}`;
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || fallback;
}

function publicMediaPath(fileName) {
  return `images/admin-uploads/${fileName}`;
}

function isAllowedImage(mimeType, fileName) {
  const mime = normalizeText(mimeType).toLowerCase();
  const ext = path.extname(fileName).toLowerCase();
  return ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"].includes(mime)
    || [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"].includes(ext);
}

function mediaTypeFromSource(source) {
  const value = normalizeText(source).toLowerCase();
  const ext = path.extname(value.split("?")[0]).toLowerCase();
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "youtube";
  if ([".mp4", ".webm", ".ogg", ".mov"].includes(ext)) return "video";
  return "image";
}

function normalizeGalleryMediaType(type, source) {
  const value = normalizeText(type).toLowerCase();
  if (["image", "video", "youtube"].includes(value)) return value;
  return mediaTypeFromSource(source);
}

function isAllowedMedia(mimeType, fileName) {
  const mime = normalizeText(mimeType).toLowerCase();
  const ext = path.extname(fileName).toLowerCase();
  return isAllowedImage(mime, fileName)
    || ["video/mp4", "video/webm", "video/ogg", "video/quicktime"].includes(mime)
    || [".mp4", ".webm", ".ogg", ".mov"].includes(ext);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashAccessCode(code) {
  return crypto
    .createHash("sha256")
    .update(normalizeText(code).toUpperCase())
    .digest("hex");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(String(password), salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), candidate);
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eyebrow TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      features TEXT NOT NULL DEFAULT '[]',
      icon TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      price TEXT NOT NULL,
      description TEXT NOT NULL,
      features TEXT NOT NULL DEFAULT '[]',
      highlighted INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Actualite',
      status TEXT NOT NULL DEFAULT 'published',
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'image',
      status TEXT NOT NULL DEFAULT 'published',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      certificate_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Certifiee',
      sector TEXT NOT NULL DEFAULT '',
      issued_at TEXT NOT NULL DEFAULT '',
      expires_at TEXT NOT NULL DEFAULT '',
      certificate_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Document',
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      code_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      uploaded_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function ensureAdminAccount() {
  const stamp = nowIso();
  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
  if (!admin) {
    db.prepare("INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)")
      .run(ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD), "admin", stamp);
    return;
  }

  if (SYNC_ADMIN_PASSWORD) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?")
      .run(hashPassword(ADMIN_PASSWORD), ADMIN_EMAIL);
  }
}

function ensureColumn(table, column, ddl) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function ensureMigrations() {
  ensureColumn("gallery_items", "media_type", "media_type TEXT NOT NULL DEFAULT 'image'");
}

function tableCount(table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function seedDatabase() {
  const stamp = nowIso();

  if (tableCount("users") === 0) {
    db.prepare("INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)")
      .run(ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD), "admin", stamp);
  }

  if (tableCount("site_content") === 0) {
    const content = {
      brandName: "MO-DJIB Consulting",
      logoImage: "images/1697909151559.jpg",
      heroImage: "images/haccpcertificationaudit.jpg",
      contactImage: "images/travail-collectif.jpg",
      heroKicker: "HACCP, hygiene alimentaire, audit et certification",
      heroTitle: "MO-DJIB Consulting",
      heroSubtitle: "Votre partenaire qualite et securite alimentaire a Djibouti et dans la Corne de l'Afrique.",
      heroBody: "Nous accompagnons les restaurants, hotels, traiteurs, collectivites et industries alimentaires avec des formations, audits, plans d'action et referencements certifies.",
      certificationIntro: "Verifiez rapidement une societe referencee par MO-DJIB Consulting avec son nom ou son numero de certificat.",
      documentsIntro: "Les documents sensibles sont proteges par code. Demandez votre code d'acces a l'equipe MO-DJIB Consulting.",
      contactEmail: "modjibconsulting@gmail.com",
      whatsappUrl: "https://wa.me/message/WZHC7CEMDMMXL1",
      phone: "+253 77 00 00 00",
      address: "Djibouti, Republique de Djibouti",
      officeHours: "Dimanche - Jeudi, 8h00 - 17h00",
      lastUpdatedLabel: "Actualise le"
    };

    const insert = db.prepare("INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, ?)");
    for (const [key, value] of Object.entries(content)) {
      insert.run(key, value, stamp);
    }
  }

  if (tableCount("services") === 0) {
    const services = [
      {
        eyebrow: "Former",
        title: "Formations HACCP et bonnes pratiques d'hygiene",
        description: "Des modules operationnels pour les equipes terrain, responsables qualite, cuisines centrales, hotels et restaurants.",
        icon: "graduation-cap",
        features: ["HACCP applique", "Hygiene du personnel", "Tracabilite et auto-controles"]
      },
      {
        eyebrow: "Auditer",
        title: "Audits hygiene et securite alimentaire",
        description: "Evaluation sur site, rapport clair, score de conformite, priorites de correction et suivi des actions.",
        icon: "shield-check",
        features: ["Audit initial", "Plan d'actions", "Verification documentaire"]
      },
      {
        eyebrow: "Accompagner",
        title: "Mise a niveau et certification",
        description: "Accompagnement jusqu'a la conformite: procedures, affichages, dossiers qualite et preparation aux controles.",
        icon: "clipboard-check",
        features: ["Dossier qualite", "Coaching equipes", "Preparation inspection"]
      },
      {
        eyebrow: "Referencer",
        title: "Base des societes certifiees",
        description: "Un registre consultable pour confirmer la validite d'un certificat ou le statut d'une entreprise referencee.",
        icon: "database",
        features: ["Recherche publique", "Numero certificat", "Statut mis a jour"]
      }
    ];

    const insert = db.prepare("INSERT INTO services (eyebrow, title, description, features, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
    services.forEach((service, index) => {
      insert.run(service.eyebrow, service.title, service.description, JSON.stringify(service.features), service.icon, index + 1);
    });
  }

  if (tableCount("pricing") === 0) {
    const plans = [
      {
        title: "Diagnostic hygiene",
        price: "Sur devis",
        description: "Audit court pour identifier les urgences et prioriser les corrections.",
        features: ["Visite terrain", "Rapport de synthese", "Contact WhatsApp ou mail"],
        highlighted: 0
      },
      {
        title: "Formation HACCP",
        price: "Sur devis",
        description: "Formation adaptee au secteur: restauration, hotel, boucherie, traiteur ou industrie.",
        features: ["Support stagiaire", "Attestation", "Session en entreprise"],
        highlighted: 1
      },
      {
        title: "Certification & suivi",
        price: "Sur devis",
        description: "Accompagnement complet avec controle documentaire et referencement public.",
        features: ["Plan d'action", "Base certifiee", "Documents proteges"],
        highlighted: 0
      }
    ];

    const insert = db.prepare("INSERT INTO pricing (title, price, description, features, highlighted, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
    plans.forEach((plan, index) => {
      insert.run(plan.title, plan.price, plan.description, JSON.stringify(plan.features), plan.highlighted, index + 1);
    });
  }

  if (tableCount("blog_posts") === 0) {
    const posts = [
      {
        title: "Mise a jour 2026: renforcer la tracabilite alimentaire",
        slug: "mise-a-jour-2026-tracabilite-alimentaire",
        excerpt: "Les controles deviennent plus exigeants: registre de reception, temperatures, nettoyage et actions correctives doivent etre suivis avec rigueur.",
        content: "MO-DJIB Consulting recommande une revue mensuelle des enregistrements HACCP, une verification des thermometres et une mise a jour des plans de nettoyage.",
        image: "images/securite-alimentaire-faut-savoir-controle-sanitaire-1.jpg",
        category: "Reglementation",
        published_at: "2026-05-11T08:00:00.000Z"
      },
      {
        title: "Pourquoi auditer avant de former les equipes",
        slug: "auditer-avant-former-equipes",
        excerpt: "Un audit initial permet de cibler la formation sur les vrais risques observes dans l'etablissement.",
        content: "Les meilleures formations partent du terrain: circuits, pratiques de stockage, hygiene du personnel et flux de production.",
        image: "images/haccpcertificationaudit.jpg",
        category: "Audit",
        published_at: "2026-04-25T08:00:00.000Z"
      },
      {
        title: "Documents qualite: proteger sans ralentir les operations",
        slug: "documents-qualite-proteges",
        excerpt: "Les fiches sensibles peuvent etre partagees avec un code d'acces, sans exposer publiquement les documents internes.",
        content: "Le nouvel espace documentaire MO-DJIB permet de controler l'acces aux fichiers importants tout en gardant une consultation simple.",
        image: "images/documents.jpg",
        category: "Documentation",
        published_at: "2026-03-18T08:00:00.000Z"
      }
    ];

    const insert = db.prepare(`
      INSERT INTO blog_posts (title, slug, excerpt, content, image, category, status, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?)
    `);
    posts.forEach((post) => {
      insert.run(post.title, post.slug, post.excerpt, post.content, post.image, post.category, post.published_at, stamp);
    });
  }

  if (tableCount("gallery_items") === 0) {
    const gallery = [
      {
        title: "Audit hygiene sur site",
        description: "Controle terrain, verification des pratiques et recommandations qualite.",
        image: "images/haccpcertificationaudit.jpg"
      },
      {
        title: "Formation des equipes",
        description: "Sessions HACCP et hygiene alimentaire adaptees aux operations quotidiennes.",
        image: "images/travail-collectif.jpg"
      },
      {
        title: "Documents qualite",
        description: "Procedures, fiches de controle et dossiers accessibles avec code.",
        image: "images/documents.jpg"
      },
      {
        title: "Securite alimentaire",
        description: "Accompagnement des restaurants, hotels, traiteurs et collectivites.",
        image: "images/securite-alimentaire-faut-savoir-controle-sanitaire-1.jpg"
      }
    ];
    const insert = db.prepare(`
      INSERT INTO gallery_items (title, description, image, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, 'published', ?, ?, ?)
    `);
    gallery.forEach((item, index) => {
      insert.run(item.title, item.description, item.image, index + 1, stamp, stamp);
    });
  }

  if (tableCount("companies") === 0) {
    const companies = [
      {
        name: "Hotel Bellevue Djibouti",
        certificate: "MODJIB-HACCP-2026-001",
        sector: "Hotellerie",
        issued: "2026-01-15",
        expires: "2027-01-15",
        notes: "Referencement actif apres audit hygiene et suivi documentaire."
      },
      {
        name: "Residence Bellevue Food Service",
        certificate: "MODJIB-HYG-2026-014",
        sector: "Restauration collective",
        issued: "2026-02-12",
        expires: "2027-02-12",
        notes: "Plan de nettoyage et tracabilite valides."
      },
      {
        name: "Corne Afrique Catering",
        certificate: "MODJIB-CERT-2026-027",
        sector: "Traiteur",
        issued: "2026-04-03",
        expires: "2027-04-03",
        notes: "En suivi trimestriel."
      }
    ];

    const insert = db.prepare(`
      INSERT INTO companies (name, certificate_number, status, sector, issued_at, expires_at, notes, updated_at)
      VALUES (?, ?, 'Certifiee', ?, ?, ?, ?, ?)
    `);
    companies.forEach((company) => {
      insert.run(company.name, company.certificate, company.sector, company.issued, company.expires, company.notes, stamp);
    });
  }
}

initSchema();
ensureMigrations();
ensureAdminAccount();
seedDatabase();
ensureMissingContent();

function ensureMissingContent() {
  const defaults = {
    servicesEyebrow: "Expertise",
    logoImage: "images/1697909151559.jpg",
    heroImage: "images/haccpcertificationaudit.jpg",
    contactImage: "images/travail-collectif.jpg",
    servicesTitle: "Un accompagnement qualite clair, mesurable et suivi.",
    servicesBody: "Chaque mission combine terrain, documents, formation et controle pour rendre la conformite plus simple a piloter.",
    certificatesEyebrow: "Base certifiee",
    certificatesTitle: "Consulter les societes referencees.",
    documentsEyebrow: "Data base securisee",
    documentsTitle: "Documents proteges par code.",
    pricingEyebrow: "Pricing",
    pricingTitle: "Des offres adaptees a la taille de votre activite.",
    pricingBody: "Chaque carte renvoie directement vers WhatsApp ou email pour recevoir une proposition precise.",
    processEyebrow: "Process",
    processTitle: "De l'audit au referencement, tout est trace.",
    processStep1Title: "Diagnostic",
    processStep1Body: "Lecture terrain, risques prioritaires, documents existants et niveau de conformite.",
    processStep2Title: "Action",
    processStep2Body: "Formation, procedures, affichages, fiches de controle et accompagnement operationnel.",
    processStep3Title: "Suivi",
    processStep3Body: "Verification, mise a jour du statut, documents proteges et consultation publique.",
    galleryEyebrow: "Galerie",
    galleryTitle: "Quelques images de nos missions et supports.",
    galleryBody: "Ajoutez vos propres images, videos et liens YouTube depuis l'espace admin pour presenter vos formations, audits, certificats, clients et evenements.",
    blogEyebrow: "Actualites",
    blogTitle: "Veille, conseils et mises a jour.",
    blogBody: "Les publications se gerent depuis l'espace admin et s'affichent automatiquement ici.",
    contactEyebrow: "Contact",
    contactTitle: "Parlez-nous de votre besoin.",
    contactBody: "Audit, formation, certification, document protege ou verification de societe: l'equipe MO-DJIB Consulting vous repond rapidement.",
    footerBody: "HACCP, hygiene, audit, certification et referencement.",
    heroMetric1Value: "2026",
    heroMetric1Label: "referentiel actualise",
    heroMetric2Value: "HACCP",
    heroMetric2Label: "formation, audit, suivi",
    heroMetric3Value: "Code",
    heroMetric3Label: "documents proteges",
    trustTags: "Restaurants\nHotels\nTraiteurs\nIndustries alimentaires\nCollectivites"
  };
  const insert = db.prepare("INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (?, ?, ?)");
  const stamp = nowIso();
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value, stamp);
  }
}

function parseJson(value, fallback = []) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function featuresToJson(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(normalizeText).filter(Boolean));
  }
  return JSON.stringify(String(value || "")
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean));
}

function getContent() {
  const rows = db.prepare("SELECT key, value FROM site_content").all();
  return rows.reduce((content, row) => {
    content[row.key] = row.value;
    return content;
  }, {});
}

function getServices() {
  return db.prepare("SELECT * FROM services ORDER BY sort_order ASC, id ASC").all().map((row) => ({
    ...row,
    features: parseJson(row.features)
  }));
}

function getPricing() {
  return db.prepare("SELECT * FROM pricing ORDER BY sort_order ASC, id ASC").all().map((row) => ({
    ...row,
    highlighted: Boolean(row.highlighted),
    features: parseJson(row.features)
  }));
}

function getBlogPosts({ publicOnly = false } = {}) {
  const sql = publicOnly
    ? "SELECT * FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC, id DESC"
    : "SELECT * FROM blog_posts ORDER BY published_at DESC, id DESC";
  return db.prepare(sql).all();
}

function getGalleryItems({ publicOnly = false } = {}) {
  const sql = publicOnly
    ? "SELECT * FROM gallery_items WHERE status = 'published' ORDER BY sort_order ASC, id DESC"
    : "SELECT * FROM gallery_items ORDER BY sort_order ASC, id DESC";
  return db.prepare(sql).all();
}

function getCompanies({ publicOnly = false, limit = 100 } = {}) {
  const sql = publicOnly
    ? "SELECT * FROM companies WHERE status != 'Suspendue' ORDER BY updated_at DESC, id DESC LIMIT ?"
    : "SELECT * FROM companies ORDER BY updated_at DESC, id DESC LIMIT ?";
  return db.prepare(sql).all(limit);
}

function getDocuments({ publicOnly = false } = {}) {
  const sql = publicOnly
    ? "SELECT id, title, description, category, original_filename, size, status, uploaded_at, updated_at FROM documents WHERE status = 'active' ORDER BY uploaded_at DESC, id DESC"
    : "SELECT id, title, description, category, original_filename, size, status, uploaded_at, updated_at FROM documents ORDER BY uploaded_at DESC, id DESC";
  return db.prepare(sql).all();
}

function getMediaFiles() {
  if (!fs.existsSync(MEDIA_DIR)) return [];
  return fs.readdirSync(MEDIA_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = path.join(MEDIA_DIR, entry.name);
      const stat = fs.statSync(filePath);
      return {
        name: entry.name,
        url: publicMediaPath(entry.name),
        media_type: mediaTypeFromSource(entry.name),
        size: stat.size,
        updated_at: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function readBody(req, limit = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Payload trop volumineux."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, decodeURIComponent(value.join("=") || "")];
  }).filter(([key]) => key));
}

function getAdminUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  return session.user;
}

function requireAdmin(req, res) {
  const user = getAdminUser(req);
  if (!user) {
    sendError(res, 401, "Connexion administrateur requise.");
    return null;
  }
  return user;
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".jfif": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "video/ogg",
      ".mov": "video/quicktime",
      ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8"
  }[ext] || "application/octet-stream";
}

function serveStatic(req, res, pathname) {
  let target = pathname === "/" ? "/index.html" : pathname;
  if (target === "/admin") target = "/admin.html";
  if (target === "/galerie" || target === "/gallery") target = "/gallery.html";

  let decoded;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    sendError(res, 400, "URL invalide.");
    return;
  }

  const filePath = path.normalize(path.join(ROOT_DIR, decoded));
  if (!filePath.startsWith(ROOT_DIR) || filePath.startsWith(DATA_DIR)) {
    sendError(res, 403, "Acces refuse.");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      sendError(res, 404, "Page introuvable.");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeType(filePath),
      "Cache-Control": decoded.startsWith("/admin") || decoded.endsWith(".js") || decoded.endsWith(".css")
        ? "no-store"
        : "public, max-age=120"
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function publicPayload() {
  return {
    generatedAt: nowIso(),
    content: getContent(),
    services: getServices(),
    pricing: getPricing(),
    posts: getBlogPosts({ publicOnly: true }).slice(0, 6),
    gallery: getGalleryItems({ publicOnly: true }),
    companies: getCompanies({ publicOnly: true, limit: 8 }),
    documents: getDocuments({ publicOnly: true })
  };
}

function searchCompanies(query) {
  const q = `%${normalizeText(query).toLowerCase()}%`;
  return db.prepare(`
    SELECT * FROM companies
    WHERE status != 'Suspendue'
      AND (LOWER(name) LIKE ? OR LOWER(certificate_number) LIKE ?)
    ORDER BY updated_at DESC, id DESC
    LIMIT 50
  `).all(q, q);
}

async function handlePublicApi(req, res, url, segments) {
  if (req.method === "GET" && segments.length === 1) {
    sendJson(res, 200, publicPayload());
    return true;
  }

  if (req.method === "GET" && segments[1] === "companies" && segments[2] === "search") {
    sendJson(res, 200, { companies: searchCompanies(url.searchParams.get("q") || "") });
    return true;
  }

  if (req.method === "GET" && segments[1] === "documents" && segments.length === 2) {
    sendJson(res, 200, { documents: getDocuments({ publicOnly: true }) });
    return true;
  }

  if (segments[1] === "documents" && segments[2]) {
    const id = Number(segments[2]);
    const document = db.prepare("SELECT * FROM documents WHERE id = ? AND status = 'active'").get(id);
    if (!document) {
      sendError(res, 404, "Document introuvable.");
      return true;
    }

    if (req.method === "POST" && segments[3] === "verify") {
      const body = await readJson(req);
      if (hashAccessCode(body.code) !== document.code_hash) {
        sendError(res, 403, "Code incorrect.");
        return true;
      }
      const token = randomToken(24);
      documentTokens.set(token, { id, expiresAt: Date.now() + 10 * 60 * 1000 });
      sendJson(res, 200, { ok: true, downloadUrl: `/api/documents/${id}/download?token=${token}` });
      return true;
    }

    if (req.method === "GET" && segments[3] === "download") {
      const token = url.searchParams.get("token") || "";
      const access = documentTokens.get(token);
      if (!access || access.id !== id || access.expiresAt < Date.now()) {
        sendError(res, 403, "Lien expire ou invalide.");
        return true;
      }
      documentTokens.delete(token);

      const filePath = path.join(UPLOAD_DIR, document.stored_filename);
      if (!fs.existsSync(filePath)) {
        sendError(res, 404, "Fichier introuvable.");
        return true;
      }

      res.writeHead(200, {
        "Content-Type": document.mime_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.original_filename)}"`,
        "Cache-Control": "no-store"
      });
      fs.createReadStream(filePath).pipe(res);
      return true;
    }
  }

  return false;
}

async function handleAdminApi(req, res, segments) {
  if (req.method === "POST" && segments[2] === "login") {
    const body = await readJson(req);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizeText(body.email).toLowerCase());
    if (!user || !verifyPassword(body.password || "", user.password_hash)) {
      sendError(res, 401, "Identifiants invalides.");
      return true;
    }

    const token = randomToken();
    sessions.set(token, {
      user: { id: user.id, email: user.email, role: user.role },
      expiresAt: Date.now() + 8 * 60 * 60 * 1000
    });
    sendJson(res, 200, { ok: true, user: { email: user.email, role: user.role } }, {
      "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`
    });
    return true;
  }

  if (req.method === "POST" && segments[2] === "logout") {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) sessions.delete(token);
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
    });
    return true;
  }

  const admin = requireAdmin(req, res);
  if (!admin) return true;

  if (req.method === "GET" && segments[2] === "dashboard") {
    const stats = {
      posts: tableCount("blog_posts"),
      companies: tableCount("companies"),
      documents: tableCount("documents"),
      services: tableCount("services"),
      pricing: tableCount("pricing"),
      gallery: tableCount("gallery_items"),
      media: getMediaFiles().length
    };
    sendJson(res, 200, {
      user: admin,
      stats,
      content: getContent(),
      services: getServices(),
      pricing: getPricing(),
      posts: getBlogPosts(),
      gallery: getGalleryItems(),
      companies: getCompanies({ limit: 500 }),
      documents: getDocuments(),
      media: getMediaFiles()
    });
    return true;
  }

  if (req.method === "PUT" && segments[2] === "content") {
    const body = await readJson(req);
    const content = body.content || body;
    const stamp = nowIso();
    const upsert = db.prepare(`
      INSERT INTO site_content (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    for (const [key, value] of Object.entries(content)) {
      upsert.run(key, String(value ?? ""), stamp);
    }
    upsert.run("lastContentUpdate", stamp, stamp);
    sendJson(res, 200, { ok: true, content: getContent() });
    return true;
  }

  if (segments[2] === "media") {
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, media: getMediaFiles() });
      return true;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const originalName = safeFileName(body.fileName || body.name || "image");
      const mime = normalizeText(body.mimeType) || mimeType(originalName);
      const base64 = normalizeText(body.base64 || "").replace(/^data:[^;]+;base64,/, "");

      if (!base64 || !isAllowedMedia(mime, originalName)) {
        sendError(res, 422, "Media invalide. Formats acceptes: JPG, PNG, WebP, SVG, GIF, MP4, WebM, OGG, MOV.");
        return true;
      }

      const fileBuffer = Buffer.from(base64, "base64");
      if (!fileBuffer.length || fileBuffer.length > 80 * 1024 * 1024) {
        sendError(res, 422, "Media invalide ou superieur a 80 Mo.");
        return true;
      }

      const ext = path.extname(originalName) || ".jpg";
      const base = path.basename(originalName, ext).slice(0, 70) || "image";
      const stored = `${Date.now()}-${randomToken(5)}-${base}${ext.toLowerCase()}`;
      fs.writeFileSync(path.join(MEDIA_DIR, stored), fileBuffer);
      sendJson(res, 201, {
        ok: true,
        file: { name: stored, url: publicMediaPath(stored), media_type: mediaTypeFromSource(stored), size: fileBuffer.length, updated_at: nowIso() },
        media: getMediaFiles()
      });
      return true;
    }

    if (req.method === "DELETE" && segments[3]) {
      const fileName = safeFileName(segments[3]);
      const target = path.normalize(path.join(MEDIA_DIR, fileName));
      if (!target.startsWith(MEDIA_DIR)) {
        sendError(res, 403, "Suppression refusee.");
        return true;
      }
      if (fs.existsSync(target)) fs.unlinkSync(target);
      sendJson(res, 200, { ok: true, media: getMediaFiles() });
      return true;
    }
  }

  if (segments[2] === "services") {
    if (req.method === "POST") {
      const body = await readJson(req);
      if (!normalizeText(body.title)) {
        sendError(res, 422, "Le titre du service est requis.");
        return true;
      }
      db.prepare(`
        INSERT INTO services (eyebrow, title, description, features, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        normalizeText(body.eyebrow),
        normalizeText(body.title),
        normalizeText(body.description),
        featuresToJson(body.features),
        normalizeText(body.icon) || "clipboard-check",
        Number(body.sort_order || 0)
      );
      sendJson(res, 201, { ok: true, services: getServices() });
      return true;
    }

    if (req.method === "PUT" && segments[3]) {
      const id = Number(segments[3]);
      const current = db.prepare("SELECT * FROM services WHERE id = ?").get(id);
      if (!current) {
        sendError(res, 404, "Service introuvable.");
        return true;
      }
      const body = await readJson(req);
      db.prepare(`
        UPDATE services
        SET eyebrow = ?, title = ?, description = ?, features = ?, icon = ?, sort_order = ?
        WHERE id = ?
      `).run(
        normalizeText(body.eyebrow),
        normalizeText(body.title) || current.title,
        normalizeText(body.description),
        featuresToJson(body.features),
        normalizeText(body.icon) || current.icon,
        Number(body.sort_order || 0),
        id
      );
      sendJson(res, 200, { ok: true, services: getServices() });
      return true;
    }

    if (req.method === "DELETE" && segments[3]) {
      db.prepare("DELETE FROM services WHERE id = ?").run(Number(segments[3]));
      sendJson(res, 200, { ok: true, services: getServices() });
      return true;
    }
  }

  if (segments[2] === "pricing") {
    if (req.method === "POST") {
      const body = await readJson(req);
      if (!normalizeText(body.title)) {
        sendError(res, 422, "Le titre de l'offre est requis.");
        return true;
      }
      db.prepare(`
        INSERT INTO pricing (title, price, description, features, highlighted, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        normalizeText(body.title),
        normalizeText(body.price) || "Sur devis",
        normalizeText(body.description),
        featuresToJson(body.features),
        body.highlighted === "1" || body.highlighted === 1 || body.highlighted === true ? 1 : 0,
        Number(body.sort_order || 0)
      );
      sendJson(res, 201, { ok: true, pricing: getPricing() });
      return true;
    }

    if (req.method === "PUT" && segments[3]) {
      const id = Number(segments[3]);
      const current = db.prepare("SELECT * FROM pricing WHERE id = ?").get(id);
      if (!current) {
        sendError(res, 404, "Offre introuvable.");
        return true;
      }
      const body = await readJson(req);
      db.prepare(`
        UPDATE pricing
        SET title = ?, price = ?, description = ?, features = ?, highlighted = ?, sort_order = ?
        WHERE id = ?
      `).run(
        normalizeText(body.title) || current.title,
        normalizeText(body.price) || "Sur devis",
        normalizeText(body.description),
        featuresToJson(body.features),
        body.highlighted === "1" || body.highlighted === 1 || body.highlighted === true ? 1 : 0,
        Number(body.sort_order || 0),
        id
      );
      sendJson(res, 200, { ok: true, pricing: getPricing() });
      return true;
    }

    if (req.method === "DELETE" && segments[3]) {
      db.prepare("DELETE FROM pricing WHERE id = ?").run(Number(segments[3]));
      sendJson(res, 200, { ok: true, pricing: getPricing() });
      return true;
    }
  }

  if (segments[2] === "gallery") {
    if (req.method === "POST") {
      const body = await readJson(req);
      const title = normalizeText(body.title);
      const image = normalizeText(body.image);
      if (!title || !image) {
        sendError(res, 422, "Titre et image requis pour la galerie.");
        return true;
      }
      const stamp = nowIso();
      const mediaType = normalizeGalleryMediaType(body.media_type, image);
      db.prepare(`
        INSERT INTO gallery_items (title, description, image, media_type, status, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title,
        normalizeText(body.description),
        image,
        mediaType,
        body.status === "draft" ? "draft" : "published",
        Number(body.sort_order || 0),
        stamp,
        stamp
      );
      sendJson(res, 201, { ok: true, gallery: getGalleryItems() });
      return true;
    }

    if (req.method === "PUT" && segments[3]) {
      const id = Number(segments[3]);
      const current = db.prepare("SELECT * FROM gallery_items WHERE id = ?").get(id);
      if (!current) {
        sendError(res, 404, "Image de galerie introuvable.");
        return true;
      }
      const body = await readJson(req);
      const image = normalizeText(body.image) || current.image;
      const mediaType = normalizeGalleryMediaType(body.media_type, image);
      db.prepare(`
        UPDATE gallery_items
        SET title = ?, description = ?, image = ?, media_type = ?, status = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `).run(
        normalizeText(body.title) || current.title,
        normalizeText(body.description),
        image,
        mediaType,
        body.status === "draft" ? "draft" : "published",
        Number(body.sort_order || 0),
        nowIso(),
        id
      );
      sendJson(res, 200, { ok: true, gallery: getGalleryItems() });
      return true;
    }

    if (req.method === "DELETE" && segments[3]) {
      db.prepare("DELETE FROM gallery_items WHERE id = ?").run(Number(segments[3]));
      sendJson(res, 200, { ok: true, gallery: getGalleryItems() });
      return true;
    }
  }

  if (segments[2] === "blog") {
    if (req.method === "POST") {
      const body = await readJson(req);
      const title = normalizeText(body.title);
      if (!title) {
        sendError(res, 422, "Le titre est requis.");
        return true;
      }
      const stamp = nowIso();
      let slug = slugify(body.slug || title);
      const exists = db.prepare("SELECT id FROM blog_posts WHERE slug = ?").get(slug);
      if (exists) slug = `${slug}-${Date.now()}`;
      db.prepare(`
        INSERT INTO blog_posts (title, slug, excerpt, content, image, category, status, published_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title,
        slug,
        normalizeText(body.excerpt),
        normalizeText(body.content),
        normalizeText(body.image),
        normalizeText(body.category) || "Actualite",
        body.status === "draft" ? "draft" : "published",
        normalizeText(body.published_at) || stamp,
        stamp
      );
      sendJson(res, 201, { ok: true, posts: getBlogPosts() });
      return true;
    }

    if (req.method === "PUT" && segments[3]) {
      const id = Number(segments[3]);
      const current = db.prepare("SELECT * FROM blog_posts WHERE id = ?").get(id);
      if (!current) {
        sendError(res, 404, "Article introuvable.");
        return true;
      }
      const body = await readJson(req);
      const slug = slugify(body.slug || body.title || current.title);
      db.prepare(`
        UPDATE blog_posts
        SET title = ?, slug = ?, excerpt = ?, content = ?, image = ?, category = ?, status = ?, published_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        normalizeText(body.title) || current.title,
        slug,
        normalizeText(body.excerpt),
        normalizeText(body.content),
        normalizeText(body.image),
        normalizeText(body.category) || "Actualite",
        body.status === "draft" ? "draft" : "published",
        normalizeText(body.published_at) || current.published_at,
        nowIso(),
        id
      );
      sendJson(res, 200, { ok: true, posts: getBlogPosts() });
      return true;
    }

    if (req.method === "DELETE" && segments[3]) {
      db.prepare("DELETE FROM blog_posts WHERE id = ?").run(Number(segments[3]));
      sendJson(res, 200, { ok: true, posts: getBlogPosts() });
      return true;
    }
  }

  if (segments[2] === "companies") {
    if (req.method === "POST") {
      const body = await readJson(req);
      if (!normalizeText(body.name) || !normalizeText(body.certificate_number)) {
        sendError(res, 422, "Nom et numero de certificat requis.");
        return true;
      }
      db.prepare(`
        INSERT INTO companies (name, certificate_number, status, sector, issued_at, expires_at, certificate_url, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        normalizeText(body.name),
        normalizeText(body.certificate_number).toUpperCase(),
        normalizeText(body.status) || "Certifiee",
        normalizeText(body.sector),
        normalizeText(body.issued_at),
        normalizeText(body.expires_at),
        normalizeText(body.certificate_url),
        normalizeText(body.notes),
        nowIso()
      );
      sendJson(res, 201, { ok: true, companies: getCompanies({ limit: 500 }) });
      return true;
    }

    if (req.method === "PUT" && segments[3]) {
      const id = Number(segments[3]);
      const body = await readJson(req);
      db.prepare(`
        UPDATE companies
        SET name = ?, certificate_number = ?, status = ?, sector = ?, issued_at = ?, expires_at = ?, certificate_url = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        normalizeText(body.name),
        normalizeText(body.certificate_number).toUpperCase(),
        normalizeText(body.status) || "Certifiee",
        normalizeText(body.sector),
        normalizeText(body.issued_at),
        normalizeText(body.expires_at),
        normalizeText(body.certificate_url),
        normalizeText(body.notes),
        nowIso(),
        id
      );
      sendJson(res, 200, { ok: true, companies: getCompanies({ limit: 500 }) });
      return true;
    }

    if (req.method === "DELETE" && segments[3]) {
      db.prepare("DELETE FROM companies WHERE id = ?").run(Number(segments[3]));
      sendJson(res, 200, { ok: true, companies: getCompanies({ limit: 500 }) });
      return true;
    }
  }

  if (segments[2] === "documents") {
    if (req.method === "POST") {
      const body = await readJson(req);
      const title = normalizeText(body.title);
      const code = normalizeText(body.code);
      const originalName = safeFileName(body.fileName || body.original_filename);
      const base64 = normalizeText(body.base64 || "").replace(/^data:[^;]+;base64,/, "");

      if (!title || !code || !base64) {
        sendError(res, 422, "Titre, fichier et code d'acces requis.");
        return true;
      }

      const fileBuffer = Buffer.from(base64, "base64");
      if (!fileBuffer.length || fileBuffer.length > 25 * 1024 * 1024) {
        sendError(res, 422, "Fichier invalide ou superieur a 25 Mo.");
        return true;
      }

      const ext = path.extname(originalName) || ".bin";
      const stored = `${Date.now()}-${randomToken(8)}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, stored), fileBuffer);

      const stamp = nowIso();
      db.prepare(`
        INSERT INTO documents (title, description, category, original_filename, stored_filename, mime_type, size, code_hash, status, uploaded_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title,
        normalizeText(body.description),
        normalizeText(body.category) || "Document",
        originalName,
        stored,
        normalizeText(body.mimeType) || "application/octet-stream",
        fileBuffer.length,
        hashAccessCode(code),
        body.status === "inactive" ? "inactive" : "active",
        stamp,
        stamp
      );
      sendJson(res, 201, { ok: true, documents: getDocuments() });
      return true;
    }

    if (req.method === "PUT" && segments[3]) {
      const id = Number(segments[3]);
      const current = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
      if (!current) {
        sendError(res, 404, "Document introuvable.");
        return true;
      }
      const body = await readJson(req);
      const codeHash = normalizeText(body.code) ? hashAccessCode(body.code) : current.code_hash;
      db.prepare(`
        UPDATE documents
        SET title = ?, description = ?, category = ?, code_hash = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(
        normalizeText(body.title) || current.title,
        normalizeText(body.description),
        normalizeText(body.category) || "Document",
        codeHash,
        body.status === "inactive" ? "inactive" : "active",
        nowIso(),
        id
      );
      sendJson(res, 200, { ok: true, documents: getDocuments() });
      return true;
    }

    if (req.method === "DELETE" && segments[3]) {
      const id = Number(segments[3]);
      const current = db.prepare("SELECT stored_filename FROM documents WHERE id = ?").get(id);
      if (current) {
        const filePath = path.join(UPLOAD_DIR, current.stored_filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      db.prepare("DELETE FROM documents WHERE id = ?").run(id);
      sendJson(res, 200, { ok: true, documents: getDocuments() });
      return true;
    }
  }

  return false;
}

async function handleApi(req, res, url) {
  const segments = url.pathname.split("/").filter(Boolean);
  try {
    if (segments[0] === "api" && segments[1] === "health") {
      sendJson(res, 200, {
        ok: true,
        db: fs.existsSync(DB_PATH),
        adminEmail: ADMIN_EMAIL,
        generatedAt: nowIso()
      }, { "Cache-Control": "no-store" });
      return;
    }

    if (segments[0] === "api" && segments[1] === "public") {
      if (await handlePublicApi(req, res, url, segments.slice(1))) return;
    }

    if (segments[0] === "api" && segments[1] === "companies" && segments[2] === "search") {
      sendJson(res, 200, { companies: searchCompanies(url.searchParams.get("q") || "") });
      return;
    }

    if (segments[0] === "api" && segments[1] === "documents") {
      if (await handlePublicApi(req, res, url, ["public", ...segments.slice(1)])) return;
    }

    if (segments[0] === "api" && segments[1] === "admin") {
      if (await handleAdminApi(req, res, segments)) return;
    }

    sendError(res, 404, "Endpoint introuvable.");
  } catch (error) {
    const message = error && error.message ? error.message : "Erreur serveur.";
    sendError(res, 500, message);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) sessions.delete(token);
  }
  for (const [token, access] of documentTokens.entries()) {
    if (access.expiresAt < now) documentTokens.delete(token);
  }
}, 10 * 60 * 1000).unref();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendError(res, 405, "Methode non autorisee.");
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`MO-DJIB Consulting pret sur http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Identifiant initial: ${ADMIN_EMAIL}`);
  console.log("Definissez ADMIN_PASSWORD pour remplacer le mot de passe initial.");
});
