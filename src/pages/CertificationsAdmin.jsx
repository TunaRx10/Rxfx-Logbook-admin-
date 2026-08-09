import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Award, Search,
  CheckCircle2, XCircle, Clock, Info, AlertCircle,
  FileCheck, Star, User,
  ChevronRight
} from "lucide-react";
import { listTable, updateRow, insertRow, getAllUsers } from "../lib/supabase-admin";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { DataState } from "../components/ui/DataState";
import { toast } from "sonner";

const CertificationsAdmin = () => {
  const [apps, setApps] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [dataState, setDataState] = useState({ kind: "loading" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDataState({ kind: "loading" });
    const result = await DataState.loadGuard(async () => {
      const [appData, userData] = await Promise.all([
        listTable("certification_applications", 200),
        getAllUsers(),
      ]);
      const userMap = {};
      userData.forEach(u => { userMap[u.id] = u; });
      return { apps: appData || [], users: userMap };
    });
    if (result.state === "ok") {
      setApps(result.data.apps);
      setUsers(result.data.users);
      setDataState({ kind: "ok" });
    } else if (result.state === "supabase-missing") {
      setDataState({ kind: "supabase-missing" });
    } else {
      toast.error("Error fetching data");
      setDataState({ kind: "error", message: result.message });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (app) => {
    try {
      const certNumber = `RFX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const issueDate = new Date().toISOString();
      
      await updateRow("certification_applications", "id", app.id, { 
        status: 'certified',
        certificate_number: certNumber,
        issue_date: issueDate,
        internal_notes: notes,
        updated_at: new Date().toISOString()
      });
      
      await insertRow("application_history", {
        application_id: app.id,
        entity_type: 'certification',
        old_status: app.status,
        new_status: 'certified',
        note: notes
      });

      toast.success(`Certification approved! Number: ${certNumber}`);
      setSelectedApp(null);
      fetchData();
    } catch (error) {
      toast.error("Approval failed: " + error.message);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateRow("certification_applications", "id", id, { 
        status: newStatus,
        internal_notes: notes,
        updated_at: new Date().toISOString()
      });
      
      await insertRow("application_history", {
        application_id: id,
        entity_type: 'certification',
        old_status: selectedApp.status,
        new_status: newStatus,
        note: notes
      });

      toast.success(`Status updated to ${newStatus}`);
      setSelectedApp(null);
      fetchData();
    } catch (error) {
      toast.error("Update failed: " + error.message);
    }
  };

  const filteredApps = apps.filter(a => {
    const user = users[a.user_id] || {};
    const matchesSearch = 
      (user.firstName + " " + user.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.certificate_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const STATUS_STYLES = {
    pending: { label: "En attente", icon: <Clock size={12} />, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    reviewing: { label: "En cours", icon: <Info size={12} />, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    certified: { label: "Certifié", icon: <CheckCircle2 size={12} />, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    refused: { label: "Refusé", icon: <XCircle size={12} />, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
    suspended: { label: "Suspendu", icon: <AlertCircle size={12} />, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Nexus Registry"
        title="Certification"
        highlight="Audit"
        subtitle="Review and issue professional certifications based on performance audit."
        actions={
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15" size={18} />
                <input
                  type="text"
                  placeholder="Search certificate or user…"
                  className="input-tech pl-12"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <select 
                className="input-tech w-full md:w-48 cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
             >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="certified">Certified</option>
             </select>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="bento-card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table-tech">
              <thead>
                <tr>
                  <th>Trader</th>
                  <th>Cert #</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dataState.kind === "loading" ? (
                   <tr><td colSpan={5} className="py-20 text-center text-white/15 animate-pulse uppercase text-[10px] tracking-widest">Loading Applications...</td></tr>
                ) : filteredApps.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-white/15 uppercase text-[10px] tracking-widest">No certifications found</td></tr>
                ) : filteredApps.map((app) => (
                  <tr key={app.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                            <User size={16} />
                         </div>
                         <div>
                            <p className="text-white text-sm font-bold">{users[app.user_id]?.firstName} {users[app.user_id]?.lastName}</p>
                            <p className="text-[10px] text-white/20 font-mono uppercase">{app.user_id?.slice(0, 8)}</p>
                         </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-[10px] font-mono text-cyan/70 tracking-widest">{app.certificate_number || "PENDING"}</span>
                    </td>
                    <td className="text-white/30 text-xs">{new Date(app.created_at).toLocaleDateString()}</td>
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
                    <td>
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
      </div>

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
              className="fixed top-0 right-0 h-screen w-full md:w-[500px] bg-black border-l border-white/10 z-[110] overflow-y-auto p-8 flex flex-col"
              style={{ background: "var(--sidebar-bg)" }}
            >
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan border border-cyan/20">
                      <Award size={20} />
                    </div>
                    <h2 className="text-xl font-black uppercase italic italic">Review Certification</h2>
                  </div>
                  <button onClick={() => setSelectedApp(null)} className="p-2 text-white/20 hover:text-white transition">
                    <XCircle size={24} />
                  </button>
               </div>

               <div className="space-y-8 flex-1">
                  <section className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                     <Award size={64} className="mx-auto text-cyan mb-4 drop-shadow-[0_0_20px_rgba(0,188,212,0.3)]" />
                     <h3 className="text-lg font-black uppercase italic text-white">{users[selectedApp.user_id]?.firstName} {users[selectedApp.user_id]?.lastName}</h3>
                     <p className="text-xs text-white/40 mt-1">Trader ID: {selectedApp.user_id}</p>
                     
                     <div className="mt-6 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan/5 border border-cyan/10">
                        <Star size={14} className="text-cyan" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan/70">Performance Audit Required</span>
                     </div>
                  </section>

                  <section className="pt-8 border-t border-white/10">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Audit Decision</h3>
                     
                     <div className="space-y-4">
                        <textarea
                          placeholder="Add internal notes or decision rationale..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-cyan transition resize-none h-32"
                        />
                        
                        <div className="grid grid-cols-2 gap-3">
                           <button 
                             onClick={() => handleUpdateStatus(selectedApp.id, 'reviewing')}
                             className="py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition"
                           >
                             Under Audit
                           </button>
                           <button 
                             onClick={() => handleUpdateStatus(selectedApp.id, 'refused')}
                             className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition"
                           >
                             Refuse Demand
                           </button>
                           <button 
                             onClick={() => handleApprove(selectedApp)}
                             className="col-span-2 py-4 rounded-xl bg-cyan/10 border border-cyan/20 text-[11px] font-black uppercase tracking-widest text-cyan hover:bg-cyan/20 transition shadow-[0_0_25px_rgba(0,188,212,0.1)] flex items-center justify-center gap-2"
                           >
                             <FileCheck size={18} />
                             Issue Professional Certificate
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

export default CertificationsAdmin;
