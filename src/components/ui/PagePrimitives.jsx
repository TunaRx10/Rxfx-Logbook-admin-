
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

/* ── PageShell ───────────────────────────────────────────────
 * Standard wrapper for every admin page. Provides the canonical
 * `p-6 md:p-10` padding, full-height background, and entry fade-in
 * matched to AdminLayout's <AnimatePresence> route transition.
 */
export const PageShell = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={cn("p-6 md:p-10 min-h-screen", className)}
  >
    {children}
  </motion.div>
);

/* ── PageHeader ──────────────────────────────────────────────
 * The single source of truth for every page's title region:
 *   - Sparkles icon + uppercase eyebrow
 *   - "Title" + cyan-highlighted highlight word
 *   - Optional subtitle
 *   - Optional right-aligned actions row
 * Normalised to `text-4xl` (overrides the wildly-varied text-5/7xl
 * styles that existed across individual pages).
 */
export const PageHeader = ({
  eyebrow,
  title,
  highlight,
  subtitle,
  actions,
}) => (
  <header
    className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10 pb-10"
    style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}
  >
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan/60">
          {eyebrow}
        </span>
      </div>
      <h1 className="text-4xl font-black tracking-tight text-white">
        {title} <span className="text-cyan">{highlight}</span>
      </h1>
      {subtitle && (
        <p className="text-sm text-white/25 font-medium">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </header>
);

/* ── Section ─────────────────────────────────────────────────
 * Grouped content block: optional icon, title, hairline divider,
 * trailing action (e.g. "Save Config" button).
 * Use for grouping multiple SettingCards, KPI grids, etc.
 */
export const Section = ({
  title,
  icon: Icon,
  accent = "cyan",
  children,
  className,
  action,
  trailing = true,
}) => {
  const iconBox =
    accent === "cyan"
      ? "bg-cyan/10 border-cyan/20 text-cyan"
      : accent === "warning"
      ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
      : accent === "critical"
      ? "bg-rose/10 border-rose/20 text-rose"
      : "bg-white/5 border-white/10 text-cyan";

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div
            className={cn(
              "p-3 rounded-2xl border flex items-center justify-center",
              iconBox
            )}
          >
            <Icon size={20} />
          </div>
        )}
        <h3 className="text-xl font-black text-white">{title}</h3>
        {trailing && <div className="flex-1 h-px bg-white/5" />}
        {action}
      </div>
      {children}
    </section>
  );
};
