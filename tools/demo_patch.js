/* ---------- every other church, monastery and convent (basic info from data/places.csv) ---------- */
Object.assign(T.en, {
  featuredH: "Jersey City & Bayonne: full schedules", allH: n => `All churches, monasteries and convents · ${n}`,
  nearH: "Closest to you", setLocHint: "Set your location with the pin button at the top to see the closest churches first.",
  basicNote: "Basic info only. Service times will be added when the church joins.", showMap: "Show on Map",
  noStreet: "Street address not found yet", townOnly: "The map dot shows the town, not the exact spot.",
  dioL: "Diocese", sourceL: "Source", typeL: "Type", statusL: "Checked", gsG_places: "All churches", nameNote: "",
  verif: { church_confirmed: "Confirmed on the church's website", known_locally: "Known locally", official_directory: "From the diocese directory", cross_checked: "Matched in two directories", unverified: "Not yet verified" },
  ptype: { church: "Church", monastery: "Monastery", convent: "Convent", community: "Coptic community", retreat_center: "Retreat center", diocese_office: "Diocese office", seminary: "Seminary", school: "School" }
});
Object.assign(T.ar, {
  featuredH: "جيرسي سيتي وبايون: المواعيد كاملة", allH: n => `كل الكنائس والأديرة · ${n.toLocaleString("ar-EG")}`,
  nearH: "الأقرب إليك", setLocHint: "حدّد موقعك بزر الدبوس في الأعلى لترى أقرب الكنائس أولًا.",
  basicNote: "معلومات أساسية فقط. ستُضاف المواعيد عندما تنضم الكنيسة.", showMap: "على الخريطة",
  noStreet: "العنوان غير متوفر بعد", townOnly: "النقطة على الخريطة تمثّل المدينة وليس الموقع الدقيق.",
  dioL: "الإيبارشية", sourceL: "المصدر", typeL: "النوع", statusL: "التحقق", gsG_places: "كل الكنائس", nameNote: "الأسماء بالإنجليزية حتى تتم ترجمتها.",
  verif: { church_confirmed: "مؤكد من موقع الكنيسة", known_locally: "معروفة محليًا", official_directory: "من دليل الإيبارشية", cross_checked: "متطابق في دليلين", unverified: "لم يتم التحقق بعد" },
  ptype: { church: "كنيسة", monastery: "دير", convent: "دير راهبات", community: "جماعة قبطية", retreat_center: "بيت خلوة", diocese_office: "مقر الإيبارشية", seminary: "كلية إكليريكية", school: "مدرسة" }
});
const STATE_NAMES = {
  AL: ["Alabama", "ألاباما"], AK: ["Alaska", "ألاسكا"], AZ: ["Arizona", "أريزونا"], AR: ["Arkansas", "أركنساس"], CA: ["California", "كاليفورنيا"], CO: ["Colorado", "كولورادو"],
  CT: ["Connecticut", "كونيتيكت"], DE: ["Delaware", "ديلاوير"], DC: ["Washington, DC", "العاصمة واشنطن"], FL: ["Florida", "فلوريدا"], GA: ["Georgia", "جورجيا"], HI: ["Hawaii", "هاواي"],
  ID: ["Idaho", "أيداهو"], IL: ["Illinois", "إلينوي"], IN: ["Indiana", "إنديانا"], IA: ["Iowa", "آيوا"], KS: ["Kansas", "كانساس"], KY: ["Kentucky", "كنتاكي"], LA: ["Louisiana", "لويزيانا"],
  ME: ["Maine", "مين"], MD: ["Maryland", "ماريلاند"], MA: ["Massachusetts", "ماساتشوستس"], MI: ["Michigan", "ميشيغان"], MN: ["Minnesota", "مينيسوتا"], MS: ["Mississippi", "ميسيسيبي"],
  MO: ["Missouri", "ميزوري"], MT: ["Montana", "مونتانا"], NE: ["Nebraska", "نبراسكا"], NV: ["Nevada", "نيفادا"], NH: ["New Hampshire", "نيوهامبشير"], NJ: ["New Jersey", "نيوجيرسي"],
  NM: ["New Mexico", "نيومكسيكو"], NY: ["New York", "نيويورك"], NC: ["North Carolina", "كارولاينا الشمالية"], ND: ["North Dakota", "داكوتا الشمالية"], OH: ["Ohio", "أوهايو"],
  OK: ["Oklahoma", "أوكلاهوما"], OR: ["Oregon", "أوريغون"], PA: ["Pennsylvania", "بنسلفانيا"], RI: ["Rhode Island", "رود آيلاند"], SC: ["South Carolina", "كارولاينا الجنوبية"],
  SD: ["South Dakota", "داكوتا الجنوبية"], TN: ["Tennessee", "تينيسي"], TX: ["Texas", "تكساس"], UT: ["Utah", "يوتا"], VT: ["Vermont", "فيرمونت"], VA: ["Virginia", "فيرجينيا"],
  WA: ["Washington", "واشنطن"], WV: ["West Virginia", "فيرجينيا الغربية"], WI: ["Wisconsin", "ويسكونسن"], WY: ["Wyoming", "وايومنغ"], VI: ["US Virgin Islands", "جزر العذراء الأمريكية"],
  AB: ["Alberta, Canada", "ألبرتا، كندا"], BC: ["British Columbia, Canada", "كولومبيا البريطانية، كندا"], MB: ["Manitoba, Canada", "مانيتوبا، كندا"], NB: ["New Brunswick, Canada", "نيو برونزويك، كندا"],
  NL: ["Newfoundland and Labrador, Canada", "نيوفاوندلاند ولابرادور، كندا"], NS: ["Nova Scotia, Canada", "نوفا سكوشا، كندا"], ON: ["Ontario, Canada", "أونتاريو، كندا"], QC: ["Québec, Canada", "كيبيك، كندا"],
  SK: ["Saskatchewan, Canada", "ساسكاتشوان، كندا"], MOR: ["Morelos, Mexico", "موريلوس، المكسيك"]
};
const stateName = s => (STATE_NAMES[s] || [s, s])[lang === "ar" ? 1 : 0];
const placeById = id => PLACES.find(p => p.id === id);
const placeColor = p => p.t === "monastery" || p.t === "convent" ? "#8a6414" : p.t === "church" ? "#7a1f2b" : "#6b5a4c";
const placeHay = p => [p.n, p.c, p.s, stateName(p.s), STATE_NAMES[p.s] && STATE_NAMES[p.s].join(" "), p.a, T.en.ptype[p.t], T.ar.ptype[p.t], p.dio].filter(Boolean).join(" ");
const placeAddr = p => p.st ? p.a : `${p.n}, ${p.c}, ${p.s}`;
const placeMiles = p => { const R = 3958.8, r = Math.PI / 180, dLat = (p.la - userLoc.lat) * r, dLon = (p.lo - userLoc.lon) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLoc.lat * r) * Math.cos(p.la * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(a)); };
const fmtChecked = iso => fmtDate(parseDate(iso), { month: "long", day: "numeric", year: "numeric" });
const PLACE_OPEN = new Set(["NJ"]);
let activePlace = null;

function placeCard(p, miles) {
  const dir = placeAddr(p);
  return `<article class="card ccard pcard" data-pid="${p.id}" style="--cc:${placeColor(p)};cursor:pointer">
    <div><div class="city">${esc(p.c)}, ${esc(p.s)} · ${esc(t("ptype")[p.t])}${miles != null ? ` · <span class="num">${esc(fmtMi(miles))}</span>` : ""}</div><h2>${esc(p.n)}</h2></div>
    <div class="facts"><div class="fact"><span class="k">${t("address")}</span>${p.st ? `<span class="num">${esc(p.a)}</span>` : `<span class="missing">${esc(t("noStreet"))}</span>`}</div></div>
    <div class="actions" style="flex-wrap:wrap">
      ${p.p ? `<a class="btn primary" href="${telHref(p.p)}">${IC.phone}${t("call")}</a>` : ""}
      <details class="evmenu"><summary class="btn">${IC.pin}${t("directions")}</summary><div class="menu" style="inset-inline-start:0;inset-inline-end:auto;min-width:11rem">
        <a class="menu-item" href="${appleUrl(dir)}" target="_blank" rel="noopener">${t("apple")}</a>
        <a class="menu-item" href="${googleUrl(dir)}" target="_blank" rel="noopener">${t("google")}</a></div></details>
      ${p.w ? `<a class="btn" href="${esc(p.w)}" target="_blank" rel="noopener">${IC.globe}${t("visit")}</a>` : ""}
      <button class="btn" type="button" data-showmap="${p.id}">${IC.pin}${esc(t("showMap"))}</button>
    </div>
    <div class="cfoot"><span class="chip plain">${esc(t("verif")[p.v])}</span><span>${t("lastChecked")}: ${esc(fmtChecked(p.d))}</span></div>
  </article>`;
}
function placeGroupBody(list) { return `<div class="list">${list.map(p => placeCard(p)).join("")}</div>`; }
function renderPlaces(CQ, demoShown) {
  const box = $("#place-list"); if (!box) return;
  const list = CQ ? PLACES.filter(p => CQ(placeHay(p))) : PLACES;
  const by = {}; list.forEach(p => (by[p.s] = by[p.s] || []).push(p));
  Object.values(by).forEach(a => a.sort((x, y) => x.c.localeCompare(y.c) || x.n.localeCompare(y.n)));
  const CO_ORDER = { "": 0, Canada: 1, Mexico: 2 }, coOf = s => CO_ORDER[by[s][0].co || ""];
  const states = Object.keys(by).sort((a, b) => (a === "NJ" ? -1 : b === "NJ" ? 1 : coOf(a) - coOf(b) || stateName(a).localeCompare(stateName(b), loc())));
  let h = "";
  if (!CQ && userLoc) {
    const near = [...PLACES].map(p => [p, placeMiles(p)]).sort((a, b) => a[1] - b[1]).slice(0, 6);
    h += `<div class="sec-h"><h3>${esc(t("nearH"))}</h3></div><div class="list">${near.map(([p, m]) => placeCard(p, m)).join("")}</div>`;
  }
  if (list.length) {
    h += `<div class="sec-h" style="margin-top:8px"><h3>${esc(t("allH")(PLACES.length + churches.length))}</h3></div>`;
    if (!CQ && !userLoc) h += `<p class="muted" style="margin:-4px 0 4px;font-size:.84rem">${esc(t("setLocHint"))}</p>`;
    h += `<p class="muted" style="margin:-4px 0 4px;font-size:.84rem">${esc(t("basicNote"))}${t("nameNote") ? " " + esc(t("nameNote")) : ""}</p>`;
    h += states.map(s => { const open = CQ || PLACE_OPEN.has(s);
      return `<details class="grp" data-state="${s}"${open ? " open" : ""}><summary>${esc(stateName(s))}<span class="gn num">${by[s].length.toLocaleString(loc())}</span></summary><div class="grpbody">${open ? placeGroupBody(by[s]) : ""}</div></details>`; }).join("");
  } else if (!demoShown) h = `<div class="empty">${t("noneFound")}</div>`;
  box.innerHTML = h;
  box.querySelectorAll("details.grp").forEach(d => d.addEventListener("toggle", () => {
    const s = d.dataset.state;
    if (d.open) { if (!CQ) PLACE_OPEN.add(s); const body = d.querySelector(".grpbody"); if (!body.innerHTML) body.innerHTML = placeGroupBody(by[s]); }
    else if (!CQ) PLACE_OPEN.delete(s);
  }));
}
function placeSheet(id) {
  const p = placeById(id), dir = placeAddr(p);
  return `<div class="chips"><span class="chip gold">${esc(t("ptype")[p.t])}</span><span class="chip plain">${esc(t("verif")[p.v])}</span></div>
    <h2 id="sheet-title">${esc(p.n)}</h2>
    ${kv(t("addressL"), `${p.st ? `<span class="num">${esc(p.a)}</span>` : `${esc(p.c)}, ${esc(stateName(p.s))} <span class="missing">· ${esc(t("noStreet"))}</span>`}<br><a href="${appleUrl(dir)}" target="_blank" rel="noopener">${t("apple")}</a> · <a href="${googleUrl(dir)}" target="_blank" rel="noopener">${t("google")}</a>`)}
    ${p.p ? kv(t("phoneL"), `<a class="num" href="${telHref(p.p)}">${esc(p.p)}</a>`) : ""}
    ${p.w ? kv(t("visit"), `<a href="${esc(p.w)}" target="_blank" rel="noopener" style="overflow-wrap:anywhere">${esc(p.w.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a>`) : ""}
    ${p.dio ? kv(t("dioL"), esc(p.dio)) : ""}
    ${kv(t("statusL"), `${esc(fmtChecked(p.d))} · <a href="${esc(p.src)}" target="_blank" rel="noopener">${esc(t("sourceL"))}</a>`)}
    ${p.nt ? `<p class="note">${esc(p.nt)}</p>` : ""}
    <p class="note">${esc(t("basicNote"))}${p.la && !p.st ? " " + esc(t("townOnly")) : ""}</p>
    <div class="actions" style="justify-content:space-between"><button class="btn" type="button" data-showmap="${p.id}">${IC.pin}${esc(t("showMap"))}</button>${rptButton(`data-report="place:${p.id}"`)}</div>`;
}
function openPlace(id) { const p = placeById(id); if (!p) return; activePlace = id; map.draw(); openDetails({ kind: "place", id, title: { en: p.n, ar: p.n } }); }
function showPlaceOnMap(id) {
  const p = placeById(id); if (!p) return; closeSheet(); activePlace = id;
  if ($("#view-churches").hidden) setTab("churches");
  $("#mapbox").scrollIntoView({ behavior: "smooth", block: "start" }); map.flyTo(p.la, p.lo, 0.1);
}
document.addEventListener("click", e => {
  const sm = e.target.closest("[data-showmap]"); if (sm) { showPlaceOnMap(sm.dataset.showmap); return; }
  const pc = e.target.closest(".pcard[data-pid]");
  if (pc && !e.target.closest("a,button,summary,details.evmenu")) openPlace(pc.dataset.pid);
});
