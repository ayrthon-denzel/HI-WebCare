import PDFDocument from "pdfkit";

const CONTACT = {
  name: "A-D PANIKA",
  role: "CEO / Fondateur — HI MARKETING",
  phone: "+221 76 900 53 96",
  whatsapp: "+221 78 153 32 25",
  email: "himarketing.africa@gmail.com",
};

const COLORS = {
  navy: "#0d1d2c",
  gold: "#b88a43",
  ink: "#172433",
  muted: "#66727e",
  pale: "#f4f1e9",
  line: "#d9dde1",
  white: "#ffffff",
};

function ensureSpace(doc, height = 110) {
  if (doc.y + height > doc.page.height - 70) doc.addPage();
}

function heading(doc, eyebrow, title) {
  ensureSpace(doc, 90);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.gold)
    .text(eyebrow.toUpperCase(), { characterSpacing: 1.4 });
  doc.moveDown(0.5);
  doc.fontSize(22).fillColor(COLORS.navy).text(title);
  doc.moveDown(0.7);
}

function issueBlock(doc, issue, index) {
  ensureSpace(doc, 125);
  const startY = doc.y;
  doc
    .roundedRect(46, startY, 503, 106, 5)
    .fillAndStroke(COLORS.pale, COLORS.line);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.gold)
    .text(String(index + 1).padStart(2, "0"), 62, startY + 15, { width: 28 });
  doc
    .fontSize(12)
    .fillColor(COLORS.ink)
    .text(issue.title || "Modification recommandée", 96, startY + 14, {
      width: 435,
    });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(COLORS.muted)
    .text(
      issue.explanation || "Point identifié pendant le diagnostic.",
      96,
      doc.y + 5,
      {
        width: 435,
        height: 30,
        ellipsis: true,
      },
    );
  doc
    .font("Helvetica-Bold")
    .fillColor(COLORS.ink)
    .text("À modifier : ", 96, startY + 72, { continued: true, width: 435 })
    .font("Helvetica")
    .text(
      issue.recommendation || "Corriger ce point dans la nouvelle version.",
      {
        height: 24,
        ellipsis: true,
      },
    );
  doc.y = startY + 120;
}

export function streamRedesignPdf(report, output) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 52, right: 46, bottom: 58, left: 46 },
    info: {
      Title: `Proposition de refonte — ${report.url}`,
      Author: "HI MARKETING",
      Subject: "Recommandations de refonte issues du diagnostic HI WebCare",
    },
  });
  doc.pipe(output);

  doc.rect(0, 0, doc.page.width, 250).fill(COLORS.navy);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.gold)
    .text("HI WEBCARE · PAR HI MARKETING", 46, 54, { characterSpacing: 1.2 });
  doc
    .fontSize(31)
    .fillColor(COLORS.white)
    .text("Proposition de refonte", 46, 98, { width: 500 });
  doc
    .font("Helvetica")
    .fontSize(13)
    .fillColor("#cbd3da")
    .text(report.url, 46, 148, { width: 500 });
  doc
    .fontSize(10)
    .text(
      `Diagnostic réalisé le ${new Date(report.createdAt).toLocaleDateString("fr-FR")}`,
      46,
      184,
    );

  doc.y = 285;
  heading(
    doc,
    "Conclusion du diagnostic",
    "Pourquoi une refonte est recommandée",
  );
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(COLORS.muted)
    .text(
      report.redesign?.message ||
        "Le diagnostic met en évidence des améliorations structurelles importantes.",
      {
        lineGap: 4,
      },
    );
  doc.moveDown(1.2);

  const stats = [
    [report.scores?.["Website Health"] ?? "—", "Santé globale /100"],
    [report.counts?.critical ?? 0, "Problèmes critiques"],
    [report.counts?.important ?? 0, "Problèmes importants"],
  ];
  const statY = doc.y;
  stats.forEach(([value, label], index) => {
    const x = 46 + index * 171;
    doc.roundedRect(x, statY, 157, 68, 4).fill(COLORS.pale);
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(COLORS.navy)
      .text(String(value), x + 14, statY + 12);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(label, x + 14, statY + 42, { width: 130 });
  });
  doc.y = statY + 100;

  heading(doc, "Plan de modification", "Ce qu’il faut changer sur le site");
  const issues = (report.issues || [])
    .filter((item) =>
      ["critical", "important", "improvement"].includes(item.level),
    )
    .sort(
      (a, b) =>
        ({ critical: 0, important: 1, improvement: 2 })[a.level] -
        { critical: 0, important: 1, improvement: 2 }[b.level],
    )
    .slice(0, 14);
  issues.forEach((issue, index) => issueBlock(doc, issue, index));

  heading(doc, "Méthode recommandée", "Ordre conseillé pour la refonte");
  [
    "Repenser la structure des pages et le parcours du visiteur.",
    "Corriger les problèmes critiques et les blocages techniques détectés.",
    "Moderniser l’interface en conservant l’identité réelle de l’entreprise.",
    "Optimiser la version mobile, l’accessibilité, le SEO et la conversion.",
    "Tester la nouvelle version avant sa mise en ligne.",
  ].forEach((step, index) => {
    ensureSpace(doc, 38);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.gold)
      .text(`${index + 1}.`, { continued: true });
    doc.font("Helvetica").fillColor(COLORS.ink).text(`  ${step}`);
    doc.moveDown(0.55);
  });

  ensureSpace(doc, 215);
  const contactY = doc.y + 12;
  doc.roundedRect(46, contactY, 503, 185, 8).fill(COLORS.navy);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.gold)
    .text("VOUS VOULEZ QUE NOUS RÉALISIONS LA REFONTE ?", 66, contactY + 24);
  doc
    .fontSize(21)
    .fillColor(COLORS.white)
    .text("Contactez HI MARKETING", 66, contactY + 49);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#cbd3da")
    .text(`${CONTACT.name} — ${CONTACT.role}`, 66, contactY + 86)
    .text(`Téléphone : ${CONTACT.phone}`, 66, contactY + 108)
    .text(`WhatsApp : ${CONTACT.whatsapp}`, 66, contactY + 128)
    .text(`Email : ${CONTACT.email}`, 66, contactY + 148);

  doc.end();
}

export { CONTACT };
