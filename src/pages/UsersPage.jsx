import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { 
  Users, Shield, Search, UserX, UserCheck, 
  ArrowRight, X, Plus, Minus, CreditCard, 
  Zap, Award, Activity, History, Trophy, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const UsersPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white font-sans"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1a1a1a] pb-12 gap-8">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-cyan-500 font-equinox">
              <Shield size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Identity Orchestration Registry</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Registry</h2>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
          <input 
            type="text" 
            placeholder="Search Identity or Email..." 
            className="w-full pl-12 pr-4 py-4 bg-[#050505] border border-[#1a1a1a] text-white text-sm focus:border-cyan-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {/* ... (Existing stats grid) ... */}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        {['All', 'Active', 'Suspended'].map(filter => (
            <button key={filter} className="text-xs font-black uppercase text-gray-500 hover:text-white px-4 py-2 border border-[#1a1a1a]">
                {filter}
            </button>
        ))}
      </div>

      {/* Table Identity */}
      <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
              <tr>
                <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Identity Node</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Status</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Economy</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Rank</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111]">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="group hover:bg-white/[0.01] transition-colors cursor-pointer" 
                  onClick={() => navigate(`/users/${user.id}`)}
                >
                  <td className="px-8 py-6">
                    <div>
                      <p className="text-white text-sm font-bold tracking-tight">{user.displayName}</p>
                      <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">{user.id} • {user.email}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase border ${user.status === 'active' ? 'border-emerald-500/20 text-emerald-500' : 'border-red-500/20 text-red-500'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2 text-white">
                       <span className="text-xs font-bold font-mono text-emerald-500">${user.balance.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                       {user.isAdmin && <Zap size={10} className="text-cyan-500 fill-current" />}
                       <span className={`text-[10px] font-black uppercase tracking-widest ${user.isAdmin ? 'text-cyan-500' : 'text-gray-600'}`}>{user.rank}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-gray-700 group-hover:text-cyan-500 transition-colors">
                       <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default UsersPage;
