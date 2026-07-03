import React, { useState } from "react";
import { 
  Trophy, Swords, Target, Timer, 
  Users, Zap, Search, Shield, 
  ArrowUpRight, BarChart2, Activity,
  Clock, CheckCircle2, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ArenaPage = () => {
  const [activeTab, setActiveTab] = useState("duels");

  const [duels] = useState([
    // Liste vierge par défaut
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white font-sans"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1a1a1a] pb-12 gap-8">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-orange-500 font-equinox">
              <Swords size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Battle Arena Control</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Arena</h2>
        </div>
        
        <div className="flex items-center space-x-8 border border-[#1a1a1a] rounded-none p-1 bg-[#050505]">
           <button 
             onClick={() => setActiveTab("duels")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'duels' ? 'bg-white text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Active Duels
           </button>
           <button 
             onClick={() => setActiveTab("comps")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'comps' ? 'bg-white text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Competitions
           </button>
        </div>
      </header>

      {/* Arena Overview Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 relative overflow-hidden group">
               <p className="text-[10px] uppercase text-gray-500 tracking-widest mb-2 italic">Total Prize Distributed</p>
               <h4 className="text-4xl font-black text-white tracking-tighter">$0.00</h4>
            </div>
            <div className="bg-orange-500 text-black p-8 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
               <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest">Active Combatants</p>
                  <Users size={16} />
               </div>
               <h4 className="text-4xl font-black tracking-tighter font-equinox">00</h4>
            </div>
         </div>
         
         <div className="lg:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] p-8 flex flex-col justify-center items-center border-dashed">
            <Trophy size={48} className="text-gray-800 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">Arena_Pulse: Scanning_for_Activity</p>
         </div>
      </div>

      {activeTab === 'duels' ? (
        <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
                 <tr>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Duel Reference</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Combatants</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Stake ($)</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Status</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Terminal Time</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#111]">
                 {duels.length === 0 ? (
                   <tr>
                     <td colSpan="5" className="px-8 py-20 text-center text-[10px] text-gray-700 uppercase tracking-[0.5em] italic">No_Combat_Active</td>
                   </tr>
                 ) : (
                   duels.map((duel) => (
                    <tr key={duel.id} className="group hover:bg-white/[0.01]">
                       <td className="px-8 py-6 font-mono text-xs text-cyan-500 tracking-tighter">{duel.id}</td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-500">{duel.players}</td>
                       <td className="px-8 py-6 text-sm font-black text-white font-mono">${duel.stake.toFixed(2)}</td>
                       <td className="px-8 py-6">
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase border border-white/10 text-gray-600">{duel.status}</span>
                       </td>
                       <td className="px-8 py-6 text-right text-[10px] font-black text-gray-700 uppercase tracking-widest font-mono">
                          {duel.time}
                       </td>
                    </tr>
                   ))
                 )}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="p-12 border border-dashed border-[#1a1a1a] bg-[#050505] flex flex-col items-center justify-center text-center space-y-6">
              <Plus size={32} className="text-gray-800" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest font-equinox">Create New Tournament</h3>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest">Authorized_Root_Access_Only</p>
           </div>
        </div>
      )}
    </motion.div>
  );
};

export default ArenaPage;
