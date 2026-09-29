#!/usr/bin/env python3
"""Check staged Pages files and rooted local HTML references."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import sys

root = Path(sys.argv[1])
assert root.is_dir()
for name in ('functions','tools','tests','.github','firestore.rules','ask-core.mjs','package.json'):
    assert not (root/name).exists(), f'internal source leaked: {name}'
for name in ('index.html','admin.html','404.html','CNAME','.nojekyll','fr/index.html','fr/ressources.html','travel-guide/index.html','uci/index.html','notice/travel-guide.html','notice/uci.html','data/link-audit.json'):
    assert (root/name).is_file(), f'missing required public file: {name}'
links = []
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('href','src') and value and value.startswith('/') and not value.startswith('//'):
                links.append(value)
for file in root.rglob('*.html'):
    Links().feed(file.read_text())
missing=[]
for value in links:
    path=urlparse(value).path.lstrip('/')
    if not path: continue
    target=root/path
    if not (target.is_file() or (root/(path+'.html')).is_file() or (target/'index.html').is_file()):
        missing.append(value)
assert not missing, f'{len(missing)} missing local links, examples {missing[:10]}'
print(f'Checked {sum(f.is_file() for f in root.rglob("*"))} public files and {len(links)} rooted links')
