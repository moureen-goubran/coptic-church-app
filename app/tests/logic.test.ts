import { describe, it, expect } from "vitest";
import { matches, norm } from "../src/lib/search";
import { milesBetween } from "../src/lib/geo";
import { nextService } from "../src/lib/time";
import { screenMessage } from "../../supabase/functions/_shared/screen";
import { parseCsv } from "../scripts/csv.mjs";
import { loadData } from "../scripts/load-data.mjs";
import type { Place, Service } from "../src/lib/types";

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

describe("upcoming services", () => {
  it("lists the next two weeks of weekly services in order, skipping ones already started today", async () => {
    const { upcoming } = await import("../src/lib/time");
    const s = (day: number, start: string): Service => ({ place_id: "x", day, start, end: null, kind: "liturgy", title_en: `${day} ${start}`, title_ar: null, room_en: null, room_ar: null, last_verified: null });
    const now = new Date(2026, 9, 26, 9, 0); // Monday 9:00
    const list = upcoming([s(1, "08:00"), s(1, "19:00"), s(0, "08:00")], now);
    expect(list.map(o => [o.s.title_en, o.inDays])).toEqual([["1 19:00", 0], ["0 08:00", 6], ["1 08:00", 7], ["1 19:00", 7], ["0 08:00", 13]]);
  });
});
