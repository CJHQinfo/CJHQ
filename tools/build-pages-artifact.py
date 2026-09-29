#!/usr/bin/env python3
"""Stage only visitor/admin Pages output, never repository source."""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
DEST = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'dist'
if DEST == ROOT or ROOT in DEST.parents:
    raise SystemExit('Build outside the repository to avoid recursive or tracked output')
if DEST.exists():
    shutil.rmtree(DEST)
DEST.mkdir(parents=True)
for file in ROOT.glob('*.html'):
    shutil.copy2(file, DEST / file.name)
for name in ('404.html','.nojekyll','CNAME','robots.txt','sitemap.xml','favicon.ico','cjhq-logo.png','og-image.png','69be9b8d02d572fe658fbc689179e521.txt'):
    shutil.copy2(ROOT/name, DEST/name)
for name in ('fr','resources','notice','travel-guide','uci','data'):
    shutil.copytree(ROOT/name, DEST/name)
for file in (ROOT/'assets').rglob('*'):
    if file.is_file() and file.suffix.lower() in {'.js','.css','.png','.jpg','.jpeg','.webp','.svg','.woff2','.ico'}:
        target = DEST / file.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, target)
for forbidden in ('functions','tools','tests','.github','firestore.rules','package.json','ask-core.mjs'):
    assert not (DEST/forbidden).exists(), f'internal source leaked: {forbidden}'
assert (DEST/'admin.html').exists() and (DEST/'fr/ressources.html').exists()
print(f'Staged {sum(f.is_file() for f in DEST.rglob("*"))} public files in {DEST}')
