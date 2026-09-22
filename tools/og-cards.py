#!/usr/bin/env python3
"""Per-page social cards for CJHQ, v2.

First pass cropped the lockup and footer out of og-image.png and set each
page's name in Lora under it. Two problems showed up in real shares: the
footer strip sat right at the bottom edge, where several platforms crop the
card to a square, and the French line duplicated what the preview already
says next to the card. v2 recomposes every card on the same safe-zone
treatment as og-image-v2.png: white field, the CJHQ lockup centred, the
page's name in English in navy DejaVu Serif Bold, cjhq.org beneath, and
everything a crawler needs inside the central 630px square that every
platform keeps.

Output files carry a -v2 suffix on purpose: platforms and CDNs cache a card
by its URL for weeks, so a recomposed card MUST get a new name or the old
one keeps showing. generate-routes.mjs prefers the -v2 file and falls back
to the v1 name, so adding a card here is enough to pick it up.

Run it only when a page is renamed or added; the output is committed as an
asset. Per-page cards for TEMPORARY pages are a different mechanism - see
tools/generate-notice-pages.py.

    pip install pillow
    python3 tools/og-cards.py
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.dirname(HERE)
LOGO   = os.path.join(ROOT, 'cjhq-logo.png')
OUTDIR = os.path.join(ROOT, 'assets')
FONT   = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'

W, H = 1200, 630
NAVY = (20, 35, 74)   # #14234a, the site's ink
SAFE = 630            # central square every platform keeps, whatever the crop

# slug -> English label. Short names, not the full <title>: a card is read at
# thumbnail size. The file written is og-<slug>-v2.png.
CARDS = {
    'notice':               'COMMUNITY NOTICE',
    'about':                'ABOUT CJHQ',
    'contact':              'CONTACT',
    'stay-informed':        'NEWS & UPDATES',
    'privacy':              'PRIVACY POLICY',
    'terms':                'TERMS OF USE',
    'accessibility':        'ACCESSIBILITY STATEMENT',
    'child-travel-consent': 'CHILD TRAVEL CONSENT LETTER',
}

def wrap(draw, text, maxw, max_lines=3):
    words, lines, cur = text.split(), [], ''
    probe = ImageFont.truetype(FONT, 34)
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=probe) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while ' ' in last and draw.textlength(last + ' \u2026', font=probe) > maxw:
            last = last.rsplit(' ', 1)[0]
        lines[-1] = last + ' \u2026'
    return lines

def fit(draw, text, max_size, max_w, min_size=18):
    s = max_size
    while s > min_size:
        f = ImageFont.truetype(FONT, s)
        if draw.textlength(text, font=f) <= max_w:
            return f
        s -= 2
    return ImageFont.truetype(FONT, min_size)

def build(label, out_path):
    card = Image.new('RGB', (W, H), (255, 255, 255))
    logo = Image.open(LOGO).convert('RGB')
    lw = 470
    lh = round(lw * logo.height / logo.width)
    d = ImageDraw.Draw(card)
    lines = wrap(d, label, SAFE - 40)
    fonts = [fit(d, ln, 34, SAFE - 40) for ln in lines]
    text_h = sum(f.size for f in fonts) + 8 * (len(lines) - 1)
    f_org_h = 30
    total_h = lh + 26 + text_h + 14 + f_org_h
    y = (H - total_h) // 2
    card.paste(logo.resize((lw, lh), Image.LANCZOS), ((W - lw) // 2, y))
    y += lh + 26
    for ln, f in zip(lines, fonts):
        d.text(((W - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=NAVY)
        y += f.size + 8
    y += 6
    f_org = ImageFont.truetype(FONT, f_org_h)
    d.text(((W - d.textlength('cjhq.org', font=f_org)) / 2, y), 'cjhq.org', font=f_org, fill=NAVY)
    card.save(out_path, optimize=True)
    return [f.size for f in fonts]

if __name__ == '__main__':
    if not os.path.exists(LOGO):
        sys.exit('cjhq-logo.png not found - run this from the repository root.')
    os.makedirs(OUTDIR, exist_ok=True)
    for slug, en in CARDS.items():
        out = os.path.join(OUTDIR, f'og-{slug}-v2.png')
        sizes = build(en, out)
        kb = os.path.getsize(out) / 1024
        print(f'  og-{slug}-v2.png  {kb:6.1f} KB   en@{sizes}px   {en}')
    print(f'\n{len(CARDS)} cards written to assets/')
