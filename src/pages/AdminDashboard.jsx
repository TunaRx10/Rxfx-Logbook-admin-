import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getAdminStats, getTradesSummary, getAllUsers, listTable, safeCallProxy } from "../lib/supabase-admin";
import {
  Activity, Users, DollarSign, TrendingUp, RefreshCw,
  Database, Zap, Server, ShieldCheck, AlertTriangle,
  MoreHorizontal, Hash, Sparkles
} from "lucide-react";
import { isChatReady } from "../lib/admin-ai";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { MobileDashboardCards } from "../components/MobileDashboardCard";
import { cn } from "../lib/utils";

// Shared class for the retired Sync buttons (Apps Script bridges superseded by Suby/Supabase).
// Single source of truth so the disabled-hover override stays in sync if btn-tech evolves.
const RETIRED_BTN_CLS =
  "btn-tech opacity-40 cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-white/40";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, proUsers: 0, eliteUsers: 0, starterUsers: 0, totalTrades: 0, totalPnl: 0 });
  const [tradesSum, setTradesSum] = useState({ totalTrades: 0, totalPnl: 0, winRate: 0, wins: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [identityNodes, setIdentityNodes] = useState([]);

  // ── Migration state ──
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [migrationError, setMigrationError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getAdminStats();
      setStats(s);
      const t = await getTradesSummary();
      setTradesSum(t);

      // Fetch recent profiles as identity nodes via the secure proxy
      // Using getAllUsers ensures we get the most recent ones (sorted by created_at)
      try {
        const recentProfiles = await getAllUsers();
        if (recentProfiles) {
          setIdentityNodes(recentProfiles.slice(0, 10).map(p => ({
            uid: p.id, // Keep full ID for key
            id: p.id?.slice(0, 8) || '---',
            displayName: p.display_name || p.email?.split('@')[0] || 'Unknown',
            email: p.email || '',
            status: p.email ? 'ACTIVE' : 'PENDING',
            createdAt: p.created_at || '',
          })));
        }
      } catch (profilesErr) {
        console.warn("[Dashboard] Could not load identity nodes:", profilesErr);
      }
    } catch (err) {
      console.error("[Dashboard] Supabase call failed:", err);
      const msg = err?.message || String(err);
      const code = err?.code || "unknown";
      if (code === "permission-denied" || msg.includes("permission-denied")) {
        setError("Accès refusé. Vérifiez votre code PIN.");
      } else {
        setError(`[${code}] ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔧 DEV-ONLY: hand the user a "Appliquer migrations" button that
  // applies pending SQL migrations against the live Supabase database
  // via the server-side proxy.
  const handleApplyMigrations = useCallback(async () => {
    setMigrating(true);
    setMigrationResult(null);
    setMigrationError(null);
    try {
      const data = await safeCallProxy("applyMigrations", {});
      setMigrationResult(data);
      // Refresh dashboard data after successful migration
      loadData();
    } catch (err) {
      setMigrationError(err.message || "Erreur réseau");
    } finally {
      setMigrating(false);
    }
  }, [loadData]);

  const formatCurrency = (n) => {
    const val = Number(n || 0);
    const sign = val > 0 ? "+" : "";
    return `${sign}$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-cyan",
      bg: "bg-cyan/10 border-cyan/20"
    },
    {
      label: "Active Subs",
      value: stats.activeUsers,
      icon: Activity,
      color: "text-emerald",
      bg: "bg-emerald/10 border-emerald/20"
    },
    {
      label: "Pro & Elite",
      value: stats.proUsers + stats.eliteUsers,
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-400/20"
    },
    {
      label: "Total Trades",
      value: tradesSum.totalTrades,
      icon: Hash,
      color: "text-violet-400",
      bg: "bg-violet-400/10 border-violet-400/20"
    },
    {
      label: "Total P&L",
      value: tradesSum.totalPnl != null ? formatCurrency(tradesSum.totalPnl) : "$0.00",
      icon: DollarSign,
      color: (tradesSum.totalPnl || 0) >= 0 ? "text-emerald" : "text-rose",
      bg: (tradesSum.totalPnl || 0) >= 0 ? "bg-emerald/10 border-emerald/20" : "bg-rose/10 border-rose/20"
    },
  ];

  const systemStatuses = [
    { label: "Supabase Client", status: error ? "Error" : "Connected", color: error ? "text-rose" : "text-emerald" },
    { label: "Supabase Auth", status: "Active", color: "text-emerald" },
    { label: "Data Layer", status: (stats.totalUsers > 0 || tradesSum.totalTrades > 0) ? "Populated" : "Empty", color: (stats.totalUsers > 0 || tradesSum.totalTrades > 0) ? "text-emerald" : "text-white/30" },
    { label: "API Health", status: error ? "Offline" : "OK", color: error ? "text-rose" : "text-emerald" },
  ];

  const chatReady = isChatReady();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin Terminal"
        title="Supabase"
        highlight="Mainframe"
        subtitle="Real-time system overview and controls."
        actions={
          <>
            {chatReady && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("admin-open-chat"))}
                className="btn-tech text-cyan border-cyan/20 hover:border-cyan/40 flex items-center gap-1.5"
              >
                <Sparkles size={14} className="text-cyan" />
                Chat IA
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="btn-tech text-cyan border-cyan/20 hover:border-cyan/40"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 
              {loading ? "Chargement..." : "Rafraîchir"}
            </button>
            {/* ── Retired: legacy Apps Script bridges reached endpoints decommissioned
                during the Suby migration. Honest UI = disabled + tooltip rather
                than fire-and-forget at a 404 (the previous toast falsely showed
                "Sync déclenché"). Both controls can be deleted once Supabase is
                confirmed as the single source of truth. */}
            <button
              type="button"
              disabled
              title="Bridge Apps Script retiré — la synchronisation Paiements passe désormais par Suby (webhooks → Supabase)."
              className={RETIRED_BTN_CLS}
            >
              <RefreshCw size={14} /> Sync Paiements
            </button>
            <button
              type="button"
              disabled
              title="Bridge Apps Script retiré — la base de données est directement servie par Supabase."
              className={RETIRED_BTN_CLS}
            >
              <Database size={14} /> Sync Base
            </button>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleApplyMigrations}
                disabled={migrating}
                className="btn-tech text-emerald border-emerald/20 hover:border-emerald/40"
                title="Applique les migrations SQL pending en développement"
              >
                <Database size={14} className={migrating ? "animate-spin" : ""} />
                {migrating ? "Migration..." : "Appliquer migrations"}
              </button>
            )}
          </>
        }
      />

      {/* Migration Results Banner */}
      {(migrationResult || migrationError) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-start gap-3 px-5 py-4 mb-8 rounded-xl border",
            migrationError ? "border-rose/20 bg-rose/5" : "border-emerald/20 bg-emerald/5"
          )}
        >
          {migrationError ? (
            <AlertTriangle size={16} className="text-rose shrink-0 mt-0.5" />
          ) : (
            <Database size={16} className="text-emerald shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              migrationError ? "text-rose/60" : "text-emerald/60"
            )}>
              {migrationError ? "Erreur migration" : "Résultat des migrations"}
            </p>
            {migrationError && (
              <p className="text-xs text-rose/40 mt-1">{migrationError}</p>
            )}
            {migrationResult && (
              <>
                <p className="text-xs text-emerald/60 mt-1">
                  {migrationResult.applied ?? 0} appliquées, {migrationResult.skipped ?? 0} ignorées sur {migrationResult.total ?? 0} fichiers.
                </p>
                {migrationResult.message && (
                  <p className="text-xs text-white/30 mt-1">{migrationResult.message}</p>
                )}
                {migrationResult.files && migrationResult.files.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
                    {migrationResult.files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        <span className={cn(
                          "shrink-0 h-1.5 w-1.5 rounded-full",
                          f.status === "applied" || f.status === "already_applied" ? "bg-emerald" : "bg-rose"
                        )} />
                        <span className="text-white/30 font-mono truncate">{f.file}</span>
                        <span className={cn(
                          "shrink-0 font-bold uppercase",
                          f.status === "applied" ? "text-emerald/50" : f.status === "already_applied" ? "text-amber/50" : "text-rose/50"
                        )}>
                          {f.status === "applied" ? "✓" : f.status === "already_applied" ? "déjà fait" : f.error?.slice(0, 40) || "✗"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <button
            onClick={() => { setMigrationResult(null); setMigrationError(null); }}
            className="shrink-0 text-white/20 hover:text-white/50 transition text-xs"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-5 py-4 mb-8 rounded-xl border border-rose/20 bg-rose/5"
        >
          <AlertTriangle size={16} className="text-rose shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose/60">Erreur de données</p>
            <p className="text-xs text-rose/40 mt-0.5 font-mono">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto btn-tech text-[9px] py-1.5 px-3 border-rose/20 hover:border-rose/40 hover:text-rose"
          >
            <RefreshCw size={12} /> Recharger
          </button>
        </motion.div>
      )}


      {/* ── Mobile Dashboard Cards (Uiverse-inspired) ── */}
      {!loading && (
        <MobileDashboardCards
          cards={[
            {
              title: "Global Metrics",
              subtitle: "Real-time overview",
              icon: Activity,
              accentColor: "text-cyan",
              glowColor: "oklch(0.74 0.13 209 / 0.12)",
              leftStat: {
                label: "Total Users",
                value: String(stats.totalUsers),
                trend: stats.activeUsers > 0 ? { direction: "up", label: `${stats.activeUsers} Active` } : undefined,
              },
              rightStat: {
                label: "Premium Users",
                value: String(stats.proUsers + stats.eliteUsers),
                trend: (stats.proUsers + stats.eliteUsers) > 0 ? { direction: "up", label: "Elite/Pro" } : undefined,
              },
              ctaLabel: "View Registry",
              onCta: () => navigate("/users"),
            },
            {
              title: "Trading Activity",
              subtitle: tradesSum.totalTrades > 0 ? `${tradesSum.totalTrades} trades` : "No data yet",
              icon: TrendingUp,
              accentColor: "text-emerald",
              glowColor: "oklch(0.87 0.27 142 / 0.12)",
              leftStat: {
                label: "Total P&L",
                value: formatCurrency(tradesSum.totalPnl),
                trend: (tradesSum.totalPnl || 0) >= 0 ? { direction: "up", label: "Profit" } : { direction: "down", label: "Loss" },
              },
              rightStat: {
                label: "Win Rate",
                value: `${tradesSum.winRate || 0}%`,
                trend: (tradesSum.winRate || 0) >= 50 ? { direction: "up", label: "Positive" } : { direction: "down", label: "Improve" },
              },
              ctaLabel: "View Economy",
              onCta: () => navigate("/economy"),
            },
            {
              title: "System Health",
              subtitle: "Infrastructure status",
              icon: Zap,
              accentColor: "text-amber-400",
              glowColor: "oklch(0.9 0.15 85 / 0.1)",
              leftStat: {
                label: "Supabase",
                value: error ? "Offline" : "Connected",
                trend: error ? { direction: "down", label: "Error" } : { direction: "up", label: "OK" },
              },
              rightStat: {
                label: "Data Layer",
                value: (stats.totalUsers > 0 || tradesSum.totalTrades > 0) ? "Populated" : "Empty",
              },
              ctaLabel: "System Settings",
              onCta: () => navigate("/settings"),
            },
          ]}
        />
      )}

      {/* Stats Grid */}
      {loading ? (
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10"
        >
          {statCards.map((s) => (
            <motion.div
              key={s.label}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              className="stat-card group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-4 relative z-10 ${s.bg} shadow-lg shadow-black/20`}>
                <s.icon className={`${s.color} drop-shadow-[0_0_8px_rgba(0,188,212,0.3)]`} size={18} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-1 relative z-10">{s.label}</p>
              <p className={`text-2xl font-black tabular-nums tracking-tight relative z-10 ${s.color}`}>{s.value}</p>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                <s.icon size={80} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* System Status */}
      <div className="bento-card mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-cyan" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25">System Status</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {systemStatuses.map(s => (
            <div
              key={s.label}
              className="flex items-center justify-between p-3 rounded-xl border"
              style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.14 0.02 255 / 0.3)" }}
            >
              <span className="text-xs text-white/40 font-medium">{s.label}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${s.color}`}>
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 shadow-[0_0_6px_currentColor]"
                  style={{ backgroundColor: "currentColor" }}
                />
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Performance */}
      {!loading && tradesSum.totalTrades > 0 && (
        <div className="bento-card mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-cyan" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25">Trade Performance</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Win Rate", value: `${tradesSum.winRate || 0}%`, color: (tradesSum.winRate || 0) >= 50 ? "text-emerald" : "text-rose" },
              { label: "Winning Trades", value: tradesSum.wins || 0, color: "text-emerald" },
              { label: "Total Trades", value: tradesSum.totalTrades, color: "text-white" },
              { label: "Win Ratio", value: `${tradesSum.wins}/${tradesSum.totalTrades}`, color: (tradesSum.winRate || 0) >= 50 ? "text-emerald" : "text-rose" },
            ].map(item => (
              <div
                key={item.label}
                className="p-4 rounded-xl border"
                style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.14 0.02 255 / 0.3)" }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-1">{item.label}</p>
                <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identity Nodes Registry */}
      <div className="bento-card">
        <div className="flex items-center gap-2 mb-4">
          <Server size={14} className="text-cyan" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25">Identity Node Registry</p>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="skeleton-shimmer h-10 rounded-xl" />)}
          </div>
        ) : identityNodes.length > 0 ? (
          <div className="table-wrap">
            <table className="table-tech">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Display Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {identityNodes.map((node) => (
                  <tr key={node.uid}>
                    <td className="font-mono text-[10px] text-cyan/70">{node.id}...</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                          <span className="text-[8px] font-black text-cyan">{node.displayName.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-xs text-white/80">{node.displayName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${node.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {node.status}
                      </span>
                    </td>
                    <td className="text-[10px] text-white/30 font-mono">
                      {node.createdAt ? new Date(node.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button 
                        onClick={() => navigate(`/users/${node.uid}`)}
                        className="text-white/20 hover:text-white/50 transition p-1"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <ShieldCheck size={24} className="mx-auto text-white/10 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/15">
              Aucun nœud d'identité enregistré
            </p>
            <p className="text-[9px] text-white/10 mt-1">
              Les utilisateurs inscrits apparaîtront ici
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
};


export default AdminDashboard;
