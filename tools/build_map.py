"""Builds the progress map page (map.html) from data/places.csv.
Run from the project folder: python3 tools/build_map.py
Dot positions are approximate (city center) until addresses are geocoded."""
import csv, json, math, os
from collections import Counter, defaultdict
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
coords = {(r['state'], r['city']): (float(r['lat']), float(r['lng']))
          for r in csv.DictReader(open(os.path.join(root, 'data/sources/city-coords-approx.csv')))}
rows = list(csv.DictReader(open(os.path.join(root, 'data/places.csv'))))
by_city = defaultdict(list)
for r in rows: by_city[(r['state'], r['city'])].append(r)
places = []
for key, group in by_city.items():
    lat, lng = coords[key]
    for i, r in enumerate(group):
        # spread places that share a city in a small ring so each dot can be tapped
        if len(group) > 1:
            a = 2 * math.pi * i / len(group); d = 0.012 + 0.003 * len(group)
            plat, plng = lat + d * math.sin(a), lng + d * math.cos(a) / math.cos(math.radians(lat))
        else: plat, plng = lat, lng
        places.append({k: r[k] for k in ('id','name','type','street','city','state','zip','region','diocese','website','phone','verification','source_url','source_checked','notes')} | {'lat': round(plat, 4), 'lng': round(plng, 4)})
done_states = ['NJ', 'NY', 'PA', 'DE', 'CT', 'MD', 'VA', 'WV', 'MA', 'RI', 'NH', 'VT', 'ME', 'NC', 'SC', 'KY', 'OH', 'MI', 'IN']
tpl = open(os.path.join(here, 'map_template.html')).read()
out = (tpl.replace('/*PLACES*/[]', json.dumps(places, ensure_ascii=False))
          .replace('/*STATES*/{}', open(os.path.join(here, 'us-states-10m.json')).read())
          .replace('/*DONE*/[]', json.dumps(done_states))
          .replace('{{UPDATED}}', max(r['source_checked'] for r in rows)))
open(os.path.join(here, 'map.html'), 'w').write(out)
print(len(places), Counter(p['verification'] for p in places))
