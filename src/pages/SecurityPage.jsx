import React, { useState } from "react";
import { 
  Shield, Key, Lock, Eye, 
  Trash2, Plus, Search, Filter,
  UserCheck, ShieldAlert, Database,
  History, Fingerprint, Activity,
  Server, Cpu, RefreshCw
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
      className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white font-sans"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1a1a1a] pb-12 gap-8">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-cyan-500 font-equinox">
              <Shield size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Authority & Protocol Integrity</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Security</h2>
        </div>
        
        <div className="flex items-center space-x-8 border border-[#1a1a1a] rounded-none p-1 bg-[#050505]">
           <button 
             onClick={() => setActiveTab("roles")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'roles' ? 'bg-cyan-500 text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Authority Roles
           </button>
           <button 
             onClick={() => setActiveTab("audit")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-cyan-500 text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Audit Trail
           </button>
        </div>
      </header>

      {/* Security Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] p-8">
            <h3 className="text-[10px] uppercase text-gray-500 tracking-[0.5em] mb-6 italic">Threat_Intrusion_Pulse</h3>
            <div className="h-32">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={securityIncidents}>
                     <Bar dataKey="value" fill="#ef4444" />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
         <div className="lg:col-span-4 bg-[#0a0a0a] border border-red-500/20 p-8 flex flex-col justify-between">
            <div>
               <p className="text-[10px] uppercase text-red-500 tracking-widest mb-2 italic">Shield Status</p>
               <h4 className="text-4xl font-black text-white tracking-tighter font-equinox uppercase">Reinforced</h4>
            </div>
            <div className="pt-6 border-t border-[#1a1a1a]">
               <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Protocol Sync: Enabled</span>
            </div>
         </div>
      </div>

      {activeTab === 'roles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {roles.map((r) => (
             <div key={r.title} className="bg-[#0a0a0a] border border-[#1a1a1a] p-10 group relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 blur-3xl rounded-full"></div>
                <div className="flex justify-between items-start mb-10">
                   <div className="flex items-center space-x-6">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-none text-gray-700 group-hover:text-cyan-500 transition-colors">
                         <Fingerprint size={28} />
                      </div>
                      <div>
                         <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{r.access} ACCESS</span>
                         <h4 className="text-3xl font-black text-white uppercase tracking-tighter font-equinox mt-1">{r.title}</h4>
                      </div>
                   </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-[#1a1a1a]">
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-gray-600">Authority Rank</span>
                      <span className="text-xs font-bold text-cyan-500">{r.rank}</span>
                   </div>
                   <button className="w-full py-4 bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all">Revoke/Assign Nodes</button>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
                 <tr>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Action Directive</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Administrator</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Severity</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Time</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#111]">
                 {auditLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-white/[0.01]">
                       <td className="px-8 py-6">
                          <div>
                             <p className="text-white text-xs font-bold uppercase tracking-widest font-mono tracking-tighter">{log.action}</p>
                             <p className="text-[10px] text-gray-600 mt-1 uppercase">Target: {log.target}</p>
                          </div>
                       </td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-500">{log.admin}</td>
                       <td className="px-8 py-6">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase border ${log.status === 'critical' ? 'border-red-500/20 text-red-500' : 'border-white/10 text-gray-600'}`}>
                             {log.status}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-right text-[10px] font-black text-gray-700 uppercase tracking-widest font-mono">{log.date}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* System Infrastructure Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-[#1a1a1a]">
         {['Mainframe CPU', 'Storage Nodes', 'Network Latency'].map((label, i) => (
           <div key={label} className="p-8 bg-[#0a0a0a] border border-[#1a1a1a] space-y-4">
              <div className="flex items-center justify-between">
                 <span className="text-[9px] font-black uppercase text-gray-500 italic">{label}</span>
                 <span className="text-xs font-black text-cyan-500">0{i === 2 ? 'ms' : '%'}</span>
              </div>
              <div className="h-0.5 bg-white/5">
                 <div className="h-full bg-cyan-500 w-0 transition-all duration-1000"></div>
              </div>
           </div>
         ))}
      </div>
    </motion.div>
  );
};

export default SecurityPage;
