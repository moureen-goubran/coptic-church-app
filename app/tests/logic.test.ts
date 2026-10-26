import { describe, it, expect } from "vitest";
import { matches, norm } from "../src/lib/search";
import { milesBetween } from "../src/lib/geo";
import { nextService, serviceKey } from "../src/lib/time";
import { fromService, nextDateFor, notOver, onDate, specialDates, upcomingItems } from "../src/lib/events";
import { googleCalUrl, icsText } from "../src/lib/cal";
import { screenMessage } from "../../supabase/functions/_shared/screen";
import { parseCsv } from "../scripts/csv.mjs";
import { loadData } from "../scripts/load-data.mjs";
import type { ChurchEvent, Place, Service } from "../src/lib/types";

const place = (o: Partial<Place>): Place => ({
  id: "x", name: "St. Mark Coptic Orthodox Church", name_ar: "كنيسة مارمرقس", type: "church", street: null, city: "Jersey City", city_ar: null,
  state: "NJ", zip: "07304", country: "US", diocese: null, website: null, phone: null, lat: 40.7, lng: -74.1, location_approx: false,
  verification: "unverified", last_verified: null, ...o,
});

describe("search", () => {
  it("finds by name, city, state code and state name, ignoring punctuation and 'saint'", () => {
    const p = place({});
    for (const q of ["st mark", "Saint Mark", "jersey", "NJ", "new jersey", "07304", "St. Mark's church"]) expect(matches(p, q.replace("'s", ""))).toBe(true);
    expect(matches(p, "bayonne")).toBe(false);
  });
  it("finds Arabic names with or without hamza and diacritics", () => {
    expect(matches(place({}), "مارمرقس")).toBe(true);
    expect(norm("أنبا")).toBe(norm("انبا"));
  });
});

describe("distance", () => {
  it("Jersey City to Bayonne is about 4 miles", () => {
    const d = milesBetween([40.7195, -74.0812], [40.6687, -74.1143]);
    expect(d).toBeGreaterThan(3); expect(d).toBeLessThan(5);
  });
});

describe("next service", () => {
  const svc = (day: number, start: string): Service => ({ place_id: "x", day, start, end: null, kind: "liturgy", title_en: "L", title_ar: null, room_en: null, room_ar: null, last_verified: null });
  it("picks later today, else the next day, wrapping the week", () => {
    const mon9am = new Date(2026, 9, 26, 9, 0); // Monday
    expect(nextService([svc(1, "19:00"), svc(0, "08:00")], mon9am)).toMatchObject({ inDays: 0 });
    expect(nextService([svc(1, "08:00"), svc(0, "08:00")], mon9am)).toMatchObject({ inDays: 6 });
    expect(nextService([svc(1, "08:00")], mon9am)).toMatchObject({ inDays: 7 });
    expect(nextService([], mon9am)).toBeNull();
  });
});

describe("corrections filter", () => {
  it("accepts a normal message", () => expect(screenMessage("The Sunday liturgy starts at 8 now, not 7.").ok).toBe(true));
  it.each([
    ["write me at kid@example.com", "email"],
    ["call 201 555 0199", "phone"],
    ["call ٢٠١٥٥٥٠١٩٩٩", "phone"],
    ["join chat.whatsapp.com/abc", "link"],
    ["see https://x.y", "link"],
    ["dm me @someone123", "social"],
    ["hi", "length"],
  ])("blocks %s", (text, reason) => expect(screenMessage(text)).toEqual({ ok: false, reason }));
});

describe("data files", () => {
  it("parses quoted CSV", () => {
    expect(parseCsv('a,b\n"x, ""y""",2\n')).toEqual([{ a: 'x, "y"', b: "2" }]);
  });
  it("master data is valid and every place has a map point", () => {
    const { places, services, errors } = loadData();
    expect(errors).toEqual([]);
    expect(places.every((p: any) => p.lat !== null)).toBe(true);
    expect(services.length).toBeGreaterThan(0);
  });
});

describe("events", () => {
  const s = (day: number, start: string): Service => ({ place_id: "x", day, start, end: null, kind: "liturgy", title_en: `${day} ${start}`, title_ar: null, room_en: null, room_ar: null, last_verified: null });
  const ev = (o: Partial<ChurchEvent>): ChurchEvent => ({ place_id: "x", date: null, end_date: null, start: null, end: null, kind: "meeting", title_en: "E", title_ar: null, room_en: null, room_ar: null, last_verified: null, ...o });
  const now = new Date(2026, 9, 26, 9, 0); // Monday, October 26, 9:00

  it("lists two weeks of services and special dates in order, skipping what already started today", () => {
    const list = upcomingItems([s(1, "08:00"), s(1, "19:00"), s(0, "08:00")], [ev({ title_en: "Vespers", date: "2026-10-27", start: "19:00" }), ev({ title_en: "Far", date: "2026-12-01", start: "10:00" })], now);
    expect(list.map(i => [i.title_en, i.date])).toEqual([["1 19:00", "2026-10-26"], ["Vespers", "2026-10-27"], ["0 08:00", "2026-11-01"], ["1 08:00", "2026-11-02"],
      ["1 19:00", "2026-11-02"], ["0 08:00", "2026-11-08"]]);
  });
  it("keeps an event listed until it ends, and a retreat for all its days", () => {
    expect(notOver(ev({ date: "2026-10-26", start: "08:00", end: "10:00" }), now)).toBe(true);
    expect(notOver(ev({ date: "2026-10-26", start: "08:00" }), now)).toBe(false);
    expect(notOver(ev({ date: "2026-10-25", end_date: "2026-10-27" }), now)).toBe(true);
    expect(notOver(ev({ date: "2026-10-25" }), now)).toBe(false);
    expect(specialDates([ev({ date: "2026-11-02", title_en: "B" }), ev({ date: "2026-10-24", end_date: "2026-10-28", title_en: "A" }), ev({ title_en: "undated" })], now).map(i => i.title_en)).toEqual(["A", "B"]);
  });
  it("finds the next date for a weekly service, and everything on one date", () => {
    expect(nextDateFor(1, "08:00", now)).toBe("2026-11-02");
    expect(nextDateFor(1, "19:00", now)).toBe("2026-10-26");
    expect(onDate([s(0, "08:00"), s(1, "08:00")], [ev({ date: "2026-10-31", end_date: "2026-11-01", start: "07:00", title_en: "Retreat" })], "2026-11-01").map(i => i.title_en)).toEqual(["Retreat", "0 08:00"]);
  });
  it("saves a weekly service under the same key as before", () => {
    expect(fromService(s(0, "08:00"), "2026-11-01").key).toBe(serviceKey(s(0, "08:00")));
  });
});

describe("calendar", () => {
  it("makes timed and all-day calendar entries", () => {
    const timed = icsText({ title: "Vespers, St. Mark", date: "2026-11-06", start: "20:00", location: "St. Mark; Jersey City" }, new Date(Date.UTC(2026, 9, 26)));
    expect(timed).toContain("DTSTART:20261106T200000\r\nDTEND:20261106T210000");
    expect(timed).toContain("SUMMARY:Vespers\\, St. Mark");
    expect(timed).toContain("LOCATION:St. Mark\\; Jersey City");
    expect(icsText({ title: "Retreat", date: "2026-11-06", endDate: "2026-11-08" })).toContain("DTEND;VALUE=DATE:20261109");
    expect(googleCalUrl({ title: "Vespers", date: "2026-11-06", start: "20:00", end: "20:45" })).toContain("dates=20261106T200000%2F20261106T204500");
  });
});
