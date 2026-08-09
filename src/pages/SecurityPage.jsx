import { useState } from "react";
import { 
  Shield, Fingerprint
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";

const SecurityPage = () => {
  const [activeTab, setActiveTab] = useState("roles");
  const [auditLogs] = useState([
    // Logs initialisés à vide (Vierge)
    { id: "LOG-0000", admin: "SYSTEM", action: "INITIAL_SECURITY_SCAN", target: "Nexus_Root", status: "info", date: "2026-07-02" },
  ]);

  const securityIncidents = [
    { name: "MON", value: 0 },
    { name: "TUE", value: 0 },
    { name: "WED", value: 0 },
    { name: "THU", value: 0 },
    { name: "FRI", value: 0 },
    { name: "SAT", value: 0 },
    { name: "SUN", value: 0 },
  ];

  const roles = [
    { title: "Root Admin", rank: "PRO", nodes: 1, access: "ABSOLUTE" },
    { title: "Regional Admin", rank: "PRO", nodes: 0, access: "MASTER" },
    { title: "Moderator", rank: "EXP", nodes: 0, access: "SOCIAL" },
    { title: "Support Specialist", rank: "EXP", nodes: 0, access: "LIMITED" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6 lg:p-12 space-y-12 text-white font-sans"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between pb-12 gap-8" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-cyan font-equinox">
              <Shield size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Authority & Protocol Integrity</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Security</h2>
        </div>
        
        <div className="flex items-center space-x-4 rounded-xl p-1" style={{ background: "oklch(0.11 0.025 255 / 0.5)", border: "1px solid oklch(1 0 0 / 7%)" }}>
           <button 
             onClick={() => setActiveTab("roles")}
             className={`badge-status cursor-pointer transition-all ${activeTab === 'roles' ? 'badge-active' : 'text-white/20 hover:text-white/50'}`} style={activeTab !== 'roles' ? { borderColor: 'oklch(1 0 0 / 7%)' } : {}}
           >
             Authority Roles
           </button>
           <button 
             onClick={() => setActiveTab("audit")}
             className={`badge-status cursor-pointer transition-all ${activeTab === 'audit' ? 'badge-active' : 'text-white/20 hover:text-white/50'}`} style={activeTab !== 'audit' ? { borderColor: 'oklch(1 0 0 / 7%)' } : {}}
           >
             Audit Trail
           </button>
        </div>
      </header>

      {/* Security Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 bento-card">
            <h3 className="text-[10px] uppercase text-white/25 tracking-[0.5em] mb-6 italic">Threat Intrusion Pulse</h3>
            <div className="h-32">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={securityIncidents}>
                     <Bar dataKey="value" fill="#ef4444" />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
         <div className="lg:col-span-4 bento-card flex flex-col justify-between" style={{ borderColor: "oklch(0.63 0.26 29 / 20%)" }}>
            <div>
               <p className="text-[10px] uppercase text-rose tracking-widest mb-2 italic">Shield Status</p>
               <h4 className="text-4xl font-black text-white tracking-tighter uppercase">Reinforced</h4>
            </div>
            <div className="pt-6" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)" }}>
               <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Protocol Sync: Enabled</span>
            </div>
         </div>
      </div>

      {activeTab === 'roles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {roles.map((r) => (
             <div key={r.title} className="bento-card group relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 blur-3xl rounded-full"></div>
                <div className="flex justify-between items-start mb-10">
                   <div className="flex items-center gap-6">
                      <div className="p-4 rounded-xl text-white/15 group-hover:text-cyan transition-colors" style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 7%)" }}>
                         <Fingerprint size={28} />
                      </div>
                      <div>
                         <span className="text-[8px] font-black text-cyan uppercase tracking-widest">{r.access} ACCESS</span>
                         <h4 className="text-3xl font-black text-white uppercase tracking-tighter mt-1">{r.title}</h4>
                      </div>
                   </div>
                </div>

                <div className="space-y-6 pt-10" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)" }}>
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-white/25">Authority Rank</span>
                      <span className="text-xs font-bold text-cyan">{r.rank}</span>
                   </div>
                   <button className="btn-tech w-full justify-center hover:text-black">Revoke/Assign Nodes</button>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl" style={{ background: "oklch(0.13 0.02 255 / 0.4)", border: "1px solid oklch(1 0 0 / 7%)" }}>
           <table className="table-tech">
              <thead>
                 <tr>
                    <th>Action Directive</th>
                    <th>Administrator</th>
                    <th>Severity</th>
                    <th className="text-right">Time</th>
                 </tr>
              </thead>
              <tbody>
                 {auditLogs.map((log) => (
                    <tr key={log.id}>
                       <td>
                          <div>
                             <p className="text-white text-xs font-bold uppercase tracking-widest font-mono">{log.action}</p>
                             <p className="text-[10px] text-white/30 mt-1 uppercase">Target: {log.target}</p>
                          </div>
                       </td>
                       <td className="text-sm font-bold text-white/40">{log.admin}</td>
                       <td>
                          <span className={`badge-status ${log.status === 'critical' ? 'badge-error' : 'badge-inactive'}`}>
                             {log.status}
                          </span>
                       </td>
                       <td className="text-right text-white/15 uppercase tracking-widest font-mono">{log.date}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* System Infrastructure Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)" }}>
         {['Mainframe CPU', 'Storage Nodes', 'Network Latency'].map((label, i) => (
           <div key={label} className="bento-card space-y-4">
              <div className="flex items-center justify-between">
                 <span className="text-[9px] font-black uppercase text-white/25 italic">{label}</span>
                 <span className="text-xs font-black text-cyan">0{i === 2 ? 'ms' : '%'}</span>
              </div>
              <div className="h-0.5 bg-white/5">
                 <div className="h-full bg-cyan w-0 transition-all duration-1000"></div>
              </div>
           </div>
         ))}
      </div>
    </motion.div>
  );
};

export default SecurityPage;
