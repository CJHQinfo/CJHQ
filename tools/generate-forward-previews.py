#!/usr/bin/env python3
"""Bounded public-page metadata importer. No scripts, cookies, credentials or private networks."""
from pathlib import Path
import os,json,re,hashlib,ipaddress,socket,ssl,http.client,time,html,io
from urllib.parse import urlsplit,urljoin,quote
from html.parser import HTMLParser
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parent.parent
ORIGIN='https://cjhq.org'; SLUG=re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
MAX_HTML=1000000;MAX_IMAGE=3000000

def safe_fetch(url,limit=MAX_HTML):
    deadline=time.monotonic()+12
    for _ in range(4):
        u=urlsplit(url)
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password:raise ValueError('Only public http/https addresses are supported')
        port=u.port or (443 if u.scheme=='https' else 80)
        if port not in (80,443):raise ValueError('Nonstandard ports are not supported')
        ips=list(dict.fromkeys(a[4][0] for a in socket.getaddrinfo(u.hostname,port,type=socket.SOCK_STREAM)))
        if not ips or any(not ipaddress.ip_address(i).is_global for i in ips):raise ValueError('Private or reserved network address blocked')
        remaining=deadline-time.monotonic()
        if remaining<=0:raise ValueError('Fetch timed out')
        # Pin the validated address. HTTPS still verifies the original host certificate/SNI.
        conn=http.client.HTTPConnection(u.hostname,port,timeout=min(6,remaining))
        sock=socket.create_connection((ips[0],port),timeout=min(6,remaining))
        if u.scheme=='https':sock=ssl.create_default_context().wrap_socket(sock,server_hostname=u.hostname)
        conn.sock=sock
        try:
            conn.request('GET',(u.path or '/')+('?' + u.query if u.query else ''),headers={'Host':u.netloc,'User-Agent':'CJHQ-Link-Preview/1.0','Accept-Encoding':'identity','Accept':'text/html,image/*;q=0.8'})
            r=conn.getresponse()
            if r.status in (301,302,303,307,308):
                loc=r.getheader('Location');
                if not loc:raise ValueError('Invalid redirect')
                url=urljoin(url,loc);continue
            if r.status!=200:raise ValueError('Destination returned HTTP '+str(r.status))
            length=r.getheader('Content-Length')
            if length and int(length)>limit:raise ValueError('Download exceeds limit')
            chunks=[];n=0
            while True:
                if time.monotonic()>deadline:raise ValueError('Fetch timed out')
                part=r.read(min(65536,limit+1-n))
                if not part:break
                n+=len(part)
                if n>limit:raise ValueError('Download exceeds limit')
                chunks.append(part)
            return b''.join(chunks),r.getheader('Content-Type',''),url
        finally:conn.close()
    raise ValueError('Too many redirects')

class Extract(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.meta={};self.titles=[];self.text=[];self.stack=[];self.title=False;self.parts=[]
    def handle_starttag(self,t,a):
        d=dict(a)
        if t in ('p','h1','h2','h3','li') and self.parts:self.text.append(' '.join(self.parts));self.parts=[]
        hidden=t in ('script','style','noscript','svg','head') or 'hidden' in d or d.get('aria-hidden')=='true' or bool(re.search(r'display\s*:\s*none|visibility\s*:\s*hidden|max-height\s*:\s*0',d.get('style',''),re.I))
        if t not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):self.stack.append((t,hidden))
        if t=='title':self.title=True
        if t=='meta':self.meta[(d.get('property') or d.get('name') or '').lower()]=d.get('content','')
    def handle_endtag(self,t):
        if t in ('p','h1','h2','h3','li') and self.parts:self.text.append(' '.join(self.parts));self.parts=[]
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==t:self.stack=self.stack[:i];break
        if t=='title':self.title=False
    def handle_data(self,d):
        if self.title:self.titles.append(d)
        if not any(v for _,v in self.stack) and d.strip():self.parts.append(d.strip())

def clean(s,n):return re.sub(r'\s+',' ',re.sub('[\u200b-\u200f\ufeff]','',html.unescape(str(s)))).strip()[:n]
def extract(raw,url):
    p=Extract();p.feed(raw.decode('utf-8','replace'))
    title=clean(p.meta.get('og:title') or p.meta.get('twitter:title') or ''.join(p.titles),180) or urlsplit(url).hostname
    desc=p.meta.get('og:description') or p.meta.get('description') or p.meta.get('twitter:description')
    if not desc:
        keep=[]
        for t in p.text+[' '.join(p.parts)]:
            if re.search(r'unsubscribe|view (this |the )?email|view (this |the )?in (your )?browser|sent (to|by)|mailjet|all rights reserved',t,re.I):continue
            if len(t)<30 or clean(t,180)==title:continue
            keep.append(t)
        desc=' '.join(keep)
    image=p.meta.get('og:image') or p.meta.get('twitter:image') or ''
    return {'title':title,'description':clean(desc,240),'image_source':urljoin(url,image) if image else ''}

def fingerprint(d):return hashlib.sha256(json.dumps({k:d.get(k,'') for k in ['destination','preview_title','preview_description','preview_image','preview_revision']},sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()[:16]
def firestore(path):
    # Public documents only, without a bearer token or user credentials.
    import urllib.request
    url='https://firestore.googleapis.com/v1/projects/cjhqinfo/databases/(default)/documents/'+path
    with urllib.request.urlopen(url,timeout=15) as r:return json.load(r)
def fields(doc):
    out={}
    for k,v in doc.get('fields',{}).items():
        if 'stringValue'in v:out[k]=v['stringValue']
        elif 'booleanValue'in v:out[k]=v['booleanValue']
    return out

def card(title,description,dest,image_url,path):
    font=ROOT/'tools/fonts/Lora-Variable.ttf';im=Image.new('RGB',(1200,630),'white');draw=ImageDraw.Draw(im)
    used=''
    if image_url:
        try:
            raw,typ,_=safe_fetch(image_url,MAX_IMAGE)
            if not typ.startswith('image/') or 'svg' in typ:raise ValueError('Unsupported image')
            Image.MAX_IMAGE_PIXELS=16000000
            with Image.open(io.BytesIO(raw)) as src:
                if src.width<200 or src.height<100 or src.width*src.height>16000000:raise ValueError('Image dimensions not suitable')
                im.paste(ImageOps.fit(src.convert('RGB'),(480,500)),(720,0));used=image_url
        except Exception:pass
    logo=Image.open(ROOT/'cjhq-logo.png').convert('RGBA');logo.thumbnail((200,130));im.paste(logo,(55,30),logo)
    width=620 if used else 1050
    size=44
    while True:
        f=ImageFont.truetype(str(font),size);words=title.split();lines=[];line=''
        for w in words:
            trial=(line+' '+w).strip()
            if draw.textlength(trial,font=f)>width and line:lines.append(line);line=w
            else:line=trial
        if line:lines.append(line)
        if len(lines)<=4 or size<=24:break
        size-=2
    for i,line in enumerate(lines[:4]):draw.text((55,190+i*(size+12)),line,font=f,fill='#0e2149')
    draw.rectangle((0,530,1200,630),fill='#0e2149');draw.text((55,555),'CJHQ | '+urlsplit(dest).hostname,font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',25),fill='white');im.save(path,optimize=True)
    return used

def build_one(slug,d,previous=None,fetcher=safe_fetch):
    fp=fingerprint(d)
    if previous and previous.get('fingerprint')==fp and (ROOT/previous.get('image','').lstrip('/')).is_file():return previous
    status='ready';note=''
    try:
        raw,typ,final=fetcher(d['destination'])
        if 'text/html' not in typ:raise ValueError('Destination is not an HTML page')
        meta=extract(raw,final)
    except Exception as e:
        meta={'title':urlsplit(d['destination']).hostname or slug,'description':'','image_source':''};status='needs_review';note='Could not collect all preview details. You can enter them with Edit Preview.'
    for k in ['title','description']:
        if d.get('preview_'+k):meta[k]=clean(d['preview_'+k],180 if k=='title' else 240)
    if d.get('preview_image'):meta['image_source']=d['preview_image']
    imgpath=ROOT/'assets'/f'og-forward-{slug}-{fp}.png';used=card(meta['title'],meta['description'],d['destination'],meta['image_source'],imgpath)
    return dict(meta,fingerprint=fp,status=status,note=note,image='/assets/'+imgpath.name,image_source=used)

def render(slug,meta):
    base=(ROOT/'go.html').read_text();url=ORIGIN+'/go/'+quote(slug);title=html.escape(meta['title'],quote=True);desc=html.escape(meta['description'],quote=True);image=ORIGIN+meta['image']
    base=re.sub(r'<title>.*?</title>','<title>'+title+'</title>',base)
    base=re.sub(r'<meta (?:name="description"|property="og:[^"]+"|name="twitter:[^"]+") [^>]*>','',base)
    tags=f'<meta name="description" content="{desc}"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:type" content="website"><meta property="og:url" content="{url}"><meta property="og:image" content="{image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}"><meta name="twitter:description" content="{desc}"><meta name="twitter:image" content="{image}">'
    base=base.replace('</head>',tags+'</head>');base=base.replace("new URLSearchParams(location.search).get('l')||''",json.dumps(slug));return '<!-- CJHQ generated forwarding preview -->\n'+base

def main():
    try:idx=firestore('forward_link_settings/public_index')
    except Exception as e:
        from urllib.error import HTTPError
        if isinstance(e,HTTPError) and e.code==404:idx={}
        else:raise
    names=idx.get('fields',{}).get('slugs',{}).get('arrayValue',{}).get('values',[])
    slugs=[v.get('stringValue','') for v in names if SLUG.fullmatch(v.get('stringValue','')) and len(v.get('stringValue',''))<=61][:1000]
    datafile=ROOT/'data/forward-previews.json';old=json.loads(datafile.read_text()).get('links',{}) if datafile.exists() else {};out={};ready=[];new=0
    for slug in slugs:
        try:d=fields(firestore('forward_links/'+slug))
        except Exception as e:
            from urllib.error import HTTPError
            if isinstance(e,HTTPError) and e.code in (403,404):continue
            raise # Outages must never remove existing output.
        if not d.get('active'):continue
        if old.get(slug,{}).get('fingerprint')!=fingerprint(d):
            if new>=20:
                if slug in old:out[slug]=old[slug]
                continue
            new+=1
        out[slug]=build_one(slug,d,old.get(slug));target=ROOT/'go'/slug;target.mkdir(parents=True,exist_ok=True);(target/'index.html').write_text(render(slug,out[slug]));ready.append(slug)
    # Only this generator's marked files are removed.
    for f in (ROOT/'go').glob('*/index.html'):
        if f.parent.name not in out and 'CJHQ generated forwarding preview' in f.read_text()[:100]:f.unlink();f.parent.rmdir()
    keep={v['image'].split('/')[-1] for v in out.values()}
    for f in (ROOT/'assets').glob('og-forward-*.png'):
        if f.name not in keep:f.unlink()
    datafile.write_text(json.dumps({'links':out},ensure_ascii=False,indent=2)+'\n');print('Forward previews:',len(out),'ready;',new,'collected')
if __name__=='__main__':main()
