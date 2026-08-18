// ── CrossAppHealthBadge ─────────────────────────────────────────────────
//
//   Admin SPA health badge that pings the consumer's `/api/webhooks/suby`
//   HEAD endpoint via the `probeConsumerWebhook` Cloud Function.
//
//   How it gets the admin PIN (Option A — inline, never persisted):
//   ─────────────────────────────────────────────────────────────────
//   The badge renders a tiny PIN input as its default state. The user
//   types their admin PIN once when they arrive; the value lives in
//   React component state (cleared on unmount) and is passed to the
//   callable on every probe. NO sessionStorage / localStorage / cookie.
//
//   Why not a higher-level pattern (PinGate inheritance, context cache)?
//   ────────────────────────────────────────────────────────────────────
//   - PinGate intentionally does NOT persist the plaintext PIN. Wiring
//     a cache into it would undermine the recent `requireAdminPin`
//     pepper hardening (P0-1 fix).
//   - Storing the PIN in sessionStorage would re-create the XSS
//     surface that the pepper audit closed.
//   - The probe is PIN-gated server-side for defense-in-depth. We
//     keep that boundary intact and pay the small UX cost of typing
//     the PIN once per page visit.
//
//   Contract:
//     • Polls every 60 seconds (configurable via pollIntervalMs). Manual
//       "Recheck now" forces a fresh probe (server-side cache bypass).
//     • State machine:
//         idle       → component just mounted, no probe yet
//         loading    → probe in flight (spinner)
//         ok-fast    → ok: true, latencyMs < 2000          (green)
//         ok-slow    → ok: true, latencyMs >= 2000         (amber)
//         unreachable → ok: false, httpCode != 200          (red)
//         error      → callable itself failed (PIN wrong / network)
//         locked     → no PIN yet, awaiting operator entry  (grey)
//     • On transition INTO unreachable or error: emit sonner toast so
//       the operator notices without watching the dashboard.

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Zap, AlertTriangle, CheckCircle2, RefreshCw,
  Clock, Globe, Lock, Unlock,
} from "lucide-react";
import { toast } from "sonner";
// Firebase removed — health badge degraded (no probe available)

const POLL_INTERVAL_MS = 60_000;
const FAST_LATENCY_MS = 2_000;

function deriveState(probe) {
  if (probe?.unavailable) return "unavailable";
  if (!probe) return "idle";
  if (probe.ok === true) {
    return probe.latencyMs < FAST_LATENCY_MS ? "ok-fast" : "ok-slow";
  }
  if (probe.ok === false) return "unreachable";
  return "idle";
}

const COPY = {
  idle:       { label: "Webhook consumer", sub: "Mesure initiale…",         color: "text-white/30",      bg: "oklch(1 0 0 / 4%)",           ring: "oklch(1 0 0 / 8%)",           icon: Clock,         pulse: false },
  locked:     { label: "Verrouillé",      sub: "PIN requis pour sonder",   color: "text-white/40",      bg: "oklch(1 0 0 / 4%)",           ring: "oklch(1 0 0 / 10%)",          icon: Lock,          pulse: false },
  loading:    { label: "Webhook consumer", sub: "Sonde en cours…",         color: "text-cyan",          bg: "oklch(0.74 0.13 209 / 6%)",   ring: "oklch(0.74 0.13 209 / 20%)",  icon: RefreshCw,     pulse: true },
  "ok-fast":  { label: "Consumer joignable", sub: "Latence optimale",       color: "text-emerald-400",  bg: "oklch(0.74 0.18 145 / 6%)",  ring: "oklch(0.74 0.18 145 / 18%)", icon: CheckCircle2,  pulse: true },
  "ok-slow":  { label: "Consumer joignable (lent)", sub: "Latence élevée — surveiller", color: "text-amber-400", bg: "oklch(0.78 0.16 75 / 6%)", ring: "oklch(0.78 0.16 75 / 20%)", icon: Zap, pulse: true },
  unreachable: { label: "Consumer injoignable", sub: "Vercel down ou URL changée", color: "text-rose",    bg: "oklch(0.62 0.20 25 / 7%)",   ring: "oklch(0.62 0.20 25 / 25%)",   icon: AlertTriangle, pulse: true },
  error:      { label: "Probe en erreur",   sub: "PIN rejeté ou réseau admin", color: "text-rose",        bg: "oklch(0.62 0.20 25 / 7%)",   ring: "oklch(0.62 0.20 25 / 25%)",   icon: Lock,          pulse: false },
  unavailable: { label: "Sonde non configurée", sub: "Aucun endpoint cross-app actif", color: "text-white/40", bg: "oklch(1 0 0 / 4%)", ring: "oklch(1 0 0 / 10%)", icon: Globe, pulse: false },
};

const CrossAppHealthBadge = ({
  adminPin: adminPinProp = null,
  targetUrl,
  pollIntervalMs = POLL_INTERVAL_MS,
}) => {
  // Option A: local PIN state. Empty + no prop ⇒ render the inline PIN
  // input. Set ⇒ probes + polls. Clear ⇒ revoke + re-prompt.
  const [localPin, setLocalPin] = useState("");
  const [pinBuffer, setPinBuffer] = useState(""); // what user is typing

  const effectivePin = adminPinProp || localPin;

  const [state, setState] = useState(adminPinProp || localPin ? "idle" : "unavailable");
  const [probe, setProbe] = useState(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [tickNow, setTickNow] = useState(0);
  const previousStateRef = useRef(state);

  // The former Firebase callable was removed with the Firebase migration.
  // Keep this widget explicit and quiet until a server-side probe endpoint is
  // deployed; never manufacture a failed network request or a misleading OK.
  const probeFn = useCallback(async () => ({
    data: { unavailable: true, error: "Sonde cross-app non configurée" },
  }), []);

  const runProbe = useCallback(async ({ force = false } = {}) => {
    if (!effectivePin) {
      setState("locked");
      return;
    }
    setState("loading");
    try {
      const payload = {
        adminPin: effectivePin,
        ...(targetUrl ? { url: targetUrl } : {}),
        ...(force ? { forceRefresh: true } : {}),
      };
      const { data } = await probeFn(payload);
      setProbe(data || null);
      setLastCheckedAt(Date.now());
      setState(deriveState(data));
    } catch (err) {
      const code = err?.code || "unknown";
      const msg = String(err?.message || err).slice(0, 160);
      setProbe({ ok: false, error: `${code}: ${msg}` });
      setLastCheckedAt(Date.now());
      // PIN-rejected errors should drop back to the locked view so the
      // operator can correct the PIN without re-mounting the badge.
      if (code === "permission-denied") {
        setState("locked");
        setLocalPin("");
      } else {
        setState("error");
      }
    }
  }, [effectivePin, targetUrl, probeFn]);

  // Toast on transitions INTO error / unreachable, AND recovery.
  useEffect(() => {
    const prev = previousStateRef.current;
    if (prev === state) return;
    if (state === "unreachable") {
      toast.error("⚠ Consumer webhook injoignable", {
        description:
          "Suby envoie les paiements ici. Une panne Vercel ou un changement d'URL peut bloquer l'activation premium.",
        duration: 8_000,
      });
    } else if (state === "error" && prev !== "error") {
      toast.error("✕ Probe cross-app en erreur", {
        description: "Vérifie la connectivité Vercel (fonctions api/*) et ton PIN admin.",
        duration: 6_000,
      });
    } else if (state === "ok-fast" && (prev === "unreachable" || prev === "error")) {
      toast.success("✓ Consumer webhook rétabli", {
        description: "Le pipeline Suby → consumer → admin est de nouveau nominal.",
        duration: 4_000,
      });
    }
    previousStateRef.current = state;
  }, [state]);

  // Polling loop — only kicks in once we have a PIN.
  useEffect(() => {
    if (!effectivePin) return;
    runProbe({ force: false });
    const id = setInterval(() => runProbe({ force: false }), pollIntervalMs);
    return () => clearInterval(id);
  }, [effectivePin, pollIntervalMs, runProbe]);

  // Age-decay re-render (every 1s).
  useEffect(() => {
    if (!lastCheckedAt) return;
    const id = setInterval(() => setTickNow((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [lastCheckedAt]);

  const onPinSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      const v = pinBuffer.trim();
      if (v.length < 1) return;
      setLocalPin(v);
      setPinBuffer("");
      // Reset probe state so the next render jumps into "loading".
      setProbe(null);
      setLastCheckedAt(null);
      setState("idle");
    },
    [pinBuffer],
  );

  const onPinClear = useCallback(() => {
    setLocalPin("");
    setPinBuffer("");
    setProbe(null);
    setLastCheckedAt(null);
    setState("locked");
  }, []);

  const copy = COPY[state] || COPY.idle;
  const Icon = copy.icon;

  const ageLabel = (() => {
    if (!lastCheckedAt) return "—";
    const sec = Math.max(0, Math.floor((Date.now() - lastCheckedAt) / 1000));
    if (sec < 60) return `actualisé il y a ${sec}s`;
    return `actualisé il y a ${Math.floor(sec / 60)} min`;
  })();

  const latencyLabel =
    typeof probe?.latencyMs === "number" ? `${probe.latencyMs} ms` : "—";

  const httpCodeLabel =
    typeof probe?.httpCode === "number" && probe.httpCode > 0
      ? `HTTP ${probe.httpCode}`
      : probe?.httpCode === 0
        ? "timeout"
        : "—";

  const urlLabel = probe?.targetUrl
    ? (() => {
        try {
          const u = new URL(probe.targetUrl);
          return `${u.hostname}${u.pathname}`;
        } catch {
          return probe.targetUrl.replace(/^https?:\/\//, "");
        }
      })()
    : "—";

  // No active server-side probe exists after Firebase removal. Do not ask
  // operators for a PIN for a feature that cannot perform a real probe.
  if (state === "unavailable") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-4 sm:p-5 flex items-center gap-3"
        style={{ borderColor: COPY.unavailable.ring, background: COPY.unavailable.bg }}
        data-testid="cross-app-health-badge"
        data-state="unavailable"
      >
        <Globe size={18} className="text-white/40 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Sonde non configurée</p>
          <p className="text-[10px] text-white/30 mt-0.5">Aucun endpoint cross-app actif depuis la migration Google Sheets.</p>
        </div>
      </motion.div>
    );
  }

  // ── Locked state: inline PIN input ──────────────────────────────────
  if (state === "locked") {
    return (
      <motion.form
        onSubmit={onPinSubmit}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{
          borderColor: copy.ring,
          background: copy.bg,
        }}
        data-testid="cross-app-health-badge"
        data-state="locked"
      >
        <Icon size={18} className={`${copy.color} shrink-0`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${copy.color}`}>
            {copy.label}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            Entre ton PIN admin pour sonder le webhook consumer — il reste en mémoire navigateur (jamais persisté).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinBuffer}
            onChange={(e) => setPinBuffer(e.target.value)}
            placeholder="••••"
            maxLength={8}
            className="input-tech w-28 text-center font-mono tracking-[0.5em] pl-[0.5em]"
            aria-label="PIN admin pour le badge cross-app"
          />
          <button
            type="submit"
            disabled={pinBuffer.length === 0}
            className="btn-tech text-[9px]"
            title="Déverrouiller le badge (PIN en mémoire React uniquement)"
          >
            <Unlock size={11} /> Déverrouiller
          </button>
        </div>
      </motion.form>
    );
  }

  // ── Active state: badge + metrics + action ─────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        borderColor: copy.ring,
        background: copy.bg,
      }}
      data-testid="cross-app-health-badge"
      data-state={state}
    >
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="relative h-10 w-10 rounded-xl flex items-center justify-center border"
          style={{
            background: "oklch(0.08 0.01 255 / 0.5)",
            borderColor: copy.ring,
          }}
        >
          <Icon
            size={18}
            className={`${copy.color} ${copy.pulse ? "animate-pulse" : ""} ${state === "loading" ? "animate-spin" : ""}`}
          />
          {state === "ok-fast" && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${copy.color}`}>
            <AnimatePresence mode="wait">
              <motion.span
                key={state}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {copy.label}
              </motion.span>
            </AnimatePresence>
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">{copy.sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-1 flex-wrap min-w-0">
        <Metric icon={Zap}      label="Latence" value={latencyLabel}
                tone={state === "ok-slow" ? "warn" : state === "unreachable" ? "bad" : "neutral"} />
        <Metric icon={Activity} label="Code"    value={httpCodeLabel}
                tone={state === "ok-fast" || state === "ok-slow" ? "good" : state === "unreachable" ? "bad" : "neutral"} />
        <Metric icon={Globe}    label="URL"     value={urlLabel} tone="neutral" wide />
        <Metric icon={Clock}    label="Âge"     value={ageLabel} tone="neutral" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => runProbe({ force: true })}
          disabled={state === "loading"}
          className="btn-tech text-[9px]"
          title="Force-refresh (bypass cache 30s côté CF)"
        >
          <RefreshCw size={11} className={state === "loading" ? "animate-spin" : ""} />
          Recheck
        </button>
        <button
          onClick={onPinClear}
          className="btn-tech text-[9px]"
          title="Effacer le PIN de la mémoire du badge (redemandera la saisie)"
        >
          <Lock size={11} />
        </button>
      </div>
    </motion.div>
  );
};

/* ── Metric sub-component ──────────────────────────────────────────── */

const TONE_CLASS = {
  good:    "text-emerald-400",
  warn:    "text-amber-400",
  bad:     "text-rose",
  neutral: "text-white/55",
};
const TONE_DOT = {
  good:    "bg-emerald-400 shadow-[0_0_6px_#10b981]",
  warn:    "bg-amber-400 shadow-[0_0_6px_#fbbf24]",
  bad:     "bg-rose shadow-[0_0_6px_#f43f5e]",
  neutral: "bg-white/15",
};
const Metric = ({ icon: Icon, label, value, tone = "neutral", wide = false }) => (
  <div
    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${wide ? "min-w-0 flex-1" : ""}`}
    style={{
      borderColor: "oklch(1 0 0 / 6%)",
      background: "oklch(0.08 0.01 255 / 0.3)",
    }}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
    <Icon size={10} className="text-white/30 shrink-0" />
    <span className="text-[8px] font-black uppercase tracking-widest text-white/25 shrink-0">
      {label}
    </span>
    <span className={`text-[10px] font-bold tabular-nums truncate ${TONE_CLASS[tone]}`}>
      {value}
    </span>
  </div>
);

export default CrossAppHealthBadge;
