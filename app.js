"use strict";

const icons = {
  "graduation-cap": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
  "shield-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 8-8 9-4.5-1-8-4-8-9V5l8-3 8 3v8Z"/><path d="m9 12 2 2 4-5"/></svg>',
  "clipboard-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-5"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg>'
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Africa/Djibouti"
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Une erreur est survenue.");
  return payload;
}

function applyContent(content, generatedAt) {
  document.querySelectorAll("[data-content]").forEach((node) => {
    const key = node.dataset.content;
    if (content[key]) node.textContent = content[key];
  });

  document.querySelectorAll("[data-whatsapp]").forEach((node) => {
    if (content.whatsappUrl) node.href = content.whatsappUrl;
  });

  document.querySelectorAll("[data-email]").forEach((node) => {
    if (content.contactEmail) node.href = `mailto:${content.contactEmail}`;
  });

  if (content.logoImage) {
    document.querySelectorAll("[data-logo-image]").forEach((node) => {
      node.src = content.logoImage;
    });
  }

  if (content.heroImage) {
    document.documentElement.style.setProperty("--hero-image", `url("${content.heroImage}")`);
  }

  if (content.contactImage) {
    document.documentElement.style.setProperty("--contact-image", `url("${content.contactImage}")`);
  }

  const trustTags = document.querySelector("[data-trust-tags]");
  if (trustTags && content.trustTags) {
    trustTags.innerHTML = content.trustTags
      .split(/\r?\n/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
      .join("");
  }

  const stamp = content.lastContentUpdate || generatedAt;
  const updatedNode = document.querySelector("[data-updated]");
  if (updatedNode) {
    updatedNode.textContent = `${content.lastUpdatedLabel || "Actualise le"} ${formatDate(stamp)}`;
  }
}

function renderServices(services) {
  const root = document.querySelector("[data-services]");
  if (!root) return;
  root.innerHTML = services.map((service) => `
    <article class="service-card">
      <div class="icon">${icons[service.icon] || icons.database}</div>
      <p class="eyebrow">${escapeHtml(service.eyebrow)}</p>
      <h3>${escapeHtml(service.title)}</h3>
      <p>${escapeHtml(service.description)}</p>
      <ul>${(service.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function renderPricing(plans, content) {
  const root = document.querySelector("[data-pricing]");
  if (!root) return;
  const mail = `mailto:${content.contactEmail || "modjibconsulting@gmail.com"}?subject=${encodeURIComponent("Demande de devis MO-DJIB Consulting")}`;
  const whatsapp = content.whatsappUrl || "https://wa.me/message/WZHC7CEMDMMXL1";
  root.innerHTML = plans.map((plan) => `
    <article class="price-card ${plan.highlighted ? "highlighted" : ""}">
      <span class="badge">${plan.highlighted ? "Populaire" : "Sur mesure"}</span>
      <h3>${escapeHtml(plan.title)}</h3>
      <div class="price">${escapeHtml(plan.price)}</div>
      <p>${escapeHtml(plan.description)}</p>
      <ul>${(plan.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      <div class="card-actions">
        <a class="button primary" href="${escapeHtml(whatsapp)}">WhatsApp</a>
        <a class="button secondary" href="${escapeHtml(mail)}">Email</a>
      </div>
    </article>
  `).join("");
}

function renderCompanies(companies, target = document.querySelector("[data-company-results]")) {
  if (!target) return;
  if (!companies.length) {
    target.innerHTML = '<div class="empty-state">Aucun resultat pour le moment.</div>';
    return;
  }
  target.innerHTML = companies.map((company) => `
    <article class="company-card">
      <header>
        <h3>${escapeHtml(company.name)}</h3>
        <span class="badge">${escapeHtml(company.status)}</span>
      </header>
      <span class="certificate-number">${escapeHtml(company.certificate_number)}</span>
      <p>${escapeHtml(company.sector || "Secteur non renseigne")} - Valide du ${escapeHtml(company.issued_at || "-")} au ${escapeHtml(company.expires_at || "-")}</p>
      <p>${escapeHtml(company.notes || "Societe referencee dans la base MO-DJIB Consulting.")}</p>
    </article>
  `).join("");
}

function renderDocuments(documents) {
  const root = document.querySelector("[data-documents]");
  if (!root) return;
  if (!documents.length) {
    root.innerHTML = '<div class="empty-state">Aucun document protege publie pour le moment.</div>';
    return;
  }
  root.innerHTML = documents.map((doc) => `
    <article class="document-card">
      <span class="badge">${escapeHtml(doc.category)}</span>
      <h3>${escapeHtml(doc.title)}</h3>
      <p>${escapeHtml(doc.description || "Document accessible avec un code fourni par MO-DJIB Consulting.")}</p>
      <p>${escapeHtml(doc.original_filename)} - ${Math.max(1, Math.round((doc.size || 0) / 1024))} Ko</p>
      <form data-document-form="${doc.id}">
        <label for="doc-code-${doc.id}">Code d'acces</label>
        <input id="doc-code-${doc.id}" name="code" type="password" placeholder="Entrez le code" required>
        <button class="button primary" type="submit">Telecharger</button>
        <p class="document-status" aria-live="polite"></p>
      </form>
    </article>
  `).join("");

  root.querySelectorAll("[data-document-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector(".document-status");
      status.textContent = "Verification...";
      try {
        const code = new FormData(form).get("code");
        const id = form.dataset.documentForm;
        const payload = await getJson(`/api/documents/${id}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        status.textContent = "Code valide. Telechargement...";
        window.location.href = payload.downloadUrl;
        form.reset();
      } catch (error) {
        status.textContent = error.message;
      }
    });
  });
}

function renderPosts(posts) {
  const root = document.querySelector("[data-posts]");
  if (!root) return;
  if (!posts.length) {
    root.innerHTML = '<div class="empty-state">Aucune actualite publiee.</div>';
    return;
  }
  root.innerHTML = posts.map((post) => `
    <article class="blog-card">
      <img src="${escapeHtml(post.image || "images/default-image.jpg")}" alt="">
      <div class="blog-card-content">
        <p class="blog-meta">${escapeHtml(post.category)} - ${formatDate(post.published_at)}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
      </div>
    </article>
  `).join("");
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

function galleryMediaMarkup(item) {
  const type = item.media_type || "image";
  if (type === "video") {
    return `<video src="${escapeHtml(item.image)}" controls preload="metadata"></video>`;
  }
  if (type === "youtube") {
    const embed = youtubeEmbedUrl(item.image);
    if (!embed) {
      return `<a class="youtube-fallback" href="${escapeHtml(item.image)}" target="_blank" rel="noreferrer">Ouvrir la video YouTube</a>`;
    }
    return `<iframe src="${escapeHtml(embed)}" title="${escapeHtml(item.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }
  return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">`;
}

function renderGallery(items) {
  const root = document.querySelector("[data-gallery]");
  if (!root) return;
  const limit = Number(root.dataset.galleryLimit || 0);
  const displayItems = limit > 0 ? items.slice(0, limit) : items;
  if (!displayItems.length) {
    root.innerHTML = '<div class="empty-state">Aucune image dans la galerie pour le moment.</div>';
    return;
  }
  root.innerHTML = displayItems.map((item) => `
    <article class="gallery-card">
      ${galleryMediaMarkup(item)}
      <div class="gallery-card-content">
        <span class="gallery-type">${escapeHtml((item.media_type || "image").toUpperCase())}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || "")}</p>
      </div>
    </article>
  `).join("");
}

function chatbotAnswer(message, content, payload) {
  const text = message.toLowerCase();
  const companyCount = (payload.companies || []).length;
  const documentCount = (payload.documents || []).length;
  if (/(devis|tarif|prix|pricing|cout|coût|payer|offre)/.test(text)) {
    return "Pour un devis rapide, utilisez WhatsApp ou envoyez un email. Les offres sont adaptees selon audit, formation, HACCP, suivi qualite ou certification.";
  }
  if (/(certificat|certification|societe|société|reference|référence|numero|numéro)/.test(text)) {
    return `Vous pouvez verifier une societe referencee avec son nom ou son numero de certificat dans la section Certificats. La base publique affiche actuellement ${companyCount} societe(s) referencee(s).`;
  }
  if (/(document|code|telecharger|télécharger|pdf|fichier|base)/.test(text)) {
    return `Les documents proteges demandent un code d'acces fourni par MO-DJIB Consulting. ${documentCount} document(s) actif(s) sont disponibles dans l'espace Documents.`;
  }
  if (/(haccp|audit|formation|hygiene|hygiène|qualite|qualité|tox|restaurant|hotel|hôtel)/.test(text)) {
    return "MO-DJIB Consulting accompagne les audits, formations HACCP, hygiene alimentaire, dossiers qualite, suivi documentaire et certification des etablissements.";
  }
  if (/(contact|whatsapp|mail|email|telephone|téléphone|adresse|rendez|rdv)/.test(text)) {
    return `Contact direct: ${content.contactEmail || "modjibconsulting@gmail.com"}${content.phone ? ` - ${content.phone}` : ""}. Le bouton WhatsApp est disponible dans cette fenetre.`;
  }
  if (/(galerie|photo|video|vidéo|youtube|image)/.test(text)) {
    return "La galerie regroupe les images, videos et liens YouTube ajoutes depuis l'espace admin. Ouvrez la page Galerie pour tout consulter.";
  }
  return "Je peux vous orienter vers un devis, une verification de certificat, un document protege, une formation HACCP ou un contact direct avec MO-DJIB Consulting.";
}

function addChatMessage(root, message, sender = "bot") {
  const item = document.createElement("div");
  item.className = `chat-message ${sender}`;
  item.textContent = message;
  root.appendChild(item);
  root.scrollTop = root.scrollHeight;
}

function initChatbot(content, payload) {
  if (document.querySelector("[data-chatbot]")) return;
  const whatsapp = content.whatsappUrl || "https://wa.me/message/WZHC7CEMDMMXL1";
  const email = content.contactEmail || "modjibconsulting@gmail.com";
  const widget = document.createElement("section");
  widget.className = "chatbot";
  widget.dataset.chatbot = "";
  widget.innerHTML = `
    <button class="chatbot-toggle" type="button" aria-expanded="false" data-chat-toggle>Assistance</button>
    <div class="chatbot-panel" data-chat-panel hidden>
      <header>
        <div>
          <strong>Assistant MO-DJIB</strong>
          <span>Reponse immediate</span>
        </div>
        <button type="button" aria-label="Fermer" data-chat-close>x</button>
      </header>
      <div class="chat-messages" data-chat-messages></div>
      <div class="chat-suggestions">
        <button type="button" data-chat-suggestion="Je veux un devis">Devis</button>
        <button type="button" data-chat-suggestion="Verifier un certificat">Certificat</button>
        <button type="button" data-chat-suggestion="Acceder a un document protege">Documents</button>
        <button type="button" data-chat-suggestion="Formation HACCP">HACCP</button>
      </div>
      <form data-chat-form>
        <input name="message" placeholder="Ecrivez votre question" autocomplete="off">
        <button type="submit">Envoyer</button>
      </form>
      <div class="chat-contact">
        <a href="${escapeHtml(whatsapp)}" target="_blank" rel="noreferrer">WhatsApp</a>
        <a href="mailto:${escapeHtml(email)}">Email</a>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  const panel = widget.querySelector("[data-chat-panel]");
  const toggle = widget.querySelector("[data-chat-toggle]");
  const messages = widget.querySelector("[data-chat-messages]");
  const form = widget.querySelector("[data-chat-form]");
  const input = form.elements.message;

  function openChat() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    input.focus();
  }

  function closeChat() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function respond(value) {
    const message = value.trim();
    if (!message) return;
    addChatMessage(messages, message, "user");
    window.setTimeout(() => addChatMessage(messages, chatbotAnswer(message, content, payload), "bot"), 180);
  }

  toggle.addEventListener("click", () => (panel.hidden ? openChat() : closeChat()));
  widget.querySelector("[data-chat-close]").addEventListener("click", closeChat);
  widget.querySelectorAll("[data-chat-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      openChat();
      respond(button.dataset.chatSuggestion || "");
    });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    respond(input.value);
    input.value = "";
  });
  addChatMessage(messages, "Bonjour, je suis l'assistant MO-DJIB. Posez une question ou choisissez un sujet.", "bot");
}

function bindSearch() {
  const form = document.querySelector("[data-company-search]");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = new FormData(form).get("q");
    const target = document.querySelector("[data-company-results]");
    target.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    try {
      const payload = await getJson(`/api/companies/search?q=${encodeURIComponent(query)}`);
      renderCompanies(payload.companies || [], target);
    } catch (error) {
      target.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  });
}

function bindNavigation() {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");

  function syncHeader() {
    if (header.hasAttribute("data-static-header")) {
      header.classList.add("is-scrolled");
      return;
    }
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  });

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
}

async function boot() {
  bindNavigation();
  bindSearch();
  try {
    const payload = await getJson("/api/public");
    applyContent(payload.content || {}, payload.generatedAt);
    renderServices(payload.services || []);
    renderPricing(payload.pricing || [], payload.content || {});
    renderCompanies(payload.companies || []);
    renderDocuments(payload.documents || []);
    renderGallery(payload.gallery || []);
    renderPosts(payload.posts || []);
    initChatbot(payload.content || {}, payload);
  } catch (error) {
    const serviceRoot = document.querySelector("[data-services]");
    if (serviceRoot) serviceRoot.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

boot();
