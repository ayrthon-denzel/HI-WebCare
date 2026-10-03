import * as cheerio from 'cheerio';

const issue = (category, level, title, explanation, recommendation, difficulty='Facile', automatable=false) => ({ category, level, title, explanation, impact: explanation, recommendation, difficulty, automatable });

export function analyzeHtml(html, url, headers, status, perf) {
  const $ = cheerio.load(html); const issues=[]; const passed=[];
  const title=$('title').first().text().trim(), desc=$('meta[name="description"]').attr('content')?.trim(), h1=$('h1'), viewport=$('meta[name="viewport"]').attr('content');
  const add=(ok, cat, level, t, exp, rec, diff, auto)=>ok?passed.push({category:cat,title:t}):issues.push(issue(cat,level,t,exp,rec,diff,auto));
  add(!!title,'SEO','critical','Balise title présente','Le titre aide les moteurs et les visiteurs à comprendre la page.','Ajouter un title unique de 30 à 60 caractères.','Facile',true);
  if(title && (title.length<20||title.length>65)) issues.push(issue('SEO','improvement','Longueur du title','Le title mesure '+title.length+' caractères.','Viser environ 30 à 60 caractères.','Facile',true));
  add(!!desc,'SEO','important','Meta description présente','La description influence la compréhension du résultat de recherche.','Rédiger une description claire de 120 à 160 caractères.','Facile',true);
  add(h1.length===1,'SEO',h1.length?'improvement':'important','Un H1 principal','La page contient '+h1.length+' H1.','Conserver un seul H1 descriptif.','Facile',true);
  add(!!$('link[rel="canonical"]').attr('href'),'SEO','improvement','URL canonique','Aucune URL canonique explicite n’a été détectée.','Ajouter une balise canonical absolue.','Facile',true);
  add(!!$('meta[property="og:title"]').attr('content')&&!!$('meta[property="og:description"]').attr('content'),'SEO','improvement','Métadonnées sociales complètes','Open Graph title/description incomplets ou absents.','Ajouter les métadonnées Open Graph essentielles.','Facile',true);
  const robots=($('meta[name="robots"]').attr('content')||'').toLowerCase();
  if(/noindex/.test(robots)) issues.push(issue('SEO','important','Page déclarée noindex','La directive noindex demande aux moteurs de ne pas indexer cette page.','Confirmer que ce blocage est volontaire, sinon retirer noindex.','Facile',true));
  const structured=$('script[type="application/ld+json"]'); let invalidStructured=0; structured.each((_,e)=>{try{JSON.parse($(e).html())}catch{invalidStructured++}});
  if(!structured.length) issues.push(issue('SEO','improvement','Données structurées absentes','Aucun JSON-LD n’a été détecté.','Ajouter uniquement les données Schema.org réellement applicables.','Moyenne',false));
  if(invalidStructured) issues.push(issue('SEO','important','Données structurées invalides',`${invalidStructured} bloc(s) JSON-LD ne sont pas valides.`,'Corriger la syntaxe JSON-LD et valider le balisage.','Moyenne',true));
  const imgs=$('img').length, noAlt=$('img').filter((_,e)=>!$(e).attr('alt')).length;
  add(noAlt===0,'Accessibility',noAlt>3?'important':'improvement','Textes alternatifs des images',`${noAlt} image(s) sur ${imgs} sans attribut alt.`,'Ajouter un alt utile, ou alt="" aux images décoratives.','Facile',true);
  add(!!$('html').attr('lang'),'Accessibility','important','Langue du document','L’attribut lang aide les technologies d’assistance.','Définir lang sur la balise html.','Facile',true);
  const unnamed=$('button, a').filter((_,e)=>!$(e).text().trim()&&!$(e).attr('aria-label')&&!$(e).find('img[alt]').length).length;
  add(unnamed===0,'Accessibility','important','Liens et boutons nommés',`${unnamed} contrôle(s) sans intitulé accessible détecté(s).`,'Ajouter un texte ou aria-label explicite.','Facile',true);
  const unlabeled=$('input:not([type="hidden"]),select,textarea').filter((_,e)=>{const id=$(e).attr('id');return !$(e).attr('aria-label')&&!$(e).attr('aria-labelledby')&&!(id&&$(`label[for="${id}"]`).length)}).length;
  add(unlabeled===0,'Accessibility','important','Champs de formulaire étiquetés',`${unlabeled} champ(s) sans label accessible détecté(s).`,'Associer chaque champ à un label ou aria-label explicite.','Facile',true);
  add(!!viewport,'Mobile','critical','Viewport mobile','Sans viewport, la page risque de mal s’adapter aux téléphones.','Ajouter meta viewport width=device-width, initial-scale=1.','Facile',true);
  const csp=headers['content-security-policy'], hsts=headers['strict-transport-security'];
  add(url.startsWith('https://'),'Security','critical','HTTPS actif','La connexion doit protéger les échanges.','Activer HTTPS et rediriger HTTP vers HTTPS.','Moyenne',false);
  add(!!csp,'Security','important','Content-Security-Policy','CSP réduit l’impact de certaines injections côté navigateur.','Définir une politique CSP adaptée après test.','Moyenne',false);
  add(!!hsts,'Security','improvement','HSTS','HSTS force les navigateurs à utiliser HTTPS.','Ajouter Strict-Transport-Security sur HTTPS.','Facile',true);
  add(!!headers['x-content-type-options'],'Security','improvement','Protection MIME','Le header X-Content-Type-Options limite le MIME sniffing.','Ajouter X-Content-Type-Options: nosniff.','Facile',true);
  const mixed=$('[src^="http://"],[href^="http://"]').length; add(mixed===0,'Security','important','Aucun contenu mixte',`${mixed} ressource(s) HTTP détectée(s) dans la page HTTPS.`,'Servir toutes les ressources en HTTPS.','Moyenne',true);
  const insecureForms=$('form').filter((_,e)=>{const a=$(e).attr('action');return a&&/^http:\/\//i.test(a)}).length;
  add(insecureForms===0,'Security','critical','Formulaires transmis en HTTPS',`${insecureForms} formulaire(s) envoient potentiellement des données vers HTTP.`,'Passer les actions de formulaire en HTTPS.','Moyenne',false);
  const scripts=$('script[src]').length, css=$('link[rel="stylesheet"]').length;
  if(perf.bytes>2_000_000) issues.push(issue('Performance','important','Page HTML lourde',`Le document transféré pèse ${(perf.bytes/1e6).toFixed(2)} Mo.`,'Réduire, compresser et différer les ressources non essentielles.','Moyenne',false)); else passed.push({category:'Performance',title:'Poids HTML raisonnable'});
  if(perf.ms>3000) issues.push(issue('Performance','important','Réponse lente',`La réponse initiale a pris ${(perf.ms/1000).toFixed(1)} s.`,'Optimiser serveur, cache et dépendances.','Difficile',false)); else passed.push({category:'Performance',title:'Temps de réponse initial correct'});
  const text=$('body').text().replace(/\s+/g,' ').trim(), words=text?text.split(' ').length:0;
  if(words<200) issues.push(issue('SEO','improvement','Contenu textuel limité',`Environ ${words} mots détectés sur la page.`,'Ajouter du contenu utile répondant aux besoins des visiteurs.','Moyenne',false));
  const phones=$('a[href^="tel:"]').length, emails=$('a[href^="mailto:"]').length, whatsapp=$('a[href*="wa.me"],a[href*="whatsapp"]').length, forms=$('form').length;
  const cta=$('a,button').filter((_,e)=>/contact|devis|acheter|commander|réserver|essai|commencer|inscri|appel/i.test($(e).text())).length;
  add(cta>0,'Conversion','important','CTA identifiable','Aucune action principale explicite n’a été identifiée dans le texte des boutons/liens.','Afficher un CTA principal clair dans la zone visible.','Facile',false);
  add(phones+emails+whatsapp+forms>0,'Conversion','important','Moyen de contact détecté','Aucun téléphone, email, WhatsApp ou formulaire n’a été détecté.','Rendre un moyen de contact immédiatement accessible.','Facile',false);
  const canonical=$('link[rel="canonical"]').attr('href')||null;
  return { meta:{title,description:desc||null,canonical,robots,h1Count:h1.length,h2Count:$('h2').length,h3Count:$('h3').length,images:imgs,imagesWithoutAlt:noAlt,links:$('a[href]').length,words,scripts,stylesheets:css,structuredData:structured.length,status}, business:{cta,phones,emails,whatsapp,forms}, issues,passed };
}

export function analyzeSiteWide(pageResults, crawl) {
  const issues=[], passed=[]; const ok=pageResults.filter(p=>!p.error);
  const attach=(item,page)=>({...item,page:page.url});
  for(const p of ok){issues.push(...p.analysis.issues.map(i=>attach(i,p)));passed.push(...p.analysis.passed.map(i=>attach(i,p)))}
  for(const p of pageResults.filter(p=>p.error)) issues.push(issue('Technical',p.status===404?'important':'critical','Page interne inaccessible',`${p.url} — ${p.error}`,'Corriger, restaurer ou rediriger cette URL.','Moyenne',false));
  const duplicate=(field,label)=>{const groups=new Map();for(const p of ok){const v=p.analysis.meta[field]?.trim().toLowerCase();if(v)groups.set(v,[...(groups.get(v)||[]),p.url])}for(const urls of groups.values())if(urls.length>1)issues.push({...issue('SEO','important',`${label} dupliqué`,`${urls.length} pages utilisent le même ${label.toLowerCase()}.`,'Rédiger une valeur unique adaptée à chaque page.','Moyenne',true),pages:urls})};
  duplicate('title','Title'); duplicate('description','Meta description');
  const crawled=new Set(pageResults.map(p=>p.url)); const broken=crawl.discovered.filter(u=>{const p=pageResults.find(x=>x.url===u);return p&&p.error});
  if(broken.length) issues.push({...issue('Technical','important','Liens internes cassés',`${broken.length} lien(s) interne(s) exploré(s) pointent vers une page inaccessible.`,'Corriger ou rediriger les liens cassés.','Moyenne',true),pages:broken.slice(0,10)}); else passed.push({category:'Technical',title:'Aucun lien interne cassé parmi les pages explorées'});
  const canonicals=ok.filter(p=>p.analysis.meta.canonical&&normalizeCanonical(p.analysis.meta.canonical,p.url)!==normalizeCanonical(p.url,p.url));
  if(canonicals.length) issues.push({...issue('SEO','important','Canoniques incohérentes',`${canonicals.length} page(s) déclarent une URL canonique différente.`,'Vérifier que chaque canonical correspond bien à la version indexable souhaitée.','Moyenne',false),pages:canonicals.map(p=>p.url)});
  return {issues,passed};
}
function normalizeCanonical(v,base){try{const u=new URL(v,base);u.hash='';return u.href.replace(/\/$/,'')}catch{return v}}

export function computeScores(issues, checks) {
  const cats=['SEO','Performance','Security','Mobile','Design / UX','Accessibility','Conversion','Technical'];
  const penalty={critical:28,important:16,improvement:7}; const scores={};
  for(const cat of cats){ const relevant=issues.filter(i=>i.category===cat); const grouped=new Map(); for(const [index,i] of relevant.entries()){const key=i.title||`unnamed-${index}`;grouped.set(key,Math.max(grouped.get(key)||0,penalty[i.level]||0))} scores[cat]=checks[cat]===false?null:Math.max(0,100-[...grouped.values()].reduce((a,b)=>a+b,0)); }
  const vals=Object.values(scores).filter(Number.isFinite); scores['Website Health']=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length); return scores;
}
