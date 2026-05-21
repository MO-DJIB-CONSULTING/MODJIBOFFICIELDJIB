"use strict";

let state = {
  content: {},
  services: [],
  pricing: [],
  posts: [],
  gallery: [],
  companies: [],
  documents: [],
  media: [],
  auditLogs: [],
  stats: {}
};

const contentFields = [
  ["brandName", "Nom de marque"],
  ["logoImage", "Logo du site", "image"],
  ["heroImage", "Image principale hero", "image"],
  ["contactImage", "Image section contact", "image"],
  ["heroKicker", "Accroche hero"],
  ["heroTitle", "Titre hero"],
  ["heroSubtitle", "Sous-titre hero"],
  ["heroBody", "Texte hero", "textarea"],
  ["certificationIntro", "Texte recherche certificats", "textarea"],
  ["documentsIntro", "Texte documents proteges", "textarea"],
  ["servicesEyebrow", "Sur-titre services"],
  ["servicesTitle", "Titre services"],
  ["servicesBody", "Texte services", "textarea"],
  ["certificatesEyebrow", "Sur-titre certificats"],
  ["certificatesTitle", "Titre certificats"],
  ["documentsEyebrow", "Sur-titre documents"],
  ["documentsTitle", "Titre documents"],
  ["pricingEyebrow", "Sur-titre pricing"],
  ["pricingTitle", "Titre pricing"],
  ["pricingBody", "Texte pricing", "textarea"],
  ["processEyebrow", "Sur-titre process"],
  ["processTitle", "Titre process"],
  ["processStep1Title", "Process 1 - titre"],
  ["processStep1Body", "Process 1 - texte", "textarea"],
  ["processStep2Title", "Process 2 - titre"],
  ["processStep2Body", "Process 2 - texte", "textarea"],
  ["processStep3Title", "Process 3 - titre"],
  ["processStep3Body", "Process 3 - texte", "textarea"],
  ["galleryEyebrow", "Sur-titre galerie"],
  ["galleryTitle", "Titre galerie"],
  ["galleryBody", "Texte galerie", "textarea"],
  ["blogEyebrow", "Sur-titre actualites"],
  ["blogTitle", "Titre actualites"],
  ["blogBody", "Texte actualites", "textarea"],
  ["contactEyebrow", "Sur-titre contact"],
  ["contactTitle", "Titre contact"],
  ["contactBody", "Texte contact", "textarea"],
  ["footerBody", "Texte footer"],
  ["heroMetric1Value", "Indicateur hero 1 - valeur"],
  ["heroMetric1Label", "Indicateur hero 1 - texte"],
  ["heroMetric2Value", "Indicateur hero 2 - valeur"],
  ["heroMetric2Label", "Indicateur hero 2 - texte"],
  ["heroMetric3Value", "Indicateur hero 3 - valeur"],
  ["heroMetric3Label", "Indicateur hero 3 - texte"],
  ["trustTags", "Domaines d'intervention, un par ligne", "textarea"],
  ["contactEmail", "Email"],
  ["whatsappUrl", "Lien WhatsApp"],
  ["phone", "Telephone"],
  ["address", "Adresse"],
  ["officeHours", "Horaires"]
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatAdminDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Date non renseignee";
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
  try {
    const response = await fetch(path, {
      credentials: "include",
      cache: "no-store",
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Erreur serveur (${response.status}).`);
    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Le serveur ne repond pas. Recharge la page ou verifie l'hebergement.");
    }
    if (error instanceof TypeError) {
      throw new Error("Impossible de joindre l'API du site.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function showApp(isLoggedIn) {
  document.querySelector("[data-login-screen]").hidden = isLoggedIn;
  document.querySelector("[data-admin-shell]").hidden = !isLoggedIn;
}

function notify(message, tone = "info") {
  const node = document.querySelector("[data-global-status]");
  if (!node) return;
  node.textContent = message || "";
  node.dataset.tone = tone;
  if (message) {
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => {
      node.textContent = "";
      node.dataset.tone = "info";
    }, 4500);
  }
}

function renderStats() {
  const root = document.querySelector("[data-stats]");
  const labels = [
    ["posts", "Articles"],
    ["companies", "Societes"],
    ["documents", "Documents"],
    ["services", "Services"],
    ["pricing", "Tarifs"],
    ["gallery", "Galerie"],
    ["media", "Images"]
  ];
  if (root) {
    root.innerHTML = labels.map(([key, label]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${state.stats[key] ?? 0}</strong>
      </article>
    `).join("");
  }

  const quickRoot = document.querySelector("[data-quick-actions]");
  if (quickRoot) {
    quickRoot.innerHTML = [
      ["content", "Personnaliser"],
      ["media", "Ajouter media"],
      ["gallery", "Galerie"],
      ["blog", "Actualite"],
      ["companies", "Societe"],
      ["documents", "Document protege"]
    ].map(([tab, label]) => `<button class="button secondary" type="button" data-go-tab="${tab}">${label}</button>`).join("");
  }

  const activeDocs = state.documents.filter((doc) => doc.status === "active").length;
  const draftPosts = state.posts.filter((post) => post.status === "draft").length;
  const hiddenGallery = state.gallery.filter((item) => item.status === "draft").length;
  const lastUpdate = state.content.lastContentUpdate || state.auditLogs[0]?.created_at || new Date().toISOString();
  const mediaSize = state.media.reduce((total, file) => total + Number(file.size || 0), 0);
  const healthRoot = document.querySelector("[data-health-cards]");
  if (healthRoot) {
    healthRoot.innerHTML = `
      <article class="status-card good">
        <span>Derniere actualisation</span>
        <strong>${escapeHtml(formatAdminDate(lastUpdate))}</strong>
      </article>
      <article class="status-card">
        <span>Documents publics actifs</span>
        <strong>${activeDocs}/${state.documents.length}</strong>
      </article>
      <article class="status-card">
        <span>Contenus masques</span>
        <strong>${draftPosts + hiddenGallery}</strong>
        <small>${draftPosts} article(s), ${hiddenGallery} media(s)</small>
      </article>
      <article class="status-card">
        <span>Mediatheque</span>
        <strong>${Math.max(0, Math.round(mediaSize / 1024 / 1024))} Mo</strong>
      </article>
    `;
  }

  const summaryRoot = document.querySelector("[data-summary]");
  if (summaryRoot) {
    summaryRoot.innerHTML = `
      <div class="list-item">
        <h3>Premier service</h3>
        <p>${escapeHtml(state.services[0]?.title || "Aucun service")}</p>
      </div>
      <div class="list-item">
        <h3>Offre mise en avant</h3>
        <p>${escapeHtml(state.pricing.find((plan) => plan.highlighted)?.title || state.pricing[0]?.title || "Aucune offre")}</p>
      </div>
      <div class="list-item">
        <h3>Dernier article</h3>
        <p>${escapeHtml(state.posts[0]?.title || "Aucun article")}</p>
      </div>
      <div class="list-item">
        <h3>Derniere societe referencee</h3>
        <p>${escapeHtml(state.companies[0]?.name || "Aucune societe")}</p>
      </div>
      <div class="list-item">
        <h3>Dernier document</h3>
        <p>${escapeHtml(state.documents[0]?.title || "Aucun document")}</p>
      </div>
    `;
  }
}

function renderContentForm() {
  const form = document.querySelector("[data-content-form]");
  form.innerHTML = contentFields.map(([key, label, type]) => {
    const value = escapeHtml(state.content[key] || "");
    let field = `<input name="${key}" value="${value}">`;
    if (type === "textarea") {
      field = `<textarea name="${key}" rows="4">${value}</textarea>`;
    }
    if (type === "image") {
      field = `
        <div class="image-field">
          <input name="${key}" value="${value}" placeholder="images/admin-uploads/image.jpg">
          <input data-image-file="${key}" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
          <button class="button secondary" type="button" data-upload-content-image="${key}">Uploader et utiliser</button>
          ${value ? `<img src="${value}" alt="">` : ""}
        </div>
      `;
    }
    return `<label class="${type === "textarea" || type === "image" ? "wide" : ""}">${label}${field}</label>`;
  }).join("") + `
    <div class="form-actions">
      <button class="button primary" type="submit">Enregistrer le contenu</button>
      <p class="form-status" data-content-status aria-live="polite"></p>
    </div>
  `;
}

function featureLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function renderServiceList() {
  const root = document.querySelector("[data-service-list]");
  if (!root) return;
  if (!state.services.length) {
    root.innerHTML = '<div class="list-item"><p>Aucun service.</p></div>';
    return;
  }
  root.innerHTML = state.services.map((service) => `
    <article class="list-item">
      <header>
        <h3>${escapeHtml(service.title)}</h3>
        <span class="badge">${escapeHtml(service.eyebrow || "Service")}</span>
      </header>
      <p>${escapeHtml(service.description || "Sans description")}</p>
      <p>Ordre: ${escapeHtml(service.sort_order ?? 0)} - Icone: ${escapeHtml(service.icon || "clipboard-check")}</p>
      <div class="row-actions">
        <button class="button secondary" type="button" data-edit-service="${service.id}">Modifier</button>
        <button class="button danger" type="button" data-delete-service="${service.id}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function resetServiceForm() {
  const form = document.querySelector("[data-service-form]");
  form.reset();
  form.elements.id.value = "";
  form.elements.icon.value = "graduation-cap";
  form.elements.sort_order.value = "0";
  document.querySelector("[data-service-form-title]").textContent = "Ajouter un service";
}

function fillServiceForm(id) {
  const service = state.services.find((item) => String(item.id) === String(id));
  if (!service) return;
  const form = document.querySelector("[data-service-form]");
  form.elements.id.value = service.id;
  form.elements.eyebrow.value = service.eyebrow || "";
  form.elements.title.value = service.title || "";
  form.elements.icon.value = service.icon || "clipboard-check";
  form.elements.sort_order.value = service.sort_order ?? 0;
  form.elements.description.value = service.description || "";
  form.elements.features.value = featureLines(service.features);
  document.querySelector("[data-service-form-title]").textContent = "Modifier le service";
}

function renderPricingList() {
  const root = document.querySelector("[data-pricing-list]");
  if (!root) return;
  if (!state.pricing.length) {
    root.innerHTML = '<div class="list-item"><p>Aucune offre.</p></div>';
    return;
  }
  root.innerHTML = state.pricing.map((plan) => `
    <article class="list-item">
      <header>
        <h3>${escapeHtml(plan.title)}</h3>
        <span class="badge">${plan.highlighted ? "Mise en avant" : "Standard"}</span>
      </header>
      <p><strong>${escapeHtml(plan.price || "Sur devis")}</strong> - ${escapeHtml(plan.description || "Sans description")}</p>
      <p>Ordre: ${escapeHtml(plan.sort_order ?? 0)}</p>
      <div class="row-actions">
        <button class="button secondary" type="button" data-edit-pricing="${plan.id}">Modifier</button>
        <button class="button danger" type="button" data-delete-pricing="${plan.id}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function resetPricingForm() {
  const form = document.querySelector("[data-pricing-form]");
  form.reset();
  form.elements.id.value = "";
  form.elements.price.value = "Sur devis";
  form.elements.highlighted.value = "0";
  form.elements.sort_order.value = "0";
  document.querySelector("[data-pricing-form-title]").textContent = "Ajouter une offre";
}

function fillPricingForm(id) {
  const plan = state.pricing.find((item) => String(item.id) === String(id));
  if (!plan) return;
  const form = document.querySelector("[data-pricing-form]");
  form.elements.id.value = plan.id;
  form.elements.title.value = plan.title || "";
  form.elements.price.value = plan.price || "Sur devis";
  form.elements.highlighted.value = plan.highlighted ? "1" : "0";
  form.elements.sort_order.value = plan.sort_order ?? 0;
  form.elements.description.value = plan.description || "";
  form.elements.features.value = featureLines(plan.features);
  document.querySelector("[data-pricing-form-title]").textContent = "Modifier l'offre";
}

function youtubeEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${encodeURIComponent(url.pathname.replace("/", ""))}`;
    }
    if (url.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${encodeURIComponent(url.searchParams.get("v"))}`;
    }
    if (url.pathname.includes("/embed/")) return value;
  } catch {
    return "";
  }
  return "";
}

function adminGalleryPreview(item) {
  const type = item.media_type || "image";
  if (type === "video") {
    return `<video src="${escapeHtml(item.image)}" controls muted preload="metadata"></video>`;
  }
  if (type === "youtube") {
    const embed = youtubeEmbedUrl(item.image);
    return embed
      ? `<iframe src="${escapeHtml(embed)}" title="${escapeHtml(item.title)}" loading="lazy" allowfullscreen></iframe>`
      : '<div class="youtube-preview">YouTube</div>';
  }
  return `<img src="${escapeHtml(item.image)}" alt="">`;
}

function mediaPreview(file) {
  if ((file.media_type || "image") === "video") {
    return `<video src="${escapeHtml(file.url)}" controls muted preload="metadata"></video>`;
  }
  return `<img src="${escapeHtml(file.url)}" alt="">`;
}

function renderGalleryList() {
  const root = document.querySelector("[data-gallery-list]");
  if (!root) return;
  if (!state.gallery.length) {
    root.innerHTML = '<div class="list-item"><p>Aucune image dans la galerie.</p></div>';
    return;
  }
  root.innerHTML = state.gallery.map((item) => `
    <article class="gallery-admin-card">
      ${adminGalleryPreview(item)}
      <div>
        <header>
          <h3>${escapeHtml(item.title)}</h3>
          <span class="badge">${item.status === "published" ? "Publie" : "Masque"}</span>
        </header>
        <span class="badge">${escapeHtml(item.media_type || "image")}</span>
        <p>${escapeHtml(item.description || "Sans description")}</p>
        <p>Ordre: ${escapeHtml(item.sort_order ?? 0)}</p>
        <div class="row-actions">
          <button class="button secondary" type="button" data-edit-gallery="${item.id}">Modifier</button>
          <button class="button danger" type="button" data-delete-gallery="${item.id}">Supprimer</button>
        </div>
      </div>
    </article>
  `).join("");
}

function resetGalleryForm() {
  const form = document.querySelector("[data-gallery-form]");
  form.reset();
  form.elements.id.value = "";
  form.elements.media_type.value = "image";
  form.elements.status.value = "published";
  form.elements.sort_order.value = "0";
  document.querySelector("[data-gallery-form-title]").textContent = "Ajouter une image a la galerie";
}

function fillGalleryForm(id) {
  const item = state.gallery.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  const form = document.querySelector("[data-gallery-form]");
  form.elements.id.value = item.id;
  form.elements.title.value = item.title || "";
  form.elements.sort_order.value = item.sort_order ?? 0;
  form.elements.media_type.value = item.media_type || "image";
  form.elements.status.value = item.status || "published";
  form.elements.image.value = item.image || "";
  form.elements.description.value = item.description || "";
  document.querySelector("[data-gallery-form-title]").textContent = "Modifier l'image de galerie";
}

function renderMediaList() {
  const root = document.querySelector("[data-media-list]");
  if (!root) return;
  if (!state.media.length) {
    root.innerHTML = '<div class="list-item"><p>Aucune image uploadee.</p></div>';
    return;
  }
  root.innerHTML = state.media.map((file) => `
    <article class="media-card">
      ${mediaPreview(file)}
      <div>
        <h3>${escapeHtml(file.name)}</h3>
        <p>${Math.max(1, Math.round((file.size || 0) / 1024))} Ko</p>
      </div>
      <div class="row-actions">
        <button class="button secondary" type="button" data-use-media="logoImage" data-media-url="${escapeHtml(file.url)}">Logo</button>
        <button class="button secondary" type="button" data-use-media="heroImage" data-media-url="${escapeHtml(file.url)}">Hero</button>
        <button class="button secondary" type="button" data-use-media="contactImage" data-media-url="${escapeHtml(file.url)}">Contact</button>
        <button class="button secondary" type="button" data-use-gallery-media="${escapeHtml(file.url)}" data-media-type="${escapeHtml(file.media_type || "image")}">Galerie</button>
        <button class="button secondary" type="button" data-copy-media="${escapeHtml(file.url)}">Chemin</button>
        <button class="button danger" type="button" data-delete-media="${escapeHtml(file.name)}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function renderBlogList() {
  const root = document.querySelector("[data-blog-list]");
  if (!state.posts.length) {
    root.innerHTML = '<div class="list-item"><p>Aucun article.</p></div>';
    return;
  }
  root.innerHTML = state.posts.map((post) => `
    <article class="list-item">
      <header>
        <h3>${escapeHtml(post.title)}</h3>
        <span class="badge">${escapeHtml(post.status)}</span>
      </header>
      <p>${escapeHtml(post.excerpt || "Sans resume")}</p>
      <div class="row-actions">
        <button class="button secondary" type="button" data-edit-blog="${post.id}">Modifier</button>
        <button class="button danger" type="button" data-delete-blog="${post.id}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function resetBlogForm() {
  const form = document.querySelector("[data-blog-form]");
  form.reset();
  form.elements.id.value = "";
  form.elements.category.value = "Actualite";
  form.elements.status.value = "published";
  document.querySelector("[data-blog-form-title]").textContent = "Nouvel article";
}

function fillBlogForm(id) {
  const post = state.posts.find((item) => String(item.id) === String(id));
  if (!post) return;
  const form = document.querySelector("[data-blog-form]");
  form.elements.id.value = post.id;
  form.elements.title.value = post.title || "";
  form.elements.category.value = post.category || "";
  form.elements.image.value = post.image || "";
  form.elements.status.value = post.status || "published";
  form.elements.published_at.value = toDatetimeLocal(post.published_at);
  form.elements.excerpt.value = post.excerpt || "";
  form.elements.content.value = post.content || "";
  document.querySelector("[data-blog-form-title]").textContent = "Modifier l'article";
}

function renderCompanyList() {
  const root = document.querySelector("[data-company-list]");
  if (!state.companies.length) {
    root.innerHTML = '<div class="list-item"><p>Aucune societe.</p></div>';
    return;
  }
  root.innerHTML = state.companies.map((company) => `
    <article class="list-item">
      <header>
        <h3>${escapeHtml(company.name)}</h3>
        <span class="badge">${escapeHtml(company.status)}</span>
      </header>
      <p><strong>${escapeHtml(company.certificate_number)}</strong> - ${escapeHtml(company.sector || "Secteur non renseigne")}</p>
      <p>Validite: ${escapeHtml(company.issued_at || "-")} au ${escapeHtml(company.expires_at || "-")}</p>
      <div class="row-actions">
        <button class="button secondary" type="button" data-edit-company="${company.id}">Modifier</button>
        <button class="button danger" type="button" data-delete-company="${company.id}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function resetCompanyForm() {
  const form = document.querySelector("[data-company-form]");
  form.reset();
  form.elements.id.value = "";
  form.elements.status.value = "Certifiee";
  document.querySelector("[data-company-form-title]").textContent = "Ajouter une societe";
}

function fillCompanyForm(id) {
  const company = state.companies.find((item) => String(item.id) === String(id));
  if (!company) return;
  const form = document.querySelector("[data-company-form]");
  for (const field of ["id", "name", "certificate_number", "status", "sector", "issued_at", "expires_at", "certificate_url", "notes"]) {
    form.elements[field].value = company[field] || "";
  }
  document.querySelector("[data-company-form-title]").textContent = "Modifier la societe";
}

function renderDocumentList() {
  const root = document.querySelector("[data-document-list]");
  if (!state.documents.length) {
    root.innerHTML = '<div class="list-item"><p>Aucun document.</p></div>';
    return;
  }
  root.innerHTML = state.documents.map((doc) => `
    <article class="list-item">
      <header>
        <h3>${escapeHtml(doc.title)}</h3>
        <span class="badge">${escapeHtml(doc.status)}</span>
      </header>
      <p>${escapeHtml(doc.description || "Sans description")}</p>
      <p>${escapeHtml(doc.original_filename)} - ${Math.max(1, Math.round((doc.size || 0) / 1024))} Ko</p>
      <div class="row-actions">
        <button class="button secondary" type="button" data-edit-document="${doc.id}">Modifier</button>
        <button class="button danger" type="button" data-delete-document="${doc.id}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function resetDocumentForm() {
  const form = document.querySelector("[data-document-form]");
  form.reset();
  form.elements.id.value = "";
  form.elements.category.value = "Document";
  form.elements.status.value = "active";
  form.elements.file.required = false;
  form.elements.code.required = false;
  document.querySelector("[data-document-form-title]").textContent = "Ajouter un document protege";
}

function fillDocumentForm(id) {
  const doc = state.documents.find((item) => String(item.id) === String(id));
  if (!doc) return;
  const form = document.querySelector("[data-document-form]");
  form.elements.id.value = doc.id;
  form.elements.title.value = doc.title || "";
  form.elements.category.value = doc.category || "Document";
  form.elements.code.value = "";
  form.elements.status.value = doc.status || "active";
  form.elements.description.value = doc.description || "";
  form.elements.file.value = "";
  form.elements.file.required = false;
  form.elements.code.required = false;
  document.querySelector("[data-document-form-title]").textContent = "Modifier le document protege";
}

function renderAuditLogs() {
  const root = document.querySelector("[data-audit-list]");
  if (!root) return;
  if (!state.auditLogs.length) {
    root.innerHTML = '<div class="list-item"><p>Aucune activite recente.</p></div>';
    return;
  }
  root.innerHTML = state.auditLogs.map((entry) => `
    <article class="audit-item">
      <div>
        <strong>${escapeHtml(entry.action)}</strong>
        <span>${escapeHtml(entry.target || "site")} - ${escapeHtml(entry.actor || "system")}</span>
      </div>
      <time>${escapeHtml(new Date(entry.created_at).toLocaleString("fr-FR"))}</time>
    </article>
  `).join("");
}

function renderAll() {
  renderStats();
  renderContentForm();
  renderMediaList();
  renderGalleryList();
  renderServiceList();
  renderPricingList();
  renderBlogList();
  renderCompanyList();
  renderDocumentList();
  renderAuditLogs();
  applyAdminSearch();
}

async function refresh() {
  const payload = await api("/api/admin/dashboard");
  state = {
    content: payload.content || {},
    services: payload.services || [],
    pricing: payload.pricing || [],
    posts: payload.posts || [],
    gallery: payload.gallery || [],
    companies: payload.companies || [],
    documents: payload.documents || [],
    media: payload.media || [],
    auditLogs: payload.auditLogs || [],
    stats: payload.stats || {}
  };
  document.querySelectorAll("[data-admin-logo]").forEach((node) => {
    if (state.content.logoImage) node.src = state.content.logoImage;
  });
  renderAll();
}

function activateTab(tab) {
  document.querySelectorAll("[data-tab]").forEach((node) => {
    node.classList.toggle("active", node.dataset.tab === tab);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
  applyAdminSearch();
}

function bindTabs() {
  document.querySelector("[data-tabs]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    activateTab(button.dataset.tab);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-go-tab]");
    if (!button) return;
    activateTab(button.dataset.goTab);
    document.querySelector(".workspace")?.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function applyAdminSearch() {
  const input = document.querySelector("[data-admin-search]");
  const panel = document.querySelector("[data-panel].active");
  if (!input || !panel) return;
  const query = input.value.trim().toLowerCase();
  const items = panel.querySelectorAll(".list-item, .media-card, .gallery-admin-card, .stat-card, .status-card");
  items.forEach((item) => {
    item.classList.toggle("is-filtered-out", Boolean(query) && !item.textContent.toLowerCase().includes(query));
  });
}

function bindAdminSearch() {
  const input = document.querySelector("[data-admin-search]");
  if (!input) return;
  input.addEventListener("input", applyAdminSearch);
}

function bindLogin() {
  document.querySelector("[data-login-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("[data-login-status]");
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    status.textContent = "Connexion...";
    try {
      await api("/api/health", { timeoutMs: 5000 });
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(formObject(form))
      });
      status.textContent = "Connexion OK. Chargement du tableau de bord...";
      showApp(true);
      await refresh();
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector("[data-logout]").addEventListener("click", async () => {
    await api("/api/admin/logout", { method: "POST" }).catch(() => null);
    showApp(false);
  });
}

function bindPasswordReset() {
  const panel = document.querySelector("[data-reset-form]");
  const toggle = document.querySelector("[data-reset-toggle]");
  const sendButton = document.querySelector("[data-send-reset-otp]");
  const status = document.querySelector("[data-reset-status]");
  if (!panel || !toggle || !sendButton || !status) return;

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    status.textContent = "";
  });

  sendButton.addEventListener("click", async () => {
    const email = panel.elements.email.value.trim();
    if (!email) {
      status.textContent = "Renseigne l'email admin.";
      return;
    }
    sendButton.disabled = true;
    status.textContent = "Envoi de l'OTP...";
    try {
      const payload = await api("/api/admin/password/request-reset", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      status.textContent = payload.message || "OTP envoye a l'email de securite.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      sendButton.disabled = false;
    }
  });

  panel.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formObject(panel);
    if (data.newPassword !== data.confirmPassword) {
      status.textContent = "La confirmation ne correspond pas.";
      return;
    }
    status.textContent = "Verification de l'OTP...";
    try {
      await api("/api/admin/password/reset", {
        method: "POST",
        body: JSON.stringify(data)
      });
      panel.reset();
      panel.hidden = true;
      document.querySelector("[data-login-status]").textContent = "Mot de passe reinitialise. Connecte-toi avec le nouveau mot de passe.";
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function bindContent() {
  document.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-content-form]")) return;
    event.preventDefault();
    const status = document.querySelector("[data-content-status]");
    status.textContent = "Enregistrement...";
    try {
      const payload = await api("/api/admin/content", {
        method: "PUT",
        body: JSON.stringify({ content: formObject(event.target) })
      });
      state.content = payload.content || state.content;
      document.querySelectorAll("[data-admin-logo]").forEach((node) => {
        if (state.content.logoImage) node.src = state.content.logoImage;
      });
      renderStats();
      status.textContent = "Contenu mis a jour.";
      notify("Contenu enregistre. Le site public affichera la nouvelle version au rechargement.", "success");
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-upload-content-image]");
    if (!button) return;
    const key = button.dataset.uploadContentImage;
    const fileInput = document.querySelector(`[data-image-file="${key}"]`);
    const status = document.querySelector("[data-content-status]");
    if (!fileInput?.files?.[0]) {
      status.textContent = "Choisis une image locale d'abord.";
      return;
    }
    button.disabled = true;
    status.textContent = "Upload de l'image...";
    try {
      const url = await uploadMediaFile(fileInput.files[0]);
      document.querySelector(`[name="${key}"]`).value = url;
      state.content[key] = url;
      status.textContent = "Image uploadee. Clique sur Enregistrer le contenu pour valider.";
      renderMediaList();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

async function applyMediaToContent(field, url) {
  const payload = await api("/api/admin/content", {
    method: "PUT",
    body: JSON.stringify({ content: { [field]: url } })
  });
  state.content = payload.content || state.content;
  document.querySelectorAll("[data-admin-logo]").forEach((node) => {
    if (state.content.logoImage) node.src = state.content.logoImage;
  });
  renderContentForm();
}

function bindMedia() {
  document.querySelector("[data-media-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("[data-media-status]");
    const file = form.elements.file.files[0];
    if (!file) return;
    status.textContent = "Upload en cours...";
    try {
      await uploadMediaFile(file);
      form.reset();
      state.stats.media = state.media.length;
      status.textContent = "Image ajoutee a la mediatheque.";
      renderStats();
      renderMediaList();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.querySelector("[data-media-list]").addEventListener("click", async (event) => {
    const useButton = event.target.closest("[data-use-media]");
    const galleryButton = event.target.closest("[data-use-gallery-media]");
    const copyButton = event.target.closest("[data-copy-media]");
    const deleteButton = event.target.closest("[data-delete-media]");
    const status = document.querySelector("[data-media-status]");

    if (useButton) {
      status.textContent = "Application de l'image...";
      try {
        await applyMediaToContent(useButton.dataset.useMedia, useButton.dataset.mediaUrl);
        status.textContent = "Image appliquee au site.";
      } catch (error) {
        status.textContent = error.message;
      }
    }

    if (galleryButton) {
      const input = document.querySelector('[data-gallery-form] input[name="image"]');
      const type = document.querySelector('[data-gallery-form] select[name="media_type"]');
      if (input) input.value = galleryButton.dataset.useGalleryMedia;
      if (type) type.value = galleryButton.dataset.mediaType || "image";
      status.textContent = "Image placee dans le formulaire Galerie.";
    }

    if (copyButton) {
      const value = copyButton.dataset.copyMedia;
      const imageInput = document.querySelector('[data-blog-form] input[name="image"]');
      if (imageInput) imageInput.value = value;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value).catch(() => null);
      }
      status.textContent = "Chemin copie et place dans le champ image de l'article.";
    }

    if (deleteButton && confirm("Supprimer cette image de la mediatheque ?")) {
      status.textContent = "Suppression...";
      try {
        const payload = await api(`/api/admin/media/${encodeURIComponent(deleteButton.dataset.deleteMedia)}`, { method: "DELETE" });
        state.media = payload.media || state.media;
        state.stats.media = state.media.length;
        status.textContent = "Image supprimee.";
        renderStats();
        renderMediaList();
      } catch (error) {
        status.textContent = error.message;
      }
    }
  });
}

function bindServices() {
  document.querySelector("[data-service-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    const id = data.id;
    delete data.id;
    const payload = await api(id ? `/api/admin/services/${id}` : "/api/admin/services", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    state.services = payload.services || state.services;
    state.stats.services = state.services.length;
    resetServiceForm();
    renderStats();
    renderServiceList();
  });

  document.querySelector("[data-service-reset]").addEventListener("click", resetServiceForm);

  document.querySelector("[data-service-list]").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-service]");
    const remove = event.target.closest("[data-delete-service]");
    if (edit) fillServiceForm(edit.dataset.editService);
    if (remove && confirm("Supprimer ce service ?")) {
      const payload = await api(`/api/admin/services/${remove.dataset.deleteService}`, { method: "DELETE" });
      state.services = payload.services || state.services;
      state.stats.services = state.services.length;
      renderStats();
      renderServiceList();
    }
  });
}

function bindPricing() {
  document.querySelector("[data-pricing-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    const id = data.id;
    delete data.id;
    const payload = await api(id ? `/api/admin/pricing/${id}` : "/api/admin/pricing", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    state.pricing = payload.pricing || state.pricing;
    state.stats.pricing = state.pricing.length;
    resetPricingForm();
    renderStats();
    renderPricingList();
  });

  document.querySelector("[data-pricing-reset]").addEventListener("click", resetPricingForm);

  document.querySelector("[data-pricing-list]").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-pricing]");
    const remove = event.target.closest("[data-delete-pricing]");
    if (edit) fillPricingForm(edit.dataset.editPricing);
    if (remove && confirm("Supprimer cette offre ?")) {
      const payload = await api(`/api/admin/pricing/${remove.dataset.deletePricing}`, { method: "DELETE" });
      state.pricing = payload.pricing || state.pricing;
      state.stats.pricing = state.pricing.length;
      renderStats();
      renderPricingList();
    }
  });
}

function bindGallery() {
  document.querySelector("[data-gallery-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    const file = form.elements.media_file.files[0];
    if (file) {
      data.image = await uploadMediaFile(file);
      if (!data.media_type || data.media_type === "image") {
        data.media_type = file.type.startsWith("video/") ? "video" : "image";
      }
    }
    delete data.media_file;
    const id = data.id;
    delete data.id;
    const payload = await api(id ? `/api/admin/gallery/${id}` : "/api/admin/gallery", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    state.gallery = payload.gallery || state.gallery;
    state.stats.gallery = state.gallery.length;
    resetGalleryForm();
    renderStats();
    renderGalleryList();
  });

  document.querySelector("[data-gallery-reset]").addEventListener("click", resetGalleryForm);

  document.querySelector("[data-gallery-list]").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-gallery]");
    const remove = event.target.closest("[data-delete-gallery]");
    if (edit) fillGalleryForm(edit.dataset.editGallery);
    if (remove && confirm("Supprimer cette image de la galerie ?")) {
      const payload = await api(`/api/admin/gallery/${remove.dataset.deleteGallery}`, { method: "DELETE" });
      state.gallery = payload.gallery || state.gallery;
      state.stats.gallery = state.gallery.length;
      renderStats();
      renderGalleryList();
    }
  });
}

function bindBlog() {
  document.querySelector("[data-blog-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    const file = form.elements.image_file.files[0];
    if (file) data.image = await uploadMediaFile(file);
    delete data.image_file;
    if (data.published_at) data.published_at = new Date(data.published_at).toISOString();
    const id = data.id;
    delete data.id;
    const payload = await api(id ? `/api/admin/blog/${id}` : "/api/admin/blog", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    state.posts = payload.posts || state.posts;
    state.stats.posts = state.posts.length;
    resetBlogForm();
    renderStats();
    renderBlogList();
  });

  document.querySelector("[data-blog-reset]").addEventListener("click", resetBlogForm);

  document.querySelector("[data-blog-list]").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-blog]");
    const remove = event.target.closest("[data-delete-blog]");
    if (edit) fillBlogForm(edit.dataset.editBlog);
    if (remove && confirm("Supprimer cet article ?")) {
      const payload = await api(`/api/admin/blog/${remove.dataset.deleteBlog}`, { method: "DELETE" });
      state.posts = payload.posts || state.posts;
      state.stats.posts = state.posts.length;
      renderStats();
      renderBlogList();
    }
  });
}

function bindCompanies() {
  document.querySelector("[data-company-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    const id = data.id;
    delete data.id;
    try {
      const payload = await api(id ? `/api/admin/companies/${id}` : "/api/admin/companies", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
      state.companies = payload.companies || state.companies;
      state.stats.companies = state.companies.length;
      resetCompanyForm();
      renderStats();
      renderCompanyList();
      notify("Societe enregistree.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  });

  document.querySelector("[data-company-import-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("[data-company-import-status]");
    status.textContent = "Import en cours...";
    try {
      const payload = await api("/api/admin/companies/import", {
        method: "POST",
        body: JSON.stringify(formObject(form))
      });
      state.companies = payload.companies || state.companies;
      state.stats.companies = state.companies.length;
      form.reset();
      status.textContent = `${payload.imported || 0} societe(s) importee(s).`;
      renderStats();
      renderCompanyList();
      await refreshAuditLogs();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.querySelector("[data-company-reset]").addEventListener("click", resetCompanyForm);

  document.querySelector("[data-company-list]").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-company]");
    const remove = event.target.closest("[data-delete-company]");
    if (edit) fillCompanyForm(edit.dataset.editCompany);
    if (remove && confirm("Supprimer cette societe ?")) {
      const payload = await api(`/api/admin/companies/${remove.dataset.deleteCompany}`, { method: "DELETE" });
      state.companies = payload.companies || state.companies;
      state.stats.companies = state.companies.length;
      renderStats();
      renderCompanyList();
    }
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadMediaFile(file) {
  const payload = await api("/api/admin/media", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      base64: await readFileAsBase64(file)
    })
  });
  state.media = payload.media || state.media;
  state.stats.media = state.media.length;
  return payload.file?.url;
}

async function refreshAuditLogs() {
  const payload = await api("/api/admin/audit-logs");
  state.auditLogs = payload.auditLogs || [];
  renderAuditLogs();
}

async function exportJsonBackup() {
  const response = await fetch("/api/admin/export", {
    credentials: "include",
    cache: "no-store"
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Export impossible.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `mo-djib-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindSecurity() {
  document.querySelector("[data-password-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("[data-password-status]");
    const data = formObject(form);
    if (data.newPassword !== data.confirmPassword) {
      status.textContent = "La confirmation ne correspond pas.";
      return;
    }
    status.textContent = "Mise a jour...";
    try {
      await api("/api/admin/security/password", {
        method: "PUT",
        body: JSON.stringify(data)
      });
      form.reset();
      status.textContent = "Mot de passe modifie.";
      await refreshAuditLogs();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.querySelector("[data-export-json]").addEventListener("click", async () => {
    notify("Preparation de l'export...", "info");
    try {
      await exportJsonBackup();
      notify("Export JSON cree.", "success");
      await refreshAuditLogs();
    } catch (error) {
      notify(error.message, "error");
    }
  });

  document.querySelector("[data-refresh-audit]").addEventListener("click", async () => {
    try {
      await refreshAuditLogs();
      notify("Journal actualise.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  });
}

function bindDocuments() {
  document.querySelector("[data-document-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("[data-document-status]");
    const data = formObject(form);
    const id = data.id;
    const file = form.elements.file.files[0];
    if (!id && !file) {
      status.textContent = "Choisis un fichier pour ajouter un document.";
      return;
    }
    if (!id && !data.code) {
      status.textContent = "Ajoute un code d'acces pour proteger ce document.";
      return;
    }
    status.textContent = "Upload en cours...";
    try {
      if (file) {
        data.fileName = file.name;
        data.mimeType = file.type || "application/octet-stream";
        data.base64 = await readFileAsBase64(file);
      }
      delete data.file;
      delete data.id;
      const payload = await api(id ? `/api/admin/documents/${id}` : "/api/admin/documents", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
      state.documents = payload.documents || state.documents;
      state.stats.documents = state.documents.length;
      resetDocumentForm();
      status.textContent = id ? "Document modifie." : "Document ajoute.";
      renderStats();
      renderDocumentList();
      await refreshAuditLogs();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.querySelector("[data-document-reset]").addEventListener("click", resetDocumentForm);

  document.querySelector("[data-document-list]").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-document]");
    const remove = event.target.closest("[data-delete-document]");
    if (edit) fillDocumentForm(edit.dataset.editDocument);
    if (remove && confirm("Supprimer ce document ?")) {
      const payload = await api(`/api/admin/documents/${remove.dataset.deleteDocument}`, { method: "DELETE" });
      state.documents = payload.documents || state.documents;
      state.stats.documents = state.documents.length;
      renderStats();
      renderDocumentList();
      await refreshAuditLogs();
    }
  });
}

async function boot() {
  bindTabs();
  bindAdminSearch();
  bindLogin();
  bindPasswordReset();
  bindContent();
  bindMedia();
  bindServices();
  bindPricing();
  bindGallery();
  bindBlog();
  bindCompanies();
  bindDocuments();
  bindSecurity();
  try {
    await refresh();
    showApp(true);
  } catch {
    showApp(false);
  }
}

boot();
