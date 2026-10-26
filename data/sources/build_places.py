import csv, re, sys, os
ST = {'Alabama':'AL','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','Ohio':'OH','Oklahoma':'OK','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','U.S. Virgin Islands':'VI','Connecticut':'CT'}
TODAY='2026-10-26'
WIKI='https://en.wikipedia.org/wiki/List_of_Coptic_Orthodox_churches_in_the_United_States'
LA='https://directory.lacopts.org/parishes'
HV='https://www.hisvine.com/diocese/106/churches'
COC='https://copticorthodox.church/en/coptic-monasteries/abroad-monasteries/'
NJ_DIO='Archdiocese of New Jersey & North America (Bishop Gabriel)'
def kind(n):
    l=n.lower()
    if 'convent' in l: return 'convent'
    if 'monastery' in l or 'abbey' in l: return 'monastery'
    if 'retreat' in l or 'village' in l or 'christian center' in l and 'church' not in l: return 'retreat_center'
    if 'coptic community' in l or l.startswith('the coptic orthodox community'): return 'community'
    if 'mission' in l: return 'mission'
    return 'church'
def slug(*p): return re.sub(r'[^a-z0-9]+','-',' '.join(p).lower()).strip('-')
rows=[]
def add(name,typ,street,city,state,diocese,verif,src,notes='',zip='',region='',phone='',website=''):
    rows.append(dict(id='',name=name,type=typ,street=street,city=city,state=state,zip=zip,region=region,country='US',diocese=diocese,website=website,phone=phone,lat='',lng='',verification=verif,source_url=src,source_checked=TODAY,notes=notes))
for r in csv.DictReader(open('sources/wikipedia-list-2026-10-26.csv')):
    if r['diocese'].startswith('Los Angeles') and 'Monastery' not in r['name']: continue  # replaced by official LA list
    n=r['name']; notes=''
    if 'Eritrean' in n: continue
    if r['state'] in ('New Jersey','New York','Pennsylvania','Delaware','Connecticut','Maryland','Virginia','West Virginia','Massachusetts','Rhode Island','New Hampshire','Vermont','Maine','North Carolina','South Carolina','Kentucky','Ohio','Michigan','Indiana','Illinois','Wisconsin','Minnesota','Iowa','Missouri','Nebraska'): continue  # replaced by state files  # not Coptic; listed in error by the source
    city=r['city']
    if 'former location' in n: notes='Source says former location; confirm whether it moved'
    if n=='St. Anthony Coptic Orthodox Monastery': notes='Papal monastery (directly under the Pope); source lists it under Los Angeles'
    if city=='Altoona': notes='Source lists it under New Jersey; Altoona is in Pennsylvania'
    if city=='Astoria': notes='HisVine lists St George in Long Island City, NY; likely the same church'
    if 'listed under' in r['diocese']: notes=(notes+'; ' if notes else '')+'Diocese assignment unconfirmed'
    n=re.sub(r'\s*\(former location\)','',n)
    v='unverified'
    add(n,kind(n),'',city,'PA' if city=='Altoona' else ST[r['state']],r['diocese'],v,WIKI,notes)
for r in csv.DictReader(open('sources/lacopts-directory-2026-10-26.csv')):
    add(r['name'],kind(r['name']),r['street'],r['city'],r['state'],'Los Angeles, Southern California & Hawaii (Metropolitan Serapion)','official_directory',LA)
for r in csv.DictReader(open('sources/nj-2026-10-26.csv')):
    add(r['name'],r['type'],r['street'],r['city'],'NJ',NJ_DIO,r['verification'],r['source_url'],r['notes'],r['zip'],r['region'],r['phone'],r['website'])
DIO={'NYNE':'New York & New England (Bishop David)','PA':'Pennsylvania, Delaware, Maryland & West Virginia (Bishop Karas)','ARCH':'Archdiocese of North America','NSCK':'North & South Carolina and Kentucky (Bishop Peter)','OMI':'Ohio, Michigan & Indiana (Bishop Seraphim)','':''}

# Remaining states: the Nihov directory lists (name|city|url) are the primary source.
# Wikipedia rows that match a Nihov row become cross_checked; Wikipedia-only rows stay unverified.
import glob
STOP={'great','the','th','sixth','vi','christian','retreat','center','st','saint','sts','coptic','orthodox','church','american','the','and','of','cathedral','community','mission'}
def toks(n): return frozenset(t for t in re.findall(r'[a-z]+',n.lower().replace('antonius','anthony').replace('antonious','anthony').replace('antony','anthony').replace('meena','mina').replace('mena','mina').replace('apanoub','abanoub').replace('rouis','reweis').replace('rueis','reweis').replace('kyrillos','kyrillos')) if t not in STOP)
SOUTH={'AL','AZ','AR','FL','GA','LA','MS','NM','OK','TN','TX'}
nihov_states=set()
DET={}
for line in open('sources/nihov-details-2026-10-26.txt', encoding='utf-8').read().splitlines()[1:]:
    u,*v=line.split('|'); DET[u]=['' if x=='-' else x for x in v]
for f in sorted(glob.glob('sources/nihov/*.txt')):
    st=os.path.basename(f).split('.')[0].split('-')[0]; nihov_states.add(st)
    wiki=[r for r in rows if r['state']==st and r['source_url']==WIKI]
    for line in open(f, encoding='utf-8'):
        if not line.strip(): continue
        name,city,url=line.strip().split('|')
        if name.startswith('Coptic Community'): name=f'{city} Coptic Community'
        t=toks(name); match=None
        cands=[w for w in wiki if toks(w['name'])==t]
        if len(cands)>1: cands=[w for w in cands if w['city']==city] or cands[:1]
        if not cands:  # same town, older name is a shorter form (e.g. "Coptic Community" that became a parish)
            cands=[w for w in wiki if w['city']==city and toks(w['name'])<=t]
        if cands: match=cands[0]
        notes=''
        if match:
            rows.remove(match); wiki.remove(match)
            if match['city']!=city: notes=f"Older lists say {match['city']}"
        dio=match['diocese'] if match else ('Southern US (Metropolitan Youssef)' if st in SOUTH else '')
        street,zp,phone,web,lat,lng=DET.get(url,['']*6)
        if web and not web.startswith('http'): web='https://'+web
        add(name,kind(name),street,city,st,dio,'cross_checked' if match else 'unverified',url,notes,zp[:5],'',phone,web)
        rows[-1]['lat'],rows[-1]['lng']=lat,lng
    for w in wiki:
        if st!='CA' and w['type']=='church':
            w['notes']=(w['notes']+'; ' if w['notes'] else '')+'Not in the Nihov directory; may have moved, merged or closed'
for r in [*csv.DictReader(open('sources/neighbors-2026-10-26.csv')), *csv.DictReader(open('sources/midatlantic-2026-10-26.csv')), *csv.DictReader(open('sources/newengland-2026-10-26.csv')), *csv.DictReader(open('sources/carolinas-ky-2026-10-26.csv')), *csv.DictReader(open('sources/ohio-mi-in-2026-10-26.csv')), *csv.DictReader(open('sources/midwest-2026-10-26.csv'))]:
    add(r['name'],r['type'],r['street'],r['city'],r['state'],DIO[r['diocese']],r['verification'],r['source_url'],r['notes'],r['zip'],r['region'],r['phone'],r['website'])
# Dawsonville convent (first found on copticorthodox.church) now comes from the Nihov GA list
seen={}
for r in rows:
    s=slug(r['state'],r['city'],r['name'].replace('Coptic Orthodox','').replace('Church',''))
    if s in seen: seen[s]+=1; s=f'{s}-{seen[s]}'
    else: seen[s]=1
    r['id']=s
rows.sort(key=lambda r:(r['state'],r['city'],r['name']))
w=csv.DictWriter(open(sys.argv[1],'w',newline=''),fieldnames=list(rows[0]))
w.writeheader(); w.writerows(rows)
from collections import Counter
print(len(rows),Counter(r['type'] for r in rows),Counter(r['verification'] for r in rows))
