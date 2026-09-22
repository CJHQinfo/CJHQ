#!/usr/bin/env python3
"""Per-page social cards for CJHQ - the classic treatment.

Design: the one Mendel approved - logo lockup and footer strip lifted pixel for
pixel from og-image.png, a short rule, then the page's name in English and
French, letterspaced, set in Lora (the site's display face). Restored after the
plainer interim redesign; the only deliberate change from the original layout is
MAX_LINE = 600, so even the longest label stays inside the 630px central safe
zone that square-crop link previews (iMessage, some WhatsApp surfaces) show.

Also importable: generate-notice-pages.py calls build() for temporary pages'
og-notice-<slug>.png cards. Output keeps the -v2 cache-busting filenames the
site's og tags already reference.

    pip install pillow
    python3 tools/og-cards.py
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

HERE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.dirname(HERE)
SRC    = os.path.join(ROOT, 'og-image.png')
OUTDIR = os.path.join(ROOT, 'assets')
LORA   = next((p for p in (os.path.join(HERE, 'fonts', 'Lora-Variable.ttf'),
                           '/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf')
              if os.path.exists(p)), None)

W, H       = 1200, 630
NAVY       = (14, 33, 73)     # --ink
BRONZE     = (47, 76, 122)    # --bronze
RULE       = (143, 163, 199)
FOOT_TOP   = 528              # where the strip lifted from og-image.png begins
MAX_LINE   = 600              # central 630px square-crop safe zone, with margin

# slug -> (English label, French label).  The file written is og-<slug>-v2.png.
# Short names, not the full <title>: a card is read at thumbnail size.
CARDS = {
    'notice':               ('COMMUNITY NOTICE',            'AVIS COMMUNAUTAIRE'),
    'resources':            ('COMMUNITY RESOURCE CENTRE',   'CENTRE DE RESSOURCES COMMUNAUTAIRES'),
    'stay-informed':        ('NEWS & UPDATES',              'ACTUALITÉS'),
    'contact':              ('CONTACT',                     'NOUS JOINDRE'),
    'about':                ('ABOUT CJHQ',                  'À PROPOS DU CJHQ'),
    'privacy':              ('PRIVACY POLICY',              'POLITIQUE DE CONFIDENTIALITÉ'),
    'terms':                ('TERMS OF USE',                'CONDITIONS D’UTILISATION'),
    'accessibility':        ('ACCESSIBILITY STATEMENT',     'DÉCLARATION D’ACCESSIBILITÉ'),
    'child-travel-consent': ('CHILD TRAVEL CONSENT LETTER', 'LETTRE DE CONSENTEMENT AU VOYAGE'),
}

def lora(size, weight=600):
    f = ImageFont.truetype(LORA, size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f

def line_width(draw, text, font, track):
    return sum(draw.textlength(c, font=font) for c in text) + track * (len(text) - 1)

def fit(draw, text, start_size, weight, track, max_w=MAX_LINE, min_size=15):
    """Shrink until the tracked line fits. Tracking shrinks with the type so the
       proportions hold rather than the letters closing up on long names."""
    size = start_size
    while size > min_size:
        f = lora(size, weight)
        t = track * (size / start_size)
        if line_width(draw, text, f, t) <= max_w:
            return f, t
        size -= 1
    f = lora(min_size, weight)
    return f, track * (min_size / start_size)

def tracked(draw, text, font, cx, y, track, fill):
    ws = [draw.textlength(c, font=font) for c in text]
    x = cx - (sum(ws) + track * (len(text) - 1)) / 2
    for c, w in zip(text, ws):
        draw.text((x, y), c, font=font, fill=fill)
        x += w + track

def build(en, fr, out_path):
    src  = Image.open(SRC).convert('RGB')
    card = Image.new('RGB', (W, H), (255, 255, 255))
    card.paste(src.crop((0, FOOT_TOP, W, H)), (0, FOOT_TOP))     # verbatim footer

    logo = src.crop((312, 108, 886, 436))                        # the lockup
    LW = 440
    card.paste(logo.resize((LW, round(LW * logo.height / logo.width)), Image.LANCZOS),
               ((W - LW) // 2, 96))

    d = ImageDraw.Draw(card)
    d.line([(W // 2 - 80, 396), (W // 2 + 80, 396)], fill=RULE, width=2)
    f_en, t_en = fit(d, en, 33, 600, 7.0)
    f_fr, t_fr = fit(d, fr, 21, 500, 4.5)
    tracked(d, en, f_en, W // 2, 420, t_en, NAVY)
    tracked(d, fr, f_fr, W // 2, 474, t_fr, BRONZE)

    card.save(out_path, optimize=True)
    return f_en.size, f_fr.size

if __name__ == '__main__':
    if not os.path.exists(SRC):
        sys.exit('og-image.png not found - run this from the repository root.')
    if not LORA:
        sys.exit('Lora not found - expected tools/fonts/Lora-Variable.ttf.')
    os.makedirs(OUTDIR, exist_ok=True)
    for slug, (en, fr) in CARDS.items():
        out = os.path.join(OUTDIR, f'og-{slug}-v2.png')
        se, sf = build(en, fr, out)
        kb = os.path.getsize(out) / 1024
        print(f'  og-{slug}-v2.png  {kb:6.1f} KB   en@{se}px  fr@{sf}px   {en}')
    print(f'\n{len(CARDS)} cards written to assets/')
