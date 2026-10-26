// Writes public/data/places.json: the built-in copy the app ships with (used offline,
// and whenever the live database can't be reached).
import { mkdirSync, writeFileSync } from "node:fs";
import { loadData } from "./load-data.mjs";

const { places, services, details, clergy, links, errors } = loadData();
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const out = { generated: new Date().toISOString().slice(0, 10), places, services, details, clergy, links };
mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/places.json", import.meta.url), JSON.stringify(out));
console.log(`places.json: ${places.length} places, ${services.length} service times, ${links.length} links`);
