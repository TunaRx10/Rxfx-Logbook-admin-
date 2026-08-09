import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar, Table, ExternalLink, RefreshCw,
  CheckCircle2, AlertCircle, Clock, Zap,
  Database, FileSpreadsheet, Mail,
  Trash2, Edit3, Save, X, Eye,
  Server, Globe, Layers, Users
} from "lucide-react";
import { cn } from "../lib/utils";
import { DataState } from "../components/ui/DataState";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import {
  listTable,
  deleteRow as deleteSupabaseRow,
  updateRow as updateSupabaseRow,
  updateUserProfile,
  deleteUser,
  getAdminStats,
} from "../lib/supabase-admin";

const WorkspaceSyncPage = () => {
  const [syncing, setSyncing] = useState({ users: false, trades: false, analytics: false });
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsState, setStatsState] = useState({ kind: "loading" });
  const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

  /* ── Data Browser state (tables Supabase) ── */
  const SECTIONS = ["profiles", "trades", "payments", "referrals", "subscriptions"];
  const [browserSection, setBrowserSection] = useState("profiles");
  const [browserData, setBrowserData] = useState([]);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Load export queue (Supabase logs — Firestore removed)
  useEffect(() => {
    async function loadQueue() {
      try {
        const rows = await listTable("logs", 50);
        setQueue(rows || []);
      } catch (e) {
        console.warn("[sync] queue fetch failed:", e);
      }
    }
    loadQueue();
    const t = setInterval(loadQueue, 12000);
    return () => clearInterval(t);
  }, []);

  const loadStats = async () => {
    setStatsState({ kind: "loading" });
    const result = await DataState.loadGuard(() => getAdminStats());
    if (result.state === "ok") {
      setStats(result.data);
      setStatsState({ kind: "ok" });
    } else if (result.state === "supabase-missing") {
      setStatsState({ kind: "supabase-missing" });
    } else {
      setStatsState({ kind: "error", message: result.message });
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const syncUsers = async () => {
    setSyncing((s) => ({ ...s, users: true }));
    try {
      const users = await listTable("profiles", 1000);
      toast.success(`${(users || []).length} utilisateurs chargés depuis Supabase (profiles)`);
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncing((s) => ({ ...s, users: false }));
    }
  };

  const syncTrades = async () => {
    setSyncing((s) => ({ ...s, trades: true }));
    try {
      const trades = await listTable("trades", 1000);
      toast.success(`${(trades || []).length} trades chargés depuis Supabase`);
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncing((s) => ({ ...s, trades: false }));
    }
  };

  const syncAnalytics = async () => {
    setSyncing((s) => ({ ...s, analytics: true }));
    try {
      const logs = await listTable("logs", 200);
      toast.success(`${(logs || []).length} entrées de logs chargées depuis Supabase`);
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncing((s) => ({ ...s, analytics: false }));
    }
  };

  /* ── Data Browser helpers (Supabase) ── */
  async function loadBrowserData() {
    setBrowserLoading(true);
    try {
      const rows = await listTable(browserSection, 200);
      setBrowserData(rows);
      toast.success(`${rows.length} lignes chargées depuis ${browserSection}`);
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : String(err)));
    }
    setBrowserLoading(false);
  }

  useEffect(() => {
    loadBrowserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserSection]);

  async function handleSaveRow(rowIndex) {
    try {
      const row = browserData[rowIndex];
      const rowId = row?.id;
      const supaFields = { ...editValues };
      delete supaFields._rowIndex;
      delete supaFields.timestamp;
      delete supaFields.created_at;

      if (!rowId) throw new Error("Ligne sans id — impossible de mettre à jour en Supabase");

      // profiles → updateUserProfile (synchronise profiles + subscriptions)
      if (browserSection === "profiles") {
        await updateUserProfile(String(rowId), supaFields);
        toast.success("Profil mis à jour (profiles + subscriptions)");
      } else {
        await updateSupabaseRow(browserSection, "id", String(rowId), supaFields);
        toast.success(`Ligne ${rowIndex} mise à jour dans ${browserSection}`);
      }

      setEditingRow(null);
      setEditValues({});
      loadBrowserData();
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleDeleteRow(rowIndex) {
    const row = browserData[rowIndex];
    const rowId = row?.id;
    if (!rowId) {
      toast.error("Ligne sans id — suppression impossible");
      return;
    }
    if (!window.confirm(`Supprimer la ligne ${rowIndex} de ${browserSection} ? Cette action est irréversible.`)) return;

    try {
      if (browserSection === "profiles") {
        await deleteUser(String(rowId));
        toast.success("Utilisateur supprimé de Supabase");
      } else {
        await deleteSupabaseRow(browserSection, "id", String(rowId));
        toast.success(`Ligne ${rowIndex} supprimée de ${browserSection}`);
      }
      loadBrowserData();
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  const syncServices = [
    {
      name: "Apps Script — Users",
      status: "Connected",
      icon: <Table size={18} />,
      color: "text-cyan",
      borderColor: "border-cyan/20",
      accentBg: "bg-cyan/10",
      action: syncUsers,
      loading: syncing.users,
      label: "Sync Users",
    },
    {
      name: "Apps Script — Trades",
      status: "Ready",
      icon: <FileSpreadsheet size={18} />,
      color: "text-emerald",
      borderColor: "border-emerald/20",
      accentBg: "bg-emerald/10",
      action: syncTrades,
      loading: syncing.trades,
      label: "Export Trades",
    },
    {
      name: "Apps Script — Analytics",
      status: "Ready",
      icon: <Database size={18} />,
      color: "text-purple-400",
      borderColor: "border-purple-400/20",
      accentBg: "bg-purple-400/10",
      action: syncAnalytics,
      loading: syncing.analytics,
      label: "Export Analytics",
    },
    {
      name: "Gmail — Email API",
      status: "Connected",
      icon: <Mail size={18} />,
      color: "text-amber-400",
      borderColor: "border-amber-400/20",
      accentBg: "bg-amber-400/10",
      action: () => window.location.href = "/email",
      loading: false,
      label: "Open Email Center",
    },
    {
      name: "Google Calendar",
      status: "Active",
      icon: <Calendar size={18} />,
      color: "text-orange-400",
      borderColor: "border-orange-400/20",
      accentBg: "bg-orange-400/10",
      action: null,
      loading: false,
      label: "View Calendar",
    },
  ];

  const statsBadge =
    statsState.kind === "ok" && stats ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium">
        <span className="flex items-center gap-1.5 text-white/40">
          <Users className="w-3 h-3" />
          <span className="text-white/60 font-bold">{stats.totalUsers}</span>
          <span className="text-white/20">users</span>
        </span>
        <span className="text-white/10 select-none">|</span>
        <span className="flex items-center gap-1.5 text-white/40">
          <Layers className="w-3 h-3" />
          <span className="text-white/60 font-bold">{stats.totalTrades}</span>
          <span className="text-white/20">trades</span>
        </span>
        <span className="text-white/10 select-none">|</span>
        <span className="flex items-center gap-1.5 text-emerald">
          <Zap className="w-3 h-3" />
          <span className="font-bold">${stats.totalPnl}</span>
          <span className="text-emerald/40">PnL</span>
        </span>
      </div>
    ) : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Google Workspace Synchronization"
        title="Data"
        highlight="Bridge"
        subtitle="Google Apps Script integration hub — direct HTTP sync with bidirectional Supabase ↔ Sheets."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {statsBadge}
          </div>
        }
      />

      {statsState.kind === "supabase-missing" && (
        <div className="mb-8"><DataState.SupabaseMissing /></div>
      )}
      {statsState.kind === "error" && (
        <div className="mb-8"><DataState.Error message={statsState.message} onRetry={loadStats} /></div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         CONNECTION CARDS — Glassmorphism bento grid
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {syncServices.map((service) => (
          <div
            key={service.name}
            className="bento-card group !p-0 overflow-hidden"
          >
            {/* Card body */}
            <div className="p-5 flex flex-col h-full">
              {/* Icon + Status row */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border shadow-lg shadow-black/20",
                    service.borderColor,
                    service.accentBg,
                    service.color
                  )}
                >
                  {service.icon}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest"
                  style={{
                    borderColor: "oklch(0.87 0.27 142 / 20%)",
                    background: "oklch(0.87 0.27 142 / 6%)",
                    color: "oklch(0.87 0.27 142)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald shadow-[0_0_6px_#10b981]" />
                  {service.status}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xs font-black text-white uppercase tracking-tight mb-1">
                {service.name}
              </h3>

              {/* Description (subtle) */}
              <p className="text-[10px] text-white/20 font-medium mb-5">
                {APPS_SCRIPT_URL ? "Direct HTTP → Apps Script" : "Non configuré"}
              </p>

              {/* Actions */}
              <div className="mt-auto flex items-center gap-2.5">
                {service.action && (
                  <button
                    onClick={service.action}
                    disabled={service.loading}
                    className={cn(
                      "btn-tech !text-[9px] flex-1 justify-center",
                      service.color,
                      service.borderColor
                    )}
                  >
                    {service.loading ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Zap size={13} />
                    )}
                    {service.label}
                  </button>
                )}
                {service.label === "Open Email Center" ? null : service.label === "View Calendar" ? (
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-white/5 text-white/25 hover:text-white hover:border-white/15 transition-all"
                  >
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  APPS_SCRIPT_URL && (
                    <a
                      href={APPS_SCRIPT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl border border-white/5 text-white/25 hover:text-white hover:border-white/15 transition-all"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )
                )}
              </div>
            </div>

            {/* Hover glow */}
            <div
              className={cn(
                "absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none",
                service.accentBg
              )}
            />
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         EXPORT QUEUE LOG — glass table
         ═══════════════════════════════════════════════════════════ */}
      <div className="bento-card !p-0 mb-10 overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid var(--card-border)" }}
        >
          <Clock size={15} className="text-white/25" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
            Export Queue Log
          </h3>
          <span className="text-[10px] font-bold text-white/15 ml-auto tabular-nums">
            {queue.length} entries
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="py-16 text-center">
            <Server size={28} className="mx-auto mb-3 text-white/10" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/15">
              No export tasks in queue
            </p>
            <p className="text-[9px] text-white/8 mt-1">
              Cloud Function exports will appear here
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-tech">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>User</th>
                  <th>Created</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.status === "success" ? (
                        <span className="inline-flex items-center gap-1.5 badge-status badge-active">
                          <CheckCircle2 size={10} /> Done
                        </span>
                      ) : item.status === "error" ? (
                        <span className="inline-flex items-center gap-1.5 badge-status badge-error">
                          <AlertCircle size={10} /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 badge-status badge-warn">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="text-white/40 uppercase text-[9px] font-bold">{item.type}</td>
                    <td className="text-white/30 font-mono text-[10px]">{item.userId?.slice(0, 12)}...</td>
                    <td className="text-white/20 font-mono text-[10px]">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "-"}
                    </td>
                    <td className="max-w-[200px] truncate">
                      {item.sheetUrl ? (
                        <a href={item.sheetUrl} target="_blank" rel="noreferrer" className="text-cyan hover:underline text-[10px] font-bold">
                          Open Sheet
                        </a>
                      ) : item.error ? (
                        <span className="text-red-400 text-[10px]">{item.error.slice(0, 60)}</span>
                      ) : (
                        <span className="text-white/15">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         SHEETS DATA BROWSER — CRUD admin
         ═══════════════════════════════════════════════════════════ */}
      <div className="bento-card !p-0 overflow-hidden mb-10">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3 flex-wrap"
          style={{ borderBottom: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-cyan/20 bg-cyan/5">
            <Eye size={14} className="text-cyan" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan">
              Data Browser
            </span>
          </div>
          <span className="text-[10px] text-white/20 font-medium hidden sm:inline">
            — Lecture, modification, suppression bidirectionnelle
          </span>
          <button
            onClick={loadBrowserData}
            disabled={browserLoading}
            className="ml-auto btn-tech text-cyan border-cyan/20 hover:border-cyan/40 !text-[9px]"
          >
            <RefreshCw size={12} className={browserLoading ? "animate-spin" : ""} />
            Rafraîchir
          </button>
        </div>

        {/* Section tabs */}
        <div
          className="flex gap-1 px-5 py-3 overflow-x-auto"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 4%)" }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setBrowserSection(s); setEditingRow(null); }}
              className={cn(
                "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-200",
                browserSection === s
                  ? "bg-cyan/10 text-cyan border border-cyan/20 shadow-[0_0_12px_rgba(0,188,212,0.08)]"
                  : "text-white/25 hover:text-white/50 border border-transparent hover:bg-white/5"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Data table */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          {browserLoading ? (
            <div className="py-20 text-center">
              <RefreshCw size={22} className="mx-auto mb-4 animate-spin text-cyan" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                Chargement...
              </p>
            </div>
          ) : browserData.length === 0 ? (
            <div className="py-20 text-center">
              <Globe size={28} className="mx-auto mb-3 text-white/10" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/15">
                Aucune donnée
              </p>
              <p className="text-[9px] text-white/8 mt-1">
                Synchronise d'abord ou clique Rafraîchir
              </p>
            </div>
          ) : (
            <table className="table-tech">
              <thead className="sticky top-0 z-10" style={{ background: "oklch(0.13 0.02 255 / 0.95)", backdropFilter: "blur(12px)" }}>
                <tr>
                  <th className="w-12">#</th>
                  {Object.keys(browserData[0] || {}).filter(k => k !== "_rowIndex").slice(0, 7).map((h) => (
                    <th key={h} className="whitespace-nowrap">{h}</th>
                  ))}
                  <th className="text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {browserData.map((row, i) => {
                  const rowIdx = Number(row._rowIndex) || i + 2;
                  const isEditing = editingRow === rowIdx;
                  const keys = Object.keys(row).filter(k => k !== "_rowIndex");
                  return (
                    <tr
                      key={i}
                      className={cn(
                        "transition-colors duration-150",
                        isEditing && "!bg-cyan/[0.03]"
                      )}
                    >
                      <td className="text-white/20 font-mono text-[10px] tabular-nums">{rowIdx}</td>
                      {keys.slice(0, 7).map((k) => (
                        <td key={k} className="max-w-[180px]">
                          {isEditing ? (
                            <input
                              value={editValues[k] ?? String(row[k] ?? "")}
                              onChange={(e) => setEditValues(prev => ({ ...prev, [k]: e.target.value }))}
                              className="input-tech !py-1 !px-2 !text-[10px] w-full"
                            />
                          ) : (
                            <span
                              className="text-white/60 text-[11px] truncate block"
                              title={String(row[k] ?? "")}
                            >
                              {String(row[k] ?? "").slice(0, 50)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveRow(rowIdx)}
                                className="p-1.5 rounded-lg text-emerald hover:bg-emerald/10 transition-colors"
                                title="Sauvegarder"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={() => { setEditingRow(null); setEditValues({}); }}
                                className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/5 transition-colors"
                                title="Annuler"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingRow(rowIdx); setEditValues({}); }}
                                className="p-1.5 rounded-lg text-white/20 hover:text-cyan hover:bg-cyan/5 transition-colors"
                                title="Modifier"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteRow(rowIdx)}
                                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-2.5 flex items-center justify-between"
          style={{ borderTop: "1px solid oklch(1 0 0 / 4%)", background: "oklch(0.09 0.02 255 / 0.3)" }}
        >
          <span className="text-[9px] font-bold text-white/15 uppercase tracking-widest">
            {browserData.length} row{browserData.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[8px] text-white/10 uppercase tracking-wider">
            Bidirectional Sync — Supabase ↔ Sheets
          </span>
        </div>
      </div>
    </PageShell>
  );
};

export default WorkspaceSyncPage;
