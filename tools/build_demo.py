"""Builds the demo page (demo.html) from the demo base page plus data/places.csv.
Run from the project folder: python3 tools/build_demo.py
demo_base.html is the hand-made demo (4 Jersey City and Bayonne churches with full schedules).
This script adds every other place as a basic card, map dot and search result, without changing the demo's look."""
import csv, json, os
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)

# --- state outlines (us-atlas topojson -> rings in 0.01 degree steps, delta encoded) ---
tj = json.load(open(os.path.join(here, 'us-states-10m.json')))
(sx, sy), (tx, ty) = tj['transform']['scale'], tj['transform']['translate']
arcs = []
for a in tj['arcs']:
    x = y = 0; pts = []
    for dx, dy in a: x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def ring(ix):
    out = []
    for i in ix:
        p = arcs[i] if i >= 0 else arcs[~i][::-1]
        out.extend(p if not out else p[1:])
    return out
rings = []
for g in tj['objects']['states']['geometries']:
    polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
    for poly in polys:
        for r in poly:
            q = []
            for lon, lat in ring(r):
                pt = (round(lon * 50), round(lat * 50))  # 0.02 degree grid
                if not q or q[-1] != pt: q.append(pt)
            if len(q) > 3: rings.append(q)
na = json.load(open(os.path.join(here, 'canada-mexico-50m.geojson')))
for f in na['features']:
    for poly in f['geometry']['coordinates']:
        q = []
        for lon, lat in poly[0]:
            pt = (round(lon * 50), round(lat * 50))
            if not q or q[-1] != pt: q.append(pt)
        if len(q) > 3: rings.append(q)
enc = []
for q in rings:
    flat = [q[0][0], q[0][1]] + [v for i in range(1, len(q)) for v in (q[i][0] - q[i-1][0], q[i][1] - q[i-1][1])]
    enc.append(','.join(map(str, flat)))
BORDERS = ';'.join(enc)

# --- places ---
DEMO = {'nj-bayonne-st-abanoub-st-antonious', 'nj-bayonne-virgin-mary-st-john', 'nj-jersey-city-st-george-st-shenouda', 'nj-jersey-city-st-mark-jersey-city'}
coords = {(r['state'], r['city']): (float(r['lat']), float(r['lng'])) for r in csv.DictReader(open(os.path.join(root, 'data/sources/city-coords-approx.csv')))}
# reuse the progress map's dot positions (exact pins or spread city centers) so both maps agree
mp = open(os.path.join(here, 'map.html')).read()
import re
places_js = json.loads(re.search(r'const PLACES = (\[.*?\]);\n', mp, re.S).group(1)) if 'const PLACES = ' in mp else None
pos = {p['id']: (p['lat'], p['lng']) for p in places_js} if places_js else {}
out = []
for r in csv.DictReader(open(os.path.join(root, 'data/places.csv'))):
    if r['id'] in DEMO: continue
    lat, lng = pos.get(r['id']) or coords[(r['state'], r['city'])]
    addr = ', '.join(x for x in [r['street'], r['city'], (r['state'] + ' ' + r['zip']).strip()] if x)
    out.append({'id': r['id'], 'n': r['name'], 't': r['type'], 'c': r['city'], 's': r['state'], 'a': addr, 'st': bool(r['street']),
                'p': r['phone'], 'w': r['website'], 'v': r['verification'], 'd': r['source_checked'], 'dio': r['diocese'],
                'la': round(lat, 5), 'lo': round(lng, 5), 'src': r['source_url'], 'nt': r['notes'], 'co': '' if r['country'] == 'US' else {'CA': 'Canada', 'MX': 'Mexico'}.get(r['country'], r['country'])})
for p in out:
    for k in list(p):
        if p[k] in ('', False): del p[k]

base = open(os.path.join(here, 'demo_base.html')).read()
def sub(old, new, count=1):
    global base
    assert base.count(old) >= 1, 'missing: ' + old[:80]
    base = base.replace(old, new, count)

sub('const COLORS = { stmark:', 'const PLACES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\nconst BORDERS = "' + BORDERS + '";\nconst COLORS = { stmark:')
inject = open(os.path.join(here, 'demo_patch.js')).read()
for old, new in json.load(open(os.path.join(here, 'demo_patch.json'))):
    sub(old, new)
sub('/* ---------- feast strip + calendar ---------- */', inject + '\n/* ---------- feast strip + calendar ---------- */')
base = base.replace('__N__', str(len(out))).replace('__T__', str(sum(1 for p in out if not p.get('st'))))
open(os.path.join(here, 'demo.html'), 'w').write(base)
print(len(out), 'places;', len(rings), 'rings;', round(len(base) / 1024), 'KB')
