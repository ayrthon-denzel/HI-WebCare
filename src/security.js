import dns from "node:dns/promises";
import net from "node:net";

export function isPrivateIp(ip) {
  if (!net.isIP(ip)) return true;
  if (ip.toLowerCase().startsWith("::ffff:")) return isPrivateIp(ip.slice(7));
  if (ip.includes(":"))
    return (
      ip === "::1" ||
      ip === "::" ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      ip.startsWith("fe8") ||
      ip.startsWith("fe9") ||
      ip.startsWith("fea") ||
      ip.startsWith("feb")
    );
  const p = ip.split(".").map(Number);
  return (
    p[0] === 10 ||
    p[0] === 127 ||
    p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    p[0] >= 224
  );
}

export async function validatePublicUrl(input) {
  let url;
  try {
    url = new URL(input.match(/^https?:\/\//i) ? input : `https://${input}`);
  } catch {
    throw new Error("URL invalide.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Seules les URL publiques HTTP(S) sont acceptées.");
  if (url.port && !["80", "443"].includes(url.port))
    throw new Error("Seuls les ports web standards sont autorisés.");
  if (url.href.length > 2048 || url.hostname.length > 253)
    throw new Error("URL trop longue.");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    throw new Error("Les réseaux locaux ne peuvent pas être analysés.");
  let records;
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new Error("Domaine introuvable.");
  }
  if (!records.length || records.some((r) => isPrivateIp(r.address)))
    throw new Error("Cette adresse réseau n’est pas autorisée.");
  url.hash = "";
  return url;
}

export async function safeFetch(input, options = {}) {
  let current = await validatePublicUrl(input);
  for (let i = 0; i < 5; i++) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Number(process.env.SCAN_TIMEOUT_MS || 25000),
    );
    let response;
    try {
      response = await fetch(current, {
        ...options,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "HI-WebCare/1.0 (+defensive website audit)",
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          ...(options.headers || {}),
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const loc = response.headers.get("location");
      if (!loc) return response;
      current = await validatePublicUrl(new URL(loc, current).href);
      continue;
    }
    return response;
  }
  throw new Error("Trop de redirections.");
}
