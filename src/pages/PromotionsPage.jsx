import { useEffect, useState } from "react";
import { Plus, Trash2, Calendar, Ticket, Zap, X, Megaphone, Clock, CheckCircle2, AlertCircle, Gift, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import {
  listCampaignEvents,
  createCampaignEvent,
  deleteCampaignEvent,
  toggleCampaignEventStatus,
} from "../lib/supabase-admin";
import { generateCampaign, isChatReady } from "../lib/admin-ai";

const EVENT_TYPES = [
  { key: "campaign", label: "Campagne", icon: Megaphone, color: "text-amber-400" },
  { key: "event", label: "Événement", icon: Calendar, color: "text-cyan" },
  { key: "promotion", label: "Promo", icon: Gift, color: "text-purple-400" },
  { key: "signal", label: "Signal", icon: TrendingUp, color: "text-emerald" },
  { key: "announcement", label: "Annonce", icon: Zap, color: "text-rose" },
];

const PromotionsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "campaign",
    status: "upcoming",
    start_date: "",
    end_date: "",
    location: "",
    link: "",
  });

  // 🔒 Routed through supabaseAdminProxy (Functions emulator → admin SDK
  //   Firestore) instead of the direct client Firestore connection. The
  //   previous direct-Firestore path was broken whenever the Firestore
  //   emulator (:8080) was not running (which is the default in this dev
  //   environment). The proxy uses the Functions emulator (:5001) which
  //   is always on, so the campaigns page works in any setup.
  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await listCampaignEvents(100);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("PromotionsPage: loadEvents failed", err);
      toast.error("Erreur de chargement des campagnes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleCreate() {
    if (!formData.title.trim() || !formData.start_date || !formData.end_date) {
      toast.error("Titre, date début et date fin requis.");
      return;
    }
    setActionPending(true);
    try {
      await createCampaignEvent({
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
      });
      toast.success("Événement créé !");
      setShowModal(false);
      setFormData({ title: "", description: "", type: "campaign", status: "upcoming", start_date: "", end_date: "", location: "", link: "" });
      await loadEvents();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la création");
    } finally {
      setActionPending(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cet événement ?")) return;
    setActionPending(true);
    try {
      await deleteCampaignEvent(id);
      toast.success("Événement supprimé");
      await loadEvents();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la suppression");
    } finally {
      setActionPending(false);
    }
  }

  async function handleToggleStatus(id, currentStatus) {
    setActionPending(true);
    try {
      const res = await toggleCampaignEventStatus(id, currentStatus);
      const newStatus = res?.status ?? (currentStatus === "cancelled" ? "active" : "cancelled");
      toast.success(`Statut changé : ${newStatus}`);
      await loadEvents();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du changement de statut");
    } finally {
      setActionPending(false);
    }
  }

  const typeConfig = (type) => EVENT_TYPES.find((t) => t.key === type) || EVENT_TYPES[0];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Campaign Management"
        title="Campaigns"
        highlight="& Events"
        subtitle={`${events.length} événement${events.length !== 1 ? "s" : ""} créé${events.length !== 1 ? "s" : ""} — gérer campagnes, événements, promos, signaux et annonces.`}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Directive</span>
          </button>
        }
      />

      {/* Events Grid */}
      {loading ? (
        <div className="p-24 text-center text-white/25 uppercase tracking-[0.5em] text-xs animate-pulse">Syncing_nodes...</div>
      ) : events.length === 0 ? (
        <div className="p-24 text-center bento-card border-dashed">
          <Zap size={40} className="mx-auto text-white/15 mb-6" />
          <p className="text-white/30 font-black uppercase tracking-[0.2em] text-xs">No active growth campaigns detected.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-8 text-orange-500 font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            Initiate First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => {
            const config = typeConfig(ev.type);
            const now = new Date();
            const startDate = ev.start_date?.toDate ? ev.start_date.toDate() : new Date(ev.start_date);
            const endDate = ev.end_date?.toDate ? ev.end_date.toDate() : new Date(ev.end_date);
            const isOngoing = now >= startDate && now <= endDate && ev.status !== "cancelled";
            const isUpcoming = now < startDate && ev.status !== "cancelled";
            const isCancelled = ev.status === "cancelled";

            return (
              <div
                key={ev.id}
                className={`bento-card group transition-all hover:border-white/10 ${
                  isOngoing ? "border-cyan/30" : isCancelled ? "border-red-500/10 opacity-60" : ""
                }`}
              >
                {/* Status indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${config.color}`}>
                    <config.icon size={14} />
                    {config.label}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isOngoing ? "bg-cyan/10 text-cyan border border-cyan/20" :
                    isUpcoming ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    isCancelled ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    "bg-white/5 text-white/25 border border-white/10"
                  }`}>
                    {isOngoing ? "EN COURS" : isUpcoming ? "À VENIR" : isCancelled ? "ANNULÉ" : "TERMINÉ"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{ev.title}</h3>
                {ev.description && (
                  <p className="text-xs text-white/30 mb-4 line-clamp-2">{ev.description}</p>
                )}

                <div className="space-y-1.5 text-[10px] text-white/30 mb-4">
                  <p className="flex items-center gap-1">
                    <Calendar size={11} />
                    {startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" })}
                    {" → "}
                    {endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" })}
                  </p>
                  {ev.location && <p>📍 {ev.location}</p>}
                  {ev.link && <p className="truncate text-cyan">🔗 {ev.link}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleToggleStatus(ev.id, ev.status)}
                    disabled={actionPending}
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest border hover:opacity-90 transition disabled:opacity-40 ${
                      ev.status === "cancelled"
                        ? "border-cyan/20 text-cyan hover:bg-cyan/5"
                        : "border-red-500/20 text-red-500 hover:bg-red-500/5"
                    }`}
                  >
                    {ev.status === "cancelled" ? "Réactiver" : "Annuler"}
                  </button>
                  <button
                    onClick={() => handleDelete(ev.id)}
                    disabled={actionPending}
                    className="p-2 border border-red-500/10 text-white/25 hover:text-red-500 hover:border-red-500/30 transition disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-panel w-full max-w-xl p-10 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-white/25 hover:text-white transition"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-black mb-8 uppercase font-equinox">New Directive</h3>

              {isChatReady() && (
                <div className="flex items-center gap-2 mb-6 p-4 rounded-xl border border-cyan/10 bg-cyan/[0.02]">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Décris la campagne (ex: webinaire trading psycho pour utilisateurs pro)..."
                    className="flex-1 bg-black/60 border border-white/10 px-4 py-2.5 text-xs focus:border-cyan outline-none placeholder:text-white/15"
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter" || !aiPrompt.trim() || aiGenerating) return;
                      setAiGenerating(true);
                      try {
                        const data = await generateCampaign(aiPrompt);
                        setFormData((p) => ({ ...p, title: data.title || "", description: data.description || "", type: data.type || "campaign", location: data.location || "", link: data.link || "" }));
                        toast.success("Campagne générée !");
                        setAiPrompt("");
                      } catch (err) { toast.error(err.message || "Erreur IA"); }
                      finally { setAiGenerating(false); }
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (!aiPrompt.trim()) { toast.error("Décris la campagne."); return; }
                      setAiGenerating(true);
                      try {
                        const data = await generateCampaign(aiPrompt);
                        setFormData((p) => ({ ...p, title: data.title || "", description: data.description || "", type: data.type || "campaign", location: data.location || "", link: data.link || "" }));
                        toast.success("Campagne générée !");
                        setAiPrompt("");
                      } catch (err) { toast.error(err.message || "Erreur IA"); }
                      finally { setAiGenerating(false); }
                    }}
                    disabled={aiGenerating || !aiPrompt.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan/10 border border-cyan/30 text-cyan text-[10px] font-black uppercase tracking-widest hover:bg-cyan/20 transition-all disabled:opacity-30 shrink-0"
                  >
                    {aiGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {aiGenerating ? "..." : "IA"}
                  </button>
                </div>
              )}

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">Titre *</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Webinar Trading Pro..."
                    className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-cyan/40 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Détails de l'événement..."
                    rows={3}
                    className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-cyan/40 focus:outline-none resize-none"
                  />
                </div>

                {/* Type selector */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setFormData((p) => ({ ...p, type: t.key }))}
                        className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-wider border transition-all ${
                          formData.type === t.key
                            ? `${t.color} border-white/20 bg-white/5`
                            : "text-white/25 border-white/5 hover:text-white hover:border-white/10"
                        }`}
                      >
                        <t.icon size={14} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">Début *</label>
                    <input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white focus:border-cyan/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">Fin *</label>
                    <input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white focus:border-cyan/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location & Link */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">Lieu</label>
                    <input
                      value={formData.location}
                      onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                      placeholder="Zoom / Paris..."
                      className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-cyan/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-2">Lien</label>
                    <input
                      value={formData.link}
                      onChange={(e) => setFormData((p) => ({ ...p, link: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-cyan/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={actionPending}
                    className="flex-1 py-4 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:text-white transition disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={actionPending}
                    className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition disabled:opacity-40"
                  >
                    {actionPending ? "..." : "Create Directive"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default PromotionsPage;