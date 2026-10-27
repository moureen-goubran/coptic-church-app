import { useEffect, useRef, useState } from "preact/hooks";
import { SUPABASE_URL, SUPABASE_ANON_KEY, TURNSTILE_SITE_KEY, supabaseHeaders } from "../config";
import { screenMessage } from "../../../supabase/functions/_shared/screen";
import type { Strings } from "../i18n";
import type { Place } from "../lib/types";
import { KIND_ORDER } from "../lib/events";
import { norm } from "../lib/search";
import { placeName } from "./bits";

// The owner's email is in English whatever language the form is in.
const EN_KINDS: Record<string, string> = { liturgy: "Liturgy", praise: "Vespers & praises", bible: "Bible study", youth: "Youth & college", meeting: "Meeting",
  classes: "Classes", servants: "Servants", retreat: "Retreat or trip", social: "Fellowship" };

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

// "Suggest an event" church box: pick one of the app's churches (type to find it), or "Add a new church" to type one in.
function ChurchPick({ id, t, lang, churches, value, onPick }: { id: string; t: Strings; lang: string; churches: Place[]; value: string; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const name = (p: Place) => placeName(p, lang as "en" | "ar");
  const picked = churches.find(p => p.id === value);
  const toks = norm(find).split(" ").filter(Boolean);
  const list = churches.filter(p => !toks.length || (h => toks.every(x => h.includes(x)))(norm([p.name, p.name_ar, p.city, p.city_ar, p.state].filter(Boolean).join(" "))));
  const choose = (v: string) => { onPick(v); setOpen(false); setFind(""); };
  return (
    <div class="dd pick" ref={box}>
      <button id={id} type="button" class={"ddb" + (value ? " on" : "")} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{picked ? `${name(picked)}, ${picked.city} ${picked.state}` : value === "new" ? t.evNewChurch : t.evChurchPh}</span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {open && <div class="pop-panel ddp" role="listbox" aria-label={t.evChurch}>
        <input class="ddfind" type="search" placeholder={t.evChurchFind} aria-label={t.evChurchFind} value={find} autoFocus onInput={e => setFind((e.target as HTMLInputElement).value)} />
        <button type="button" role="option" aria-selected={value === "new"} class="opt add" onClick={() => choose("new")}>+ {t.evNewChurch}</button>
        {list.map(p => <button type="button" role="option" key={p.id} aria-selected={p.id === value} class="opt" onClick={() => choose(p.id)}>
          <span>{name(p)}</span><small class="muted">{[(lang === "ar" && p.city_ar) || p.city, p.state].filter(Boolean).join(" · ")}</small>
        </button>)}
        {!list.length && <p class="muted small">{t.evNoChurch}</p>}
      </div>}
    </div>
  );
}

// Also the Coptic Welcome suggestion box, "Is this your church?" and "Suggest an event" (same screening and bot check,
// their own wording). An event suggestion is emailed to the owner and saved in the private event_suggestions table
// (a typed-in church in church_suggestions); nothing shows in the app until it's checked and added by hand.
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
  const [ev, setEv] = useState({ church: "", kind: "", other: "", name: "", city: "", state: "", date: "", time: "" });
  const widget = useRef<HTMLDivElement>(null);
  const id = `${claim ? "claim" : isEvent ? "event" : "fix"}-${placeId ?? "app"}`;

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
    let event: object | undefined;
    if (isEvent) {
      if (!ev.church) { setProblem(t.evNeedChurch); return; }
      if (ev.church === "new" && (ev.name.trim().length < 3 || ev.city.trim().length < 2)) { setProblem(t.evNeedNew); return; }
      if (!ev.kind || (ev.kind === "other" && !ev.other.trim())) { setProblem(t.evNeedTitle); return; }
      const isNew = ev.church === "new";
      church = isNew ? null : ev.church;
      // Dates and times go in as words, so the phone-number screen doesn't mistake "2026-11-08" for a number.
      const day = ev.date && new Date(ev.date + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const at = ev.time && new Date(`2000-01-01T${ev.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const what = ev.kind === "other" ? `Other: ${ev.other.trim()}` : EN_KINDS[ev.kind] ?? ev.kind;
      text = [`Event: ${what}`, isNew && `New church (not in the app yet): ${[ev.name.trim(), ev.city.trim(), ev.state.trim()].filter(Boolean).join(", ")}`,
        day && `Date: ${day}`, at && `Time: ${at}`, msg.trim() && `Details: ${msg.trim()}`].filter(Boolean).join("\n");
      event = { kind: ev.kind, other: ev.other, date: ev.date, time: ev.time, details: msg,
        new_church: isNew ? { name: ev.name, city: ev.city, state: ev.state } : undefined };
    }
    const r = screenMessage(text);
    if (!r.ok) { setProblem(t.screen[r.reason]); return; }
    setProblem(null); setState("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-correction`, {
        method: "POST",
        headers: { "content-type": "application/json", ...supabaseHeaders() },
        body: JSON.stringify({ place_id: church, message: r.text, topic: claim ? "claim" : isEvent ? "event" : isReport ? topic : "suggestion", token, event }),
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
        <ChurchPick id={id + "-c"} t={t} lang={lang} churches={churches!} value={ev.church} onPick={v => setEv({ ...ev, church: v })} />
        {ev.church === "new" && <div class="newchurch">
          <label for={id + "-n"}>{t.evNewName}</label>
          <input id={id + "-n"} maxLength={140} autocomplete="off" placeholder={t.evNewNamePh} value={ev.name} onInput={e => setEv({ ...ev, name: (e.target as HTMLInputElement).value })} />
          <div class="two">
            <span><label for={id + "-ci"}>{t.evNewCity}</label><input id={id + "-ci"} maxLength={80} autocomplete="off" value={ev.city} onInput={e => setEv({ ...ev, city: (e.target as HTMLInputElement).value })} /></span>
            <span><label for={id + "-s"}>{t.evNewState}</label><input id={id + "-s"} maxLength={40} autocomplete="off" value={ev.state} onInput={e => setEv({ ...ev, state: (e.target as HTMLInputElement).value })} /></span>
          </div>
        </div>}
        <label for={id + "-k"}>{t.evWhat}</label>
        <select id={id + "-k"} value={ev.kind} onChange={e => setEv({ ...ev, kind: (e.target as HTMLSelectElement).value })}>
          <option value="" disabled>{t.evWhatPh}</option>
          {KIND_ORDER.map(k => <option key={k} value={k}>{t.kinds[k] ?? k}</option>)}
          <option value="other">{t.evOther}</option>
        </select>
        {ev.kind === "other" && <input aria-label={t.evOtherPh} maxLength={120} autocomplete="off" placeholder={t.evOtherPh} value={ev.other} onInput={e => setEv({ ...ev, other: (e.target as HTMLInputElement).value })} />}
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
