// Corrections-box filter, shared by the app (instant feedback) and the server (enforcement).
// Blocks anything that looks like contact info or a link, so no one can use the box to reach a child.
const PATTERNS: [string, RegExp][] = [
  ["email", /[^\s@]+@[^\s@]+\.[^\s@]+/],
  ["link", /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|org|net|io|me|app|ly|co|us|info|gg|tv)\b)/i],
  ["phone", /(\+?\d[\d\s().-]{7,}\d)/],
  ["social", /(^|\s)@[a-z0-9_.]{3,}/i],
];

export type ScreenResult = { ok: true; text: string } | { ok: false; reason: "length" | "email" | "link" | "phone" | "social" };

export function screenMessage(input: string): ScreenResult {
  const text = input.normalize("NFKC").replace(/[​-‏‪-‮⁦-⁩]/g, "").trim();
  if (text.length < 3 || text.length > 1000) return { ok: false, reason: "length" };
  // Arabic-Indic digits count as digits for the phone check.
  const latin = text.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));
  for (const [reason, re] of PATTERNS) if (re.test(latin)) return { ok: false, reason: reason as any };
  return { ok: true, text };
}
