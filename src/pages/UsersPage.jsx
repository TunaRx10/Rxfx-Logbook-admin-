import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MoreVertical, Ban, CheckCircle2,
  Pause, Trash2, X, Zap, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllUsersWithSubs,
  suspendUser,
  reactivateUser,
  banUser,
  unbanUser,
  deleteUser,
  updateUserProfile,
} from "../lib/data-admin";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import PlanEditor from "../components/ui/PlanEditor";

/**
 * statusToKey — maps profile + banned field combos to the i18n key suffix
 * we render in the status badge. A user with `banned=true` ALWAYS wins,
 * even if their `status` is still "active" (legacy data).
 */
function statusToKey(profile) {
  if (profile?.banned === true) return "banned";
  switch (profile?.status) {
    case "suspended": return "suspended";
    case "inactive": return "inactive";
    case "pending": return "pending";
    case "active":
    default: return "active";
  }
}

const STATUS_FILTERS = [
  { key: "all", match: () => true },
  { key: "active", match: (u) => statusToKey(u) === "active" },
  { key: "suspended", match: (u) => statusToKey(u) === "suspended" },
  { key: "banned", match: (u) => statusToKey(u) === "banned" },
];

const STATUS_BADGE_CLASS = {
  active: "badge-active",
  inactive: "badge-inactive",
  suspended: "badge-warn",
  banned: "badge-danger",
  pending: "badge-pending",
};

const UsersPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLang();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [editPlanFor, setEditPlanFor] = useState(null);
  const [reason, setReason] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [planUpdating, setPlanUpdating] = useState(null);
  const menuRef = useRef(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllUsersWithSubs();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("UsersPage: load failed", err);
      toast.error(t("users_toast_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleQuickPlanChange = async (uid, newPlan) => {
    setPlanUpdating(uid);
    try {
      await updateUserProfile(uid, { plan: newPlan, status: "active" });
      toast.success(`Plan mis à jour : ${newPlan}`);
      await loadUsers();
    } catch (err) {
      toast.error("Erreur: " + (err?.message ?? err));
    } finally {
      setPlanUpdating(null);
    }
  };

  // Click-outside to close the per-row action menu.
  useEffect(() => {
    if (!openMenuFor) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuFor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuFor]);

  const filteredUsers = useMemo(() => {
    const filterFn = STATUS_FILTERS.find((f) => f.key === statusFilter)?.match ?? (() => true);
    const q = searchTerm.trim().toLowerCase();
    return users
      .filter(filterFn)
      .filter((u) =>
        !q ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.last_name || "").toLowerCase().includes(q) ||
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q),
      );
  }, [users, searchTerm, statusFilter]);

  /**
   * performAction — executes the action against the backend, shows a
   * toast on success/failure, reloads the list so the persisted state
   * is canonical.
   */
  const performAction = useCallback(async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    const adminUid = currentUser?.id ?? "";
    setActionPending(true);
    try {
      switch (type) {
        case "suspend":
          await suspendUser(user.id, reason, adminUid);
          toast.success(t("users_toast_suspended"));
          break;
        case "reactivate":
          await reactivateUser(user.id, adminUid);
          toast.success(t("users_toast_reactivated"));
          break;
        case "ban":
          await banUser(user.id, reason, adminUid);
          toast.success(t("users_toast_banned"));
          break;
        case "unban":
          await unbanUser(user.id, adminUid);
          toast.success(t("users_toast_unbanned"));
          break;
        case "delete":
          await deleteUser(user.id, adminUid);
          toast.success(t("users_toast_deleted"));
          setOpenMenuFor(null);
          setConfirmAction(null);
          setReason("");
          setActionPending(false);
          await loadUsers();
          return;
        default:
          throw new Error("unknown action type");
      }
      await loadUsers();
    } catch (err) {
      console.error("performAction failed", err);
      toast.error(`${t("users_toast_error")}: ${String(err?.message ?? err).slice(0, 120)}`);
    } finally {
      setOpenMenuFor(null);
      setConfirmAction(null);
      setReason("");
      setActionPending(false);
    }
  }, [confirmAction, currentUser, reason, t, loadUsers]);

  const startAction = (user, type) => {
    setConfirmAction({ user, type });
    setReason("");
  };

  // Auto-fire non-destructive actions (reactivate / unban are reversible).
  useEffect(() => {
    if (!confirmAction) return;
    if (confirmAction.type === "reactivate" || confirmAction.type === "unban") {
      performAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmAction?.type]);

  const counts = useMemo(() => ({
    all: users.length,
    active: users.filter((u) => statusToKey(u) === "active").length,
    suspended: users.filter((u) => statusToKey(u) === "suspended").length,
    banned: users.filter((u) => statusToKey(u) === "banned").length,
  }), [users]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="User Registry — Google Sheets"
        title="User"
        highlight="Registry"
        subtitle="Browse, search, suspend, ban or delete every registered trader."
        actions={
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15" size={18} />
            <input
              type="text"
              placeholder={t("users_search_placeholder")}
              className="input-tech pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition border ${
                active
                  ? "bg-cyan/15 text-cyan border-cyan/40"
                  : "bg-white/[0.02] text-white/40 border-white/5 hover:border-white/15 hover:text-white/70"
              }`}
            >
              {t(`users_filter_${f.key}`)}{" "}
              <span className="ml-1 opacity-50 font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bento-card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table-tech">
            <thead>
              <tr>
                <th>{t("users_col_user")}</th>
                <th>{t("users_col_email")}</th>
                <th>{t("users_col_plan")}</th>
                <th>{t("users_col_status")}</th>
                <th className="text-right pr-6">{t("users_col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-white/15 text-[10px] uppercase">
                    Loading…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-white/15 text-[10px] uppercase">
                    No users match
                  </td>
                </tr>
              ) : filteredUsers.map((user) => {
                const statusKey = statusToKey(user);
                return (
                  <tr key={user.id} className="group">
                    <td
                      className="cursor-pointer"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      <p className="text-white text-sm font-bold">
                        {user.display_name || `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "—"}
                      </p>
                      <p className="text-[10px] text-white/15 font-mono uppercase">{user.id?.slice(0, 12)}…</p>
                    </td>
                    <td className="text-white/50 text-xs">{user.email}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {planUpdating === user.id ? (
                          <div className="px-6 py-1">
                            <Loader2 size={12} className="text-cyan animate-spin mx-auto" />
                          </div>
                        ) : (
                          <>
                            <PlanBadge
                              active={(user.plan || "free") === "free"}
                              label="Free"
                              onClick={() => handleQuickPlanChange(user.id, "free")}
                            />
                            <PlanBadge
                              active={user.plan === "pro"}
                              label="Pro"
                              color="text-cyan border-cyan/30 bg-cyan/10"
                              onClick={() => handleQuickPlanChange(user.id, "pro")}
                            />
                            <PlanBadge
                              active={user.plan === "elite"}
                              label="Elite"
                              color="text-amber-400 border-amber-400/30 bg-amber-400/10"
                              onClick={() => handleQuickPlanChange(user.id, "elite")}
                            />
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${STATUS_BADGE_CLASS[statusKey]}`}>
                        {t(`users_status_${statusKey}`)}
                      </span>
                    </td>
                    <td className="text-right pr-6">
                      <div className="relative inline-block" ref={openMenuFor === user.id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuFor(openMenuFor === user.id ? null : user.id);
                          }}
                          className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition"
                          aria-label={t("users_action_more")}
                        >
                          <MoreVertical size={16} />
                        </button>
                        <AnimatePresence>
                          {openMenuFor === user.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-full mt-1 w-44 bg-black border border-white/10 rounded-xl shadow-2xl z-10 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {statusKey === "suspended" ? (
                                <ActionItem
                                  icon={<CheckCircle2 size={14} className="text-emerald" />}
                                  label={t("users_action_reactivate")}
                                  onClick={() => startAction(user, "reactivate")}
                                />
                              ) : statusKey !== "banned" ? (
                                <ActionItem
                                  icon={<Pause size={14} className="text-amber" />}
                                  label={t("users_action_suspend")}
                                  onClick={() => startAction(user, "suspend")}
                                />
                              ) : null}

                              <ActionItem
                                icon={<Zap size={14} className="text-cyan" />}
                                label={t("users_action_edit_plan")}
                                onClick={() => {
                                  setEditPlanFor(user);
                                  setOpenMenuFor(null);
                                }}
                              />

                              {statusKey === "banned" ? (
                                <ActionItem
                                  icon={<CheckCircle2 size={14} className="text-emerald" />}
                                  label={t("users_action_unban")}
                                  onClick={() => startAction(user, "unban")}
                                />
                              ) : (
                                <ActionItem
                                  icon={<Ban size={14} className="text-red-500" />}
                                  label={t("users_action_ban")}
                                  danger
                                  onClick={() => startAction(user, "ban")}
                                />
                              )}

                              <ActionItem
                                icon={<Trash2 size={14} className="text-red-500" />}
                                label={t("users_action_delete")}
                                danger
                                onClick={() => startAction(user, "delete")}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {confirmAction && (
          <ConfirmModal
            action={confirmAction}
            reason={reason}
            setReason={setReason}
            onCancel={() => { setConfirmAction(null); setReason(""); }}
            onConfirm={performAction}
            pending={actionPending}
            t={t}
          />
        )}
        {editPlanFor && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setEditPlanFor(null)}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl bg-black border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">
                  Modifier Plan : {editPlanFor.display_name || editPlanFor.email}
                </h3>
                <button onClick={() => setEditPlanFor(null)} className="p-2 text-white/20 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <PlanEditor
                uid={editPlanFor.id}
                currentPlan={editPlanFor.subscription?.plan ?? editPlanFor.plan ?? "free"}
                currentStatus={editPlanFor.subscription?.status ?? editPlanFor.status ?? "inactive"}
                onSaved={() => {
                  setEditPlanFor(null);
                  loadUsers();
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

const ActionItem = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-left transition ${
      danger ? "text-red-400 hover:bg-red-500/10" : "text-white/70 hover:bg-white/5"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const ConfirmModal = ({ action, reason, setReason, onCancel, onConfirm, pending, t }) => {
  const isDelete = action.type === "delete";
  const isBan = action.type === "ban";
  const titleKey = isDelete ? "users_confirm_delete_title" : isBan ? "users_confirm_ban_title" : `users_confirm_${action.type}_title`;
  const descKey = isDelete ? "users_confirm_delete_desc" : isBan ? "users_confirm_ban_desc" : `users_confirm_${action.type}_desc`;

  // Close on Escape (topmost modal wins).
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
        className="w-full max-w-md min-h-screen sm:min-h-0 sm:rounded-2xl p-6 sm:p-8 space-y-6 bg-black border border-white/10"
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

        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">{t("users_col_user")}</p>
          <p className="text-sm text-white font-semibold">
            {action.user.display_name || action.user.email || action.user.id}
          </p>
          <p className="text-[10px] text-white/30 font-mono">{action.user.id}</p>
        </div>

        {(action.type === "ban" || action.type === "suspend") && (
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
              isDelete || isBan
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {pending ? "…" : t("users_modal_confirm")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PlanBadge = ({ active, label, onClick, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter transition border ${
      active
        ? color || "bg-white/10 text-white border-white/20"
        : "bg-transparent text-white/10 border-transparent hover:border-white/5 hover:text-white/30"
    }`}
  >
    {label}
  </button>
);

export default UsersPage;
