import express from "express";
import archiver from "archiver";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditSite } from "./audit.js";
import { conceptCss, conceptHtml, conceptReadme } from "./concept-export.js";

const app = express(),
  dir = path.dirname(fileURLToPath(import.meta.url));
const reports = new Map(),
  jobs = new Map(),
  limits = new Map(),
  activeByIp = new Map();
const MAX_CONCURRENT_SCANS = 2;
let activeScans = 0;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }),
);
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    req.path.startsWith("/api/") ? "no-store" : "public, max-age=300",
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  if (["TRACE", "TRACK", "CONNECT"].includes(req.method))
    return res.sendStatus(405);
  if (req.path.startsWith("/api/") && req.method !== "GET") {
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`)
      return res.status(403).json({ error: "Origine non autorisée." });
  }
  next();
});
app.use(
  express.json({ limit: "12kb", strict: true, type: "application/json" }),
);
app.use(
  express.static(path.join(dir, "../public"), {
    dotfiles: "deny",
    fallthrough: true,
    index: false,
    maxAge: "5m",
  }),
);

app.get("/api/health", (_, res) =>
  res.json({ ok: true, service: "HI WebCare" }),
);
app.post("/api/scans", (req, res) => {
  const ip = req.ip,
    now = Date.now(),
    recent = (limits.get(ip) || []).filter((t) => now - t < 3600000);
  if (recent.length >= 5)
    return res
      .status(429)
      .json({ error: "Limite de 5 scans par heure atteinte." });
  if (activeScans >= MAX_CONCURRENT_SCANS)
    return res.status(503).json({
      error:
        "Le scanner traite déjà plusieurs analyses. Réessayez dans un instant.",
    });
  if (activeByIp.has(ip))
    return res
      .status(429)
      .json({ error: "Une analyse est déjà en cours depuis cette connexion." });
  const raw = req.body?.url;
  if (typeof raw !== "string" || raw.length < 4 || raw.length > 2048)
    return res.status(400).json({ error: "URL invalide." });
  limits.set(ip, [...recent, now]);
  activeByIp.set(ip, true);
  activeScans++;
  const id = crypto.randomUUID();
  jobs.set(id, {
    id,
    status: "running",
    progress: 2,
    message: "Préparation du diagnostic",
  });
  res.status(202).json({ id });
  auditSite(raw, (progress, message) =>
    jobs.set(id, { id, status: "running", progress, message }),
  )
    .then((report) => {
      report.id = id;
      reports.set(id, report);
      jobs.set(id, {
        id,
        status: "complete",
        progress: 100,
        message: "Rapport prêt",
      });
    })
    .catch((e) =>
      jobs.set(id, {
        id,
        status: "failed",
        progress: 100,
        message:
          e.name === "AbortError"
            ? "Le site a dépassé le délai autorisé."
            : String(e.message || "Analyse impossible.").slice(0, 240),
      }),
    )
    .finally(() => {
      activeScans = Math.max(0, activeScans - 1);
      activeByIp.delete(ip);
    });
});
const validId = (req, res, next) =>
  /^[0-9a-f-]{36}$/i.test(req.params.id)
    ? next()
    : res.status(404).json({ error: "Ressource introuvable." });
app.get("/api/scans/:id", validId, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job)
    return res.status(404).json({ error: "Scan introuvable ou expiré." });
  res.json(job);
});
app.get("/api/reports/:id", validId, (req, res) => {
  const report = reports.get(req.params.id);
  if (!report)
    return res.status(404).json({ error: "Rapport introuvable ou expiré." });
  res.json(report);
});
app.get("/api/concepts/:id/download", validId, (req, res, next) => {
  const report = reports.get(req.params.id);
  if (!report)
    return res.status(404).json({ error: "Concept introuvable ou expiré." });
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", next);
  res.attachment(`hi-webcare-refonte-${req.params.id.slice(0, 8)}.zip`);
  res.type("application/zip");
  archive.pipe(res);
  archive.append(conceptHtml(report), { name: "index.html" });
  archive.append(conceptCss, { name: "style.css" });
  archive.append(conceptReadme(report), { name: "README.txt" });
  archive.finalize();
});
app.get("/report/:id", validId, (_, res) =>
  res.sendFile(path.join(dir, "../public/index.html")),
);
app.get("/concept/:id", validId, (_, res) =>
  res.sendFile(path.join(dir, "../public/index.html")),
);
app.get("/", (_, res) => res.sendFile(path.join(dir, "../public/index.html")));
app.use("/api/", (_, res) =>
  res.status(404).json({ error: "Route API inexistante." }),
);
app.use((req, res) =>
  req.method === "GET"
    ? res.status(404).sendFile(path.join(dir, "../public/index.html"))
    : res.sendStatus(405),
);
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res
    .status(err.type === "entity.too.large" ? 413 : 400)
    .json({ error: "Requête invalide." });
});
setInterval(() => {
  const ttl = 86400000;
  for (const [id, r] of reports)
    if (Date.now() - new Date(r.createdAt) > ttl) {
      reports.delete(id);
      jobs.delete(id);
    }
  for (const [ip, times] of limits) {
    const fresh = times.filter((t) => Date.now() - t < 3600000);
    fresh.length ? limits.set(ip, fresh) : limits.delete(ip);
  }
}, 3600000).unref();
app.listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log(`HI WebCare on ${process.env.PORT || 3000}`),
);
