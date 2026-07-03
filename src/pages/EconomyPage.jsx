import React, { useState } from "react";
import { 
  CreditCard, Wallet, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Download, Plus, Minus,
  Coins, Bitcoin, Landmark, History, Database,
  TrendingUp, Activity, Clock
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area 
} from "recharts";
import { motion } from "framer-motion";

const EconomyPage = () => {
  const [activeTab, setActiveTab] = useState("ledger");
  const [transactions] = useState([
    // Ledger initialisé à vide (Vierge)
    { id: "TRX-0000", user: "SYSTEM", type: "INITIALIZATION", method: "GENESIS", amount: 0.00, status: "completed", date: "2026-07-02" },
  ]);

  const volumeData = [
    { name: "MON", value: 0 },
    { name: "TUE", value: 0 },
    { name: "WED", value: 0 },
    { name: "THU", value: 0 },
    { name: "FRI", value: 0 },
    { name: "SAT", value: 0 },
    { name: "SUN", value: 0 },
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
              <Landmark size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Economic Engine Control</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Economy</h2>
        </div>
        
        <div className="flex items-center space-x-8 border border-[#1a1a1a] rounded-none p-1 bg-[#050505]">
           <button 
             onClick={() => setActiveTab("ledger")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-cyan-500 text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Master Ledger
           </button>
           <button 
             onClick={() => setActiveTab("withdrawals")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'withdrawals' ? 'bg-cyan-500 text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Withdrawals
           </button>
        </div>
      </header>

      {/* Main Stats Grid & Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl" />
               <p className="text-[10px] uppercase text-gray-500 tracking-widest mb-2 italic">Total Platform Revenue</p>
               <h4 className="text-4xl font-black text-white tracking-tighter">$0.00</h4>
            </div>
            <div className="bg-[#0a0a0a] border border-cyan-500/20 p-8">
               <p className="text-[10px] uppercase text-cyan-500 tracking-widest mb-2 italic">Net Profit (MTD)</p>
               <h4 className="text-4xl font-black text-white tracking-tighter">$0.00</h4>
            </div>
         </div>
         <div className="lg:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] p-8">
            <h3 className="text-[10px] uppercase text-gray-500 tracking-[0.5em] mb-6 italic">Transaction_Volume_Pulse</h3>
            <div className="h-32">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                     <Bar dataKey="value" fill="#06b6d4" />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {activeTab === 'ledger' ? (
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.5em] italic">Intelligence_Ledger_Feed</h3>
              <div className="flex items-center space-x-4">
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search Transaction ID..." 
                      className="pl-10 pr-4 py-2 bg-[#050505] border border-[#1a1a1a] text-[10px] text-white focus:border-cyan-500 outline-none"
                    />
                 </div>
                 <button className="px-4 py-2 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center">
                    <Download size={14} className="mr-2" />
                    <span>Export</span>
                 </button>
              </div>
           </div>

           <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
                       <tr>
                          <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Reference</th>
                          <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Method</th>
                          <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Impact ($)</th>
                          <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Status</th>
                          <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Time</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111]">
                       {transactions.map((trx) => (
                          <tr key={trx.id} className="group hover:bg-white/[0.01] transition-colors cursor-pointer">
                             <td className="px-8 py-6">
                                <div>
                                   <p className="text-white text-xs font-bold font-mono tracking-tighter">{trx.id}</p>
                                   <p className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">{trx.user} • {trx.type}</p>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{trx.method}</span>
                             </td>
                             <td className="px-8 py-6">
                                <span className={`text-sm font-black tracking-tight font-mono ${trx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {trx.amount >= 0 ? '+' : '-'}${Math.abs(trx.amount).toFixed(2)}
                                </span>
                             </td>
                             <td className="px-8 py-6">
                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase border ${trx.status === 'completed' ? 'border-emerald-500/20 text-emerald-500' : 'border-orange-500/20 text-orange-500'}`}>
                                   {trx.status}
                                </span>
                             </td>
                             <td className="px-8 py-6 text-right text-[10px] font-black text-gray-700 uppercase tracking-widest font-mono">
                                {trx.date}
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : (
        <div className="p-20 text-center border border-dashed border-[#1a1a1a] bg-[#050505]">
           <h3 className="text-xl font-black text-white uppercase tracking-[0.5em] mb-4 font-equinox">Withdrawal Audit Required</h3>
           <p className="text-[10px] text-gray-600 font-medium uppercase tracking-[0.2em]">0 manual audits pending. Authorized Root only.</p>
           <button className="mt-8 px-12 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 transition-all">Begin Security Audit</button>
        </div>
      )}

      {/* Gateway Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-[#1a1a1a]">
         <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-10 space-y-6">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] font-equinox flex items-center space-x-3">
               <Landmark size={14} className="text-cyan-500" />
               <span>Gateway Auth: STRIPE</span>
            </h3>
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5">
               <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Live Sync Status</span>
               <span className="text-[10px] font-black text-emerald-500 uppercase">Authorized</span>
            </div>
         </div>
         <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-10 space-y-6">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] font-equinox flex items-center space-x-3">
               <Bitcoin size={14} className="text-orange-500" />
               <span>Gateway Auth: CRYPTO</span>
            </h3>
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5">
               <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Liquidity Link</span>
               <span className="text-[10px] font-black text-orange-500 uppercase">Active</span>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default EconomyPage;
