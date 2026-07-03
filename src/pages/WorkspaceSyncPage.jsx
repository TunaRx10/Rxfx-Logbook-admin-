import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import { 
  Calendar, Table, ExternalLink, RefreshCw, 
  CheckCircle2, AlertCircle, Clock, Zap, Ticket
} from "lucide-react";
import { motion } from "framer-motion";

const WorkspaceSyncPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const SPREADSHEET_ID = "1dkjo1fFA6e5LVVUo_odyn4INs8UpogiOKAVP9v1ivBA";

  const syncStatus = [
    { name: "Google Sheets", status: "Operational", icon: <Table size={20} />, id: SPREADSHEET_ID, url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}` },
    { name: "Google Calendar", status: "Active", icon: <Calendar size={20} />, id: "RxFx Logbook Marketing", url: "https://calendar.google.com" }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-12 bg-black min-h-screen text-white font-sans"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-[#1a1a1a] pb-12 mb-12">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-orange-500 font-black text-[10px] tracking-[0.3em] uppercase">
            <RefreshCw size={16} />
            <span>Workspace Synchronization</span>
          </div>
          <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Data Bridge</h2>
        </div>
        
        <button 
          className="p-4 bg-white/5 border border-white/10 rounded-none text-gray-500 hover:text-white transition-all"
        >
          <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Connection Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {syncStatus.map((service) => (
          <div key={service.name} className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 group relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/10 transition-all"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-6">
                <div className="p-4 bg-white/5 text-cyan-500 border border-white/5 group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">{service.name}</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{service.status}</span>
                  </div>
                </div>
              </div>
              <a 
                href={service.url} 
                target="_blank" 
                rel="noreferrer"
                className="p-3 bg-white/5 border border-white/5 text-gray-600 hover:text-cyan-500 transition-all"
              >
                <ExternalLink size={20} />
              </a>
            </div>
            <div className="mt-8 pt-6 border-t border-[#111]">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 italic">Resource_ID</p>
              <code className="text-xs text-gray-500 bg-black/30 px-3 py-1.5 font-mono truncate block">
                {service.id}
              </code>
            </div>
          </div>
        ))}
      </div>

      {/* Sync Log Placeholder */}
      <div className="bg-[#050505] border border-[#1a1a1a] p-10 space-y-8">
        <div className="flex items-center space-x-4 border-b border-[#1a1a1a] pb-6">
          <Clock size={20} className="text-gray-700" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 italic">Synchronization_Registry_Log</h3>
        </div>

        <div className="py-20 text-center">
           <AlertCircle size={32} className="mx-auto text-gray-800 mb-6" />
           <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">No_Sync_Directives_Detected</p>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkspaceSyncPage;
