// Checks src/lib/logo-shapes.ts lists every church logo, so a new logo can't ship without its shape and colour.
import { readdirSync, readFileSync } from "node:fs";

export function checkLogoShapes() {
  const listed = readFileSync(new URL("../src/lib/logo-shapes.ts", import.meta.url), "utf8");
  const files = readdirSync(new URL("../public/logos/", import.meta.url)).filter(f => /\.(webp|png)$/.test(f));
  const missing = files.filter(f => !listed.includes(`"/logos/${f}"`));
  if (missing.length) throw new Error(`Logos missing from src/lib/logo-shapes.ts (run python3 tools/logo_shapes.py): ${missing.join(", ")}`);
  return files.length;
}
