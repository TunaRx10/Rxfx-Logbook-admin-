import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Send, MessageSquare, Clock, AlertCircle, Search } from "lucide-react";

const SupportPage = () => {
  const [filter, setFilter] = useState("all");
  const tickets = [
    { id: "TK-8821", user: "Marc-Antoine", subject: "Problème de synchronisation Arena", status: "open", priority: "high", timestamp: "2026-07-02 14:30" },
    { id: "TK-8819", user: "Elena S.", subject: "Badge Identity non reçu", status: "pending", priority: "medium", timestamp: "2026-07-02 12:15" },
    { id: "TK-8815", user: "Rick K.", subject: "Accès Boutique restreint", status: "resolved", priority: "low", timestamp: "2026-07-01 09:45" }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 bg-black min-h-screen text-white font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-[0.3em] font-equinox text-cyan-500">Support Center</h2>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] mt-2 italic">Nexus_Link_Communication_Hub</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
            <input type="text" placeholder="Search Tickets..." className="bg-[#0a0a0a] border border-[#1a1a1a] pl-10 pr-4 py-2 rounded-sm text-xs focus:border-cyan-500 outline-none transition-all w-64" />
          </div>
          <button className="bg-cyan-500 text-black px-6 py-2 rounded-sm font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Smartphone size={14} /> Broadcast Message
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 italic">Quick_Filter</h4>
            {['all', 'open', 'pending', 'resolved'].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`w-full flex items-center justify-between p-3 text-[10px] uppercase font-bold tracking-widest transition-all ${filter === s ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-white/5 text-gray-500 hover:text-white"}`}>
                {s}
                <span className="opacity-50 font-mono">03</span>
              </button>
            ))}
          </div>
          <div className="bg-[#050505] border border-cyan-500/20 p-6 rounded-sm">
            <div className="flex items-center gap-2 text-cyan-500 mb-4">
              <AlertCircle size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Active Alerts</span>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed uppercase tracking-tighter">3 Nodes currently reporting high latency in the Arena module.</p>
          </div>
        </div>
        <div className="lg:col-span-3 space-y-4">
          <AnimatePresence>
            {tickets.map((ticket, i) => (
              <motion.div key={ticket.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-6">
                  <div className={`p-4 rounded-sm ${ticket.status === 'open' ? 'bg-red-500/10 text-red-500' : ticket.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-xs text-cyan-500">{ticket.id}</span>
                      <span className="text-white font-bold text-sm tracking-tight">{ticket.subject}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">User: {ticket.user} • {ticket.timestamp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 border ${ticket.priority === 'high' ? 'border-red-500/50 text-red-500' : 'border-gray-700 text-gray-500'}`}>{ticket.priority} priority</span>
                    <span className="text-[9px] text-gray-600 font-mono italic">{ticket.status}</span>
                  </div>
                  <button className="bg-white/5 hover:bg-cyan-500 hover:text-black p-3 rounded-sm transition-all text-gray-400"><Send size={16} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default SupportPage;