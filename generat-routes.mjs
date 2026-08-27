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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
];

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

  // Nothing outside <head> may differ from index.html.
  const bodyOf = (s) => s.slice(s.indexOf('</head>'));
  if (bodyOf(out) !== bodyOf(html)) {
    throw new Error(`${route}: content outside <head> changed - aborting`);
  }
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

if (checkOnly && drift > 0) {
  console.error(`\n${drift} route file(s) out of date. Run: node tools/generate-routes.mjs`);
  process.exit(1);
}
console.log(`\n${ROUTES.length} routes processed.`);
