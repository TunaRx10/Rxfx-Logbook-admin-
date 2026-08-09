import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Handshake, Search, ChevronRight, XCircle,
  ExternalLink, Mail, MapPin, Building2,
  CheckCircle2, Clock, Info, AlertCircle,
} from "lucide-react";
import { listTable, updateRow, insertRow } from "../lib/supabase-admin";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { DataState } from "../components/ui/DataState";
import { toast } from "sonner";

const STATUS_STYLES = {
  pending: { label: "En attente", icon: <Clock size={12} />, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  reviewing: { label: "En cours", icon: <Info size={12} />, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  more_info_requested: { label: "Infos +", icon: <AlertCircle size={12} />, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  accepted: { label: "Accepté", icon: <CheckCircle2 size={12} />, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  refused: { label: "Refusé", icon: <XCircle size={12} />, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-500/20" },
  suspended: { label: "Suspendu", icon: <AlertCircle size={12} />, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-500/20" },
};

const PartnershipsAdmin = () => {
  const [apps, setApps] = useState([]);
  const [state, setState] = useState({ kind: "loading" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    setState({ kind: "loading" });
    const result = await DataState.loadGuard(() => listTable("partnership_applications", 200));
    if (result.state === "ok") {
      setApps(result.data);
      setState({ kind: "ok" });
    } else if (result.state === "supabase-missing") {
      setState({ kind: "supabase-missing" });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateRow("partnership_applications", "id", id, {
        status: newStatus,
        internal_notes: notes,
        updated_at: new Date().toISOString(),
      });
      await insertRow("application_history", {
        application_id: id,
        entity_type: "partnership",
        old_status: selectedApp.status,
        new_status: newStatus,
        note: notes,
      });
      toast.success(`Statut → ${newStatus}`);
      setSelectedApp(null);
      fetchData();
    } catch (error) {
      toast.error("Update failed: " + error.message);
    }
  };

  const filteredApps = apps.filter((a) => {
    const matchesSearch =
      a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.professional_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Nexus Partners"
        title="Partnership"
        highlight="Management"
        subtitle="Gérer et examiner les candidatures de partenariat de la communauté RxFx."
        actions={
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15" size={18} />
              <input
                type="text"
                placeholder="Rechercher un partenaire…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-tech pl-12"
              />
            </div>
            <select
              className="input-tech w-full md:w-48 cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="reviewing">En cours</option>
              <option value="more_info_requested">Infos requises</option>
              <option value="accepted">Accepté</option>
            </select>
          </div>
        }
      />

      {/* Data State — single source of truth for loading / missing / error / ok */}
      {state.kind === "loading" && (
        <DataState.Loading label="Chargement des candidatures…" rows={5} />
      )}
      {state.kind === "supabase-missing" && (
        <DataState.SupabaseMissing onGoToSettings={() => (window.location.href = "/settings")} />
      )}
      {state.kind === "error" && (
        <DataState.Error message={state.message} onRetry={fetchData} />
      )}
      {state.kind === "ok" && (
        filteredApps.length === 0 ? (
          <DataState.Empty
            icon={Handshake}
            title="Aucune candidature"
            message="Les nouvelles candidatures de partenariat apparaîtront ici dès qu'elles arrivent."
          />
        ) : (
          <div className="bento-card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="table-tech">
                <thead>
                  <tr>
                    <th>Partenaire</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="group">
                      <td>
                        <div className="flex flex-col">
                          <p className="text-white text-sm font-bold">{app.full_name}</p>
                          <p className="text-xs text-white/40">{app.professional_email}</p>
                        </div>
                      </td>
                      <td>
                        <span className="text-[10px] font-black uppercase text-cyan/70 tracking-widest">
                          {app.type?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="text-white/30 text-xs">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {(() => {
                          const s = STATUS_STYLES[app.status] || STATUS_STYLES.pending;
                          return (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${s.bg} ${s.color} ${s.border}`}>
                              {s.icon} {s.label}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => { setSelectedApp(app); setNotes(app.internal_notes || ""); }}
                          className="p-2 bg-white/5 hover:bg-cyan/20 rounded-lg text-white/20 hover:text-cyan transition-all"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Slide-over Detail Panel */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-full md:w-[600px] bg-black border-l border-white/10 z-[110] overflow-y-auto p-8 flex flex-col"
              style={{ background: "var(--sidebar-bg)" }}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan border border-cyan/20">
                    <Handshake size={20} />
                  </div>
                  <h2 className="text-xl font-black uppercase italic">Review Application</h2>
                </div>
                <button onClick={() => setSelectedApp(null)} className="p-2 text-white/20 hover:text-white transition">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 flex items-center gap-2">
                    <Building2 size={12} /> Partner Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Full Name</p>
                      <p className="text-sm font-bold text-white">{selectedApp.full_name}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Company</p>
                      <p className="text-sm font-bold text-white">{selectedApp.company_name || "N/A"}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Email</p>
                      <p className="text-sm font-bold text-cyan flex items-center gap-1">
                        <Mail size={12} /> {selectedApp.professional_email}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1">Country</p>
                      <p className="text-sm font-bold text-white flex items-center gap-1">
                        <MapPin size={12} /> {selectedApp.country || "Unknown"}
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Project & Motivation</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">Project Presentation</p>
                      <p className="text-sm text-white/60 leading-relaxed italic">"{selectedApp.project_presentation}"</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-2">Value Proposition</p>
                      <p className="text-sm text-white/60 leading-relaxed italic">"{selectedApp.value_add}"</p>
                    </div>
                  </div>
                </section>

                {selectedApp.website_url && (
                  <section>
                    <a
                      href={selectedApp.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl bg-cyan/5 border border-cyan/20 text-cyan hover:bg-cyan/10 transition"
                    >
                      <span className="text-xs font-black uppercase tracking-widest">Visit Project Website</span>
                      <ExternalLink size={16} />
                    </a>
                  </section>
                )}

                <section className="pt-8 border-t border-white/10">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Administrative Actions</h3>
                  <div className="space-y-4">
                    <textarea
                      placeholder="Add internal notes…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-cyan transition resize-none h-32"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleUpdateStatus(selectedApp.id, "reviewing")} className="py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition">
                        Mark Under Review
                      </button>
                      <button onClick={() => handleUpdateStatus(selectedApp.id, "more_info_requested")} className="py-3 rounded-xl bg-purple-400/10 border border-purple-400/20 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-400/20 transition">
                        Request More Info
                      </button>
                      <button onClick={() => handleUpdateStatus(selectedApp.id, "refused")} className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition">
                        Refuse Partnership
                      </button>
                      <button onClick={() => handleUpdateStatus(selectedApp.id, "accepted")} className="py-3 rounded-xl bg-emerald/10 border border-emerald/20 text-[10px] font-black uppercase tracking-widest text-emerald hover:bg-emerald/20 transition">
                        Approve Partnership
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default PartnershipsAdmin;