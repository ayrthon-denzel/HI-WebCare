import * as cheerio from 'cheerio';
import { safeFetch } from './security.js';

const DROP_PARAMS = /^(utm_|fbclid$|gclid$|mc_|ref$)/i;
export function normalizeUrl(value, base, origin) {
  try {
    const u = new URL(value, base);
    if (!['http:', 'https:'].includes(u.protocol) || u.origin !== origin) return null;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (DROP_PARAMS.test(key)) u.searchParams.delete(key);
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
    return u.href;
  } catch { return null; }
}

export async function crawlSite(startUrl, maxPages = Number(process.env.MAX_PAGES || 8)) {
  const origin = new URL(startUrl).origin, queue = [startUrl], seen = new Set(), pages = [], discovered = new Set();
  while (queue.length && pages.length < Math.min(maxPages, 12)) {
    const url = queue.shift(); if (seen.has(url)) continue; seen.add(url);
    const began = Date.now();
    try {
      const response = await safeFetch(url);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('text/html')) { pages.push({url,status:response.status,error:!response.ok?`HTTP ${response.status}`:'Contenu non HTML',ms:Date.now()-began}); continue; }
      const raw = Buffer.from(await response.arrayBuffer());
      if (raw.length > 2_500_000) { pages.push({url,status:response.status,error:'HTML supérieur à 2,5 Mo',bytes:raw.length,ms:Date.now()-began}); continue; }
      const html = raw.toString('utf8'), $ = cheerio.load(html), links=[];
      $('a[href]').each((_,el)=>{ const href=normalizeUrl($(el).attr('href'),url,origin); if(href){links.push(href);discovered.add(href);if(!seen.has(href)&&!queue.includes(href)&&queue.length<50)queue.push(href)} });
      const safeHeaderNames=['content-type','content-length','content-encoding','cache-control','content-security-policy','strict-transport-security','x-content-type-options','referrer-policy','permissions-policy','server','x-powered-by'];
      const headers=Object.fromEntries(safeHeaderNames.map(name=>[name,response.headers.get(name)]).filter(([,v])=>v));
      pages.push({url:response.url||url,status:response.status,html,headers,bytes:raw.length,ms:Date.now()-began,links:[...new Set(links)]});
    } catch (e) { pages.push({url,status:null,error:e.name==='AbortError'?'Délai dépassé':e.message,ms:Date.now()-began}); }
  }
  return {origin,pages,discovered:[...discovered],limit:maxPages,truncated:queue.length>0||discovered.size>pages.length};
}
