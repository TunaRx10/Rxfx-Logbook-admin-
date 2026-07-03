import React, { useState } from "react";
import { 
  Bell, Send, Clock, Users, Globe, 
  Search, Filter, Plus, Trash2, 
  CheckCircle2, AlertCircle, RefreshCw,
  Zap, Smartphone, MessageSquare, History
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

const NotificationPage = () => {
  const [activeTab, setActiveTab] = useState("broadcast");
  const [history] = useState([
    { id: "NT-01", title: "System Maintenance", target: "GLOBAL", status: "sent", date: "1h ago" },
    { id: "NT-02", title: "New Duel Available", target: "PRO_NODES", status: "scheduled", date: "In 2h" },
  ]);

  const deliveryData = [
    { name: "Push", value: 85 },
    { name: "In-App", value: 65 },
    { name: "Email", value: 45 },
    { name: "Neural", value: 12 },
  ];

  return (
    <div className="min-h-screen bg-[#000000] p-6 lg:p-12 space-y-12 text-[#888888] font-geist">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#222222] pb-12 gap-8">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-premium-cyan font-equinox">
              <Bell size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Global Communication Hub</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Alerts</h2>
        </div>
        
        <div className="flex items-center space-x-8 border border-[#222222] rounded-none p-1 bg-[#0A0A0A]">
           <button 
             onClick={() => setActiveTab("broadcast")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'broadcast' ? 'bg-white text-black' : 'text-[#444444] hover:text-white'}`}
           >
             Broadcast
           </button>
           <button 
             onClick={() => setActiveTab("history")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-black' : 'text-[#444444] hover:text-white'}`}
           >
             Intel Logs
           </button>
        </div>
      </header>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 tech-card p-8">
            <h3 className="tech-label mb-6 font-equinox text-white/40">Delivery Efficiency %</h3>
            <div className="h-32">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData}>
                     <Bar dataKey="value" fill="#00F0FF" radius={[0, 0, 0, 0]} />
                     <XAxis dataKey="name" stroke="#222222" fontSize={8} tick={{ fontWeight: 900 }} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
         <div className="lg:col-span-4 tech-card p-8 flex flex-col justify-between">
            <div>
               <p className="tech-label text-premium-cyan">Nodes Reached (24h)</p>
               <h4 className="text-4xl font-black text-white">8,902</h4>
            </div>
            <div className="pt-6 border-t border-[#222222]">
               <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Global Broadcast Latency: 42ms</span>
            </div>
         </div>
      </div>

      {activeTab === 'broadcast' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           <div className="lg:col-span-7 space-y-10">
              <div className="tech-card p-10 space-y-8">
                 <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] font-equinox border-b border-[#222222] pb-6">Directive Creation</h3>
                 <div className="space-y-6">
                    <div>
                       <label className="tech-label">Signal Title</label>
                       <input className="tech-input text-2xl border-b border-[#222222] pb-2 font-equinox" placeholder="PROTOCOL UPDATE 5.5" />
                    </div>
                    <div>
                       <label className="tech-label">Transmission Content</label>
                       <textarea className="w-full bg-white/5 border border-white/5 rounded-none p-6 text-sm text-white focus:outline-none focus:border-premium-cyan transition-all min-h-[150px]" placeholder="Compose global directive..." />
                    </div>
                    <button className="w-full btn-action py-6 flex items-center justify-center space-x-4">
                       <Zap size={18} />
                       <span>Execute Broadcast</span>
                    </button>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-5 space-y-8">
              <div className="tech-card p-10 space-y-6">
                 <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] font-equinox">Targeting Matrix</h3>
                 <div className="space-y-4">
                    {[
                      { icon: <Globe size={18} />, label: "Global Nodes", count: "12,480" },
                      { icon: <Zap size={18} />, label: "Premium Nodes", count: "3,240" },
                      { icon: <Smartphone size={18} />, label: "Mobile Active", count: "8,902" },
                    ].map((target) => (
                      <div key={target.label} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:border-premium-cyan transition-all cursor-pointer group">
                         <div className="flex items-center space-x-4">
                            <div className="text-[#444444] group-hover:text-premium-cyan transition-colors">{target.icon}</div>
                            <span className="text-[10px] font-black uppercase text-white/60">{target.label}</span>
                         </div>
                         <span className="text-xs font-bold text-white">{target.count}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="tech-card overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-[#222222]">
                 <tr>
                    <th className="px-8 py-5 tech-label">Reference</th>
                    <th className="px-8 py-5 tech-label">Target</th>
                    <th className="px-8 py-5 tech-label">Status</th>
                    <th className="px-8 py-5 tech-label text-right">Timestamp</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                 {history.map((nt) => (
                    <tr key={nt.id} className="group hover:bg-white/[0.01]">
                       <td className="px-8 py-6">
                          <p className="text-white text-xs font-bold uppercase">{nt.title}</p>
                          <p className="text-[10px] text-[#444444] font-medium font-mono">{nt.id}</p>
                       </td>
                       <td className="px-8 py-6 text-[10px] font-black text-premium-cyan uppercase tracking-widest">{nt.target}</td>
                       <td className="px-8 py-6">
                          <span className={`status-badge ${nt.status === 'sent' ? 'border-emerald-500/20 text-emerald-500' : 'border-amber-500/20 text-amber-500'}`}>{nt.status}</span>
                       </td>
                       <td className="px-8 py-6 text-right text-[10px] font-black text-[#444444] uppercase tracking-widest">{nt.date}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
