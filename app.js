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

const supportedLanguages = ["fr", "en", "ar"];
const defaultLanguage = "fr";
const siteOrigin = "https://modjibconsulting.online";

const translations = {
  en: {
    meta: {
      homeTitle: "MO-DJIB Consulting | Hygiene, HACCP & Audit Firm in Djibouti",
      homeDescription: "MO-DJIB Consulting is a Djibouti-based firm for food hygiene, safety, HACCP, audit, certification, training and professional compliance.",
      galleryTitle: "MO-DJIB Consulting Gallery | HACCP videos and audits in Djibouti",
      galleryDescription: "Images and videos from MO-DJIB Consulting missions in Djibouti: hygiene, food safety, HACCP, audit and certification."
    },
    ui: {
      navHome: "Home",
      navServices: "Services",
      navCertificates: "Certificates",
      navDocuments: "Documents",
      navGallery: "Gallery",
      navPricing: "Pricing",
      navNews: "News",
      languageLabel: "Language",
      ctaQuote: "Request a quote",
      ctaVerify: "Verify a certificate",
      localCard1Title: "Search terms in Djibouti",
      localCard1Body: "Djibouti consulting firm, hygiene and safety firm in Djibouti, HACCP audit Djibouti, food hygiene training and professional certification.",
      localCard2Title: "Supported sectors",
      localCard2Body: "Restaurants, hotels, caterers, institutions, food industries, professional kitchens and catering services.",
      localCard3Title: "Service area",
      localCard3Body: "Djibouti City, Republic of Djibouti and organizations across the Horn of Africa."
    },
    content: {
      heroKicker: "HACCP, food hygiene, audit and certification",
      heroSubtitle: "Your quality and food safety partner in Djibouti and the Horn of Africa.",
      heroBody: "We support restaurants, hotels, caterers, institutions and food companies with training, audits, action plans and certified references.",
      servicesTitle: "Clear, measurable and monitored quality support.",
      servicesBody: "Each mission combines field work, documents, training and control to make compliance easier to manage.",
      certificatesTitle: "Consult referenced companies.",
      certificationIntro: "Quickly verify a company referenced by MO-DJIB Consulting using its name or certificate number.",
      documentsTitle: "Code-protected documents.",
      documentsIntro: "Sensitive documents are protected by access code. Request your access code from MO-DJIB Consulting.",
      pricingTitle: "Offers adapted to your activity size.",
      pricingBody: "Each card connects directly to WhatsApp or email for a precise proposal.",
      localSeoEyebrow: "Professional firm in Djibouti",
      localSeoTitle: "Hygiene and safety consulting firm in Djibouti for companies, restaurants and hotels.",
      localSeoBody: "MO-DJIB Consulting is based in Djibouti and helps professionals with food safety, hygiene, referencing, HACCP audits, team training and certification documents.",
      contactTitle: "Tell us what you need.",
      contactBody: "Audit, training, certification, protected document or company verification: the MO-DJIB Consulting team answers quickly."
    }
  },
  ar: {
    meta: {
      homeTitle: "MO-DJIB Consulting | مكتب النظافة والسلامة و HACCP في جيبوتي",
      homeDescription: "MO-DJIB Consulting مكتب في جيبوتي متخصص في النظافة والسلامة الغذائية و HACCP والتدقيق والتدريب والاعتماد.",
      galleryTitle: "معرض MO-DJIB Consulting | فيديوهات وتدقيق HACCP في جيبوتي",
      galleryDescription: "صور وفيديوهات من مهام MO-DJIB Consulting في جيبوتي: النظافة، السلامة الغذائية، HACCP، التدقيق والاعتماد."
    },
    ui: {
      navHome: "الرئيسية",
      navServices: "الخدمات",
      navCertificates: "الشهادات",
      navDocuments: "الوثائق",
      navGallery: "المعرض",
      navPricing: "الأسعار",
      navNews: "الأخبار",
      languageLabel: "اللغة",
      ctaQuote: "طلب عرض سعر",
      ctaVerify: "التحقق من شهادة",
      localCard1Title: "خدمات مطلوبة في جيبوتي",
      localCard1Body: "مكتب جيبوتي، مكتب النظافة والسلامة في جيبوتي، تدقيق HACCP، تدريب النظافة الغذائية والاعتماد المهني.",
      localCard2Title: "القطاعات المستفيدة",
      localCard2Body: "المطاعم، الفنادق، خدمات التموين، المؤسسات، الصناعات الغذائية والمطابخ المهنية.",
      localCard3Title: "منطقة الخدمة",
      localCard3Body: "مدينة جيبوتي، جمهورية جيبوتي ومؤسسات القرن الأفريقي."
    },
    content: {
      heroKicker: "HACCP، النظافة الغذائية، التدقيق والاعتماد",
      heroSubtitle: "شريككم في الجودة والسلامة الغذائية في جيبوتي والقرن الأفريقي.",
      heroBody: "نرافق المطاعم والفنادق وخدمات التموين والمؤسسات الغذائية من خلال التدريب والتدقيق وخطط العمل والمراجع المعتمدة.",
      servicesTitle: "دعم واضح وقابل للقياس في إدارة الجودة.",
      servicesBody: "كل مهمة تجمع بين العمل الميداني والوثائق والتدريب والرقابة لتسهيل الامتثال.",
      certificatesTitle: "التحقق من الشركات المرجعية.",
      certificationIntro: "تحقق بسرعة من شركة مرجعية لدى MO-DJIB Consulting بالاسم أو رقم الشهادة.",
      documentsTitle: "وثائق محمية برمز.",
      documentsIntro: "الوثائق الحساسة محمية برمز دخول. اطلب رمز الدخول من فريق MO-DJIB Consulting.",
      pricingTitle: "عروض مناسبة لحجم نشاطك.",
      pricingBody: "كل بطاقة تقود مباشرة إلى WhatsApp أو البريد الإلكتروني للحصول على عرض دقيق.",
      localSeoEyebrow: "مكتب مهني في جيبوتي",
      localSeoTitle: "مكتب النظافة والسلامة في جيبوتي للشركات والمطاعم والفنادق.",
      localSeoBody: "MO-DJIB Consulting مكتب في جيبوتي يساعد المهنيين في السلامة الغذائية والنظافة والتدقيق HACCP وتدريب الفرق ووثائق الاعتماد.",
      contactTitle: "أخبرونا بحاجتكم.",
      contactBody: "تدقيق، تدريب، اعتماد، وثيقة محمية أو تحقق من شركة: فريق MO-DJIB Consulting يجيب بسرعة."
    }
  }
};

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

function assetUrl(value) {
  const clean = String(value || "").trim();
  if (!clean || /^(https?:|data:|blob:|mailto:|tel:|#)/i.test(clean)) return clean;
  return `/${clean.replace(/^\/+/, "")}`;
}

function pageType() {
  return document.documentElement.dataset.page || (location.pathname.includes("galerie") ? "gallery" : "home");
}

function currentLanguage() {
  const firstSegment = location.pathname.split("/").filter(Boolean)[0];
  if (supportedLanguages.includes(firstSegment)) return firstSegment;
  const saved = localStorage.getItem("moDjibLang");
  return supportedLanguages.includes(saved) ? saved : defaultLanguage;
}

function localizedUrl(lang, page = pageType()) {
  const suffix = page === "gallery" ? "galerie" : "";
  if (lang === "fr") return suffix ? `/${suffix}` : "/";
  return suffix ? `/${lang}/${suffix}` : `/${lang}/`;
}

function setMeta(name, content, property = false) {
  if (!content) return;
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let node = document.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function setLink(rel, href, hreflang = "") {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let node = document.querySelector(selector);
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", rel);
    if (hreflang) node.setAttribute("hreflang", hreflang);
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

function applySeo(lang, content) {
  const page = pageType();
  const languageMeta = translations[lang]?.meta || {};
  const title = page === "gallery"
    ? (languageMeta.galleryTitle || "Galerie MO-DJIB Consulting | Videos et audits HACCP a Djibouti")
    : (lang === "fr" ? (content.seoTitle || "MO-DJIB Consulting | Cabinet Hygiene, HACCP & Audit a Djibouti") : (languageMeta.homeTitle || content.seoTitle || "MO-DJIB Consulting | Cabinet Hygiene, HACCP & Audit a Djibouti"));
  const description = page === "gallery"
    ? (languageMeta.galleryDescription || "Galerie MO-DJIB Consulting a Djibouti: images, videos YouTube, formations HACCP, audits hygiene et supports professionnels.")
    : (lang === "fr" ? (content.seoDescription || "MO-DJIB Consulting, cabinet a Djibouti specialise en hygiene et securite alimentaire, HACCP, audit, certification, formation et referencement professionnel.") : (languageMeta.homeDescription || content.seoDescription || "MO-DJIB Consulting, cabinet a Djibouti specialise en hygiene et securite alimentaire, HACCP, audit, certification, formation et referencement professionnel."));
  document.title = title;
  setMeta("description", description);
  setMeta("keywords", content.seoKeywords || "cabinet Djibouti, cabinet hygiene et securite Djibouti, HACCP Djibouti, audit hygiene Djibouti, certification alimentaire Djibouti");
  setMeta("og:title", title, true);
  setMeta("og:description", description, true);
  setMeta("og:url", `${siteOrigin}${localizedUrl(lang, page).replace(/\/$/, page === "home" ? "/" : "")}`, true);
  setLink("canonical", `${siteOrigin}${localizedUrl(lang, page)}`);
  setLink("alternate", `${siteOrigin}${localizedUrl("fr", page)}`, "fr-DJ");
  setLink("alternate", `${siteOrigin}${localizedUrl("en", page)}`, "en");
  setLink("alternate", `${siteOrigin}${localizedUrl("ar", page)}`, "ar");
  setLink("alternate", `${siteOrigin}${localizedUrl("fr", page)}`, "x-default");
}

function translatedContent(content, lang) {
  return {
    ...content,
    ...(translations[lang]?.content || {})
  };
}

function applyStaticTranslations(lang) {
  const ui = translations[lang]?.ui || {};
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const value = ui[node.dataset.i18n];
    if (value) node.textContent = value;
  });
  document.documentElement.lang = lang === "fr" ? "fr" : lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("is-rtl", lang === "ar");
  const select = document.querySelector("[data-language-select]");
  if (select) select.value = lang;
  document.querySelectorAll('a[href="/galerie"]').forEach((link) => {
    link.href = localizedUrl(lang, "gallery");
  });
  document.querySelectorAll('a[href="/"]').forEach((link) => {
    link.href = localizedUrl(lang, "home");
  });
  document.querySelectorAll('a[href^="/#"]').forEach((link) => {
    const hash = link.getAttribute("href").slice(1);
    link.href = `${localizedUrl(lang, "home")}${hash}`;
  });
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Une erreur est survenue.");
  return payload;
}

function applyContent(content, generatedAt, lang = defaultLanguage) {
  const activeContent = translatedContent(content, lang);
  applyStaticTranslations(lang);
  applySeo(lang, activeContent);

  document.querySelectorAll("[data-content]").forEach((node) => {
    const key = node.dataset.content;
    if (activeContent[key]) node.textContent = activeContent[key];
  });

  document.querySelectorAll("[data-whatsapp]").forEach((node) => {
    if (content.whatsappUrl) node.href = content.whatsappUrl;
  });

  document.querySelectorAll("[data-email]").forEach((node) => {
    if (content.contactEmail) node.href = `mailto:${content.contactEmail}`;
  });

  if (content.logoImage) {
    document.querySelectorAll("[data-logo-image]").forEach((node) => {
      node.src = assetUrl(content.logoImage);
    });
  }

  if (content.heroImage) {
    document.documentElement.style.setProperty("--hero-image", `url("${assetUrl(content.heroImage)}")`);
  }

  if (content.contactImage) {
    document.documentElement.style.setProperty("--contact-image", `url("${assetUrl(content.contactImage)}")`);
  }

  const trustTags = document.querySelector("[data-trust-tags]");
  if (trustTags && activeContent.trustTags) {
    trustTags.innerHTML = activeContent.trustTags
      .split(/\r?\n/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
      .join("");
  }

  const stamp = activeContent.lastContentUpdate || generatedAt;
  const updatedNode = document.querySelector("[data-updated]");
  if (updatedNode) {
    updatedNode.textContent = `${activeContent.lastUpdatedLabel || "Actualise le"} ${formatDate(stamp)}`;
  }

  return activeContent;
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

function renderCompanies(companies, target = document.querySelector("[data-company-results]"), lang = defaultLanguage) {
  if (!target) return;
  if (!companies.length) {
    target.innerHTML = `<div class="empty-state">${lang === "en" ? "No result yet." : lang === "ar" ? "لا توجد نتائج حاليا." : "Aucun resultat pour le moment."}</div>`;
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

function renderDocuments(documents, lang = defaultLanguage) {
  const root = document.querySelector("[data-documents]");
  if (!root) return;
  if (!documents.length) {
    root.innerHTML = `<div class="empty-state">${lang === "en" ? "No protected document is published yet." : lang === "ar" ? "لا توجد وثائق محمية منشورة حاليا." : "Aucun document protege publie pour le moment."}</div>`;
    return;
  }
  const labels = {
    fr: ["Code d'acces", "Entrez le code", "Telecharger", "Verification...", "Code valide. Telechargement..."],
    en: ["Access code", "Enter the code", "Download", "Checking...", "Valid code. Downloading..."],
    ar: ["رمز الدخول", "أدخل الرمز", "تحميل", "جاري التحقق...", "الرمز صحيح. جاري التحميل..."]
  }[lang] || [];
  root.innerHTML = documents.map((doc) => `
    <article class="document-card">
      <span class="badge">${escapeHtml(doc.category)}</span>
      <h3>${escapeHtml(doc.title)}</h3>
      <p>${escapeHtml(doc.description || "Document accessible avec un code fourni par MO-DJIB Consulting.")}</p>
      <p>${escapeHtml(doc.original_filename)} - ${Math.max(1, Math.round((doc.size || 0) / 1024))} Ko</p>
      <form data-document-form="${doc.id}">
        <label for="doc-code-${doc.id}">${escapeHtml(labels[0])}</label>
        <input id="doc-code-${doc.id}" name="code" type="password" placeholder="${escapeHtml(labels[1])}" required>
        <button class="button primary" type="submit">${escapeHtml(labels[2])}</button>
        <p class="document-status" aria-live="polite"></p>
      </form>
    </article>
  `).join("");

  root.querySelectorAll("[data-document-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector(".document-status");
      status.textContent = labels[3];
      try {
        const code = new FormData(form).get("code");
        const id = form.dataset.documentForm;
        const payload = await getJson(`/api/documents/${id}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        });
        status.textContent = labels[4];
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
      <img src="${escapeHtml(assetUrl(post.image || "images/default-image.jpg"))}" alt="" loading="lazy" decoding="async">
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
    return `<video src="${escapeHtml(assetUrl(item.image))}" controls preload="metadata"></video>`;
  }
  if (type === "youtube") {
    const embed = youtubeEmbedUrl(item.image);
    if (!embed) {
      return `<a class="youtube-fallback" href="${escapeHtml(item.image)}" target="_blank" rel="noreferrer">Ouvrir la video YouTube</a>`;
    }
    return `<iframe src="${escapeHtml(embed)}" title="${escapeHtml(item.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }
  return `<img src="${escapeHtml(assetUrl(item.image))}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">`;
}

function renderGallery(items, lang = defaultLanguage) {
  const root = document.querySelector("[data-gallery]");
  if (!root) return;
  const limit = Number(root.dataset.galleryLimit || 0);
  const displayItems = limit > 0 ? items.slice(0, limit) : items;
  if (!displayItems.length) {
    root.innerHTML = `<div class="empty-state">${lang === "en" ? "No gallery item yet." : lang === "ar" ? "لا توجد عناصر في المعرض حاليا." : "Aucune image dans la galerie pour le moment."}</div>`;
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

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findCompanyMatch(message, payload, context) {
  const text = normalizeSearch(`${message} ${context.companyName || ""} ${context.certificateNumber || ""}`);
  return (payload.companies || []).find((company) => {
    const name = normalizeSearch(company.name);
    const certificate = normalizeSearch(company.certificate_number);
    return (certificate && text.includes(certificate)) || (name && text.includes(name));
  });
}

function chatbotAnswer(message, content, payload, context = {}) {
  const text = message.toLowerCase();
  const companyCount = (payload.companies || []).length;
  const documentCount = (payload.documents || []).length;
  const certificateLike = /(certificat|certification|societe|soci[eé]t[eé]|reference|r[eé]f[eé]rence|numero|num[eé]ro|modjib-|haccp)/i.test(text);
  const certCandidate = message.match(/[A-Z0-9-]{8,}/i)?.[0] || "";
  if (certCandidate) context.certificateNumber = certCandidate.toUpperCase();

  if (certificateLike) {
    const match = findCompanyMatch(message, payload, context);
    if (match) {
      context.companyName = match.name;
      context.certificateNumber = match.certificate_number;
      return `${match.name} est dans la base MO-DJIB avec le certificat ${match.certificate_number}. Statut: ${match.status}. Secteur: ${match.sector || "non renseigne"}. Validite: ${match.issued_at || "-"} au ${match.expires_at || "-"}.`;
    }
    context.intent = "certificate";
    if (!context.companyName) {
      return "Bien sur. Donnez-moi le nom de l'entreprise, puis le numero de certificat si vous l'avez. Exemple: Hotel Bellevue Djibouti, MODJIB-HACCP-2026-001.";
    }
    if (!context.certificateNumber) {
      return `Merci. Pour ${context.companyName}, pouvez-vous aussi indiquer le numero de certificat ? Cela permet une verification plus precise.`;
    }
    return `Je n'ai pas trouve de correspondance exacte pour ${context.companyName} avec ${context.certificateNumber}. Verifiez l'orthographe ou utilisez la recherche Certificats sur le site.`;
  }

  if (context.intent === "certificate" && !context.companyName) {
    context.companyName = message.trim();
    return `Merci. Avez-vous aussi le numero de certificat de ${context.companyName} ? Sinon, je peux vous guider vers la recherche par nom.`;
  }
  if (context.intent === "certificate" && !context.certificateNumber) {
    context.certificateNumber = certCandidate || message.trim();
    const match = findCompanyMatch(message, payload, context);
    if (match) return `${match.name} est referencee avec le certificat ${match.certificate_number}. Statut: ${match.status}.`;
    return "Je n'ai pas encore une correspondance exacte. Lancez la recherche dans la section Certificats ou contactez MO-DJIB pour confirmation.";
  }
  if (/(devis|tarif|prix|pricing|cout|co[uû]t|payer|offre)/i.test(text)) {
    return "Pour preparer un devis juste, j'ai besoin de 3 elements: le type d'activite, la taille de l'etablissement et le besoin principal (audit, formation, HACCP, certification ou suivi). Vous pouvez aussi ouvrir WhatsApp directement.";
  }
  if (/(document|code|telecharger|t[eé]l[eé]charger|pdf|fichier|base)/i.test(text)) {
    return `Les documents proteges demandent un code d'acces fourni par MO-DJIB Consulting. ${documentCount} document(s) actif(s) sont disponibles dans l'espace Documents.`;
  }
  if (/(haccp|audit|formation|hygiene|hygi[eè]ne|qualite|qualit[eé]|tox|restaurant|hotel|h[oô]tel)/i.test(text)) {
    return "MO-DJIB Consulting accompagne les audits, formations HACCP, hygiene alimentaire, dossiers qualite, suivi documentaire et certification. Quel est votre secteur: restaurant, hotel, traiteur, collectivite ou industrie alimentaire ?";
  }
  if (/(contact|whatsapp|mail|email|telephone|t[eé]l[eé]phone|adresse|rendez|rdv)/i.test(text)) {
    return `Contact direct: ${content.contactEmail || "modjibconsulting@gmail.com"}${content.phone ? ` - ${content.phone}` : ""}. Le bouton WhatsApp est disponible dans cette fenetre.`;
  }
  if (/(galerie|photo|video|vid[eé]o|youtube|image)/i.test(text)) {
    return "La galerie regroupe les images, videos et liens YouTube ajoutes depuis l'espace admin. Ouvrez la page Galerie pour tout consulter.";
  }
  return `Je peux vous aider pour un devis, une verification de certificat (${companyCount} societe(s) publiques), un document protege, une formation HACCP ou un contact direct. Quel sujet souhaitez-vous traiter ?`;
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
  const chatContext = {};

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
    window.setTimeout(() => addChatMessage(messages, chatbotAnswer(message, content, payload, chatContext), "bot"), 180);
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
      renderCompanies(payload.companies || [], target, currentLanguage());
    } catch (error) {
      target.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  });
}

function bindLanguageSwitcher() {
  const select = document.querySelector("[data-language-select]");
  if (!select) return;
  select.addEventListener("change", () => {
    const lang = supportedLanguages.includes(select.value) ? select.value : defaultLanguage;
    localStorage.setItem("moDjibLang", lang);
    window.location.href = localizedUrl(lang, pageType());
  });
}

function visitorId() {
  const key = "moDjibVisitorId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function trackVisit(lang) {
  const pageKey = `${location.pathname}:${lang}`;
  const sessionKey = `moDjibTracked:${pageKey}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");
  const payload = {
    eventType: "page_view",
    visitorId: visitorId(),
    sessionId: sessionStorage.getItem("moDjibSessionId") || "",
    path: location.pathname,
    title: document.title,
    referrer: document.referrer,
    language: lang,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  };
  if (!payload.sessionId) {
    payload.sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("moDjibSessionId", payload.sessionId);
  }
  fetch("/api/analytics/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => null);
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
  bindLanguageSwitcher();
  bindSearch();
  try {
    const lang = currentLanguage();
    const payload = await getJson("/api/public");
    const activeContent = applyContent(payload.content || {}, payload.generatedAt, lang);
    renderServices(payload.services || []);
    renderPricing(payload.pricing || [], activeContent);
    renderCompanies(payload.companies || [], undefined, lang);
    renderDocuments(payload.documents || [], lang);
    renderGallery(payload.gallery || [], lang);
    renderPosts(payload.posts || []);
    initChatbot(activeContent, payload);
    trackVisit(lang);
  } catch (error) {
    const serviceRoot = document.querySelector("[data-services]");
    if (serviceRoot) serviceRoot.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

boot();
