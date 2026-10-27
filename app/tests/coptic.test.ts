import { describe, it, expect } from "vitest";
import { copticParts, easter, feastsFor, upcomingFasts, fastOn, isWedFriFast, commDates, commOn, synaxUrl, parseIso } from "../src/lib/coptic";

// From the demo, which used copticchurch.net's published dates for 2026 and 2027.
const DEMO_FEASTS: [string, string, string][] = [["2026-01-07", "major", "Nativity"], ["2026-01-14", "minor", "Circumcision of our Lord"], ["2026-01-19", "major", "Theophany (Epiphany)"], ["2026-01-21", "minor", "Wedding at Cana"], ["2026-02-02", "fast", "Fast of Nineveh (Jonah's Fast)"], ["2026-02-15", "minor", "Entrance into the Temple"], ["2026-02-16", "fast", "Great Lent begins"], ["2026-04-05", "major", "Palm Sunday"], ["2026-04-07", "major", "Annunciation"], ["2026-04-09", "minor", "Covenant Thursday"], ["2026-04-10", "holy", "Good Friday"], ["2026-04-12", "major", "Feast of the Resurrection (Easter)"], ["2026-04-19", "minor", "Thomas Sunday"], ["2026-05-21", "major", "Ascension"], ["2026-05-31", "major", "Pentecost"], ["2026-06-01", "minor", "Entry of the Lord into Egypt"], ["2026-07-12", "other", "Feast of the Apostles"], ["2026-08-07", "fast", "St. Mary's Fast begins"], ["2026-08-19", "minor", "Transfiguration"], ["2026-08-22", "other", "Feast of St. Mary (Assumption)"], ["2026-11-25", "fast", "Nativity Fast begins"], ["2027-01-07", "major", "Nativity"], ["2027-01-14", "minor", "Circumcision of our Lord"], ["2027-01-19", "major", "Theophany (Epiphany)"], ["2027-01-21", "minor", "Wedding at Cana"], ["2027-02-15", "minor", "Entrance into the Temple"], ["2027-02-22", "fast", "Fast of Nineveh (Jonah's Fast)"], ["2027-03-08", "fast", "Great Lent begins"], ["2027-04-07", "major", "Annunciation"], ["2027-04-25", "major", "Palm Sunday"], ["2027-04-29", "minor", "Covenant Thursday"], ["2027-04-30", "holy", "Good Friday"], ["2027-05-02", "major", "Feast of the Resurrection (Easter)"], ["2027-05-09", "minor", "Thomas Sunday"], ["2027-06-01", "minor", "Entry of the Lord into Egypt"], ["2027-06-10", "major", "Ascension"], ["2027-06-20", "major", "Pentecost"], ["2027-07-12", "other", "Feast of the Apostles"], ["2027-08-07", "fast", "St. Mary's Fast begins"], ["2027-08-19", "minor", "Transfiguration"], ["2027-08-22", "other", "Feast of St. Mary (Assumption)"]];
const DEMO_FASTS: [string, string, string][] = [["2026-11-25", "2027-01-06", "2027-01-07"], ["2027-02-22", "2027-02-24", "2027-02-25"], ["2027-03-08", "2027-05-01", "2027-05-02"], ["2027-06-21", "2027-07-11", "2027-07-12"], ["2027-08-07", "2027-08-21", "2027-08-22"]];

describe("coptic calendar", () => {
  it("converts to Coptic dates, including the September 12 new year before a leap year", () => {
    expect(copticParts(parseIso("2026-09-11"))).toEqual({ day: 1, month: 1, year: 1743 });
    expect(copticParts(parseIso("2026-09-10"))).toEqual({ day: 5, month: 13, year: 1742 });
    expect(copticParts(parseIso("2027-09-12"))).toEqual({ day: 1, month: 1, year: 1744 });
    expect(copticParts(parseIso("2027-09-11"))).toEqual({ day: 6, month: 13, year: 1743 });
    expect(copticParts(parseIso("2026-10-26"))).toEqual({ day: 16, month: 2, year: 1743 });
  });

  it("finds Coptic Easter", () => {
    expect([2024, 2025, 2026, 2027, 2028, 2030].map(easter)).toEqual(["2024-05-05", "2025-04-20", "2026-04-12", "2027-05-02", "2028-04-16", "2030-04-28"]);
  });

  it("matches the published feast dates for 2026 and 2027", () => {
    const got = [...feastsFor(2026), ...feastsFor(2027)].filter(f => f.date <= "2027-08-31" && f.key !== "cross" && f.key !== "nayrouz").map(f => [f.date, f.kind, f.name.en]);
    expect(got).toEqual(DEMO_FEASTS);
  });

  it("adds Nayrouz and both Feasts of the Cross (10 Baramhat and 17 Tout)", () => {
    const d = (y: number, k: string) => feastsFor(y).filter(f => f.key === k).map(f => f.date);
    expect(d(2026, "nayrouz")).toEqual(["2026-09-11"]);
    expect(d(2027, "nayrouz")).toEqual(["2027-09-12"]);
    expect(d(2026, "cross")).toEqual(["2026-03-19", "2026-09-27"]);
    expect(d(2027, "cross")).toEqual(["2027-03-19", "2027-09-28"]);
  });

  it("moves fixed feasts a day after a Coptic leap year, but keeps Nativity on January 7", () => {
    const f = (y: number, en: string) => feastsFor(y).find(x => x.name.en === en)!.date;
    expect(f(2028, "Theophany (Epiphany)")).toBe("2028-01-20");
    expect(f(2028, "Nativity")).toBe("2028-01-07");
    expect(f(2027, "Theophany (Epiphany)")).toBe("2027-01-19");
  });

  it("lists each fast's current or next season", () => {
    expect(upcomingFasts("2026-10-26").map(f => [f.start, f.end, f.feast.date])).toEqual(DEMO_FASTS);
    expect(upcomingFasts("2026-12-01")[0].key).toBe("nativity");
    expect(fastOn("2027-01-06")?.key).toBe("nativity");
    expect(fastOn("2027-01-07")).toBeNull();
  });

  it("keeps Wednesday and Friday fasts except from Easter to Pentecost", () => {
    expect(isWedFriFast("2026-10-28")).toBe(true);
    expect(isWedFriFast("2026-10-27")).toBe(false);
    expect(isWedFriFast("2026-04-15")).toBe(false);
    expect(isWedFriFast("2026-06-03")).toBe(true);
  });

  it("finds the monthly commemorations and Synaxarium pages", () => {
    expect(commDates(21, "2026-10-26", 3)).toEqual(["2026-10-31", "2026-11-30", "2026-12-30"]);
    expect(commDates(12, "2026-10-26", 3)).toEqual(["2026-11-21", "2026-12-21", "2027-01-20"]);
    expect(commOn("2026-10-31")?.key).toBe("mary");
    expect(synaxUrl("2026-10-26")).toBe("https://st-takla.org/books/en/church/synaxarium/02-babah/16-baba.html");
  });
});

describe("feast background", () => {
  it("every feast and fast has English, Arabic and a trusted https source", async () => {
    const { ABOUT, fastAbout, fastsFor } = await import("../src/lib/coptic");
    const items = [...feastsFor(2026).map(f => ABOUT[f.key]), ...fastsFor(2026).map(f => fastAbout(f.key))];
    expect(items).toHaveLength(29);
    items.push(...Object.values(ABOUT));
    for (const a of items) {
      expect(a.en.length).toBeGreaterThan(40);
      expect(a.ar).toMatch(/[؀-ۿ]/);
      expect(new URL(a.src).hostname).toMatch(/^(www\.)?(st-takla\.org|lacopts\.org|(abbey\.)?suscopts\.org|copticchurch\.net)$/);
    }
  });
});
