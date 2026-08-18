import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, UserX, UserCheck, Zap, CreditCard, Activity, Globe, Smartphone,
  Clock, History, Award, Swords, TrendingUp, Ban, Pause, Trash2, CheckCircle2, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getAllUsersWithSubs,
  suspendUser, reactivateUser, banUser, unbanUser,
  deleteUser, getUserModerationHistory,
} from "../lib/data-admin";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import PlanEditor from "../components/ui/PlanEditor";

function statusToKey(profile) {
  if (!profile) return "inactive";
  if (profile.banned === true) return "banned";
  switch (profile.status) {
    case "suspended": return "suspended";
    case "inactive": return "inactive";
    case "pending": return "pending";
    case "active":
    default: return "active";
  }
}

const STATUS_BADGE_CLASS = {
  active: "border-emerald/20 text-emerald",
  inactive: "border-white/10 text-white/40",
  suspended: "border-amber/30 text-amber",
  banned: "border-red-500/30 text-red-500",
  pending: "border-cyan/30 text-cyan",
};

const UserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLang();
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // { type }
  const [reason, setReason] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [users, hist] = await Promise.all([
        getAllUsersWithSubs(),
        getUserModerationHistory(id).catch(() => []),
      ]);
      const arr = Array.isArray(users) ? users : [];
      const found = arr.find((u) => u.id === id) ?? null;
      setUser(found);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.error("UserDetailsPage: load failed", err);
      toast.error(t("users_toast_error"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const statusKey = useMemo(() => statusToKey(user), [user]);
  const subscriptionPlan = user?.subscription?.plan ?? user?.plan ?? "free";

  const performAction = useCallback(async (type) => {
    if (!user) return;
    const adminUid = currentUser?.id ?? "";
    setActionPending(true);
    try {
      switch (type) {
        case "suspend": await suspendUser(user.id, reason, adminUid); toast.success(t("users_toast_suspended")); break;
        case "reactivate": await reactivateUser(user.id, adminUid); toast.success(t("users_toast_reactivated")); break;
        case "ban": await banUser(user.id, reason, adminUid); toast.success(t("users_toast_banned")); break;
        case "unban": await unbanUser(user.id, adminUid); toast.success(t("users_toast_unbanned")); break;
        case "delete":
          await deleteUser(user.id, adminUid);
          toast.success(t("users_toast_deleted"));
          setConfirmAction(null);
          setActionPending(false);
          navigate("/users");
          return;
        default: throw new Error("unknown action");
      }
      await load();
    } catch (err) {
      console.error("performAction failed", err);
      toast.error(`${t("users_toast_error")}: ${String(err?.message ?? err).slice(0, 120)}`);
    } finally {
      setConfirmAction(null);
      setReason("");
      setActionPending(false);
    }
  }, [user, currentUser, reason, t, load, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-2 border-cyan/20 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-[10px] font-black text-cyan uppercase tracking-widest animate-pulse">Initializing Node Access...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black p-6 lg:p-12 space-y-8">
        <button
          onClick={() => navigate("/users")}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan hover:text-white transition"
        >
          <ArrowLeft size={14} /> {t("users_back_to_list")}
        </button>
        <div className="bento-card p-8 text-center space-y-4">
          <p className="text-white/40 text-sm">User not found</p>
          <p className="text-white/15 text-[10px] font-mono">id: {id}</p>
        </div>
      </div>
    );
  }

  const displayName =
    user.display_name ||
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
    user.email ||
    user.id;

  const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : "—";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white font-sans no-scrollbar"
    >
      <header className="flex items-center justify-between border-b border-white/5 pb-8 flex-wrap gap-4">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => navigate("/users")}
            className="p-3 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-cyan">
              <Zap size={12} />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Identity Node Protocol</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mt-1">{displayName}</h2>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border ${STATUS_BADGE_CLASS[statusKey]}`}>
            Node_Status: {t(`users_status_${statusKey}`)}
          </span>
          <div className="px-4 py-1.5 bg-cyan text-black text-[10px] font-black uppercase tracking-widest">
            Rank_{subscriptionPlan}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Identity + Financials + Actions */}
        <div className="lg:col-span-4 space-y-12">
          <div className="bento-card !p-8 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-3xl group-hover:bg-cyan/10 transition-all" />
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center text-5xl font-black text-white/10">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="space-y-4 border-t border-white/5 pt-8">
              <Row label="Internal_ID" value={user.id} mono />
              <Row label="Email_Link" value={user.email} />
              <Row label="Display_Name" value={user.display_name || "—"} />
              <Row label="First/Last" value={`${user.first_name || "—"} / ${user.last_name || "—"}`} />
              <Row label="Country" value={user.country || "—"} />
              <Row label="Trader_Type" value={user.trader_type || "—"} />
              <Row label="Sync_Date" value={createdAt} />
            </div>
            {user.banned && (
              <div className="border-t border-red-500/20 pt-4 text-[10px] text-red-400 uppercase tracking-widest space-y-1">
                <p>Status: Banned</p>
                {user.banned_reason && <p>Reason: {user.banned_reason}</p>}
                {user.banned_at && <p>At: {new Date(user.banned_at).toLocaleString()}</p>}
              </div>
            )}
            {statusKey === "suspended" && (
              <div className="border-t border-amber/20 pt-4 text-[10px] text-amber uppercase tracking-widest space-y-1">
                <p>Status: Suspended</p>
                {user.suspended_reason && <p>Reason: {user.suspended_reason}</p>}
                {user.suspended_at && <p>At: {new Date(user.suspended_at).toLocaleString()}</p>}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic">{t("users_section_financial")}</h4>
            {!user.subscription ? (
              <div className="bento-card !p-10 space-y-4">
                <p className="text-[10px] text-white/20 uppercase tracking-widest">No active subscription</p>
              </div>
            ) : (
              <div className="bento-card !p-6 sm:!p-8 space-y-3">
                <Row label="Plan" value={user.subscription.plan} />
                <Row label="Status" value={user.subscription.status || "—"} />
                {user.subscription.current_period_end && (
                  <Row label="Renews/Expires" value={new Date(user.subscription.current_period_end).toLocaleDateString()} />
                )}
              </div>
            )}
            {/* Inline plan editor — flips profiles.plan + subscriptionStatus */}
            <PlanEditor
              uid={user.id}
              currentPlan={user.subscription?.plan ?? user.plan ?? "free"}
              currentStatus={user.subscription?.status ?? user.subscriptionStatus ?? "inactive"}
              onSaved={(p) => setUser((prev) => ({ ...prev, plan: p.plan, subscriptionStatus: p.status, subscription: { ...(prev.subscription || {}), plan: p.plan, status: p.status } }))}
            />
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic">{t("users_section_actions")}</h4>
            <div className="grid grid-cols-1 gap-3">
              {statusKey === "suspended" ? (
                <ActionButton
                  icon={<CheckCircle2 size={18} />}
                  label={t("users_action_reactivate")}
                  onClick={() => performAction("reactivate")}
                  tone="ok"
                />
              ) : statusKey !== "banned" ? (
                <ActionButton
                  icon={<Pause size={18} />}
                  label={t("users_action_suspend")}
                  onClick={() => setConfirmAction({ type: "suspend" })}
                  tone="warn"
                />
              ) : null}

              {statusKey === "banned" ? (
                <ActionButton
                  icon={<CheckCircle2 size={18} />}
                  label={t("users_action_unban")}
                  onClick={() => performAction("unban")}
                  tone="ok"
                />
              ) : (
                <ActionButton
                  icon={<Ban size={18} />}
                  label={t("users_action_ban")}
                  onClick={() => setConfirmAction({ type: "ban" })}
                  tone="danger"
                />
              )}

              <ActionButton
                icon={<Trash2 size={18} />}
                label={t("users_action_delete")}
                onClick={() => setConfirmAction({ type: "delete" })}
                tone="danger"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Analytics + History */}
        <div className="lg:col-span-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Stat label="Role" value={user.role || "user"} icon={<Award size={18} />} color="text-cyan" />
            <Stat label="Plan" value={subscriptionPlan} icon={<Zap size={18} />} color="text-emerald" />
            <Stat label="Banned" value={user.banned ? "yes" : "no"} icon={<Activity size={18} />} color="text-orange-500" />
          </div>

          {/* Moderation history */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic">{t("users_section_history")}</h4>
              <History size={14} className="text-white/20" />
            </div>
            {history.length === 0 ? (
              <p className="text-[10px] text-white/20 uppercase tracking-widest py-8 text-center">{t("users_history_empty")}</p>
            ) : (
              <div className="space-y-3">
                {history.map((ev) => (
                  <div key={ev.id} className="p-4 bg-white/[0.01] border border-white/5 hover:border-cyan/30 transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs font-black text-white uppercase tracking-wider">
                        {ev.type === "ban" ? <span className="text-red-500">BAN</span> :
                         ev.type === "unban" ? <span className="text-emerald">UNBAN</span> :
                         ev.type === "suspend" ? <span className="text-amber">SUSPEND</span> :
                         ev.type === "reactivate" ? <span className="text-emerald">REACTIVATE</span> :
                         ev.type === "delete" ? <span className="text-red-500">DELETE</span> :
                         ev.type?.toUpperCase() || "EVENT"}
                      </p>
                      <p className="text-[9px] text-white/25 uppercase font-mono">
                        {ev.createdAt?.toDate ? ev.createdAt.toDate().toLocaleString() : "—"}
                      </p>
                    </div>
                    {ev.reason && <p className="text-[10px] text-white/40 mt-2 leading-relaxed">{ev.reason}</p>}
                    {ev.adminUid && <p className="text-[9px] text-white/25 font-mono mt-1">by: {ev.adminUid}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmModal
            type={confirmAction.type}
            reason={reason}
            setReason={setReason}
            onCancel={() => { setConfirmAction(null); setReason(""); }}
            onConfirm={() => performAction(confirmAction.type)}
            pending={actionPending}
            t={t}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between items-center">
    <span className="text-[8px] font-black text-white/25 uppercase tracking-widest">{label}</span>
    <span className={`text-[10px] font-bold text-white uppercase tracking-wider ${mono ? "font-mono" : ""} truncate ml-3 max-w-[60%]`}>{value}</span>
  </div>
);

const Stat = ({ label, value, icon, color }) => (
  <div className="bento-card !p-8 space-y-4">
    <div className={`${color} opacity-50`}>{icon}</div>
    <div>
      <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black text-white tracking-tighter uppercase">{value}</p>
    </div>
  </div>
);

const ActionButton = ({ icon, label, onClick, tone }) => {
  const toneClass = {
    ok: "border-emerald/30 text-emerald hover:bg-emerald/10",
    warn: "border-amber/30 text-amber hover:bg-amber/10",
    danger: "border-red-500/30 text-red-500 hover:bg-red-500/10",
    neutral: "border-cyan/30 text-cyan hover:bg-cyan/10",
  }[tone] || "border-white/10 text-white/60 hover:bg-white/5";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bento-card !p-5 flex items-center justify-between transition-all ${toneClass}`}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
    </button>
  );
};

const ConfirmModal = ({ type, reason, setReason, onCancel, onConfirm, pending, t }) => {
  const isDelete = type === "delete";
  const isBan = type === "ban";
  const titleKey = isDelete ? "users_confirm_delete_title" : isBan ? "users_confirm_ban_title" : `users_confirm_${type}_title`;
  const descKey = isDelete ? "users_confirm_delete_desc" : isBan ? "users_confirm_ban_desc" : `users_confirm_${type}_desc`;

  // Close on Escape.
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.96 }}
        className="w-full max-w-md min-h-screen sm:min-h-0 sm:rounded-2xl p-6 sm:p-8 space-y-6 glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDelete ? <Trash2 size={20} className="text-red-500" /> :
             isBan ? <Ban size={20} className="text-red-500" /> :
             <Pause size={20} className="text-amber" />}
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t(titleKey)}</h2>
          </div>
          <button onClick={onCancel} className="text-white/30 hover:text-white p-1" disabled={pending} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">{t(descKey)}</p>
        {(type === "ban" || type === "suspend") && (
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase tracking-widest block">
              {t("users_reason_label")}
            </label>
            <textarea
              maxLength={280}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="input-tech w-full resize-none"
              placeholder="…"
            />
            <p className="text-[9px] text-white/20 text-right">{reason.length}/280</p>
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-40"
          >
            {t("users_modal_cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-40 ${
              isDelete || isBan ? "bg-red-500 text-white hover:bg-red-600" : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {pending ? "…" : t("users_modal_confirm")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserDetailsPage;
