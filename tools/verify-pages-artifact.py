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
for name in ('index.html','admin.html','404.html','CNAME','.nojekyll','fr/index.html','fr/ressources.html','resources/find-a-family-doctor.html','fr/ressources/find-a-family-doctor.html','data/link-audit.json'):
    assert (root/name).is_file(), f'missing required public file: {name}'
# Preserve any temporary-page output present in the source; expired pages
# need not exist. Never require named temporary pages to stay published.
source = Path(__file__).resolve().parent.parent
for directory in ('notice','travel-guide','uci'):
    for file in (source/directory).rglob('*'):
        if file.is_file():
            staged = root/file.relative_to(source)
            assert staged.is_file() and staged.read_bytes() == file.read_bytes(), f'temporary page changed or missing: {file}'
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

# The build is expected to stage every resource share route in both languages.
import re
slugs=set(re.findall(r"slug:'([a-z0-9-]+)'", (Path(__file__).parent.parent/'assets/site-core.js').read_text()))
assert len(slugs)==67, f'Expected 67 distinct resource slugs, got {len(slugs)}'
for slug in slugs:
    for prefix in ('resources','fr/ressources'):
        f=root/prefix/(slug+'.html')
        assert f.is_file(), f'Missing detail route {f}'
        html=f.read_text()
        url='https://cjhq.org/'+prefix+'/'+slug
        assert f'<link rel="canonical" id="canonicalTag" href="{url}">' in html, f'Wrong canonical {f}'
        assert url+'#webpage' in html, f'Wrong WebPage schema {f}'
