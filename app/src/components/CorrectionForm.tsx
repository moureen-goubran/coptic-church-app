import { useEffect, useRef, useState } from "preact/hooks";
import { SUPABASE_URL, SUPABASE_ANON_KEY, TURNSTILE_SITE_KEY } from "../config";
import { screenMessage } from "../../../supabase/functions/_shared/screen";
import type { Strings } from "../i18n";

declare global { interface Window { turnstile?: any } }

let turnstileLoading: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  // Cloudflare's privacy-friendly bot check, loaded only when someone opens this form.
  turnstileLoading ??= new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.onload = () => ok(); s.onerror = () => { turnstileLoading = null; fail(); };
    document.head.appendChild(s);
  });
  return turnstileLoading;
}

export function CorrectionForm({ placeId, t, lang }: { placeId: string | null; t: Strings; lang: string }) {
  const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && TURNSTILE_SITE_KEY);
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "fail">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const widget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !widget.current) return;
    let id: string | undefined;
    loadTurnstile().then(() => {
      id = window.turnstile.render(widget.current, { sitekey: TURNSTILE_SITE_KEY, language: lang, callback: setToken, "expired-callback": () => setToken("") });
    }).catch(() => setState("fail"));
    return () => { if (id) window.turnstile?.remove(id); };
  }, [enabled]);

  if (!enabled) return <p class="muted small">{t.reportOff}</p>;
  if (state === "sent") return <p class="status ok" role="status">{t.sent}</p>;

  const submit = async (e: Event) => {
    e.preventDefault();
    const r = screenMessage(msg);
    if (!r.ok) { setProblem(t.screen[r.reason]); return; }
    setProblem(null); setState("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-correction`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ place_id: placeId, message: r.text, token }),
      });
      if (res.status === 422) { const { error } = await res.json(); setProblem(t.screen[error] ?? t.sendFail); setState("idle"); return; }
      setState(res.ok ? "sent" : "fail");
    } catch { setState("fail"); }
    window.turnstile?.reset();
  };

  return (
    <form class="f" onSubmit={submit}>
      <p class="muted small">{t.reportIntro}</p>
      <label for="fix">{t.reportLabel}</label>
      <textarea id="fix" maxLength={1000} rows={4} value={msg} onInput={e => setMsg((e.target as HTMLTextAreaElement).value)} autocomplete="off" />
      <div ref={widget} />
      {problem && <p class="status warn" role="alert">{problem}</p>}
      {state === "fail" && <p class="status warn" role="alert">{t.sendFail}</p>}
      <div><button class="btn primary" type="submit" disabled={state === "sending" || !token}>{state === "sending" ? t.sending : t.send}</button></div>
    </form>
  );
}
