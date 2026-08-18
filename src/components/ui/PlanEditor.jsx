import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Sparkles, Check, X, Edit3, Save, Loader2,
  Calendar, Tag, Layers, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { updateUserProfile } from "../../lib/data-admin";

const PLANS = [
  {
    id: "free",
    label: "Free",
    icon: Tag,
    color: "text-white/40",
    bg: "bg-white/[0.02] border-white/5",
    description: "Aucun abonnement actif.",
  },
  {
    id: "pro",
    label: "Pro",
    icon: Sparkles,
    color: "text-cyan",
    bg: "bg-cyan/5 border-cyan/20",
    description: "Starter · $29.99/mois ou $83.67/trimestre.",
  },
  {
    id: "elite",
    label: "Elite",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-400/5 border-amber-400/20",
    description: "Pro Max · $99.99/mois ou $279.99/trimestre.",
  },
];

const STATUSES = [
  { id: "active", label: "Actif", dot: "bg-emerald" },
  { id: "inactive", label: "Inactif", dot: "bg-white/30" },
  { id: "pending", label: "En attente", dot: "bg-amber-400" },
  { id: "suspended", label: "Suspendu", dot: "bg-amber-400" },
];

/**
 * PlanEditor — inline editor for the user's `plan` + `subscriptionStatus`.
 * Renders two compact radio-button cards side-by-side with a "Save" action
 * that calls `updateUserProfile`. Use inside UserDetailsPage or anywhere
 * an admin needs to flip a user's plan.
 *
 * Why not just expose the raw profiles table? Because the plan/status
 * fields have semantic meaning (free / pro / elite / active / inactive /
 * pending) and a wrong write can disable an active subscription — the
 * dropdown UI enforces the allowlist.
 */
const PlanEditor = ({ uid, currentPlan = "free", currentStatus = "inactive", onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [plan, setPlan] = useState(currentPlan || "free");
  const [status, setStatus] = useState(currentStatus || "inactive");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPlan(currentPlan || "free");
    setStatus(currentStatus || "inactive");
    setDirty(false);
  }, [currentPlan, currentStatus]);

  useEffect(() => {
    setDirty(plan !== currentPlan || status !== currentStatus);
  }, [plan, status, currentPlan, currentStatus]);

  const save = async () => {
    if (!dirty) { setEditing(false); return; }
    setSaving(true);
    try {
      await updateUserProfile(uid, {
        plan,
        status,
      });
      toast.success(`Plan mis à jour : ${plan} / ${status}`);
      onSaved?.({ plan, status });
      setEditing(false);
    } catch (err) {
      toast.error("Erreur: " + (err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setPlan(currentPlan || "free");
    setStatus(currentStatus || "inactive");
    setEditing(false);
  };

  return (
    <div className="rounded-2xl border p-6 space-y-5" style={{ borderColor: "oklch(1 0 0 / 7%)", background: "oklch(0.13 0.02 255 / 0.4)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
            Plan & Statut
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-tech text-[10px] py-1.5 px-3"
          >
            <Edit3 size={11} /> Modifier
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="btn-tech text-[10px] py-1.5 px-3"
            >
              <X size={11} /> Annuler
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="btn-tech btn-tech-primary text-[10px] py-1.5 px-3 disabled:opacity-40"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Sauver
            </button>
          </div>
        )}
      </div>

      {/* Plan */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
          Plan
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PLANS.map((p) => {
            const active = plan === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!editing}
                onClick={() => setPlan(p.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  active
                    ? `${p.bg} ring-1 ring-cyan/30`
                    : "bg-white/[0.02] border-white/5 hover:border-white/15"
                } ${editing ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={active ? p.color : "text-white/30"} />
                    <span className={`text-xs font-black uppercase tracking-wider ${active ? p.color : "text-white/40"}`}>
                      {p.label}
                    </span>
                  </div>
                  {active && <Check size={12} className="text-cyan" />}
                </div>
                <p className="text-[9px] text-white/30 leading-relaxed">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
          Statut abonnement
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUSES.map((s) => {
            const active = status === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!editing}
                onClick={() => setStatus(s.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                  active
                    ? "bg-cyan/10 border-cyan/30 text-cyan"
                    : "bg-white/[0.02] border-white/5 text-white/40 hover:border-white/15"
                } ${editing ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cyan" : s.dot}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {s.label}
                </span>
                {active && <Check size={11} className="ml-auto text-cyan" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Warn if downgrading an active elite sub */}
      <AnimatePresence>
        {dirty && currentPlan === "elite" && plan !== "elite" && status === "active" && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20"
          >
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              Vous rétrogradez un abonnement Elite actif. L'utilisateur perdra ses
              privilèges premium à la prochaine synchronisation du webhook Suby.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[8px] text-white/15 leading-relaxed">
        Les changements sont écrits dans <code>profiles.plan</code> et
        <code> profiles.subscription_status</code>. Le webhook Suby les resynchronisera au prochain paiement.
      </p>
    </div>
  );
};

export default PlanEditor;