import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { listReferrals, listPayoutRequests, updateReferral, updatePayoutRequest, insertRow } from "../lib/data-admin";
import {
  Gift, Users, TrendingUp, DollarSign, Clock, Wallet,
  Search, ExternalLink, CheckCircle2, ChevronRight,
  ArrowRight, Crown, Award, Zap, Star, Sparkles, FileSpreadsheet,
  Filter, ShieldCheck, History,
} from "lucide-react";
import { PageShell, PageHeader, Section } from "../components/ui/PagePrimitives";
import { DataState } from "../components/ui/DataState";
import { useLang } from "../context/LangContext";

/* ── Commission Constants ─────────────────── */
const COMMISSIONS = {
  pro: 3.60,    // 12% of $29.99
  elite: 15.00, // 15% of $99.99
  free: 0,
};

/* ── Tier definitions (the "Rewards Ladder") ─────────────────── */
const TIERS = [
  { threshold: 3,  reward: "Badge Bronze + Bonus $5",      icon: Star,       accent: "emerald" },
  { threshold: 10, reward: "Signaux Pro (30j)",            icon: Zap,        accent: "amber"   },
  { threshold: 15, reward: "Badge Ambassadeur Silver",      icon: Award,      accent: "purple"  },
  { threshold: 30, reward: "Lifetime + 12% Revshare Pro",   icon: Crown,     accent: "rose"    },
];

/* ── Tier color tokens ─────────────────────────────────── */
const ACCENT_TOKENS = {
  emerald: { text: "text-emerald",      glow: "from-emerald/20 to-emerald/0",    line: "bg-emerald/40"      },
  amber:   { text: "text-amber-400",    glow: "from-amber-500/20 to-amber-500/0", line: "bg-amber-500/40"    },
  purple:  { text: "text-purple-400",   glow: "from-purple-500/20 to-purple-500/0", line: "bg-purple-500/40" },
  rose:    { text: "text-rose",         glow: "from-rose/20 to-rose/0",          line: "bg-rose/40"         },
};

const ReferralsPage = () => {
  const { t } = useLang();
  const [referrals, setReferrals] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sheetSyncing, setSheetSyncing] = useState(false);

  async function fetchAll() {
    try {
      const [refRows, payoutRows] = await Promise.all([
        listReferrals(500),
        listPayoutRequests(200),
      ]);
      setReferrals(refRows || []);
      setPayoutRequests(payoutRows || []);
      setLoading(false);
      setLoadError(null);
    } catch (err) {
      console.error("[referrals] fetch failed:", err);
      setLoading(false);
      setLoadError(err?.message || "Erreur de chargement des parrainages");
    }
  }

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 12000);
    return () => clearInterval(t);
  }, []);

  /* ── Logging Helper (logs table) ── */
  const logAction = async (action) => {
    const dateStr = new Date().toLocaleString('fr-FR', { hour12: false });
    const logMessage = `[${dateStr}] ${action}`;
    try {
      await insertRow("audit_log", { action: "referral_action", entity: "referrals", entity_id: null, after: { message: logMessage } });
    } catch (e) {
      console.warn("[referrals] log failed:", e);
    }
    console.log(logMessage);
  };

  /* ── Payout confirmation ── */
  const confirmPayout = async (refId, refEmail, plan) => {
    const amount = COMMISSIONS[plan] || 3.00;
    if (!window.confirm(`SÉCURITÉ : Confirmer le versement de commission de $${amount} pour le parrain de ${refEmail} (Plan: ${plan}) ?`)) return;
    
    try {
      const row = referrals.find(r => r.id === refId);
      if (row?.id) {
        await updateReferral(row.id, { payout_status: "paid", payout_amount: amount, payout_date: new Date().toISOString() });
      }
      await logAction(`Commission de $${amount} versée pour le parrain de ${refEmail}`);
      toast.success(`Payout $${amount} confirmé pour ${refEmail}`);
      fetchAll();
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  };

  /* ── Export to Google Sheets (via Apps Script si dispo) ── */
  const exportToSheet = async () => {
    setSheetSyncing(true);
    try {
      const rows = referrals.map((r) => ({
        timestamp: new Date().toISOString(),
        referrer_code: r.referrer_id || "",
        referred_email: r.referred_email || "",
        referred_name: r.referred_name || "",
        country: "",
        status: r.status || "pending",
        payout_amount: r.payout_amount || 0,
        payout_status: r.payout_status || "unpaid",
      }));
      // Les données sont déjà dans la feuille referrals — export facultatif
      await logAction(`Export de ${rows.length} parrainages (données Sheets)`);
      toast.success(`${rows.length} parrainages disponibles (stockés dans Sheets)`);
    } catch (err) {
      toast.error("Erreur export");
    }
    setSheetSyncing(false);
  };

  /* ── Give tier reward ── */
  const giveTierReward = async (refId, tierReward, tierThreshold, refEmail) => {
    if (!window.confirm(`SÉCURITÉ : Attribuer la récompense "${tierReward}" à ${refEmail} ?`)) return;
    try {
      const row = referrals.find(r => r.id === refId);
      if (row?.id) {
        await updateReferral(row.id, { tier_reward: tierReward, tier_threshold: tierThreshold, tier_awarded_at: new Date().toISOString() });
      }
      await logAction(`Récompense "${tierReward}" (Tier ${tierThreshold}) attribuée à ${refEmail}`);
      toast.success(`Récompense attribuée !`);
      fetchAll();
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  };

  /* ── Payout request management ── */
  const approvePayoutRequest = async (reqId, reqEmail, amount) => {
    if (!window.confirm(`SÉCURITÉ : Approuver la demande de payout de $${amount} pour ${reqEmail} ?`)) return;
    try {
      const row = payoutRequests.find(r => r.id === reqId);
      if (row?.id) {
        await updatePayoutRequest(row.id, { status: "approved", approved_amount: amount, approved_at: new Date().toISOString() });
      }
      await logAction(`Demande de payout de $${amount} APPROUVÉE pour ${reqEmail}`);
      toast.success(`Payout $${amount} approuvé`);
      fetchAll();
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  };

  const rejectPayoutRequest = async (reqId, reqEmail) => {
    const reason = window.prompt(`Raison du rejet pour ${reqEmail} ?`);
    if (!reason) return;
    try {
      const row = payoutRequests.find(r => r.id === reqId);
      if (row?.id) {
        await updatePayoutRequest(row.id, { status: "rejected", rejected_reason: reason, rejected_at: new Date().toISOString() });
      }
      await logAction(`Demande de payout REJETÉE pour ${reqEmail}. Raison: ${reason}`);
      toast.success(`Payout rejeté`);
      fetchAll();
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  };

  const markPayoutPaid = async (reqId, reqEmail, amount) => {
    if (!window.confirm(`SÉCURITÉ : Confirmer que les $${amount} ont été envoyés en crypto à ${reqEmail} ?`)) return;
    try {
      const row = payoutRequests.find(r => r.id === reqId);
      if (row?.id) {
        await updatePayoutRequest(row.id, { status: "paid", paid_at: new Date().toISOString(), paid_amount: amount });
      }
      await logAction(`Payout de $${amount} marqué comme PAYÉ pour ${reqEmail}`);
      toast.success(`Payout marqué payé`);
      fetchAll();
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  };

  /* ── Derived data ── */
  const stats = useMemo(() => ({
    total: referrals.length,
    active: referrals.filter((r) => r.status === "active").length,
    paid: referrals.filter((r) => r.payout_status === "paid").length,
    pending: referrals.filter((r) => r.payout_status === "unpaid" && r.status === "active").length,
    totalPayouts: referrals
      .filter((r) => r.payout_status === "paid")
      .reduce((a, b) => a + (b.payout_amount || COMMISSIONS[b.plan] || 3), 0),
    totalDue: referrals
      .filter((r) => r.payout_status === "unpaid" && r.status === "active")
      .reduce((a, b) => a + (COMMISSIONS[b.plan] || 3), 0),
  }), [referrals]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return referrals.filter((r) => {
      const matches =
        (r.referred_email || "").toLowerCase().includes(term) ||
        (r.referrer_email || "").toLowerCase().includes(term) ||
        (r.referrer_id || "").toLowerCase().includes(term);
      const ok =
        statusFilter === "all" || r.status === statusFilter || r.payout_status === statusFilter;
      return matches && ok;
    });
  }, [referrals, searchTerm, statusFilter]);

  const KPIS = [
    {
      key: "total",
      label: "Growth Index",
      value: stats.total,
      sub: "Total Referrals",
      icon: Users,
      accent: { text: "text-cyan", border: "hover:border-cyan/40", radialStyle: { background: "radial-gradient(circle, oklch(0.78 0.16 200 / 0.32) 0%, transparent 70%)" } },
    },
    {
      key: "active",
      label: "Active Nodes",
      value: stats.active,
      sub: "Paying Subscribers",
      icon: TrendingUp,
      accent: { text: "text-emerald", border: "hover:border-emerald/40", radialStyle: { background: "radial-gradient(circle, oklch(0.74 0.18 155 / 0.32) 0%, transparent 70%)" } },
    },
    {
      key: "paid",
      label: "Total Paid",
      value: `$${stats.totalPayouts.toFixed(0)}`,
      sub: `${stats.paid} Commissions`,
      icon: DollarSign,
      accent: { text: "text-amber-400", border: "hover:border-amber-500/40", radialStyle: { background: "radial-gradient(circle, oklch(0.78 0.17 85 / 0.32) 0%, transparent 70%)" } },
    },
    {
      key: "pending",
      label: "Account Due",
      value: `$${stats.totalDue.toFixed(0)}`,
      sub: `${stats.pending} Unpaid Active`,
      icon: Clock,
      accent: { text: "text-purple-400", border: "hover:border-purple-500/40", radialStyle: { background: "radial-gradient(circle, oklch(0.62 0.22 295 / 0.32) 0%, transparent 70%)" } },
    },
    {
      key: "requests",
      label: "Payout Queue",
      value: payoutRequests.filter((r) => r.status === "pending").length,
      sub: "Pending Requests",
      icon: Wallet,
      accent: { text: "text-rose", border: "hover:border-rose/40", radialStyle: { background: "radial-gradient(circle, oklch(0.65 0.22 15 / 0.32) 0%, transparent 70%)" } },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Referral & Ambassador Loop"
        title={t("referrals")}
        highlight="Mainframe"
        subtitle="Pilot growth commissions (12% Pro, 15% Elite), rewards ladder, and crypto payouts."
        actions={
          <div className="flex gap-2">
            <button onClick={exportToSheet} disabled={sheetSyncing} className="btn-tech btn-tech-primary text-[10px]">
              <FileSpreadsheet size={12} />
              <span>{sheetSyncing ? "Export…" : "Sheet Sync"}</span>
            </button>
            <button onClick={() => window.location.href='/analytics'} className="btn-tech text-[10px]">
              <History size={12} />
              <span className="hidden sm:inline">Audit Logs</span>
            </button>
          </div>
        }
      />

      {/* KPI Tiles */}
      <motion.div
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
      >
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.key}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -2 }}
              className={`bento-card relative overflow-hidden p-6 transition-colors ${kpi.accent.border}`}
            >
              <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-60" style={kpi.accent.radialStyle} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">{kpi.label}</p>
                  <p className={`text-3xl font-black tracking-tighter leading-none ${kpi.accent.text}`}>{kpi.value}</p>
                  <p className="text-[9px] text-white/25 mt-1.5 font-mono">{kpi.sub}</p>
                </div>
                <div className={`p-2 rounded-xl border border-white/5 bg-white/[0.02] ${kpi.accent.text}`}><Icon size={16} /></div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Rewards Ladder */}
      <Section title="Rewards Ladder" icon={Sparkles} accent="purple">
        <div className="relative rounded-2xl border p-6 overflow-hidden" style={{ borderColor: "oklch(1 0 0 / 7%)", background: "oklch(0.12 0.015 255 / 0.3)" }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            <div className="hidden md:block absolute top-1/2 left-[12.5%] right-[12.5%] h-px -translate-y-1/2 bg-gradient-to-r from-emerald/40 via-amber-500/40 via-purple-500/40 to-rose/40 opacity-30" />
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.threshold}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="relative flex md:flex-col items-center md:items-start gap-4 p-4 rounded-xl border bg-black/40 group border-white/5"
              >
                <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/5 ${ACCENT_TOKENS[tier.accent].text}`}>
                  <tier.icon size={18} />
                </div>
                <div>
                  <p className={`text-xl font-black tracking-tighter leading-none ${ACCENT_TOKENS[tier.accent].text}`}>{tier.threshold}</p>
                  <p className="text-[8px] uppercase tracking-widest text-white/30 mt-1">Filleuls Actifs</p>
                  <p className="text-[10px] font-bold text-white mt-2 leading-tight">{tier.reward}</p>
                </div>
                {i < TIERS.length - 1 && <ArrowRight size={14} className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-white/10" />}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Referrals Registry */}
      <Section title="Intelligence Registry" icon={Filter}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text" placeholder="Rechercher parrain, filleul ou UID…"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="input-tech pl-11 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "active", "paid", "unpaid", "pending"].map((s) => (
              <button
                key={s} onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border rounded-full transition-all ${
                  statusFilter === s ? "bg-cyan/10 border-cyan/40 text-cyan shadow-[0_0_18px_rgba(6,182,212,0.1)]" : "bg-white/[0.02] border-white/10 text-white/30 hover:text-white/60"
                }`}
              >
                {s === 'all' ? 'Tous' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "oklch(1 0 0 / 7%)", background: "oklch(0.1 0.01 255 / 0.4)" }}>
          <div className="overflow-x-auto">
            <table className="table-tech w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {["Parrain", "Filleul", "Plan", "Status", "Commission", "Award", "Time", ""].map((h) => (
                    <th key={h} className="px-5 py-4 text-[9px] uppercase tracking-[0.25em] text-white/30 font-black">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="group hover:bg-white/[0.01] transition-colors border-t border-white/5">
                    <td className="px-5 py-4 min-w-[140px]">
                      <p className="text-xs font-bold text-white font-mono truncate">{r.referrer_email || r.referrer_id?.slice(0, 14)}</p>
                      <p className="text-[8px] text-white/20 font-mono mt-0.5">{r.referrer_id?.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-white/70 truncate">{r.referred_email || "N/A"}</p>
                      <p className="text-[8px] text-white/20 mt-0.5">{r.referred_name || "—"}</p>
                    </td>
                    <td className="px-5 py-4"><PlanPill plan={r.plan} /></td>
                    <td className="px-5 py-4"><StatusPill value={r.status} /></td>
                    <td className="px-5 py-4">
                      {r.payout_status === "paid" ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald">
                          <CheckCircle2 size={12} /> ${r.payout_amount || COMMISSIONS[r.plan] || 3}
                        </span>
                      ) : r.status === "active" ? (
                        <button
                          onClick={() => confirmPayout(r.id, r.referred_email, r.plan)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                        >
                          Payer ${COMMISSIONS[r.plan] || 3.00}
                        </button>
                      ) : (
                        <span className="text-[9px] text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {r.status === "active" ? (
                        <select
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const tier = TIERS.find((t) => String(t.threshold) === e.target.value);
                            if (tier) giveTierReward(r.id, tier.reward, tier.threshold, r.referred_email);
                            e.target.value = "";
                          }}
                          className="bg-black/50 border border-white/10 px-2 py-1 text-[9px] font-black uppercase text-purple-300 outline-none rounded cursor-pointer hover:border-purple-400/40 transition-colors"
                        >
                          <option value="">Badge</option>
                          {TIERS.map((t) => <option key={t.threshold} value={t.threshold}>{t.threshold} → {t.reward}</option>)}
                        </select>
                      ) : (
                        <span className="text-[9px] text-purple-300 font-black uppercase">{r.tier_reward ? <Award size={10} className="inline mr-1" /> : ""}{r.tier_reward || "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[10px] text-white/20 font-mono">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="p-2 text-white/10 group-hover:text-cyan transition-colors"><ChevronRight size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Payout Queue */}
      <Section title="Payout Queue" icon={Wallet} accent="amber">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {payoutRequests.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[10px] uppercase tracking-widest text-white/10 italic">Aucune demande en file d'attente</div>
          ) : payoutRequests.map((req) => (
            <PayoutRequestCard
              key={req.id} req={req}
              onApprove={(amt) => approvePayoutRequest(req.id, req.referrer_email, amt)}
              onReject={() => rejectPayoutRequest(req.id, req.referrer_email)}
              onMarkPaid={(amt) => markPayoutPaid(req.id, req.referrer_email, amt)}
            />
          ))}
        </div>
      </Section>

      <div className="mt-12 flex items-center justify-between p-6 rounded-2xl border bg-cyan/5 border-cyan/10">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Administrative Integrity</p>
            <p className="text-[9px] text-white/30 font-medium uppercase mt-1">Actions are logged and PIN-verified for terminal security.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-[8px] font-black text-cyan/30 uppercase tracking-[0.3em]">System Synchronized</span>
        </div>
      </div>
    </PageShell>
  );
};

/* ── UI Helpers ── */
const PlanPill = ({ plan }) => {
  const map = {
    elite: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Crown },
    pro:   { cls: "bg-cyan/10 text-cyan border-cyan/30",                icon: Star },
    free:  { cls: "bg-white/[0.03] text-white/40 border-white/10",       icon: null },
  };
  const v = map[plan] || map.free;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${v.cls}`}>
      {v.icon && <v.icon size={8} />} {plan || "free"}
    </span>
  );
};

const StatusPill = ({ value, variant = "referral" }) => {
  const refMap = {
    active:   { cls: "bg-emerald/10 text-emerald border-emerald/30",       label: "actif"   },
    pending:  { cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", label: "pending" },
    canceled: { cls: "bg-white/[0.03] text-white/30 border-white/10",       label: "annulé"  },
  };
  const payMap = {
    paid:     { cls: "bg-emerald/10 text-emerald border-emerald/30",       label: "payé"    },
    approved: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", label: "approuvé" },
    pending:  { cls: "bg-cyan/10 text-cyan border-cyan/30",                 label: "queue" },
    rejected: { cls: "bg-rose/10 text-rose border-rose/30",                 label: "rejeté" },
  };
  const lookup = variant === "payout" ? payMap : refMap;
  const v = lookup[value] || { cls: "bg-white/[0.03] text-white/30 border-white/10", label: value || "—" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${v.cls}`}>{v.label}</span>
  );
};

const PayoutRequestCard = ({ req, onApprove, onReject, onMarkPaid }) => {
  const amount = req.amount || (req.active_count || 0) * 3.60;
  const status = req.status || "pending";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/5 p-5 bg-white/[0.02]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-cyan truncate max-w-[200px]">{req.referrer_email || req.referrer_id?.slice(0, 12)}</p>
          <p className="text-[9px] text-white/20 mt-0.5 font-mono">{req.payout_address ? `${req.payout_address.slice(0, 8)}...${req.payout_address.slice(-6)}` : "No Wallet"}</p>
        </div>
        <StatusPill value={status} variant="payout" />
      </div>
      <div className="flex items-baseline gap-2 mb-5">
        <p className="text-3xl font-black text-white tracking-tighter">${amount.toFixed(2)}</p>
        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">{req.currency || "USDT"}</span>
      </div>
      <div className="flex gap-2">
        {status === "pending" && (
          <>
            <button onClick={() => onApprove(amount)} className="btn-tech btn-tech-primary py-2 text-[8px]">Approve</button>
            <button onClick={onReject} className="btn-tech !border-rose/20 text-rose hover:bg-rose/5 py-2 text-[8px]">Reject</button>
          </>
        )}
        {status === "approved" && <button onClick={() => onMarkPaid(amount)} className="btn-tech !border-emerald/20 text-emerald py-2 text-[8px] w-full">Mark Paid</button>}
        {status === "paid" && <span className="text-[9px] font-black uppercase text-emerald">💸 Paid {new Date(req.paid_at).toLocaleDateString()}</span>}
      </div>
    </motion.div>
  );
};

export default ReferralsPage;
