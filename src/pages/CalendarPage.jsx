import { useState, useEffect } from "react";
import {
  Calendar, Mail, Clock, AlertCircle, Plus,
  ExternalLink, Zap, Trash2, RefreshCw, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { DataState } from "../components/ui/DataState";
import { listTable, insertRow, deleteRow } from "../lib/supabase-admin";

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [mailQueue, setMailQueue] = useState([]);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", start_date: "", end_date: "", location: "" });
  const [syncingSubs, setSyncingSubs] = useState(false);

  // `available` is set true if we can reach the campaign_events table.
  // It used to be hardcoded `true` which meant the "Apps Script non déployé"
  // banner was unreachable AND we never knew if Supabase was down. Now we
  // detect by capturing the first fetch's outcome.
  const [available, setAvailable] = useState(true);

  // Normalize Supabase calendar rows → UI fields.
  // ⚠️ Le schéma principal (001) n'avait pas `start_date`/`end_date`,
  // CalendarPage s'appuyait dessus et finissait sur "Invalid Date" dans
  // toutes les lignes. Maintenant on TOLÈRE les 3 cas :
  //   1. `start_date` présent (optimal, post-migration 002)
  //   2. `start_date` absent mais `created_at` présent (legacy rows)
  //   3. rien  → null (la ligne sera filtrée de la liste)
  function normalizeEvents(rows) {
    return (rows || [])
      .map((e) => {
        const rawStart = e.start_date || e.date || e.start || e.created_at || null;
        if (!rawStart) return null;
        const start = new Date(rawStart);
        if (Number.isNaN(start.getTime())) return null;
        return {
          ...e,
          start: rawStart,
          end: e.end_date || e.end || start.getTime(),
          allDay: !String(rawStart).includes("T"),
          location: e.location || "",
        };
      })
      .filter(Boolean);
  }

  // Load calendar events (Supabase polling).
  // `available` flips to true only after the FIRST successful fetch ; failed
  // fetches set it false (banner stays visible until reload).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rows = await listTable("campaign_events", 100);
        if (cancelled) return;
        setEvents(normalizeEvents(rows));
        setAvailable(true);
        setFetchError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[calendar] fetch failed:", err);
        setFetchError(err?.message || "Impossible de charger le calendrier");
        setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Mail queue (Supabase polling). La table `mail_queue` peut ne pas
  // exister dans le schéma : on capture l'erreur silencieusement et la
  // file d'attente reste vide sans spammer la console toutes les 10s.
  useEffect(() => {
    let cancelled = false;
    async function loadQueue() {
      try {
        const rows = await listTable("mail_queue", 100);
        if (!cancelled) setMailQueue(rows || []);
      } catch (e) {
        // Silencieux — pas de spam console si la table n'existe pas.
        if (!cancelled) setMailQueue([]);
      }
    }
    loadQueue();
    const t = setInterval(loadQueue, 10000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  async function handleCreateEvent() {
    if (!newEvent.title.trim()) { toast.error("Titre requis"); return; }
    try {
      const inserted = await insertRow("campaign_events", {
        title: newEvent.title,
        description: newEvent.description,
        start_date: newEvent.start_date || new Date().toISOString(),
        end_date: newEvent.end_date || null,
        location: newEvent.location,
        type: "event",
        status: "upcoming",
      });
      const row = Array.isArray(inserted) ? inserted[0] : inserted;
      toast.success(`Événement créé : ${row?.title || newEvent.title}`);
      setShowNewEvent(false);
      setNewEvent({ title: "", description: "", start_date: "", end_date: "", location: "" });
      const evts = await listTable("campaign_events", 100);
      setEvents(normalizeEvents(evts));
    } catch (err) {
      toast.error("Erreur: " + (err?.message || String(err)));
    }
  }

  async function handleDeleteEvent(eventId) {
    if (!window.confirm("Supprimer cet événement ?")) return;
    try {
      await deleteRow("campaign_events", "id", eventId);
      toast.success("Événement supprimé");
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      toast.error("Erreur: " + (err?.message || String(err)));
    }
  }

  async function handleSyncSubscriptions() {
    setSyncingSubs(true);
    try {
      // Sync tous les abonnements actifs vers le calendrier (Supabase)
      const subs = await listTable("subscriptions", 500);
      const profiles = await listTable("profiles", 500);
      const emailById = {};
      (profiles || []).forEach((p) => { emailById[p.id] = p.email; });
      let synced = 0;
      for (const s of (subs || [])) {
        if (!s.current_period_end || s.status !== "active") continue;
        const email = emailById[s.user_id] || "";
        const title = `Abonnement ${s.plan} — ${email}`;
        const date = s.current_period_end;
        const existing = (await listTable("campaign_events", 500)).find(
          (e) => e.title === title && e.start_date === date
        );
        if (!existing) {
          await insertRow("campaign_events", { 
            title, 
            start_date: date, 
            end_date: date, 
            type: "subscription",
            status: "active"
          });
          synced++;
        }
      }
      toast.success(`${synced} événements d'abonnement synchronisés`);
      const evts = await listTable("campaign_events", 100);
      setEvents(normalizeEvents(evts));
    } catch (err) {
      toast.error("Erreur sync: " + (err?.message || String(err)));
    }
    setSyncingSubs(false);
  }

  const pendingCount = mailQueue.filter(q => q.status === "pending").length;
  const sentCount = mailQueue.filter(q => q.status === "sent").length;
  const failedCount = mailQueue.filter(q => q.status === "failed").length;
  const upcomingEvents = events.filter(e => new Date(e.start) > new Date()).slice(0, 30);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Calendar & Automation Center"
        title="Automation"
        highlight="Control Plane"
        subtitle={`Google Calendar & Gmail — ${available ? "Apps Script actif" : "non configuré"}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { listTable("campaign_events", 100).then((r) => setEvents(normalizeEvents(r))); toast.success("Calendrier rafraîchi"); }}
              className="btn-tech !text-[9px]"
            >
              <RefreshCw size={12} /> Rafraîchir
            </button>
            <button
              onClick={() => setShowNewEvent(true)}
              disabled={!available}
              className="btn-tech !text-[9px] text-cyan border-cyan/20"
            >
              <Plus size={12} /> Nouvel événement
            </button>
          </div>
        }
      />

      {!available && (
        <div className="mb-8">
          <DataState.Error
            title="Apps Script non deploye"
            message="Ajoute VITE_GOOGLE_APPS_SCRIPT_URL dans .env et redeploie le Code.gs sur script.google.com"
          />
        </div>
      )}

      {/* ══ Mail Queue KPIs ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bento-card text-center !py-5">
          <p className="text-3xl font-black text-cyan">{pendingCount}</p>
          <p className="text-[9px] text-white/25 uppercase tracking-widest mt-1">Emails en attente</p>
        </div>
        <div className="bento-card text-center !py-5">
          <p className="text-3xl font-black text-emerald">{sentCount}</p>
          <p className="text-[9px] text-white/25 uppercase tracking-widest mt-1">Emails envoyés</p>
        </div>
        <div className="bento-card text-center !py-5">
          <p className="text-3xl font-black text-rose">{failedCount}</p>
          <p className="text-[9px] text-white/25 uppercase tracking-widest mt-1">Échecs</p>
        </div>
      </div>

      {/* ══ New Event Modal ══ */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bento-card w-full max-w-md !p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan">Nouvel événement</h3>
            <input
              value={newEvent.title}
              onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
              placeholder="Titre de l'événement"
              className="input-tech w-full"
              autoFocus
            />
            <textarea
              value={newEvent.description}
              onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optionnel)"
              className="input-tech w-full resize-none"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8px] uppercase tracking-wider text-white/30 block mb-1">Début</label>
                <input
                  type="datetime-local"
                  value={newEvent.start_date ? new Date(newEvent.start_date).toISOString().slice(0, 16) : ""}
                  onChange={e => setNewEvent(p => ({ ...p, start_date: new Date(e.target.value).toISOString() }))}
                  className="input-tech w-full"
                />
              </div>
              <div>
                <label className="text-[8px] uppercase tracking-wider text-white/30 block mb-1">Fin</label>
                <input
                  type="datetime-local"
                  value={newEvent.end_date ? new Date(newEvent.end_date).toISOString().slice(0, 16) : ""}
                  onChange={e => setNewEvent(p => ({ ...p, end_date: new Date(e.target.value).toISOString() }))}
                  className="input-tech w-full"
                />
              </div>
            </div>
            <input
              value={newEvent.location}
              onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
              placeholder="Lieu (optionnel)"
              className="input-tech w-full"
            />
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreateEvent} className="btn-tech btn-tech-primary flex-1">
                <Plus size={12} /> Créer
              </button>
              <button onClick={() => setShowNewEvent(false)} className="btn-tech flex-1">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Google Calendar Events ══ */}
      <div className="bento-card mb-8" style={{ padding: 0 }}>
        <div className="px-6 py-4 flex items-center gap-3 border-b" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          <Calendar size={14} className="text-orange-400" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
            Google Calendar — 60 prochains jours
          </h2>
          <button
            onClick={handleSyncSubscriptions}
            disabled={syncingSubs || !available}
            className="ml-auto btn-tech !text-[9px] text-orange-400 border-orange-400/20"
          >
            {syncingSubs ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Sync abonnements
          </button>
          <a href="https://calendar.google.com" target="_blank" rel="noreferrer"
            className="p-2 rounded-lg border border-white/5 text-white/20 hover:text-white hover:border-white/15 transition">
            <ExternalLink size={13} />
          </a>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 size={22} className="mx-auto mb-3 animate-spin text-cyan" />
            <p className="text-[10px] uppercase tracking-widest text-white/20">Chargement du calendrier...</p>
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center">
            <AlertCircle size={24} className="mx-auto mb-3 text-amber-400/40" />
            <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2">Calendar indisponible</p>
            <p className="text-[9px] text-white/10 max-w-md mx-auto leading-relaxed">
              {fetchError}
            </p>
            <button
              onClick={() => { setFetchError(null); setLoading(true); listTable("campaign_events", 100).then((r) => setEvents(normalizeEvents(r))).catch(e => setFetchError(e?.message || String(e))).finally(() => setLoading(false)); }}
              className="mt-4 btn-tech !text-[9px]"
            >
              <RefreshCw size={12} /> Réessayer
            </button>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle size={24} className="mx-auto mb-3 text-white/8" />
            <p className="text-[10px] uppercase tracking-widest text-white/15">Aucun événement à venir</p>
            {!available && (
              <p className="text-[9px] text-white/8 mt-1 max-w-md mx-auto">
                Déploie le Code.gs sur script.google.com pour activer Google Calendar.
              </p>
            )}
          </div>
        ) : (
          <div className="table-wrap max-h-[500px] overflow-y-auto">
            <table className="table-tech">
              <thead className="sticky top-0 z-10" style={{ background: "oklch(0.13 0.02 255 / 0.95)", backdropFilter: "blur(12px)" }}>
                <tr>
                  <th>Date</th>
                  <th>Titre</th>
                  <th>Lieu</th>
                  <th>Description</th>
                  <th className="w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="text-white/40 font-mono text-[10px] whitespace-nowrap">
                      {new Date(ev.start).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      {!ev.allDay && ` ${new Date(ev.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                    </td>
                    <td className="text-white/70 text-xs font-medium">{ev.title}</td>
                    <td className="text-white/30 text-[10px]">{ev.location || "—"}</td>
                    <td className="text-white/20 text-[10px] max-w-[200px] truncate">{ev.description || "—"}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 rounded-lg text-white/15 hover:text-rose hover:bg-rose/5 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Mail Queue ══ */}
      <div className="bento-card" style={{ padding: 0 }}>
        <div className="px-6 py-4 flex items-center gap-3 border-b" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          <Mail size={14} className="text-amber-400" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Mail Queue</h2>
          <span className="ml-auto text-[9px] text-white/15 font-bold">{mailQueue.length} emails</span>
        </div>
        {mailQueue.length === 0 ? (
          <div className="py-16 text-center">
            <Mail size={22} className="mx-auto mb-3 text-white/8" />
            <p className="text-[10px] uppercase tracking-widest text-white/15">File d'attente vide</p>
          </div>
        ) : (
          <div className="table-wrap max-h-[400px] overflow-y-auto">
            <table className="table-tech">
              <thead className="sticky top-0 z-10" style={{ background: "oklch(0.13 0.02 255 / 0.95)", backdropFilter: "blur(12px)" }}>
                <tr>
                  <th>Status</th>
                  <th>Destinataire</th>
                  <th>Sujet</th>
                  <th>Date</th>
                  <th>Erreur</th>
                </tr>
              </thead>
              <tbody>
                {mailQueue.map((q, i) => (
                  <tr key={q.id || i}>
                    <td>
                      {q.status === "sent" ? (
                        <span className="badge-status badge-active">Envoyé</span>
                      ) : q.status === "failed" ? (
                        <span className="badge-status badge-error">Échec</span>
                      ) : (
                        <span className="badge-status badge-warn">En attente</span>
                      )}
                    </td>
                    <td className="text-white/50 font-mono text-[10px]">{q.to_email || q.to || q.userId || "—"}</td>
                    <td className="text-white/70 text-[10px] max-w-[250px] truncate">{q.subject || "—"}</td>
                    <td className="text-white/15 text-[9px] font-mono">
                      {q.createdAt || q.created_at ? new Date(q.createdAt || q.created_at).toLocaleString("fr-FR") : "—"}
                    </td>
                    <td className="text-rose text-[9px] max-w-[120px] truncate">{q.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default CalendarPage;
