#!/usr/bin/env node
/*
 * CJHQ — static route file generator
 * ----------------------------------
 * GitHub Pages has no server-side rewriting. A request for /resources does not
 * match a file, so it returns HTTP 404, serves 404.html, and JavaScript
 * redirects. Visitors never notice; crawlers do, and generally will not index a
 * URL that answers 404.
 *
 * This writes one static file per route, each a copy of index.html with the
 * <head> metadata for that route baked in. Every route then answers 200 with
 * the correct title, description and canonical even before JavaScript runs.
 *
 * It invents nothing: every title and description is read out of the PAGE_META
 * object already inside index.html. No visible page content is altered - the
 * <body> of each generated file is byte-identical to index.html, and the SPA
 * router still resolves the page from location.pathname exactly as it does now.
 *
 * Run:  node tools/generate-routes.mjs
 *       node tools/generate-routes.mjs --check   (verify only, non-zero on drift)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'index.html');
const ORIGIN = 'https://cjhq.org';

// Routes to generate. 'home' is index.html itself and is deliberately excluded.
// Keep in sync with SITE_PAGES in index.html.
const ROUTES = [
  'resources',
  'stay-informed',
  'contact',
  'about',
  'privacy',
  'terms',
  'accessibility',
  'child-travel-consent',
];

// The admin panel is ~24 KB of markup no visitor can use. It lives in
// tools/admin-panel.html and is injected into admin.html only - keeping it out
// of index.html is what makes this generator idempotent.
const ADMIN_PARTIAL = join(dirname(fileURLToPath(import.meta.url)), 'admin-panel.html');
// The Ask CJHQ engine, same arrangement as the admin panel: it lives outside
// index.html and is injected into admin.html only. ASK_CJHQ_PUBLIC is false and
// the panel markup exists only in admin.html, so no public page could ever run
// it - it was ~191 KB every visitor downloaded and parsed for nothing.
const ASK_ENGINE = join(dirname(fileURLToPath(import.meta.url)), 'ask-engine.js');
const ASK_PLACEHOLDER = '/* Ask CJHQ engine: source lives in tools/ask-engine.js and is injected into';
const ADMIN_PLACEHOLDER =
  '<!-- Admin panel: source lives in tools/admin-panel.html and is injected into admin.html only. -->';

// Reciprocal hreflang, on / and /fr/ only. The other routes have no French URL.
const HREFLANG = [
  '<link rel="alternate" hreflang="en" href="https://cjhq.org/">',
  '<link rel="alternate" hreflang="fr" href="https://cjhq.org/fr/">',
  '<link rel="alternate" hreflang="x-default" href="https://cjhq.org/">',
].join('\n');

// index.html carries hreflang in the source. It is correct there and on /fr/,
// and wrong on every other route - there is no French equivalent of /about to
// point at - so those get it stripped.
function stripHreflang(doc) {
  return doc.replace(/\n<!-- Reciprocal with \/fr\/[\s\S]*?-->/, '')
            .replace(/\n<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, '');
}
function assertHreflang(doc, label) {
  for (const tag of HREFLANG.split('\n')) {
    if (!doc.includes(tag)) throw new Error(`${label}: missing hreflang ${tag}`);
  }
  return doc;
}

const checkOnly = process.argv.includes('--check');

if (!existsSync(SRC)) {
  console.error('index.html not found at', SRC);
  process.exit(1);
}
const html = readFileSync(SRC, 'utf8');

/* ---- read PAGE_META out of index.html (single source of truth) ---- */
function readPageMeta(source) {
  const start = source.indexOf('const PAGE_META = {');
  if (start === -1) throw new Error('PAGE_META not found in index.html');
  const open = source.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('PAGE_META object not terminated');
  // eslint-disable-next-line no-new-func
  return Function('"use strict"; return (' + source.slice(open, end + 1) + ');')();
}

const META = readPageMeta(html);

/* ---- html escaping for attribute/text insertion ---- */
const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ---- replace exactly one occurrence, or fail loudly ---- */
function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected exactly 1 match, found ${matches ? matches.length : 0}`);
  }
  return source.replace(pattern, () => replacement);
}

/* Per-route WebPage node.

   Ten routes previously shipped one identical JSON-LD block, so a consumer had
   no machine-readable way to tell the documents apart. Each route now carries
   its own WebPage, built from the title, description, canonical and card this
   function has already computed - no new source of truth, and nothing that can
   drift from the <head> it sits beside.

   isPartOf and about are @id references, so the WebPage, the WebSite and the
   Organization resolve to one graph across the whole site. */
function webPageNode(url, name, desc, image, lang) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url + '#webpage',
    url,
    name,
    description: desc,
    inLanguage: lang,
    isPartOf: { '@id': 'https://cjhq.org/#website' },
    about:     { '@id': 'https://cjhq.org/#organization' },
    primaryImageOfPage: image
  }, null, 2);
}

function replacePageSchema(out, url, name, desc, image, lang, label) {
  return replaceOnce(out,
    /<script type="application\/ld\+json" id="pageSchema">[\s\S]*?<\/script>/,
    '<script type="application/ld+json" id="pageSchema">\n' +
      webPageNode(url, name, desc, image, lang) + '\n</script>',
    label);
}

function buildRoute(route) {
  const meta = META[route];
  if (!meta) throw new Error(`No PAGE_META entry for route "${route}"`);

  const title = esc(meta.en);
  const desc = esc(meta.desc_en);
  const url = `${ORIGIN}/${route}`;

  let out = html;
  out = replaceOnce(out, /<title id="pageTitle">[\s\S]*?<\/title>/,
    `<title id="pageTitle">${title}</title>`, `${route}: <title>`);
  out = replaceOnce(out, /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${desc}">`, `${route}: description`);
  out = replaceOnce(out, /<link rel="canonical" id="canonicalTag" href="[^"]*">/,
    `<link rel="canonical" id="canonicalTag" href="${url}">`, `${route}: canonical`);
  out = replaceOnce(out, /<meta property="og:url" id="ogUrl" content="[^"]*">/,
    `<meta property="og:url" id="ogUrl" content="${url}">`, `${route}: og:url`);
  out = replaceOnce(out, /<meta property="og:title" id="ogTitle" content="[^"]*">/,
    `<meta property="og:title" id="ogTitle" content="${title}">`, `${route}: og:title`);
  out = replaceOnce(out, /<meta property="og:description" id="ogDescription" content="[^"]*">/,
    `<meta property="og:description" id="ogDescription" content="${desc}">`, `${route}: og:description`);
  out = replaceOnce(out, /<meta name="twitter:title" id="twitterTitle" content="[^"]*">/,
    `<meta name="twitter:title" id="twitterTitle" content="${title}">`, `${route}: twitter:title`);
  out = replaceOnce(out, /<meta name="twitter:description" id="twitterDescription" content="[^"]*">/,
    `<meta name="twitter:description" id="twitterDescription" content="${desc}">`, `${route}: twitter:description`);

  /* Every page used to share og-image.png - the logo and nothing else - so a
     link to /resources and a link to /contact produced an identical card that
     said nothing about the page. Each route now points at its own card, built
     by tools/og-cards.py from the same logo and footer so they stay one family.

     A route with no card falls back to og-image.png rather than pointing at a
     404: a missing card means a plain logo preview, which is what the site had
     before, not a broken one. The check is on the file, so adding a card is
     enough to pick it up and nothing here needs editing. */
  const cardFile = `assets/og-${route}.png`;
  if (existsSync(join(ROOT, cardFile))) {
    const cardUrl = `${ORIGIN}/${cardFile}`;
    const alt = `${title} — CJHQ`;
    out = replaceOnce(out, /<meta property="og:image" id="ogImage" content="[^"]*">/,
      `<meta property="og:image" id="ogImage" content="${cardUrl}">`, `${route}: og:image`);
    out = replaceOnce(out, /<meta property="og:image:alt" id="ogImageAlt" content="[^"]*">/,
      `<meta property="og:image:alt" id="ogImageAlt" content="${esc(alt)}">`, `${route}: og:image:alt`);
    out = replaceOnce(out, /<meta name="twitter:image" id="twitterImage" content="[^"]*">/,
      `<meta name="twitter:image" id="twitterImage" content="${cardUrl}">`, `${route}: twitter:image`);
    out = replaceOnce(out, /<meta name="twitter:image:alt" id="twitterImageAlt" content="[^"]*">/,
      `<meta name="twitter:image:alt" id="twitterImageAlt" content="${esc(alt)}">`, `${route}: twitter:image:alt`);
  } else {
    console.warn(`  note: ${cardFile} not found - ${route} keeps the default og-image.png`);
  }

  const cardAbs = existsSync(join(ROOT, cardFile))
    ? `${ORIGIN}/${cardFile}` : `${ORIGIN}/og-image.png`;
  out = replacePageSchema(out, url, meta.en, meta.desc_en, cardAbs, 'en-CA', `${route}: WebPage schema`);

  // Mark this route's own page as the active one.
  //
  // Every route file previously shipped with <div class="page active"
  // id="page-home">, so a crawler that does not execute CSS/JS read the
  // HOMEPAGE content on /about, /resources and the rest - eight URLs whose
  // pre-render content was identical. Google renders and was unaffected, but
  // non-rendering crawlers (some AI crawlers, social scrapers) were not.
  //
  // The router still calls goPage() on load and re-derives this from the URL,
  // so this only changes what is true before JavaScript runs.
  const pageId = `page-${route}`;
  if (!out.includes(`id="${pageId}"`)) {
    throw new Error(`${route}: no <div class="page" id="${pageId}"> found`);
  }
  out = replaceOnce(out, /<div class="page active" id="page-home"/,
    '<div class="page" id="page-home"', `${route}: deactivate home`);
  out = replaceOnce(out, new RegExp(`<div class="page" id="${pageId}"`),
    `<div class="page active" id="${pageId}"`, `${route}: activate ${pageId}`);

  // Exactly one page may be active, or the pre-JS render shows two at once.
  const activeCount = (out.match(/class="page active"/g) || []).length;
  if (activeCount !== 1) {
    throw new Error(`${route}: expected 1 active page, found ${activeCount}`);
  }

  if (out.includes('id="page-admin"')) {
    throw new Error(`${route}: admin markup leaked into a public route`);
  }
  out = stripHreflang(out);
  if (out.includes('hreflang=')) throw new Error(`${route}: hreflang should not be on this route`);

  // Nothing outside <head> may differ from index.html except that one class.
  const normalise = (s) => s.slice(s.indexOf('</head>'))
    .replace(/<div class="page active" id="page-[a-z0-9-]+"/g, '<div class="page" id="PAGE"')
    .replace(/<div class="page" id="page-[a-z0-9-]+"/g, '<div class="page" id="PAGE"');
  if (normalise(out) !== normalise(html)) {
    throw new Error(`${route}: content outside <head> changed - aborting`);
  }
  return out;
}

/* ---- /admin: the only page that carries the admin panel ---- */
function buildAdmin() {
  let out = html;
  out = replaceOnce(out, /<title id="pageTitle">[\s\S]*?<\/title>/,
    '<title id="pageTitle">Admin — CJHQ</title>', 'admin: title');
  out = replaceOnce(out, /<meta name="robots" content="[^"]*">/,
    '<meta name="robots" content="noindex, nofollow">', 'admin: robots');
  out = replaceOnce(out, /<link rel="canonical" id="canonicalTag" href="[^"]*">/,
    '<link rel="canonical" id="canonicalTag" href="https://cjhq.org/admin">', 'admin: canonical');
  out = replaceOnce(out, /<div class="page active" id="page-home"/,
    '<div class="page" id="page-home"', 'admin: deactivate home');
  if (!existsSync(ADMIN_PARTIAL)) throw new Error('tools/admin-panel.html is missing');
  const panel = readFileSync(ADMIN_PARTIAL, 'utf8')
    .replace('<div class="page" id="page-admin">', '<div class="page active" id="page-admin">');
  if (!out.includes(ADMIN_PLACEHOLDER)) throw new Error('admin: placeholder not found in index.html');
  out = out.replace(ADMIN_PLACEHOLDER, panel);

  // Put the Ask CJHQ engine back, for admin.html only.
  if (!existsSync(ASK_ENGINE)) throw new Error('tools/ask-engine.js is missing');
  const engine = readFileSync(ASK_ENGINE, 'utf8');
  const at = out.indexOf(ASK_PLACEHOLDER);
  if (at < 0) throw new Error('admin: Ask engine placeholder not found in index.html');
  // Replace the whole placeholder comment block, not just its first line.
  const close = out.indexOf('*/', at);
  if (close < 0) throw new Error('admin: Ask engine placeholder comment is unterminated');
  out = out.slice(0, at) + engine + out.slice(close + 2);
  if (!out.includes('SHARED ASK CORE: END')) throw new Error('admin.html lost the Ask engine');
  // admin.html is noindex,nofollow and is not a public document, so it carries
  // no WebPage node. Removing it is cleaner than shipping a page description
  // for a URL no crawler is allowed to index.
  out = replaceOnce(out,
    /<script type="application\/ld\+json" id="pageSchema">[\s\S]*?<\/script>\n?/,
    '', 'admin: drop WebPage schema');
  out = stripHreflang(out);
  if (!out.includes('id="page-admin"')) throw new Error('admin.html lost its panel');
  return out;
}

/* ---- /fr/: one crawlable French homepage. Not a French site. ---- */
function buildFrenchHome() {
  const meta = META.home;
  if (!meta || !meta.fr || !meta.desc_fr) throw new Error('PAGE_META.home lacks fr/desc_fr');
  const title = esc(meta.fr), desc = esc(meta.desc_fr), url = `${ORIGIN}/fr/`;
  let out = html;
  // French before any JavaScript runs, so a crawler sees French.
  out = replaceOnce(out, /<html lang="en">/,
    '<html lang="fr" class="lang-fr" data-force-lang="fr">', 'fr: html lang + force marker');
  out = replaceOnce(out, /<title id="pageTitle">[\s\S]*?<\/title>/,
    `<title id="pageTitle">${title}</title>`, 'fr: title');
  out = replaceOnce(out, /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${desc}">`, 'fr: description');
  out = replaceOnce(out, /<link rel="canonical" id="canonicalTag" href="[^"]*">/,
    `<link rel="canonical" id="canonicalTag" href="${url}">`, 'fr: canonical');
  out = replaceOnce(out, /<meta property="og:url" id="ogUrl" content="[^"]*">/,
    `<meta property="og:url" id="ogUrl" content="${url}">`, 'fr: og:url');

  /* The French homepage used to declare the English Organization node - French
     title, French description, French lang attribute, English structured data.
     Same @id, so this is still one entity; only the label a French consumer
     reads changes. The English name stays in alternateName, which it already
     was, so nothing is lost. */
  // No capture group: replaceOnce counts match array length, and a group would
  // make a single match look like two.
  out = replaceOnce(out,
    /"name": "Jewish Hasidic Council of Quebec",\n      "alternateName"/,
    '"name": "Le Conseil des Juifs Hassidiques du Québec",\n      "alternateName"',
    'fr: Organization name');
  out = replaceOnce(out,
    /"description": "The Jewish Hasidic Council of Quebec \(CJHQ\) is a community organization dedicated to serving, supporting, and representing Quebec's Hasidic Jewish communities\.",/,
    `"description": ${JSON.stringify(meta.desc_fr)},`,
    'fr: Organization description');
  out = replacePageSchema(out, url, meta.fr, meta.desc_fr, `${ORIGIN}/og-image.png`, 'fr-CA', 'fr: WebPage schema');
  out = replaceOnce(out, /<meta property="og:title" id="ogTitle" content="[^"]*">/,
    `<meta property="og:title" id="ogTitle" content="${title}">`, 'fr: og:title');
  out = replaceOnce(out, /<meta property="og:description" id="ogDescription" content="[^"]*">/,
    `<meta property="og:description" id="ogDescription" content="${desc}">`, 'fr: og:description');
  out = replaceOnce(out, /<meta name="twitter:title" id="twitterTitle" content="[^"]*">/,
    `<meta name="twitter:title" id="twitterTitle" content="${title}">`, 'fr: twitter:title');
  out = replaceOnce(out, /<meta name="twitter:description" id="twitterDescription" content="[^"]*">/,
    `<meta name="twitter:description" id="twitterDescription" content="${desc}">`, 'fr: twitter:description');
  out = replaceOnce(out, /<meta property="og:locale" content="[^"]*">/,
    '<meta property="og:locale" content="fr_CA">', 'fr: og:locale');
  out = replaceOnce(out, /<meta property="og:locale:alternate" content="[^"]*">/,
    '<meta property="og:locale:alternate" content="en_CA">', 'fr: og:locale:alternate');
  if (out.includes('id="page-admin"')) throw new Error('fr: admin markup leaked');
  return out;
}

let drift = 0;
for (const route of ROUTES) {
  const target = join(ROOT, `${route}.html`);
  const built = buildRoute(route);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;

  if (checkOnly) {
    if (current !== built) { console.error(`DRIFT: ${route}.html is out of date`); drift++; }
    else console.log(`ok: ${route}.html`);
  } else if (current === built) {
    console.log(`unchanged: ${route}.html`);
  } else {
    writeFileSync(target, built);
    console.log(`written: ${route}.html`);
  }
}

/* ---- index.html (served copy), admin.html, fr/index.html ---- */
// index.html is the source AND the served homepage, so the generator does not
// rewrite it - it only asserts the hreflang block is present.
assertHreflang(html, 'index.html (source)');
const extras = [
  ['admin.html', buildAdmin()],
  [join('fr', 'index.html'), assertHreflang(buildFrenchHome(), 'fr')],
];

// The forced-language marker must exist ONLY on the French page. Test the
// attribute on <html>, not the string anywhere - the language script contains
// getAttribute('data-force-lang') on every page, which is correct and expected.
const hasForceAttr = (doc) => /<html[^>]*\sdata-force-lang="fr"/.test(doc);
for (const [name, doc] of extras) {
  const has = hasForceAttr(doc);
  if (name.startsWith('fr') && !has) throw new Error('fr/index.html lost its force-lang marker');
  if (!name.startsWith('fr') && has) throw new Error(`${name}: force-lang marker leaked`);
}
if (hasForceAttr(html)) throw new Error('index.html source must not carry the force-lang marker');
// Only admin.html may contain the admin panel.
for (const [name, doc] of extras) {
  const has = doc.includes('id="page-admin"');
  if (name === 'admin.html' && !has) throw new Error('admin.html lost its panel');
  if (name !== 'admin.html' && has) throw new Error(`${name}: admin markup leaked`);
}

for (const [name, doc] of extras) {
  const target = join(ROOT, name);
  const dir = dirname(target);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (checkOnly) {
    if (current !== doc) { console.error(`DRIFT: ${name} is out of date`); drift++; }
    else console.log(`ok: ${name}`);
  } else if (current === doc) {
    console.log(`unchanged: ${name}`);
  } else {
    writeFileSync(target, doc);
    console.log(`written: ${name}`);
  }
}

if (checkOnly && drift > 0) {
  console.error(`\n${drift} route file(s) out of date. Run: node tools/generate-routes.mjs`);
  process.exit(1);
}
console.log(`\n${ROUTES.length} routes + ${extras.length} extras processed.`);
