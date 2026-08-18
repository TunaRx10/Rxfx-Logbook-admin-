/* This module intentionally exports the composed DataState namespace. */
/* eslint-disable react-refresh/only-export-components */
import { motion } from "framer-motion";
import { loadGuard } from "./data-state";
import {
  Loader2, AlertTriangle, Inbox, Database,
  Plug, ExternalLink, RefreshCw,
} from "lucide-react";
// Note: motion.div is used in Empty + motion entry/exit transitions

/**
 * DataState — single source of truth for "no / loading / errored / OK"
 * in the admin app. Use one of the four sub-components (`DataState.Loading`,
 * `DataState.Empty`, `DataState.Error`, `DataState.BackendMissing`) so
 * every page renders the same look during outages.
 *
 * Rationale: before this existed, half the pages toasted raw "Error
 * fetching applications" / "Erreur lors du chargement des produits Suby"
 * which (a) is unactionable, (b) flashes a misleading error in local
 * dev when the backend simply isn't configured, and (c) had inconsistent
 * empty states. Now every page renders the same canonical states.
 */
const SHELL_CLS =
  "rounded-2xl border flex flex-col items-center justify-center text-center p-8 sm:p-12 space-y-4";
const SHELL_BORDER = "border-white/5";
const SHELL_BG = "oklch(0.13 0.02 255 / 0.4)";

const Loading = ({ label = "Loading…", rows = 3 }) => (
  <div className={SHELL_CLS} style={{ borderColor: "oklch(1 0 0 / 7%)", background: SHELL_BG }}>
    <Loader2 className="text-cyan animate-spin" size={28} />
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{label}</p>
    <div className="w-full max-w-sm space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-shimmer h-3 rounded-full opacity-60" />
      ))}
    </div>
  </div>
);

const Empty = ({ icon: Icon = Inbox, title, message, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className={SHELL_CLS}
    style={{ borderColor: "oklch(1 0 0 / 7%)", background: SHELL_BG }}
  >
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
      <Icon size={28} className="text-white/15" />
    </div>
    <div className="space-y-1">
      <p className="text-sm font-bold text-white/60">{title}</p>
      {message && (
        <p className="text-xs text-white/25 max-w-md mx-auto leading-relaxed">{message}</p>
      )}
    </div>
    {action}
  </motion.div>
);

/**
 * BackendMissing — the canonical "Apps Script isn't configured" state.
 * Triggered when the Apps Script deployment URL is missing or responds
 * in HTML (expired deployment). Surfaces a single CTA pointing the
 * operator to the configuration, instead of alarming with an error toast.
 */
const BackendMissing = ({ onGoToSettings }) => (
  <Empty
    icon={Plug}
    title="Backend not configured"
    message="Configurez VITE_GOOGLE_APPS_SCRIPT_URL (déploiement Apps Script « Anyone ») pour activer cette page."
    action={
      <button
        type="button"
        onClick={onGoToSettings ?? (() => (window.location.href = "/settings"))}
        className="btn-tech btn-tech-primary text-[10px] mt-2"
      >
        <Database size={12} /> Open Settings
        <ExternalLink size={12} />
      </button>
    }
  />
);

/**
 * Error — fallback for anything OTHER than "backend not configured".
 * Use sparingly. Most "errors" in dev come from missing Apps Script config
 * (see BackendMissing) — only render this when the failure is genuinely
 * unexpected (e.g. the deployment returns 401/403).
 */
const Error = ({ title = "Something went wrong", message, onRetry }) => (
  <Empty
    icon={AlertTriangle}
    title={title}
    message={message || "An unexpected error occurred. Try again."}
    action={
      onRetry && (
        <button type="button" onClick={onRetry} className="btn-tech text-[10px] mt-2">
          <RefreshCw size={12} /> Retry
        </button>
      )
    }
  />
);

export const DataState = { Loading, Empty, Error, BackendMissing, loadGuard };
export default DataState;