import React, { useState } from "react";
import { 
  Swords, Trophy, Users, Zap, 
  Search, Filter, Plus, Target,
  TrendingUp, Activity, Shield,
  ArrowRight, Timer, AlertCircle, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AlliancesPage = () => {
  const [alliances] = useState([
    // Registry initialisé à vide (Vierge)
    { id: "NODE-ALPHA", members: 1, rank: "PRO", status: "Ready", stake: 0.00, pot: 0.00 },
  ]);

  const lpValue = 0.00; // Pool de Liquidité

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white font-sans"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1a1a1a] pb-6 md:pb-12 gap-6">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-cyan-500 font-equinox">
              <Swords size={14} />
              <span className="text-[9px] font-black uppercase tracking-[0.5em]">Alliance Network Orchestration</span>
           </div>
           <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase font-equinox">Alliances</h2>
        </div>
        
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 md:p-6 flex items-center space-x-4 md:space-x-10 relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
           <div>
              <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Total_Liquidity_Pool</p>
              <p className="text-lg md:text-xl font-black text-cyan-500 tracking-tighter">${lpValue.toLocaleString()}</p>
           </div>
           <div className="w-px h-8 md:h-10 bg-[#1a1a1a]" />
           <button className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Manage Pool</button>
        </div>
      </header>

      {/* Duel Config Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: "Individual Entry", range: "$10 - $50", color: "border-gray-800" },
           { label: "Alliance Entry", range: "$100 - $500", color: "border-gray-800" },
           { label: "System Commission", range: "5%", color: "border-orange-900/30 text-orange-500" },
         ].map((c, i) => (
           <div key={c.label} className={`p-8 bg-[#0a0a0a] border ${c.color}`}>
              <p className="text-[9px] uppercase text-gray-500 tracking-widest mb-2 italic">{c.label}</p>
              <p className="text-2xl font-black text-white tracking-tighter uppercase font-mono">{c.range}</p>
           </div>
         ))}
      </div>

      {/* Alliance Table */}
      <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
        {/* ... table content remains same ... */}
      </div>

      {/* Liquidity Pool Management Section */}
      <div className="p-8 bg-[#050505] border border-cyan-500/20">
         <h3 className="text-xl font-black text-white mb-6 uppercase tracking-widest">Liquidity Pool Administration</h3>
         <div className="flex gap-4 items-center">
            <input 
                type="number" 
                placeholder="Adjust Pool Value ($)" 
                className="bg-black border border-[#1a1a1a] p-4 text-white w-64"
            />
            <button className="bg-cyan-600 px-8 py-4 font-black uppercase text-xs tracking-widest text-white">
                Update Pool
            </button>
         </div>
      </div>

      {/* Network Alert */}
      <div className="p-8 bg-[#050505] border border-cyan-500/20 flex items-center justify-between">

         <div className="flex items-center gap-4">
            <AlertCircle size={20} className="text-cyan-500" />
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">Network Pulse: Stable • All Duels Synchronized</p>
         </div>
         <div className="flex items-center gap-2">
            <div className="h-1 w-1 bg-cyan-500 rounded-full animate-ping" />
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em]">Live_Sync_Enabled</span>
         </div>
      </div>
    </motion.div>
  );
};

export default AlliancesPage;
