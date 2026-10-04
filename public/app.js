document.head.insertAdjacentHTML(
  "beforeend",
  '<link rel="stylesheet" href="/report.css">',
);
const app = document.querySelector("#app");
let report = null,
  active = "Overview",
  filter = "all";
const landing = () =>
  `<section class="hero"><div class="eyebrow">Le contrôle technique de votre présence digitale</div><h1>Votre site mérite<br>un check-up complet.</h1><p>SEO, performance, sécurité, mobile, structure et design : HI WebCare analyse réellement votre site et vous montre ce qui doit être amélioré.</p><form class="scanbox" id="scan"><input name="url" type="text" required placeholder="https://votresite.com" autocomplete="url"><button>Analyser mon site</button></form><div id="err"></div><div class="pills"><span>SEO</span><span>Performance</span><span>Sécurité</span><span>Mobile</span><span>Design</span><span>Conversion</span></div></section><section class="promise"><div><strong>Mesures réelles</strong><p>Aucun score inventé. Lorsqu’un contrôle ne peut pas être réalisé, il apparaît comme non vérifié.</p></div><div><strong>Priorités claires</strong><p>Chaque problème est expliqué, hiérarchisé et accompagné d’une recommandation concrète.</p></div><div><strong>Diagnostic défensif</strong><p>HI WebCare observe uniquement les éléments publics du site, sans exploitation intrusive.</p></div></section>`;
function bindLanding() {
  document.querySelector("#scan")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const r = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: new FormData(e.target).get("url") }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      showProgress(d.id);
    } catch (x) {
      document.querySelector("#err").innerHTML =
        `<p class="error">${esc(x.message)}</p>`;
      btn.disabled = false;
    }
  });
}
async function showProgress(id) {
  app.innerHTML = `<section class="progress"><div class="eyebrow">Diagnostic en cours</div><h2>Nous examinons votre site</h2><div class="bar"><i style="width:2%"></i></div><p id="msg">Préparation…</p></section>`;
  const poll = async () => {
    const r = await fetch("/api/scans/" + id),
      d = await r.json();
    document.querySelector(".bar i").style.width = d.progress + "%";
    document.querySelector("#msg").textContent = d.message;
    if (d.status === "complete") {
      loadReport(id, true);
    } else if (d.status === "failed") {
      app.innerHTML = `<section class="progress"><h2>Analyse interrompue</h2><p class="error">${esc(d.message)}</p><a class="cta" href="/" style="display:inline-block;padding:16px 24px;text-decoration:none">Nouvelle analyse</a></section>`;
    } else setTimeout(poll, 900);
  };
  poll();
}
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const label = {
  critical: "Critique",
  important: "Important",
  improvement: "À améliorer",
  passed: "Correct",
};
function redesignDecision(r) {
  if (r.redesign) return r.redesign;
  const health = Number(r.scores?.["Website Health"] ?? 100);
  const ux = Number(r.scores?.["Design / UX"] ?? r.scores?.UX ?? 100);
  const mobile = Number(r.scores?.Mobile ?? 100);
  const critical = Number(r.counts?.critical || 0);
  const important = Number(r.counts?.important || 0);
  const recommended =
    critical > 0 || important >= 3 || health < 70 || ux < 65 || mobile < 65;
  return {
    recommended,
    message: recommended
      ? "Le diagnostic révèle des problèmes structurels qui justifient une nouvelle version du site."
      : "Le site ne nécessite pas de refonte complète. Des optimisations ciblées suffisent.",
  };
}
function reportView() {
  const r = report,
    cats = [
      "Overview",
      "SEO",
      "Performance",
      "Security",
      "UX",
      "Mobile",
      "Accessibility",
      "Conversion",
      "Technical",
    ],
    scores = Object.entries(r.scores).filter(([k]) => k !== "Website Health"),
    c = r.coverage || { pagesAnalyzed: 1, pagesDiscovered: 1, pages: [] },
    rt = r.performance?.runtime;
  return `<section class="report"><div class="report-actions"><a href="/">← Accueil</a><a class="new-scan" href="/">Analyser un autre site</a></div><div class="report-head"><div><div class="eyebrow" style="color:#d9b66e">Rapport de diagnostic approfondi</div><h1>${esc(r.url)}</h1><p>${new Date(r.createdAt).toLocaleString("fr-FR")} · ${(r.durationMs / 1000).toFixed(1)} s · ${c.pagesAnalyzed} page(s) inspectée(s)</p></div><div class="health">${r.screenshots.desktop ? `<img class="shot" src="data:image/jpeg;base64,${r.screenshots.desktop}" alt="Capture du site">` : ""}<div><small>WEBSITE HEALTH</small><strong>${r.scores["Website Health"]}</strong><span>/100</span></div></div></div><div class="coverage"><div><b>${c.pagesAnalyzed}</b><span>pages analysées</span></div><div><b>${c.pagesDiscovered}</b><span>URLs découvertes</span></div><div><b>${rt?.requests?.total ?? "—"}</b><span>ressources observées</span></div><div><b>${rt?.consoleErrors?.length ?? "—"}</b><span>erreurs JavaScript</span></div></div><details class="pages"><summary>Voir les pages et preuves inspectées</summary>${(c.pages || []).map((p) => `<div><span>${esc(p.url)}</span><small>${p.error ? esc(p.error) : `HTTP ${p.status} · ${p.ms} ms`}</small></div>`).join("")}</details><div class="counts"><div class="count"><b>${r.counts.critical}</b><span>Problèmes critiques</span></div><div class="count"><b>${r.counts.important}</b><span>Problèmes importants</span></div><div class="count"><b>${r.counts.improvement}</b><span>Améliorations</span></div><div class="count"><b>${r.counts.passed}</b><span>Contrôles réussis</span></div></div><div class="scores">${scores.map(([k, v]) => `<div class="scorecard"><label>${esc(k)}</label><span class="num">${v === null ? "Non vérifié" : v}</span>${v !== null ? "<small>/100</small>" : ""}</div>`).join("")}</div><div class="tabs">${cats.map((x) => `<button data-tab="${x}" class="${active === x ? "active" : ""}">${x}</button>`).join("")}</div><div class="filters">${["all", "critical", "important", "improvement", "passed"].map((f) => `<button data-filter="${f}" class="${filter === f ? "active" : ""}">${f === "all" ? "Tous" : label[f]}</button>`).join("")}</div><div id="issues">${issuesView()}</div><p class="method"><b>Méthodologie :</b> ${esc(r.methodology.rule)} Les contrôles visuels sont assistés par des règles mesurées et ne constituent pas une vérité esthétique objective.</p></section>`;
}
function issuesView() {
  let cat = active === "UX" ? "Design / UX" : active;
  let all = [
    ...report.issues,
    ...report.passed.map((x) => ({
      ...x,
      level: "passed",
      explanation: "Contrôle conforme aux règles automatiques appliquées.",
      recommendation: "Aucune correction prioritaire.",
    })),
  ];
  if (active !== "Overview") all = all.filter((x) => x.category === cat);
  if (filter !== "all") all = all.filter((x) => x.level === filter);
  return all.length
    ? all
        .map(
          (x) =>
            `<article class="issue"><i class="stripe ${x.level}"></i><div><h3>${esc(x.title)}</h3><p>${esc(x.explanation)}</p>${x.page ? `<p class="evidence"><b>Preuve :</b> ${esc(x.page)}</p>` : ""}${x.pages?.length ? `<p class="evidence"><b>Pages concernées :</b> ${x.pages.map(esc).join(" · ")}</p>` : ""}${x.level !== "passed" ? `<p><b>Recommandation :</b> ${esc(x.recommendation)}</p><p><b>Difficulté :</b> ${esc(x.difficulty)} · ${x.automatable ? "Correction automatisable" : "Intervention recommandée"}</p>` : ""}</div><span class="badge">${label[x.level]}</span></article>`,
        )
        .join("")
    : '<div class="panel">Aucun contrôle dans cette vue.</div>';
}
function bindReport() {
  const head = document.querySelector(".report-head");
  const redesign = redesignDecision(report);
  if (head && !document.querySelector(".redesign-offer")) {
    head.insertAdjacentHTML(
      "afterend",
      redesign.recommended
        ? `<section class="redesign-offer"><div class="redesign-summary"><span>REFONTE RECOMMANDÉE</span><h2>Découvrez précisément ce qu’il faut modifier.</h2><p>${esc(redesign.message)}</p><a class="pdf-link" href="/api/reports/${esc(report.id)}/redesign.pdf">Télécharger la proposition de refonte (PDF)</a></div><aside class="redesign-contact"><small>NOUS CONTACTER POUR LA REFONTE</small><strong>HI MARKETING</strong><p>A-D PANIKA<br>CEO / Fondateur</p><p>Tél. : +221 76 900 53 96<br>WhatsApp : +221 78 153 32 25<br>Email : himarketing.africa@gmail.com</p></aside></section>`
        : `<section class="redesign-offer no-redesign"><div><span>OPTIMISATIONS CIBLÉES</span><h2>Une refonte complète n’est pas nécessaire.</h2><p>${esc(redesign.message)}</p></div></section>`,
    );
  }
  document.querySelectorAll(".report-actions a").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showLanding();
    });
  });
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        active = b.dataset.tab;
        app.innerHTML = reportView();
        bindReport();
      }),
  );
  document.querySelectorAll("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.filter;
        app.innerHTML = reportView();
        bindReport();
      }),
  );
}
function safeLink(value) {
  try {
    const url = new URL(value || report.url, report.url);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)
      ? url.href
      : report.url;
  } catch {
    return report.url;
  }
}
function conceptView() {
  const c = report.meta?.content || {};
  const services = c.sections?.length
    ? c.sections
    : [
        "Une présence plus claire",
        "Une expérience mobile fluide",
        "Un parcours orienté conversion",
      ];
  const contact = safeLink(c.whatsapp || c.phone || c.email || report.url);
  const priorities = report.issues
    .filter((x) => x.level === "critical" || x.level === "important")
    .slice(0, 4);
  return `<section class="concept-shell"><div class="concept-notice"><span>REFONTE PROPOSÉE · GÉNÉRÉE PAR HI WEBCARE</span><div class="concept-tools"><button data-new-scan>Analyser un autre site</button><button data-back-report>Retour au diagnostic</button></div></div><nav class="concept-nav"><div class="concept-brand">${esc(c.brand || report.meta?.title || new URL(report.url).hostname)}</div><div>${(
    c.navigation || []
  )
    .slice(0, 4)
    .map((x) => `<a href="#services">${esc(x)}</a>`)
    .join(
      "",
    )}<a class="concept-nav-cta" href="${esc(contact)}">Nous contacter</a></div></nav><header class="concept-hero"><div><span class="concept-kicker">Une expérience repensée</span><h1>${esc(c.headline || report.meta?.title || "Votre activité mérite une présence plus forte.")}</h1><p>${esc(c.summary || "Une présentation plus claire, plus rapide et pensée pour transformer chaque visite en opportunité.")}</p><div class="concept-buttons"><a href="${esc(contact)}">Commencer maintenant</a><a class="ghost" href="#services">Découvrir</a></div></div><aside><span>DIAGNOSTIC HI WEBCARE</span><b>${report.scores["Website Health"]}</b><small>Score ayant guidé cette proposition</small></aside></header><section id="services" class="concept-services"><span class="concept-kicker">L’essentiel, immédiatement compréhensible</span><h2>Une structure conçue pour informer, rassurer et convertir.</h2><div>${services
    .slice(0, 6)
    .map(
      (s, i) =>
        `<article><small>0${i + 1}</small><h3>${esc(s)}</h3><p>Une présentation claire, accessible sur mobile et organisée autour des besoins réels du visiteur.</p></article>`,
    )
    .join(
      "",
    )}</div></section><section class="concept-proof"><div><span class="concept-kicker">Ce concept corrige en priorité</span><h2>${report.counts.critical + report.counts.important} points à fort impact détectés.</h2></div><ul>${priorities.map((x) => `<li>${esc(x.title)}</li>`).join("")}</ul></section><section class="concept-final"><span>VOTRE VERSION AMÉLIORÉE</span><h2>Cette refonte vous convient ?</h2><p>Téléchargez maintenant le code de cette version améliorée. Le ZIP contient le site présenté ci-dessus avec ses fichiers HTML et CSS.</p><div class="concept-final-actions"><a href="/api/concepts/${esc(report.id)}/download">Télécharger ce site (.zip)</a><a class="secondary" href="https://hi-marketing-africa.onrender.com">Faire finaliser la refonte</a></div></section><footer class="concept-footer"><b>HI WebCare</b><span>Cette prévisualisation ne modifie pas le site original et ne constitue pas le site officiel de l’entreprise.</span></footer></section>`;
}
function bindConcept() {
  document
    .querySelector("[data-new-scan]")
    ?.addEventListener("click", showLanding);
  document
    .querySelector("[data-back-report]")
    ?.addEventListener("click", () => {
      history.pushState({}, "", `/report/${report.id}`);
      app.innerHTML = reportView();
      bindReport();
    });
}
function showLanding() {
  report = null;
  active = "Overview";
  filter = "all";
  history.pushState({}, "", "/");
  app.innerHTML = landing();
  bindLanding();
  requestAnimationFrame(() => document.querySelector("#scan input")?.focus());
}
async function loadReport(id, push = false) {
  app.innerHTML =
    '<section class="progress"><h2>Chargement du rapport…</h2></section>';
  const response = await fetch("/api/reports/" + id);
  if (!response.ok) {
    app.innerHTML =
      '<section class="progress"><h2>Cette analyse a expiré</h2><p>Les anciennes analyses peuvent disparaître après une mise à jour du service. Relancez le scan pour générer immédiatement une nouvelle refonte.</p><button class="cta" data-new-scan>Lancer une nouvelle analyse</button></section>';
    document
      .querySelector("[data-new-scan]")
      ?.addEventListener("click", showLanding);
    return;
  }
  report = await response.json();
  if (push) history.pushState({}, "", "/report/" + id);
  app.innerHTML = reportView();
  bindReport();
}
async function init() {
  const m = location.pathname.match(/^\/report\/([^/]+)/);
  if (!m) {
    app.innerHTML = landing();
    bindLanding();
    return;
  }
  await loadReport(m[1]);
}
window.addEventListener("popstate", () => init());
init();
