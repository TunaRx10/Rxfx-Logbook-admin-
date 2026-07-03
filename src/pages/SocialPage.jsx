import React, { useState } from "react";
import { 
  MessageSquare, Users, Shield, Zap, 
  Search, Filter, Plus, Target,
  TrendingUp, Activity, Smartphone,
  ArrowRight, Timer, AlertCircle, Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SocialPage = () => {
  const [activeTab, setActiveTab] = useState("alliances");

  const [alliances] = useState([
    // Liste vierge par défaut
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-12 bg-black min-h-screen text-white font-sans"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1a1a1a] pb-12 mb-12 gap-8">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-cyan-500 font-equinox">
              <Share2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Social Ecosystem Oversight</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Social</h2>
        </div>
        
        <div className="flex items-center space-x-8 border border-[#1a1a1a] rounded-none p-1 bg-[#050505]">
           <button 
             onClick={() => setActiveTab("alliances")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'alliances' ? 'bg-white text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Alliance Registry
           </button>
           <button 
             onClick={() => setActiveTab("chats")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chats' ? 'bg-white text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Global Channels
           </button>
        </div>
      </header>

      {/* Social Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
         {[
           { label: "Active Alliances", value: "00", icon: <Users size={20} /> },
           { label: "Global Messages (24h)", value: "0", icon: <MessageSquare size={20} /> },
           { label: "Network Reach", value: "0 Nodes", icon: <Activity size={20} /> },
         ].map((s, i) => (
           <div key={s.label} className="p-8 bg-[#0a0a0a] border border-[#1a1a1a] relative group">
              <div className="text-cyan-500 mb-6">{s.icon}</div>
              <p className="text-[10px] uppercase text-gray-500 tracking-widest mb-2 italic">{s.label}</p>
              <p className="text-3xl font-black text-white tracking-tighter">{s.value}</p>
           </div>
         ))}
      </div>

      {activeTab === 'alliances' ? (
        <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
                 <tr>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Alliance Node</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Commander</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Rank</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Status</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#111]">
                 {alliances.length === 0 ? (
                   <tr>
                     <td colSpan="5" className="px-8 py-20 text-center text-[10px] text-gray-700 uppercase tracking-[0.5em] italic">No_Social_Nodes_Detected</td>
                   </tr>
                 ) : (
                   alliances.map((al) => (
                    <tr key={al.id} className="group hover:bg-white/[0.01] transition-colors">
                       <td className="px-8 py-6 font-bold text-white tracking-tight">{al.name} <span className="text-xs text-gray-600 ml-2 font-mono">[{al.id}]</span></td>
                       <td className="px-8 py-6 text-[10px] text-gray-500 font-mono tracking-widest">{al.leader}</td>
                       <td className="px-8 py-6">
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase border border-cyan-500/20 text-cyan-500">{al.rank}</span>
                       </td>
                       <td className="px-8 py-6">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{al.status}</span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <button className="p-2 text-gray-700 hover:text-white transition-all"><ArrowRight size={16} /></button>
                       </td>
                    </tr>
                   ))
                 )}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="p-24 text-center border border-dashed border-[#1a1a1a] bg-[#050505] flex flex-col items-center justify-center space-y-6">
           <MessageSquare size={48} className="text-gray-800" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 italic">No_Global_Channels_Active</p>
        </div>
      )}
    </motion.div>
  );
};

export default SocialPage;
