import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, Trash2, Mail, UserPlus, CreditCard,
  AlertTriangle, Info, ShoppingBag, Calendar, X,
  Filter, CheckCheck,
} from "lucide-react";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { toast } from "sonner";

/* ── Icons & Colors per notification type ────────────────── */
const NOTIF_ICONS = {
  user: UserPlus,
  payment: CreditCard,
  alert: AlertTriangle,
  info: Info,
  shop: ShoppingBag,
  event: Calendar,
  email: Mail,
  system: Bell,
};

const NOTIF_COLORS = {
  user: "border-blue-500/20 bg-blue-500/5 text-blue-400",
  payment: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  alert: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  info: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
  shop: "border-violet-500/20 bg-violet-500/5 text-violet-400",
  event: "border-pink-500/20 bg-pink-500/5 text-pink-400",
  email: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
  system: "border-white/10 bg-white/5 text-white/50",
};

/* ── Demo data ──────────────────────────────────────────── */
const DEMO_NOTIFS = [
  { id: "1", type: "user", title: "Nouvel utilisateur", message: "Jean D. s'est inscrit via Google OAuth.", time: "Il y a 5 min", read: false },
  { id: "2", type: "payment", title: "Paiement reçu", message: "Abonnement Pro Max — 49€ de Marie L.", time: "Il y a 12 min", read: false },
  { id: "3", type: "alert", title: "Limite API atteinte", message: "OpenRouter : 85% du quota quotidien utilisé.", time: "Il y a 28 min", read: false },
  { id: "4", type: "shop", title: "Nouvelle commande", message: "Formation Scalping Pro × 1 — à expédier.", time: "Il y a 1h", read: true },
  { id: "5", type: "event", title: "Webinaire demain", message: "Rappel : « Psychologie du Trading » à 18h CET.", time: "Il y a 2h", read: true },
  { id: "6", type: "info", title: "Mise à jour système", message: "v3.2.1 déployée — nouveaux modèles IA disponibles.", time: "Il y a 3h", read: true },
  { id: "7", type: "email", title: "Campagne envoyée", message: "Newsletter « Septembre » envoyée à 2 340 abonnés.", time: "Il y a 5h", read: true },
  { id: "8", type: "system", title: "Backup effectué", message: "Snapshot DB sauvegardé sur S3 — 342 MB.", time: "Il y a 8h", read: true },
  { id: "9", type: "user", title: "Compte supprimé", message: "Utilisateur #4821 a demandé la suppression.", time: "Il y a 1j", read: true },
  { id: "10", type: "payment", title: "Remboursement", message: "Remboursement de 29€ — motif : « doublon ».", time: "Il y a 2j", read: true },
];

const STORAGE_KEY = "rxfx_admin_notifs";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEMO_NOTIFS;
    } catch { return DEMO_NOTIFS; }
  });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
  }, [notifs]);

  const unreadCount = notifs.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? notifs.filter((n) => !n.read) : notifs;

  function markRead(id) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Tout est lu ✅");
  }

  function deleteNotif(id) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification supprimée");
  }

  function clearAll() {
    setNotifs([]);
    toast.success("Toutes les notifications ont été effacées");
  }

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} non lue${unreadCount > 1 ? "s" : ""} · ${notifs.length} au total`}
        icon={<Bell className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(filter === "all" ? "unread" : "all")}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                filter === "unread"
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              <Filter className="h-3 w-3" />
              {filter === "unread" ? "Non lues" : "Toutes"}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/40 hover:text-white/70 hover:border-white/20 transition"
              >
                <CheckCheck className="h-3 w-3" />
                Tout lire
              </button>
            )}
            {notifs.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 rounded-full border border-red-500/20 px-3 py-1.5 text-[11px] font-bold text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition"
              >
                <Trash2 className="h-3 w-3" />
                Vider
              </button>
            )}
          </div>
        }
      />

      {/* Notif list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <Bell className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-sm text-white/30">Aucune notification</p>
              <p className="text-xs text-white/15 mt-1">
                {filter === "unread" ? "Toutes les notifications ont été lues." : "Les nouvelles notifications apparaîtront ici."}
              </p>
            </motion.div>
          ) : (
            filtered.map((notif) => {
              const Icon = NOTIF_ICONS[notif.type] || Bell;
              const colorClass = NOTIF_COLORS[notif.type] || NOTIF_COLORS.system;
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`group flex items-start gap-4 rounded-2xl border p-4 transition cursor-pointer ${
                    notif.read
                      ? "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                      : "border-cyan-500/10 bg-cyan-500/[0.03] hover:bg-cyan-500/[0.06]"
                  }`}
                  onClick={() => markRead(notif.id)}
                >
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-bold ${notif.read ? "text-white/50" : "text-white/80"}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${notif.read ? "text-white/25" : "text-white/45"}`}>
                      {notif.message}
                    </p>
                    <p className="mt-1.5 text-[10px] font-mono text-white/15">{notif.time}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                    {!notif.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                        title="Marquer comme lu"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Supprimer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
