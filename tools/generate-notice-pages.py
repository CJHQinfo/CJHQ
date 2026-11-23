#!/usr/bin/env python3
"""Per-page share previews for admin-created temporary pages.

Why this exists
---------------
notice.html gives every temporary page ONE generic preview card, because a
static file cannot vary its tags per ?p= value. This closes that gap: for each
currently-live custom page it writes a real static file at notice/<slug>.html
carrying that page's own og title, description and card image, so the share
link /notice/<slug> previews with the page's actual headline.

Access model: it reads Firestore over the public REST API with the same
publishable web apiKey the site's own JavaScript uses - no credentials, no
admin access. The key is read from the checked-out index.html at runtime
(see load_api_key) so this file stores no key of its own, and requests send
the site origin as Referer to match the key's website restriction. The security rules already decide what is public: a page that is
unpublished, not yet started or expired answers permission-denied, exactly as
it does for an anonymous visitor, and no file is written for it. Files for
pages that have left the live window are deleted on the next run.

Safety: if the index document cannot be read the script exits non-zero WITHOUT
touching the working tree, so a Firestore outage can never wipe the generated
files. Deletions only ever follow a successful index read.

Runs on the GitHub Action in .github/workflows/notice-pages.yml (hourly plus
manual dispatch); can also be run locally with `pip install pillow`.

    python3 tools/generate-notice-pages.py
"""
import datetime, html, json, os, re, shutil, sys, urllib.request
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = 'cjhqinfo'
def load_api_key():
    """The site's publishable Firebase web key.

    Read from the checked-out index.html (its public FIREBASE_CONFIG) so this file
    stores no key of its own. Set FIREBASE_WEB_API_KEY to override when
    running without a full checkout."""
    key = os.environ.get('FIREBASE_WEB_API_KEY')
    if key:
        return key
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    m = re.search(r'apiKey:\s*"([^"]+)"', src)
    if not m:
        sys.exit('firebase apiKey not found in index.html')
    return m.group(1)


API_KEY = load_api_key()
BASE = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents'
ORIGIN = 'https://cjhq.org'
SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-]{0,60}$')


def get(path):
    req = urllib.request.Request(f'{BASE}/{path}?key={API_KEY}',
                                 headers={'User-Agent': 'cjhq-notice-pages/1.0',
                                          'Referer': ORIGIN + '/'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def field(doc, name, default=''):
    v = doc.get('fields', {}).get(name, {})
    return v.get('stringValue', default)


def page_is_live(doc, now=None):
    """Independent lifecycle gate: never bake a page outside Montreal dates."""
    f = doc.get('fields', {})
    if f.get('published', {}).get('booleanValue') is not True:
        return False
    today = (now or datetime.datetime.now(ZoneInfo('America/Toronto'))).date().isoformat()
    start, end = field(doc, 'start_date').strip(), field(doc, 'end_date').strip()
    return (not start or start <= today) and (not end or today <= end)


def strip_html(s):
    s = re.sub(r'<[^>]+>', ' ', s or '')
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def page_desc_en(doc, title):
    """English share description: the homepage blurb, else the start of the
    body (a leading repeat of the title trimmed), else the site default.
    updatePageMeta() in assets/site-core.js recomputes this the same way for
    the live page, so raw HTML and post-load metadata agree."""
    body_txt = strip_html(field(doc, 'body_en'))
    if title and body_txt.lower().startswith(title.lower()):
        body_txt = body_txt[len(title):].lstrip(' .·')
    return (field(doc, 'home_blurb_en') or body_txt[:160]
            or 'Official community information and updates from the Jewish Hasidic Council of Quebec.')


def page_desc_fr(doc):
    fr_body_txt = strip_html(field(doc, 'body_fr'))
    return (field(doc, 'home_blurb_fr') or fr_body_txt[:160]
            or 'Informations et nouvelles officielles du Conseil des Juifs Hassidiques du Québec.')


def bake_body_html(body, fmt):
    """Static copy of what the inline render script puts on screen, so the
    notice is also readable without JavaScript (plain-text extraction, some
    crawlers). HTML bodies are admin-authored - the Firestore rules let only
    staff write them - and the script still re-renders through DOMPurify in
    the browser, so the live page is sanitised exactly as before. Text bodies
    are escaped here the same way the script escapes them."""
    b = str(body or '')
    if fmt != 'text':
        return b
    paras = [x.strip() for x in re.split(r'\n{2,}', b.replace('\r\n', '\n').replace('\r', '\n'))]
    return ''.join('<p>' + html.escape(x).replace('\n', '<br>') + '</p>' for x in paras if x)


def make_card(en_short, fr_short, out_path):
    """Same classic treatment as the static pages' cards: og-cards.py's build()
       (logo lockup + footer strip lifted from og-image.png, Lora labels)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'ogcards', os.path.join(ROOT, 'tools', 'og-cards.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    m.build(en_short, fr_short, out_path)


# The Belgium brit milah notice is a public statement page: the owner asked
# (2026-11-22) for search engines and AI crawlers to be able to see it. Other
# temporary notices stay noindex.
INDEXABLE_SLUGS = {'brit-milah-belgium'}

def robots_meta(slug):
    return 'index, follow' if slug in INDEXABLE_SLUGS else 'noindex, follow'

HTML_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- GENERATED by tools/generate-notice-pages.py - do not edit by hand.
     Per-page share preview for the temporary page "{slug}" (served at both
     /notice/{slug} and the direct address /{slug}). The crawler reads
     the tags below straight out of this static file; a human visitor is
     forwarded to the page itself through the site's own router, which enforces
     the publish window and shows the normal 404 outside it. Deleted
     automatically when the page leaves its live window. -->
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{origin}/{slug}">
<meta name="robots" content="{robots}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="CJHQ">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{origin}/{slug}">
<meta property="og:image" content="{origin}/assets/og-notice-{slug}.png">
<meta property="og:image:secure_url" content="{origin}/assets/og-notice-{slug}.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{title} — CJHQ">
<meta property="og:locale" content="en_CA">
<meta property="og:locale:alternate" content="fr_CA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{origin}/assets/og-notice-{slug}.png">
<meta name="twitter:image:alt" content="{title} — CJHQ">
<link rel="icon" href="/favicon.ico">
<style>
  body{{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
       color:#0E2149;background:#fff;display:flex;min-height:100vh;align-items:center;
       justify-content:center;padding:24px;}}
  .box{{max-width:30rem;text-align:center;}}
  h1{{font-size:1.15rem;font-weight:600;margin:0 0 8px;}}
  a{{color:#0E2149;}}
</style>
<script>
  (function(){{
    var base = '/';
    try{{
      base = location.pathname.replace(/\/(notice\/)?[a-z0-9-]+(\.html|\/index\.html)?\/?$/i, '') + '/';
      location.replace(base + '{target}');
    }}catch(e){{ location.replace(base); }}
  }})();
</script>
</head>
<body>
  <div class="box">
    <h1>{title_h1}</h1>
    <p>Opening the notice… <a href="/">Go to cjhq.org</a> if nothing happens.</p>
  </div>
</body>
</html>
"""


MARKER = 'GENERATED by tools/generate-notice-pages.py'


def _js_json(obj):
    """JSON safe to drop inside an inline <script>."""
    s = json.dumps(obj, ensure_ascii=False)
    return (s.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
             .replace('\u2028', '\\u2028').replace('\u2029', '\\u2029'))


def inline_support_views(src):
    # The two support views kept above are invisible to visitors (display:none
    # until the router needs them), but raw-HTML readers - AI crawlers, link
    # previewers, text extractors - read them as page content: a second and
    # third <h1> ("Trusted Government Resources", "We couldn't find that
    # page") and "No resources match your search" next to the notice. Ship
    # each one as a string inside an inline script that writes it back in the
    # same place while the page is parsed. Anything that runs JavaScript gets
    # the identical DOM, before site-core.js runs; text extractors skip script
    # contents. '<' is escaped so the markup cannot close the script early.
    for view in ('page-resources', 'page-404'):
        main_start = src.find('<main id="mainContent"')
        main_end = src.find('</main>', main_start)
        marks = [(main_start + m.start(), m.group(1)) for m in
                 re.finditer(r'<div class="page[^"]*" id="(page-[a-z0-9-]+)"[^>]*>',
                             src[main_start:main_end])]
        bounds = marks + [(main_end, None)]
        seg = next(((s, e) for (s, name), (e, _) in zip(bounds, bounds[1:]) if name == view), None)
        if seg is None:
            return None
        s, e = seg
        html = src[s:e]
        if '<script' in html:
            return None
        payload = json.dumps(html, ensure_ascii=False).replace('<', '\\u003c')
        src = (src[:s]
               + '<script>document.currentScript.insertAdjacentHTML("beforebegin",'
               + payload + ');document.currentScript.remove();</script>\n'
               + src[e:])
    return src


def bake_page(slug, doc, title, desc, lang='en'):
    """The full site (index.html) with this notice already on screen.

    The visitor gets the page itself at /<slug>/ - no bounce through the
    homepage, no wait on Firestore. The body is still sanitised by DOMPurify in
    the browser exactly like the live render (loaded synchronously on this page
    only), and the site's router still checks Firestore afterwards, so a page
    that has been unpublished or has expired turns into the normal 404 even
    before the next run deletes this file. Returns None if index.html no longer
    matches the expected shape - the caller then falls back to the redirect
    stub, so a site change can never break a notice link."""
    try:
        src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    except OSError:
        return None
    e = lambda v: html.escape(v, quote=True)
    url = f'{ORIGIN}/{slug}' if lang == 'en' else f'{ORIGIN}/fr/{slug}'
    img = f'{ORIGIN}/assets/og-notice-{slug}.png'
    subs = [
        (r'<title id="pageTitle">[^<]*</title>', f'<title id="pageTitle">{e(title)}</title>'),
        (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">'),
        (r'<meta name="robots" content="[^"]*">', f'<meta name="robots" content="{robots_meta(slug)}">'),
        (r'<link rel="canonical" id="canonicalTag" href="[^"]*">', f'<link rel="canonical" id="canonicalTag" href="{url}">'),
        (r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="article">'),
        (r'<meta property="og:title" id="ogTitle" content="[^"]*">', f'<meta property="og:title" id="ogTitle" content="{e(title)}">'),
        (r'<meta property="og:description" id="ogDescription" content="[^"]*">', f'<meta property="og:description" id="ogDescription" content="{e(desc)}">'),
        (r'<meta property="og:url" id="ogUrl" content="[^"]*">', f'<meta property="og:url" id="ogUrl" content="{url}">'),
        (r'<meta property="og:image" id="ogImage" content="[^"]*">', f'<meta property="og:image" id="ogImage" content="{img}">'),
        (r'<meta property="og:image:alt" id="ogImageAlt" content="[^"]*">', f'<meta property="og:image:alt" id="ogImageAlt" content="{e(title)} — CJHQ">'),
        (r'<meta name="twitter:title" id="twitterTitle" content="[^"]*">', f'<meta name="twitter:title" id="twitterTitle" content="{e(title)}">'),
        (r'<meta name="twitter:description" id="twitterDescription" content="[^"]*">', f'<meta name="twitter:description" id="twitterDescription" content="{e(desc)}">'),
        (r'<meta name="twitter:image" id="twitterImage" content="[^"]*">', f'<meta name="twitter:image" id="twitterImage" content="{img}">'),
        # Twitter alt matched the generic CJHQ brand line while og:image:alt
        # carried the notice title; both now name the notice, per the audit.
        (r'<meta name="twitter:image:alt" id="twitterImageAlt" content="[^"]*">', f'<meta name="twitter:image:alt" id="twitterImageAlt" content="{e(title)} — CJHQ">'),
        (r'<script defer src="/assets/purify\.min\.js"></script>', '<script src="/assets/purify.min.js"></script>'),
        (r'<div class="page active" id="page-home">', '<div class="page" id="page-home">'),
        (r'<div class="page" id="page-custom">', '<div class="page active" id="page-custom">'),
    ]
    for pat, rep in subs:
        src, n = re.subn(pat, lambda m, r=rep: r, src, count=1)
        if n != 1:
            return None
    if lang == 'fr':
        src, n = re.subn(r'<html lang="en">',
                         '<html lang="fr" class="lang-fr" data-force-lang="fr">', src, count=1)
        if n != 1:
            return None
        src = src.replace('<meta property="og:locale" content="en_CA">',
                          '<meta property="og:locale" content="fr_CA">', 1)
        src = src.replace('<meta property="og:locale:alternate" content="fr_CA">',
                          '<meta property="og:locale:alternate" content="en_CA">', 1)
    # Per-page WebPage structured data. The raw copy of index.html carries the
    # HOMEPAGE pageSchema (url cjhq.org, English name/description) on every
    # notice page - including inLanguage "en-CA" on the French one - and
    # updatePageMeta() never touches pageSchema, so it stayed wrong after
    # render too. Bake this page's own URL, title, description and language.
    schema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': url + '#webpage',
        'url': url,
        'name': field(doc, 'title_' + lang) or title,
        'description': desc,
        'inLanguage': 'fr-CA' if lang == 'fr' else 'en-CA',
        'isPartOf': {'@id': ORIGIN + '/#website'},
        'about': {'@id': ORIGIN + '/#organization'},
        'primaryImageOfPage': img,
    }
    schema_json = json.dumps(schema, ensure_ascii=False, indent=2)
    schema_json = (schema_json.replace('<', '\\u003c').replace('>', '\\u003e')
                   .replace('&', '\\u0026'))
    schema_block = ('<script type="application/ld+json" id="pageSchema">\n'
                    + schema_json + '\n</script>')
    src, n = re.subn(r'<script type="application/ld\+json" id="pageSchema">.*?</script>',
                     lambda m: schema_block, src, count=1, flags=re.S)
    if n != 1:
        return None

    # Reciprocal hreflang alternates: the English address, its French
    # counterpart at /fr/<slug>, and the English address as the default.
    alt = (f'<link rel="alternate" hreflang="en" href="{ORIGIN}/{slug}">\n'
           f'<link rel="alternate" hreflang="fr" href="{ORIGIN}/fr/{slug}">\n'
           f'<link rel="alternate" hreflang="x-default" href="{ORIGIN}/{slug}">\n')
    src = re.sub(r'(<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?)+', alt, src, count=1)
    data = {'slug': slug, 'title_en': field(doc, 'title_en'), 'title_fr': field(doc, 'title_fr'),
            'body_en': field(doc, 'body_en'), 'body_fr': field(doc, 'body_fr'),
            'body_format': field(doc, 'body_format') or None}
    if slug == 'brit-milah-belgium':
        # Website-only release replacement: never writes the stored record.
        # All three current releases have seven pages, including the final notes.
        replacements = {
            'cjhq-statement-brit-milah-belgium-en.pdf?v=20261122b': 'cjhq-statement-brit-milah-belgium-en-20261122-r3.pdf',
            'cjhq-statement-brit-milah-belgium-fr-20261122.pdf': 'cjhq-statement-brit-milah-belgium-fr-20261122-r3.pdf',
            'cjhq-statement-brit-milah-belgium-nl.pdf?v=20261122b': 'cjhq-statement-brit-milah-belgium-nl-20261122-r3.pdf',
        }
        for key in ('body_en', 'body_fr'):
            for old, new in replacements.items():
                data[key] = data[key].replace(old, new)
        src = src.replace('/assets/site-core.js"', '/assets/site-core.js?v=20261122r5"')
    # Carried into the prerender block so updatePageMeta() can restore the
    # exact baked descriptions at runtime, even before the backend answers.
    data['desc_en'] = page_desc_en(doc, data['title_en'] or 'CJHQ Community Notice')
    data['desc_fr'] = page_desc_fr(doc)
    t_en, t_fr = html.escape(data['title_en']), html.escape(data['title_fr'])
    title_html = f'<span data-en>{t_en}</span><span data-fr>{t_fr}</span>'
    render = ('<script>\n'
              f'window.__CJHQ_PRERENDER = {_js_json(data)};\n'
              '(function(p){\n'
              '  function esc(v){ return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#39;"); }\n'
              '  function body(b){ b = String(b == null ? "" : b);\n'
              '    if(p.body_format !== "text"){ return (window.DOMPurify && DOMPurify.sanitize) ? DOMPurify.sanitize(b, {ADD_ATTR: ["target"]}) : esc(b); }\n'
              '    return b.replace(/\\r\\n?/g, "\\n").split(/\\n{2,}/).map(function(x){ return x.trim(); }).filter(Boolean)\n'
              '      .map(function(x){ return "<p>" + esc(x).replace(/\\n/g, "<br>") + "</p>"; }).join(""); }\n'
              '  document.getElementById("customPageBody").innerHTML =\n'
              '    "<div data-en>" + body(p.body_en) + "</div><div data-fr>" + body(p.body_fr || p.body_en) + "</div>";\n'
              '})(window.__CJHQ_PRERENDER);\n'
              '</script>')
    pat = re.compile(r'(<h1 id="customPageTitle"[^>]*>)(</h1>\s*<div id="customPageBody"[^>]*>)(</div>)')
    m = pat.search(src)
    if not m:
        return None
    # The approved body is baked into the container itself (same text, no new
    # words); the script below re-renders it sanitised when JavaScript runs.
    body_html = ('<div data-en>' + bake_body_html(data['body_en'], data['body_format']) + '</div>'
                 '<div data-fr>' + bake_body_html(data['body_fr'] or data['body_en'], data['body_format']) + '</div>')
    src = src[:m.start()] + m.group(1) + title_html + m.group(2) + body_html + m.group(3) + '\n' + render + src[m.end():]
    # A baked notice used to ship the ENTIRE site: every hidden route view
    # (home, about, privacy, terms, 404, the consent-letter form, ...), both
    # languages, 12 h1s in one DOM. Rendering crawlers apply the CSS and see
    # only the notice, but raw-HTML readers (AI crawlers, text extractors)
    # got the whole site with the notice buried in it. Keep only what this
    # page's own function needs:
    #   page-custom    - the notice itself (baked active)
    #   page-resources - header site search opens its results in this view
    #   page-404       - the router's target if the page expires or is unpublished
    # The views are flat siblings inside <main>, so each removal runs from one
    # view's opening tag to the next one's.
    KEEP_VIEWS = {'page-custom', 'page-resources', 'page-404'}
    main_start = src.find('<main id="mainContent"')
    main_end = src.find('</main>', main_start)
    if main_start == -1 or main_end == -1:
        return None
    marks = [(main_start + m.start(), m.group(1)) for m in
             re.finditer(r'<div class="page[^"]*" id="(page-[a-z0-9-]+)"[^>]*>',
                         src[main_start:main_end])]
    bounds = marks + [(main_end, None)]
    cuts = [(s, e) for (s, name), (e, _) in zip(bounds, bounds[1:]) if name not in KEEP_VIEWS]
    for s, e in reversed(cuts):
        src = src[:s] + src[e:]

    src = inline_support_views(src)
    if src is None:
        return None

    # With the SPA views gone, in-place routing has nowhere to swap to: the
    # static links must be plain hyperlinks again. Dropping data-page makes
    # the delegated click handler ignore them (their hrefs are already real
    # addresses), and on the French page each points at the French route so a
    # French visitor stays in French. Runtime-rendered links (search results,
    # nav additions) keep their own data-page and still route in place.
    if lang == 'fr':
        fr_routes = {'home': '/fr/', 'resources': '/fr/ressources',
                     'stay-informed': '/fr/actualites', 'about': '/fr/a-propos',
                     'contact': '/fr/contact', 'privacy': '/fr/politique-de-confidentialite',
                     'terms': '/fr/conditions-utilisation', 'accessibility': '/fr/accessibilite',
                     'child-travel-consent': '/fr/consentement-voyage-enfant'}
        src = re.sub(r'href="([^"]*)" data-page="([a-z0-9-]+)"',
                     lambda m: 'href="%s" data-page="%s"' % (fr_routes.get(m.group(2), m.group(1)), m.group(2)),
                     src)
    src = re.sub(r'\sdata-page="[^"]*"', '', src)

    note = (f'<!-- {MARKER} - do not edit by hand. Baked copy of index.html with the '
            f'temporary page "{slug}" already rendered; rewritten every run, deleted '
            'when the page leaves its live window. -->\n')
    return src.replace('<head>', '<head>\n' + note, 1)


def main():
    try:
        idx = get('page_settings/public_pages')
    except Exception as e:
        sys.exit(f'public_pages index unreadable ({e}) - leaving the tree untouched.')
    raw = idx.get('fields', {}).get('slugs', {}).get('arrayValue', {}).get('values', [])
    slugs = []
    for v in raw:
        s = v.get('stringValue', '').strip().lower()
        if SLUG_RE.match(s) and s not in slugs:
            slugs.append(s)

    notice_dir = os.path.join(ROOT, 'notice')
    os.makedirs(notice_dir, exist_ok=True)
    live, skipped, collisions = [], [], []
    for slug in slugs:
        try:
            doc = get(f'custom_pages/{slug}')
        except Exception:
            skipped.append(slug)  # outside its window or unpublished: rules deny, so no file
            continue
        if not page_is_live(doc):
            skipped.append(slug)
            continue
        title = field(doc, 'title_en') or 'CJHQ Community Notice'
        desc = page_desc_en(doc, title)
        short = title.split('·')[0].strip() or 'CJHQ Community Notice'
        page_html = HTML_TMPL.format(slug=slug, origin=ORIGIN, target=slug + '/',
                                     robots=robots_meta(slug),
                                     title=html.escape(title, quote=True),
                                     title_h1=html.escape(title),
                                     desc=html.escape(desc, quote=True))
        # notice/<slug>.html stays a light preview-card stub that forwards to
        # the baked page; the direct address gets the full baked page.
        with open(os.path.join(notice_dir, f'{slug}.html'), 'w', encoding='utf-8') as f:
            f.write(page_html)
        # Fallback if index.html changed shape: the old stub that bridges into
        # the SPA (never the /<slug>/ target, which would loop onto itself).
        baked = bake_page(slug, doc, title, desc) or HTML_TMPL.format(
            slug=slug, origin=ORIGIN, target='?/' + slug,
            robots=robots_meta(slug),
            title=html.escape(title, quote=True), title_h1=html.escape(title),
            desc=html.escape(desc, quote=True))
        # The direct address /<slug> is the link people actually type and
        # share; give it the same preview file. Guard against colliding with
        # a real site route (about.html, fr/, ...) or a hand-made directory:
        # only a directory whose index.html carries our marker is ours.
        direct_dir = os.path.join(ROOT, slug)
        marker = MARKER
        direct_index = os.path.join(direct_dir, 'index.html')
        direct_html = os.path.join(ROOT, f'{slug}.html')
        if (os.path.exists(direct_html)
               and marker not in open(direct_html, encoding='utf-8', errors='ignore').read(4096)) \
           or (os.path.isdir(direct_dir) \
               and not (os.path.isfile(direct_index) and marker in open(direct_index, encoding='utf-8', errors='ignore').read(4096))):
            collisions.append(slug)
        else:
            os.makedirs(direct_dir, exist_ok=True)
            with open(direct_index, 'w', encoding='utf-8') as f:
                f.write(baked)
            # /<slug>.html lets GitHub Pages answer /<slug> directly, without
            # the 301 to /<slug>/ that a directory alone gets.
            with open(direct_html, 'w', encoding='utf-8') as f:
                f.write(baked)
            # French address /fr/<slug>: same baked page with French meta and
            # data-force-lang="fr", so the link opens directly in French.
            title_fr = field(doc, 'title_fr') or title
            desc_fr = page_desc_fr(doc)
            fr_baked = bake_page(slug, doc, title_fr, desc_fr, lang='fr')
            fr_dir = os.path.join(ROOT, 'fr', slug)
            fr_index = os.path.join(fr_dir, 'index.html')
            fr_html = os.path.join(ROOT, 'fr', f'{slug}.html')
            if not fr_baked:
                collisions.append(slug + '(fr)')
            elif (os.path.exists(fr_html)
                    and MARKER not in open(fr_html, encoding='utf-8', errors='ignore').read(4096)) \
                 or (os.path.isdir(fr_dir)
                    and not (os.path.isfile(fr_index) and MARKER in open(fr_index, encoding='utf-8', errors='ignore').read(4096))):
                collisions.append(slug + '(fr)')
            else:
                os.makedirs(fr_dir, exist_ok=True)
                with open(fr_index, 'w', encoding='utf-8') as f:
                    f.write(fr_baked)
                with open(fr_html, 'w', encoding='utf-8') as f:
                    f.write(fr_baked)
        fr_short = (field(doc, 'title_fr').split('\u00b7')[0].strip()
                    or 'AVIS COMMUNAUTAIRE').upper()
        if fr_short == short.upper():
            fr_short = ''  # identical EN/FR titles: one line is enough
        make_card(short.upper(), fr_short,
                  os.path.join(ROOT, 'assets', f'og-notice-{slug}.png'))
        live.append(slug)

    # Remove generated files for pages that left the live window.
    removed = []
    for name in os.listdir(notice_dir):
        m = re.fullmatch(r'([a-z0-9][a-z0-9-]{0,60})\.html', name)
        if m and m.group(1) not in live:
            os.remove(os.path.join(notice_dir, name)); removed.append(name)
    marker = 'GENERATED by tools/generate-notice-pages.py'
    for name in os.listdir(ROOT):
        d = os.path.join(ROOT, name)
        idx = os.path.join(d, 'index.html')
        if (os.path.isdir(d) and re.fullmatch(r'[a-z0-9][a-z0-9-]{0,60}', name)
                and name not in live and os.path.isfile(idx)
                and marker in open(idx, encoding='utf-8', errors='ignore').read(4096)):
            shutil.rmtree(d); removed.append(name + '/')
    for name in os.listdir(ROOT):
        m = re.fullmatch(r'([a-z0-9][a-z0-9-]{0,60})\.html', name)
        p = os.path.join(ROOT, name)
        if (m and m.group(1) not in live and os.path.isfile(p)
                and marker in open(p, encoding='utf-8', errors='ignore').read(4096)):
            os.remove(p); removed.append(name)
    fr_root = os.path.join(ROOT, 'fr')
    if os.path.isdir(fr_root):
        for name in os.listdir(fr_root):
            d = os.path.join(fr_root, name)
            idxp = os.path.join(d, 'index.html')
            if (os.path.isdir(d) and re.fullmatch(r'[a-z0-9][a-z0-9-]{0,60}', name)
                    and name not in live and os.path.isfile(idxp)
                    and marker in open(idxp, encoding='utf-8', errors='ignore').read(4096)):
                shutil.rmtree(d); removed.append('fr/' + name + '/')
        for name in os.listdir(fr_root):
            m = re.fullmatch(r'([a-z0-9][a-z0-9-]{0,60})\.html', name)
            p = os.path.join(fr_root, name)
            if (m and m.group(1) not in live and os.path.isfile(p)
                    and marker in open(p, encoding='utf-8', errors='ignore').read(4096)):
                os.remove(p); removed.append('fr/' + name)
    assets = os.path.join(ROOT, 'assets')
    for name in os.listdir(assets):
        m = re.fullmatch(r'og-notice-([a-z0-9][a-z0-9-]{0,60})\.png', name)
        if m and m.group(1) not in live and m.group(1) not in ('v1', 'v2'):
            os.remove(os.path.join(assets, name)); removed.append(name)

    print(f'live: {live or "none"}  skipped(not public): {skipped or "none"}  removed: {removed or "none"}  collisions: {collisions or "none"}')


if __name__ == '__main__':
    main()
