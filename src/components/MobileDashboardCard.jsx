
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";

/* ── Simple SVG sparkline ────────────────────────────────── */
function Sparkline({ data, height = 100, color = "var(--cyan)" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 300;
  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = innerW / (data.length - 1);
  const points = data.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + innerH - (v / max) * innerH;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(" L")}`;
  const areaD = `${pathD} L${padding + innerW},${padding + innerH} L${padding},${padding + innerH} Z`;
  const lastPoint = points[points.length - 1];
  const [lastX, lastY] = lastPoint.split(",").map(Number);

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-fill-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-fill-${color.replace(/[^a-zA-Z0-9]/g, "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="5" fill={color} style={{ filter: "drop-shadow(0 0 8px var(--cyan))" }} />
      <circle cx={lastX} cy={lastY} r="9" fill={color} opacity="0.2" className="animate-ping" />
    </svg>
  );
}

/* ── MobileDashboardCard ─────────────────────────────────── */
export function MobileDashboardCard({
  title,
  subtitle = "Updated just now",
  icon: Icon,
  accentColor = "text-cyan",
  glowColor = "oklch(0.74 0.13 209 / 0.12)",
  leftStat,
  rightStat,
  sparklineData,
  ctaLabel = "View Full Report",
  onCta,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="group relative w-full overflow-hidden rounded-2xl p-5 shadow-2xl"
      style={{
        background: "oklch(0.12 0.02 255 / 0.95)",
        border: "1px solid oklch(1 0 0 / 6%)",
      }}
    >
      <div
        className="absolute -top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl transition-all duration-700 group-hover:opacity-70"
        style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)`, opacity: 0.5 }}
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "color-mix(in oklab, var(--cyan) 10%, transparent)" }}
            >
              <Icon className={`h-5 w-5 ${accentColor}`} />
            </div>
            <div>
              <p className="font-semibold text-sm text-white/90">{title}</p>
              <p className="text-[10px] text-white/30">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex divide-x" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          <div className="flex-1 pr-5">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">{leftStat.label}</p>
            <p className="text-xl font-bold text-white/95 mt-0.5">{leftStat.value}</p>
            {leftStat.trend && (
              <p className={`mt-1 text-[10px] font-semibold flex items-center gap-0.5 ${
                leftStat.trend.direction === "up" ? "text-emerald" : "text-rose"
              }`}>
                {leftStat.trend.direction === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {leftStat.trend.label}
              </p>
            )}
          </div>
          <div className="flex-1 pl-5">
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">{rightStat.label}</p>
            <p className="text-xl font-bold text-white/95 mt-0.5">{rightStat.value}</p>
            {rightStat.trend && (
              <p className={`mt-1 text-[10px] font-semibold flex items-center gap-0.5 ${
                rightStat.trend.direction === "up" ? "text-emerald" : "text-rose"
              }`}>
                {rightStat.trend.direction === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {rightStat.trend.label}
              </p>
            )}
          </div>
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="relative h-24 w-full">
            <Sparkline data={sparklineData} height={100} color="var(--cyan)" />
          </div>
        )}

        <div className="border-t pt-4" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          <button
            onClick={onCta}
            className="w-full rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5"
            style={{
              borderColor: "color-mix(in oklab, var(--cyan) 40%, transparent)",
              color: "var(--cyan)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--cyan)";
              e.currentTarget.style.color = "oklch(0.05 0 0)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--cyan)";
            }}
          >
            {ctaLabel}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── MobileDashboardCards grid ───────────────────────────── */
export function MobileDashboardCards({ cards }) {
  return (
    <div className="md:hidden space-y-4 mb-6">
      {cards.map((card, i) => (
        <MobileDashboardCard key={i} {...card} />
      ))}
    </div>
  );
}
