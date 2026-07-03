import React, { useState, useEffect } from "react";
import { 
  Activity, Server, Shield, Globe, Clock, 
  Search, Filter, ArrowUpRight, BarChart3, 
  Database, Zap, Cpu, AlertCircle, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

const ApiMonitoringPage = () => {
  const [loading, setLoading] = useState(true);
  const [apiLogs, setApiLogs] = useState([]);
  const [stats, setStats] = useState({
    totalCalls: 124502,
    errorRate: "0.04%",
    avgLatency: "124ms",
    activeNodes: 124
  });

  useEffect(() => {
    // Simulating API logs fetching
    const mockLogs = [
      { id: 1, method: "GET", endpoint: "/v1/auth/session/verify", status: 200, latency: "45ms", user: "admin@rxfx.io", timestamp: "14:25:01" },
      { id: 2, method: "POST", endpoint: "/v1/economy/balance/credit", status: 201, latency: "182ms", user: "martha_nexus", timestamp: "14:24:55" },
      { id: 3, method: "GET", endpoint: "/v1/arena/duels/active", status: 200, latency: "89ms", user: "system_cron", timestamp: "14:24:42" },
      { id: 4, method: "PUT", endpoint: "/v1/user/profile/update", status: 403, latency: "32ms", user: "guest_9921", timestamp: "14:24:30" },
      { id: 5, method: "GET", endpoint: "/v1/boutique/orders/stream", status: 200, latency: "512ms", user: "operator_z", timestamp: "14:24:15" },
      { id: 6, method: "POST", endpoint: "/v1/notifications/push/broadcast", status: 500, latency: "1024ms", user: "root_admin", timestamp: "14:23:59" },
      { id: 7, method: "DELETE", endpoint: "/v1/security/token/revoke", status: 204, latency: "12ms", user: "shield_system", timestamp: "14:23:45" },
    ];

    setTimeout(() => {
      setApiLogs(mockLogs);
      setLoading(false);
    }, 800);
  }, []);

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
    if (status >= 400 && status < 500) return "text-amber-500 border-amber-500/20 bg-amber-500/5";
    if (status >= 500) return "text-red-500 border-red-500/20 bg-red-500/5";
    return "text-blue-500 border-blue-500/20 bg-blue-500/5";
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white font-sans"
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1a1a1a] pb-12 gap-8">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-cyan-500 font-equinox">
              <Activity size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Nexus API Traffic Monitoring</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Monitoring</h2>
        </div>
        
        <div className="flex gap-4">
           <button className="px-8 py-4 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Force Refresh
           </button>
           <button className="px-8 py-4 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-3">
              <Shield size={16} /> API Settings
           </button>
        </div>
      </header>

      {/* Real-time Stats Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: "Total_Requests", value: stats.totalCalls.toLocaleString(), icon: <Zap size={14} />, color: "border-gray-800" },
           { label: "Failure_Rate", value: stats.errorRate, icon: <AlertCircle size={14} />, color: "border-red-900/30 text-red-500" },
           { label: "Mean_Latency", value: stats.avgLatency, icon: <Clock size={14} />, color: "border-cyan-900/30 text-cyan-500" },
           { label: "Active_Threads", value: stats.activeNodes, icon: <Cpu size={14} />, color: "border-emerald-900/30 text-emerald-500" },
         ].map((s, i) => (
           <motion.div 
             key={s.label}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className={`p-8 bg-[#0a0a0a] border ${s.color} relative group overflow-hidden`}
           >
              <div className="absolute top-0 right-0 p-4 opacity-20">{s.icon}</div>
              <p className="text-[10px] uppercase text-gray-500 tracking-widest mb-2 italic">{s.label}</p>
              <p className="text-4xl font-black text-white tracking-tighter">{s.value}</p>
           </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Main Traffic Stream */}
         <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Live_Traffic_Stream</h4>
               <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                     <span className="text-[8px] font-black uppercase text-emerald-500">Connected</span>
                  </div>
               </div>
            </div>

            <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
                        <tr>
                           <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Method</th>
                           <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Endpoint</th>
                           <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Status</th>
                           <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Latency</th>
                           <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Time</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#111]">
                        {loading ? (
                           Array(6).fill(0).map((_, i) => (
                              <tr key={i} className="animate-pulse">
                                 <td colSpan="5" className="px-8 py-6 h-16 bg-white/[0.01]" />
                              </tr>
                           ))
                        ) : (
                           apiLogs.map((log) => (
                              <tr key={log.id} className="group hover:bg-white/[0.01] transition-colors cursor-pointer">
                                 <td className="px-8 py-6">
                                    <span className={`px-2 py-0.5 text-[10px] font-black font-mono ${log.method === 'GET' ? 'text-cyan-500' : log.method === 'POST' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                       {log.method}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6">
                                    <p className="text-white text-xs font-bold tracking-tight font-mono">{log.endpoint}</p>
                                    <p className="text-[9px] text-gray-600 uppercase mt-0.5 italic">Caller: {log.user}</p>
                                 </td>
                                 <td className="px-8 py-6">
                                    <span className={`px-2 py-0.5 text-[9px] font-black border ${getStatusColor(log.status)}`}>
                                       {log.status}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6">
                                    <span className="text-[10px] font-bold font-mono text-gray-500">{log.latency}</span>
                                 </td>
                                 <td className="px-8 py-6 text-right font-mono text-[10px] text-gray-600 uppercase">
                                    {log.timestamp}
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* Side Analytics */}
         <div className="lg:col-span-4 space-y-12">
            <div className="space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Global_Distribution</h4>
               <div className="bg-[#050505] border border-[#1a1a1a] p-8 space-y-8">
                  <div className="space-y-4">
                     {[
                        { label: "/v1/auth", percent: 45, color: "bg-cyan-500" },
                        { label: "/v1/economy", percent: 30, color: "bg-emerald-500" },
                        { label: "/v1/arena", percent: 15, color: "bg-orange-500" },
                        { label: "/v1/other", percent: 10, color: "bg-gray-700" },
                     ].map(item => (
                        <div key={item.label} className="space-y-2">
                           <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                              <span className="text-gray-500">{item.label}</span>
                              <span className="text-white">{item.percent}%</span>
                           </div>
                           <div className="h-1 bg-white/5 w-full">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${item.percent}%` }}
                                 className={`h-full ${item.color}`}
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Server_Health_Index</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] space-y-2">
                     <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">CPU_Load</p>
                     <p className="text-2xl font-black text-white">12%</p>
                  </div>
                  <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] space-y-2">
                     <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Memory</p>
                     <p className="text-2xl font-black text-white">2.4GB</p>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-cyan-500/5 border border-cyan-500/20 space-y-4 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-3xl group-hover:bg-cyan-500/20 transition-all" />
               <BarChart3 className="text-cyan-500 opacity-50" size={24} />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500">Forensic Insight</p>
               <p className="text-xs text-gray-400 leading-relaxed">
                  System detected an anomalous surge in <span className="text-white font-bold">/v1/economy</span> endpoints from localized node cluster.
               </p>
               <button className="text-[9px] font-black uppercase tracking-widest text-cyan-500 hover:underline">Download Audit Report</button>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default ApiMonitoringPage;
