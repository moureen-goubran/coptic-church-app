import { useEffect, useRef, useState } from "preact/hooks";
import { SUPABASE_URL, SUPABASE_ANON_KEY, TURNSTILE_SITE_KEY, supabaseHeaders } from "../config";
import { screenMessage } from "../../../supabase/functions/_shared/screen";
import type { Strings } from "../i18n";
import type { Place } from "../lib/types";
import { placeName } from "./bits";

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

// Also the Coptic Welcome suggestion box, "Is this your church?" and "Suggest an event" (same screening and bot check,
// their own wording). An event suggestion is only emailed to the owner; nothing shows in the app until it's added by hand.
export function CorrectionForm({ placeId, t, lang, intro, label, claim, churches }: { placeId: string | null; t: Strings; lang: string; intro?: string; label?: string; claim?: boolean; churches?: Place[] }) {
  const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && TURNSTILE_SITE_KEY);
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "fail">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [failCode, setFailCode] = useState("");
  // Reports (not the suggestion box) say what kind of problem it is; safety concerns are emailed as urgent.
  const [topic, setTopic] = useState<"info" | "safety" | "other">("info");
  const isEvent = Boolean(churches);
  const isReport = !intro && !claim && !isEvent;
  const [ev, setEv] = useState({ church: "", title: "", date: "", time: "" });
  const widget = useRef<HTMLDivElement>(null);
  const id = `${claim ? "claim" : isEvent ? "event" : "fix"}-${placeId ?? "app"}`;
  // "Church name, City ST": the same words the church box offers, so a picked church maps back to its id.
  const churchLabel = (p: Place) => `${placeName(p, lang as "en" | "ar")}, ${p.city} ${p.state}`;

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
    let text = msg, church = placeId;
    if (isEvent) {
      if (!ev.title.trim()) { setProblem(t.evNeedTitle); return; }
      const picked = churches!.find(p => churchLabel(p) === ev.church.trim());
      church = picked?.id ?? null;
      // Dates and times go in as words, so the phone-number screen doesn't mistake "2026-11-08" for a number.
      const day = ev.date && new Date(ev.date + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const at = ev.time && new Date(`2000-01-01T${ev.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      text = [`Event: ${ev.title.trim()}`, !picked && ev.church.trim() && `Church (typed): ${ev.church.trim()}`,
        day && `Date: ${day}`, at && `Time: ${at}`, msg.trim() && `Details: ${msg.trim()}`].filter(Boolean).join("\n");
    }
    const r = screenMessage(text);
    if (!r.ok) { setProblem(t.screen[r.reason]); return; }
    setProblem(null); setState("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-correction`, {
        method: "POST",
        headers: { "content-type": "application/json", ...supabaseHeaders() },
        body: JSON.stringify({ place_id: church, message: r.text, topic: claim ? "claim" : isEvent ? "event" : isReport ? topic : "suggestion", token }),
      });
      if (res.status === 422) { const { error } = await res.json(); setProblem(t.screen[error] ?? t.sendFail); setState("idle"); return; }
      // A short code after the failure message (e.g. "bot_check") tells the owner which step refused it.
      if (!res.ok) setFailCode(await res.json().then(b => [b.error, ...(b.codes ?? [])].filter(Boolean).join(" "), () => String(res.status)));
      setState(res.ok ? "sent" : "fail");
    } catch { setFailCode("network"); setState("fail"); }
    window.turnstile?.reset();
  };

  return (
    <form class="f" onSubmit={submit}>
      <p class="muted small">{claim ? t.claimIntro : isEvent ? t.evIntro : intro ?? t.reportIntro}</p>
      {isReport && <div class="topics" role="radiogroup" aria-label={t.reportLabel}>
        {(["info", "safety", "other"] as const).map(k => <button type="button" key={k} role="radio" aria-checked={topic === k} aria-pressed={topic === k} onClick={() => setTopic(k)}>{t.topics[k]}</button>)}
      </div>}
      {isReport && topic === "safety" && <p class="status warn" role="note">{t.safetyNow}</p>}
      {isEvent && <>
        <label for={id + "-c"}>{t.evChurch}</label>
        <input id={id + "-c"} list={id + "-cl"} autocomplete="off" placeholder={t.evChurchPh} value={ev.church} onInput={e => setEv({ ...ev, church: (e.target as HTMLInputElement).value })} />
        <datalist id={id + "-cl"}>{churches!.map(p => <option key={p.id} value={churchLabel(p)} />)}</datalist>
        <label for={id + "-t"}>{t.evWhat}</label>
        <input id={id + "-t"} maxLength={120} autocomplete="off" placeholder={t.evWhatPh} value={ev.title} onInput={e => setEv({ ...ev, title: (e.target as HTMLInputElement).value })} />
        <div class="two">
          <span><label for={id + "-d"}>{t.evDate}</label><input id={id + "-d"} type="date" value={ev.date} onInput={e => setEv({ ...ev, date: (e.target as HTMLInputElement).value })} /></span>
          <span><label for={id + "-h"}>{t.evTime}</label><input id={id + "-h"} type="time" value={ev.time} onInput={e => setEv({ ...ev, time: (e.target as HTMLInputElement).value })} /></span>
        </div>
      </>}
      <label for={id}>{claim ? t.claimLabel : isEvent ? t.evMore : label ?? t.reportLabel}</label>
      <textarea id={id} maxLength={1000} rows={4} value={msg} onInput={e => setMsg((e.target as HTMLTextAreaElement).value)} autocomplete="off" />
      <div ref={widget} />
      {problem && <p class="status warn" role="alert">{problem}</p>}
      {state === "fail" && <p class="status warn" role="alert">{t.sendFail}{failCode && <small class="muted"> ({failCode})</small>}</p>}
      <div><button class="btn primary" type="submit" disabled={state === "sending" || !token}>{state === "sending" ? t.sending : t.send}</button></div>
    </form>
  );
}
