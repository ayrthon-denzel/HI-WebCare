const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

const safeUrl = (value, fallback) => {
  try {
    const url = new URL(value || fallback, fallback);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)
      ? url.href
      : fallback;
  } catch {
    return fallback;
  }
};

export function assessRedesign(report) {
  const health = Number(report.scores?.["Website Health"] ?? 100);
  const ux = Number(report.scores?.["Design / UX"] ?? report.scores?.UX ?? 100);
  const mobile = Number(report.scores?.Mobile ?? 100);
  const critical = Number(report.counts?.critical || 0);
  const important = Number(report.counts?.important || 0);
  const recommended =
    critical > 0 || important >= 3 || health < 70 || ux < 65 || mobile < 65;
  const reasons = [];
  if (critical) reasons.push(`${critical} problème(s) critique(s)`);
  if (important >= 3) reasons.push(`${important} problème(s) important(s)`);
  if (health < 70) reasons.push(`santé globale limitée à ${health}/100`);
  if (ux < 65) reasons.push(`expérience utilisateur à ${ux}/100`);
  if (mobile < 65) reasons.push(`expérience mobile à ${mobile}/100`);
  return {
    recommended,
    reasons,
    message: recommended
      ? `Une refonte est recommandée : ${reasons.slice(0, 3).join(", ")}.`
      : "Le site ne nécessite pas de refonte complète. Des optimisations ciblées suffisent.",
  };
}

export const conceptCss = `
:root{font-family:Arial,sans-serif;color:#102131;background:#f4f1e9}*{box-sizing:border-box}body{margin:0}a{text-decoration:none}.notice{padding:10px 5%;background:#102131;color:#d9bd86;font-size:11px;letter-spacing:1px}.nav{max-width:1160px;margin:auto;padding:28px 24px;display:flex;justify-content:space-between;align-items:center}.brand{font-size:21px;font-weight:800}.nav a{color:#102131;border:1px solid #102131;padding:11px 16px}.hero{max-width:1160px;margin:20px auto 80px;padding:70px 24px;border-top:1px solid #cec7b9;display:grid;grid-template-columns:3fr 1fr;gap:60px;align-items:center}.kicker{color:#8d6b33;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700}h1{font-size:clamp(42px,6vw,76px);line-height:1.03;letter-spacing:-3px;margin:22px 0}.hero p{max-width:680px;color:#59626e;font-size:17px;line-height:1.7}.buttons{display:flex;gap:10px;margin-top:32px}.buttons a,.final a{padding:15px 22px;background:#102131;color:white}.buttons .ghost{background:transparent;color:#102131;border:1px solid #bbb3a4}.score{background:white;border:1px solid #ded8cc;padding:30px}.score span,.score small{display:block;color:#68727c;font-size:11px}.score b{display:block;color:#b68b47;font-size:72px;margin:12px 0}.services{background:white;padding:90px max(24px,calc((100vw - 1112px)/2))}.services h2{font-size:clamp(30px,4vw,48px);max-width:760px}.grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #ddd}.card{padding:28px 25px 28px 0;border-bottom:1px solid #ddd}.card small{color:#b68b47}.card p{color:#68727c;line-height:1.6}.final{text-align:center;background:#102131;color:white;padding:90px 24px}.final p{max-width:650px;margin:0 auto 34px;color:#bac1c8}.footer{padding:28px;text-align:center;color:#68727c;font-size:12px}@media(max-width:760px){.hero{grid-template-columns:1fr;gap:28px;padding-top:35px}.grid{grid-template-columns:1fr}.nav{gap:20px}h1{letter-spacing:-2px}}
`;

export function conceptHtml(report) {
  const content = report.meta?.content || {};
  const brand =
    content.brand || report.meta?.title || new URL(report.url).hostname;
  const headline =
    content.headline ||
    report.meta?.title ||
    "Votre activité mérite une présence plus forte.";
  const summary =
    content.summary ||
    "Une présentation plus claire, plus rapide et pensée pour transformer chaque visite en opportunité.";
  const services = content.sections?.length
    ? content.sections.slice(0, 6)
    : [
        "Une présence plus claire",
        "Une expérience mobile fluide",
        "Un parcours orienté conversion",
      ];
  const contact = safeUrl(
    content.whatsapp || content.phone || content.email || report.url,
    report.url,
  );
  const navigation = (content.navigation || []).slice(0, 4);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(brand)} — Site amélioré</title><meta name="description" content="${escapeHtml(summary)}"><link rel="stylesheet" href="style.css"></head><body><div class="notice">VERSION AMÉLIORÉE · GÉNÉRÉE À PARTIR DU DIAGNOSTIC HI WEBCARE</div><nav class="nav"><div class="brand">${escapeHtml(brand)}</div><div class="navlinks">${navigation.map((item) => `<a class="navitem" href="#services">${escapeHtml(item)}</a>`).join("")}<a href="${escapeHtml(contact)}">Nous contacter</a></div></nav><main><header class="hero"><div><span class="kicker">Une expérience repensée</span><h1>${escapeHtml(headline)}</h1><p>${escapeHtml(summary)}</p><div class="buttons"><a href="${escapeHtml(contact)}">Commencer maintenant</a><a class="ghost" href="#services">Découvrir</a></div></div><aside class="score"><span>DIAGNOSTIC HI WEBCARE</span><b>${Number(report.scores?.["Website Health"]) || 0}</b><small>Score ayant guidé cette proposition</small></aside></header><section class="services" id="services"><span class="kicker">L'essentiel, immédiatement compréhensible</span><h2>Une structure conçue pour informer, rassurer et convertir.</h2><div class="grid">${services.map((service, index) => `<article class="card"><small>0${index + 1}</small><h3>${escapeHtml(service)}</h3><p>Une présentation claire, accessible sur mobile et organisée autour des besoins réels du visiteur.</p></article>`).join("")}</div></section><section class="final"><span class="kicker">Une base prête à personnaliser</span><h2>Une version améliorée, prête à être adaptée.</h2><p>Vérifiez les textes, les couleurs, les images et les fonctionnalités avant la mise en ligne.</p><a href="${escapeHtml(contact)}">Nous contacter</a></section></main><footer class="footer">Cette version ne modifie pas le site original et ne constitue pas le site officiel de l'entreprise.</footer></body></html>`;
}

export function conceptReadme(report) {
  return `HI WebCare — concept de refonte\n\nSource analysée : ${report.url}\nGénéré le : ${new Date().toISOString()}\n\nOuvrez index.html dans un navigateur pour voir le site.\nLe dossier contient un fichier HTML autonome et sa feuille de style.\n\nImportant : ce concept est une proposition non officielle. Vérifiez les textes, coordonnées, droits sur les images et mentions légales avant toute publication.\n`;
}
