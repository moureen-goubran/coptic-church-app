// Small per-phone preferences (language, text size, theme). Never personal data.
export const store = {
  get<T>(k: string, fallback: T): T {
    try { const v = localStorage.getItem("mcc." + k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(k: string, v: unknown) { try { localStorage.setItem("mcc." + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
