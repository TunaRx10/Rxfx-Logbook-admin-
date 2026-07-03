import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Shield, ArrowLeft, Plus, Minus, UserX, UserCheck, 
  History, Zap, CreditCard, Activity, Globe, Smartphone,
  Clock, Server, ChevronRight, Award, Swords, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

const UserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Simulating fetching user data
    setTimeout(() => {
      setUser({
        id: id || "NODE-0001",
        displayName: "Root Admin",
        email: "admin@rxfx.io",
        status: "active",
        isAdmin: true,
        rank: "PRO",
        balance: 1250.50,
        performance: "A+",
        joined: "2026-07-02",
        lastActive: "2026-07-03 14:20:00",
        ip: "192.168.1.1",
        device: "Desktop / Chrome",
        totalDuels: 42,
        winRate: "68%",
        commissions: 152.40
      });
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest animate-pulse">Initializing Node Access...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white font-sans no-scrollbar"
    >
      {/* Header Navigation */}
      <header className="flex items-center justify-between border-b border-[#1a1a1a] pb-8">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => navigate("/users")}
            className="p-3 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
             <div className="flex items-center space-x-2 text-cyan-500 font-equinox">
                <Shield size={12} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Identity Node Protocol</span>
             </div>
             <h2 className="text-4xl font-black text-white tracking-tighter uppercase font-equinox mt-1">{user.displayName}</h2>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
           <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border ${user.status === 'active' ? 'border-emerald-500/20 text-emerald-500' : 'border-red-500/20 text-red-500'}`}>
              Node_Status: {user.status}
           </span>
           <div className="px-4 py-1.5 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest">
              Rank_{user.rank}
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Identity & Financials */}
        <div className="lg:col-span-4 space-y-12">
           {/* Card Identity */}
           <div className="bg-[#050505] border border-[#1a1a1a] p-8 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/10 transition-all" />
              
              <div className="flex justify-center">
                 <div className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center text-5xl font-black text-white/10 font-equinox">
                    {user.displayName.charAt(0)}
                 </div>
              </div>

              <div className="space-y-4 border-t border-[#1a1a1a] pt-8">
                 {[
                   { label: "Internal_ID", value: user.id },
                   { label: "Email_Link", value: user.email },
                   { label: "Sync_Date", value: user.joined },
                   { label: "Last_Pulse", value: user.lastActive },
                 ].map(item => (
                   <div key={item.label} className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{item.label}</span>
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{item.value}</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Card Financials */}
           <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Financial_Nexus</h4>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-10 space-y-8">
                 <div>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3 italic">Total Available Liquidity</p>
                    <div className="flex items-center justify-between">
                       <span className="text-6xl font-black text-white font-mono tracking-tighter">${user.balance.toFixed(2)}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-3 py-4 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all">
                       <Plus size={16} /> Credit
                    </button>
                    <button className="flex items-center justify-center gap-3 py-4 bg-red-500 text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all">
                       <Minus size={16} /> Debit
                    </button>
                 </div>
              </div>
           </div>

           {/* Administrative Directives */}
           <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Security_Protocols</h4>
              <div className="grid grid-cols-1 gap-4">
                 <button className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-between hover:border-red-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                       <UserX size={20} className="text-gray-700 group-hover:text-red-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-white">Suspend Identity Node</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-800" />
                 </button>
                 <button className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-between hover:border-cyan-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                       <Zap size={20} className="text-gray-700 group-hover:text-cyan-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-white">Update Rank Level</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-800" />
                 </button>
              </div>
           </div>
        </div>

        {/* Right Column: Analytics & Activity */}
        <div className="lg:col-span-8 space-y-12">
           {/* Performance Grid */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Win_Rate", value: user.winRate, icon: <Swords size={18} />, color: "text-cyan-500" },
                { label: "Total_Duels", value: user.totalDuels, icon: <Activity size={18} />, color: "text-emerald-500" },
                { label: "Commissions", value: `$${user.commissions}`, icon: <TrendingUp size={18} />, color: "text-orange-500" },
              ].map(stat => (
                <div key={stat.label} className="p-8 bg-[#050505] border border-[#1a1a1a] space-y-4">
                   <div className={`${stat.color} opacity-50`}>{stat.icon}</div>
                   <div>
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-4xl font-black text-white tracking-tighter uppercase font-equinox">{stat.value}</p>
                   </div>
                </div>
              ))}
           </div>

           {/* Connection Details */}
           <div className="bg-[#050505] border border-[#1a1a1a] p-8 space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Endpoint_Telemetrie</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="flex items-center space-x-4">
                    <Globe size={18} className="text-gray-700" />
                    <div>
                       <p className="text-[8px] font-black text-gray-600 uppercase">IP_Origin</p>
                       <p className="text-xs font-bold font-mono">{user.ip}</p>
                    </div>
                 </div>
                 <div className="flex items-center space-x-4">
                    <Smartphone size={18} className="text-gray-700" />
                    <div>
                       <p className="text-[8px] font-black text-gray-600 uppercase">Device_Identity</p>
                       <p className="text-xs font-bold">{user.device}</p>
                    </div>
                 </div>
                 <div className="flex items-center space-x-4">
                    <Clock size={18} className="text-gray-700" />
                    <div>
                       <p className="text-[8px] font-black text-gray-600 uppercase">Active_Session_Time</p>
                       <p className="text-xs font-bold">12m 45s</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Operational Logs */}
           <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 italic">Operational_Sequence_Logs</h4>
                 <History size={14} className="text-gray-700" />
              </div>

              <div className="space-y-3">
                 {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="group p-5 bg-white/[0.01] border border-[#111] hover:border-cyan-500/30 transition-all flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className="w-10 h-10 bg-white/5 flex items-center justify-center text-gray-700 font-mono text-[10px] group-hover:bg-cyan-500/10 group-hover:text-cyan-500 transition-all">0{i}</div>
                          <div>
                             <p className="text-xs font-black text-white uppercase tracking-wider group-hover:text-cyan-500 transition-all">API_Call: /v1/user/economy/sync</p>
                             <p className="text-[9px] text-gray-600 uppercase font-mono mt-1">Status: 200 OK • Node_Verified • 2026-07-03 14:15:22</p>
                          </div>
                       </div>
                       <button className="text-[9px] text-gray-700 font-black uppercase hover:text-white transition-all">View Payload</button>
                    </div>
                 ))}
              </div>

              <button className="w-full py-4 bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                 Load Extended History Sequence
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserDetailsPage;
