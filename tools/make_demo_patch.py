"""Writes demo_patch.json: exact find/replace pairs applied to demo_base.html by build_demo.py."""
import json, os
P = []
def r(a, b): P.append([a, b])
# --- map: national view with state outlines, every place as a dot ---
r('  const toW = (lat, lon) => [(lon + 74.2) * 1e5 * KX, -(lat - 40.6) * 1e5];',
  '''  const toW = (lat, lon) => [(lon + 74.2) * 1e5 * KX, -(lat - 40.6) * 1e5];
  // street data covers Jersey City and Bayonne only; outside it (or zoomed out) the map shows state outlines
  let SB = [Infinity, Infinity, -Infinity, -Infinity];
  ways.forEach(w => { for (let i = 0; i < w.pts.length; i += 2) { SB[0] = Math.min(SB[0], w.pts[i]); SB[1] = Math.min(SB[1], w.pts[i + 1]); SB[2] = Math.max(SB[2], w.pts[i]); SB[3] = Math.max(SB[3], w.pts[i + 1]); } });
  const rings = BORDERS.split(";").map(s => { const p = s.split(",").map(Number); const out = new Float32Array(p.length); let x = 0, y = 0;
    for (let i = 0; i < p.length; i += 2) { x += p[i]; y += p[i + 1]; const w = toW(y / 50, x / 50); out[i] = w[0]; out[i + 1] = w[1]; } return out; });
  const PW = PLACES.map(p => toW(p.la, p.lo));''')
r('  const pinR = 13;', '''  const pinR = 13;
  function inStreets() { return view.z >= 0.6 && view.cx > SB[0] && view.cx < SB[2] && view.cy > SB[1] && view.cy < SB[3]; }
  function drawBorders() {
    ctx.fillStyle = colors.water; ctx.fillRect(0, 0, W, H);
    ctx.beginPath();
    for (const p of rings) { ctx.moveTo(sx(p[0]), sy(p[1])); for (let i = 2; i < p.length; i += 2) ctx.lineTo(sx(p[i]), sy(p[i + 1])); ctx.closePath(); }
    ctx.fillStyle = colors.land; ctx.fill("evenodd"); ctx.strokeStyle = colors["road-major-edge"]; ctx.lineWidth = 0.8; ctx.lineJoin = "round"; ctx.stroke();
  }
  function placeLabel(text, X, Y, r) {
    ctx.font = "600 12px " + getComputedStyle(document.body).fontFamily; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = colors.surface; ctx.globalAlpha = .92; ctx.fillRect(X - tw / 2 - 6, Y - r - 24, tw + 12, 20); ctx.globalAlpha = 1;
    ctx.fillStyle = colors.fg; ctx.fillText(text, X, Y - r - 14);
  }
  function drawPlaces() {
    const r = view.z < 0.05 ? 3.5 : view.z < 0.5 ? 5 : 7; let act = null;
    PLACES.forEach((p, i) => {
      const X = sx(PW[i][0]), Y = sy(PW[i][1]); if (X < -10 || Y < -10 || X > W + 10 || Y > H + 10) return;
      if (p.id === activePlace) { act = [p, X, Y]; return; }
      ctx.beginPath();
      if (p.t === "monastery" || p.t === "convent") { ctx.moveTo(X, Y - r - 1); ctx.lineTo(X + r + 1, Y); ctx.lineTo(X, Y + r + 1); ctx.lineTo(X - r - 1, Y); ctx.closePath(); } else ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fillStyle = placeColor(p); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      if (view.z > 2.5) placeLabel(p.n.replace(/ Coptic Orthodox Church/, ""), X, Y, r);
    });
    if (act) { const [p, X, Y] = act; ctx.beginPath(); ctx.arc(X, Y, 10, 0, Math.PI * 2); ctx.fillStyle = placeColor(p); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.stroke(); placeLabel(p.n.replace(/ Coptic Orthodox Church/, ""), X, Y, 10); }
  }
  function hitPlace(px, py) {
    let best = null, bd = 11;
    PLACES.forEach((p, i) => { const d = Math.hypot(sx(PW[i][0]) - px, sy(PW[i][1]) - py); if (d < bd) { bd = d; best = p.id; } });
    return best;
  }''')
r('''    ctx.fillStyle = colors.land; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const showRes = view.z > 0.9;
    for (const cls of order) {''', '''    const streetMode = inStreets();
    if (streetMode) { ctx.fillStyle = colors.land; ctx.fillRect(0, 0, W, H); } else drawBorders();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const showRes = view.z > 0.9;
    if (streetMode) for (const cls of order) {''')
r('''    drawLabels();
    churches.forEach((c, i) => {''', '''    if (streetMode) drawLabels();
    drawPlaces();
    churches.forEach((c, i) => {''')
r('ctx.beginPath(); ctx.arc(X, Y, on ? pinR + 3 : pinR, 0, Math.PI * 2);', 'const R = view.z < 0.3 ? 6 : pinR; ctx.beginPath(); ctx.arc(X, Y, on ? R + 3 : R, 0, Math.PI * 2);')
r('ctx.fillText(String(i + 1), X, Y + 0.5);', 'if (R === pinR) ctx.fillText(String(i + 1), X, Y + 0.5);')
r('Math.min(12, Math.max(0.35, view.z * f))', 'Math.min(12, Math.max(0.012, view.z * f))')
r('''    return null;
  }
  // pointer handling''', '''    const pid = hitPlace(px, py); if (pid) return "p:" + pid;
    return null;
  }
  function fitAll() {
    const pts = [...churches.map(c => toW(c.lat, c.lon)), ...PLACES.filter(p => p.lo > -126 && p.lo < -52 && p.la > 17 && p.la < 56).map(p => toW(p.la, p.lo))];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    view.cx = (Math.min(...xs) + Math.max(...xs)) / 2; view.cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    view.z = Math.min((W - 40) / (Math.max(...xs) - Math.min(...xs)), (H - 40) / (Math.max(...ys) - Math.min(...ys))) * 100; draw();
  }
  // pointer handling''')
r('else { const id = hit(e.offsetX, e.offsetY); if (id) select(id, true, false); }', 'else { const id = hit(e.offsetX, e.offsetY); if (id && id.startsWith("p:")) openPlace(id.slice(2)); else if (id) select(id, true, false); }')
r('$("#zfit").addEventListener("click", fit);', '$("#zfit").addEventListener("click", () => (view.z < 0.3 ? fit() : fitAll()));')
r('return { view, draw, flyTo, fit, setUser, setPick };', 'return { view, draw, flyTo, fit, fitAll, setUser, setPick };')
r('function select(id, scroll, center) {\n  active = id;', 'function select(id, scroll, center) {\n  active = id; activePlace = null;')
# --- churches tab: featured heading, place list ---
r('<div class="list" id="church-list" style="margin-top:12px"></div>',
  '<div class="sec-h" style="margin-top:14px"><h3 data-t="featuredH"></h3></div>\n    <div class="list" id="church-list"></div>\n    <div id="place-list" style="display:flex;flex-direction:column;gap:10px;margin-top:18px"></div>')
r('''  }).join("") || `<div class="empty">${t("noneFound")}</div>`;
  document.querySelectorAll(".ccard[data-id]").forEach(card''', '''  }).join("");
  renderPlaces(CQ, !!$("#church-list").innerHTML);
  document.querySelectorAll(".ccard[data-id]").forEach(card''')
r('<canvas id="map" tabindex="0" aria-label="Street map of Jersey City and Bayonne with church locations"></canvas>', '<canvas id="map" tabindex="0" aria-label="Map of Coptic Orthodox churches, monasteries and convents"></canvas>')
r('mapNote: "Drag to move, pinch or scroll to zoom. Street data © OpenStreetMap contributors.",', 'mapNote: "Drag to move, pinch or scroll to zoom. ⤢ switches between Jersey City and all of North America. Streets © OpenStreetMap contributors.",')
r('mapNote: "اسحب للتحريك، وكبّر بإصبعين أو بعجلة الماوس. بيانات الشوارع © مساهمو OpenStreetMap.",', 'mapNote: "اسحب للتحريك، وكبّر بإصبعين أو بعجلة الماوس. زر ⤢ يبدّل بين جيرسي سيتي وأمريكا الشمالية كلها. الشوارع © مساهمو OpenStreetMap.",')
# --- details sheet, report, search ---
r('''  if (r.kind === "ev") {
    const c = churchById(r.church);''', '''  if (r.kind === "place") { h = placeSheet(r.id); } else if (r.kind === "ev") {
    const c = churchById(r.church);''')
r('''  if (k === "event" && b._raw)''', '''  if (k.startsWith("place:")) { const p = placeById(k.slice(6)); return openReport({ kind: "church", title: `${p.n} (${p.c}, ${p.s})`, eventId: k }); }
  if (k === "event" && b._raw)''')
r('  const evs = [...weekly.map(', '''  const ps = PLACES.filter(p => M(placeHay(p)));
  if (ps.length) groups.push(["places", ps.length, ps.map(p => `<button class="gsr" type="button" data-open="${reg({ kind: "place", id: p.id, title: { en: p.n, ar: p.n } })}" style="--cc:${placeColor(p)}"><span class="dot"></span><span><b>${esc(p.n)}</b><small>${esc(p.c)}, ${esc(p.s)}</small></span></button>`)]);
  const evs = [...weekly.map(''')
r('data-gsgo="${k}">', 'data-gsgo="${k === "places" ? "churches" : k}">')
# --- wording and fixes ---
r('Feast dates from copticchurch.net."', 'Feast dates from copticchurch.net. Other churches from diocese directories, the Nihov directory and Coptic Society, checked October 26, 2026."')
r('مواعيد الأعياد من copticchurch.net."', 'مواعيد الأعياد من copticchurch.net. باقي الكنائس من أدلة الإيبارشيات ودليل Nihov وCoptic Society، بتاريخ ٢٦ أكتوبر ٢٠٢٦."')
r('shareAppText: "Coptic church services and meetings in Jersey City and Bayonne:"', 'shareAppText: "Find Coptic Orthodox churches across North America, with full schedules for Jersey City and Bayonne:"')
r('shareAppText: "مواعيد القداسات والاجتماعات في الكنائس القبطية في جيرسي سيتي وبايون:"', 'shareAppText: "ابحث عن الكنائس القبطية الأرثوذكسية في أمريكا الشمالية، مع المواعيد الكاملة لكنائس جيرسي سيتي وبايون:"')
r('donate: "http://www.paypal.com/', 'donate: "https://www.paypal.com/')
r('        <li><b>The Arabic hasn', '''        <li><b>Churches outside Jersey City and Bayonne show basic info only.</b> There are __N__ more places in the US, Canada and Mexico, from diocese directories and two church directories, checked October 26, 2026. Most have an address, phone and website, but no service times yet. Each card says how well it has been checked, and __T__ places still only list a town.</li>
        <li><b>The Arabic hasn''')
json.dump(P, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'demo_patch.json'), 'w'), ensure_ascii=False, indent=0)
print(len(P), 'replacements')
