import React from "react";
import { Users, Activity, CreditCard, ShieldCheck, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const AdminDashboard = () => {
  // Statut vierge (Données à 0/N/A)
  const metrics = [
    { label: "Total Users", value: "0", icon: <Users size={20} />, color: "text-cyan-500" },
    { label: "Active Nodes", value: "0", icon: <Activity size={20} />, color: "text-emerald-500" },
    { label: "Revenue", value: "$0.00", icon: <CreditCard size={20} />, color: "text-orange-500" },
    { label: "Alerts", value: "0", icon: <ShieldCheck size={20} />, color: "text-red-500" },
  ];

  const identityNodes = [
    // Placeholder vierge
    { id: "NODE_0000", status: "WAITING", economy: "$0.00", rank: "UNRANKED" },
  ];

  return (
    <div className="min-h-screen bg-black p-12 text-white font-sans">
      <motion.h2 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-4xl font-black uppercase tracking-[0.3em] mb-10 font-equinox text-cyan-500"
      >
        Dashboard
      </motion.h2>
      
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {metrics.map((m, i) => (
          <motion.div 
            key={m.label} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-cyan-500 transition-all group relative overflow-hidden"
          >
            <div className={`${m.color} mb-6 group-hover:scale-110 transition-transform`}>{m.icon}</div>
            <p className="text-[10px] uppercase text-gray-500 tracking-widest">{m.label}</p>
            <h4 className="text-2xl font-bold mt-2">{m.value}</h4>
            <div className="absolute bottom-0 left-0 h-1 bg-cyan-500 w-0 group-hover:w-full transition-all duration-500" />
          </motion.div>
        ))}
      </div>

      {/* Identity Node Table */}
      <div className="mt-20">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 italic">Identity_Node_Registry</h3>
          <div className="h-px bg-[#1a1a1a] flex-1 mx-8" />
        </div>

        <div className="overflow-x-auto border border-[#1a1a1a] bg-[#050505]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-[#1a1a1a]">
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-gray-500 font-black">Identity Node</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-gray-500 font-black">Status</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-gray-500 font-black">Economy</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-gray-500 font-black">Rank</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {identityNodes.map((node, i) => (
                <tr key={i} className="border-b border-[#111] hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-5 font-mono text-xs tracking-tighter text-cyan-500">{node.id}</td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 text-[8px] font-black bg-white/5 border border-white/10 rounded-sm text-gray-500 italic uppercase">
                      {node.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-mono text-xs">{node.economy}</td>
                  <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{node.rank}</td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-gray-600 hover:text-cyan-500 transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
