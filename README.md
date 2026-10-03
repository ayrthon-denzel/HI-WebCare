# HI WebCare

Centre de diagnostic défensif pour sites web publics, par **HI MARKETING — Digital • Software • Growth**.

## MVP opérationnel

- URL sans compte, validation DNS et protection SSRF
- analyse SEO, structure, sécurité publique, accessibilité et conversion
- contrôle `robots.txt` / `sitemap.xml`
- mesures réelles de réponse et poids HTML
- captures Playwright desktop/mobile et détection de débordement
- scores déterministes documentés et rapport partageable `/report/{id}`
- crawl contrôlé jusqu’à 10 pages, détection inter-pages et preuves par URL
- limites : 5 scans/heure/IP, 2,5 Mo/page crawlée, timeout 25 s

## Installation

```bash
npm install
npx playwright install chromium
npm test
npm start
```

Ouvrir `http://localhost:3000`.

## Architecture

- `src/security.js` : validation URL, DNS, SSRF, fetch à redirections contrôlées
- `src/audit.js` : orchestration et navigateur headless
- `src/analyzers.js` : règles et scoring
- `src/server.js` : API, rate limiting, rapports temporaires
- `public/` : interface responsive sans framework client

## Méthodologie de score

Chaque dimension vérifiée part de 100 : critique −28, important −16, amélioration −7, minimum 0. `Website Health` est la moyenne des dimensions vérifiées. Une dimension non mesurable est affichée **Non vérifié**, jamais inventée.

## Render

Le projet utilise l’image Playwright officielle afin d’inclure Chromium et ses dépendances. Le service écoute `0.0.0.0:$PORT`. `render.yaml` configure le service, son health check et les limites du scanner.

## Limites connues du MVP

Les rapports sont conservés en mémoire pendant 24 h et disparaissent au redémarrage. Le crawl multi-pages, Lighthouse, la persistance PostgreSQL, l’analyse IA visuelle et l’export PDF sont prévus pour les versions suivantes. Aucun site n’est modifié.
