import React, { useState } from "react";
import { 
  ShoppingBag, Plus, Search, Filter, 
  Image as ImageIcon, Video, Tag, 
  Package, DollarSign, Percent, 
  Trash2, Edit3, Eye, Download,
  RefreshCw, CheckCircle2, AlertTriangle,
  ArrowUpRight, Truck, Undo2, MessageCircle
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from "recharts";
import { motion } from "framer-motion";

const BoutiquePage = () => {
  const [activeTab, setActiveTab] = useState("inventory");
  const [products] = useState([
    // Inventory initialisé à vide (Vierge)
    { 
      id: "P-00", name: "Sample Product", price: 0.00, stock: 0, category: "General", status: "draft",
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=60"
    },
  ]);

  const [orders] = useState([
    // Liste vide par défaut
  ]);

  const marketData = [
    { name: "MON", sales: 0 },
    { name: "TUE", sales: 0 },
    { name: "WED", sales: 0 },
    { name: "THU", sales: 0 },
    { name: "FRI", sales: 0 },
    { name: "SAT", sales: 0 },
    { name: "SUN", sales: 0 },
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
              <ShoppingBag size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Market Supply Chain Control</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Market</h2>
        </div>
        
        <div className="flex items-center space-x-8 border border-[#1a1a1a] rounded-none p-1 bg-[#050505]">
           <button 
             onClick={() => setActiveTab("inventory")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-cyan-500 text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Inventory
           </button>
           <button 
             onClick={() => setActiveTab("orders")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-cyan-500 text-black' : 'text-gray-600 hover:text-white'}`}
           >
             Orders
           </button>
        </div>
      </header>

      {/* Market Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] p-8">
            <h3 className="text-[10px] uppercase text-gray-500 tracking-[0.5em] mb-6 italic">Market_Volume_Pulse</h3>
            <div className="h-32">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketData}>
                     <Bar dataKey="sales" fill="#06b6d4" />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
         <div className="lg:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] p-8 flex flex-col justify-between">
            <div>
               <p className="text-[10px] uppercase text-emerald-500 tracking-widest mb-2 italic">Live Orders</p>
               <h4 className="text-4xl font-black text-white tracking-tighter">{orders.length}</h4>
            </div>
            <div className="pt-6 border-t border-[#1a1a1a]">
               <div className="flex justify-between items-center text-[10px] font-black uppercase">
                  <span className="text-gray-500">Refund Rate</span>
                  <span className="text-white/20">0%</span>
               </div>
            </div>
         </div>
      </div>

      {activeTab === 'inventory' ? (
        <div className="space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                    <input className="pl-10 pr-4 py-2 bg-[#050505] border border-[#1a1a1a] text-[10px] text-white focus:border-cyan-500 outline-none" placeholder="Asset SKU..." />
                 </div>
              </div>
              <button className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 transition-all flex items-center">
                 <Plus size={14} className="mr-2" />
                 <span>Deploy Asset</span>
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p) => (
                <div key={p.id} className="bg-[#0a0a0a] border border-[#1a1a1a] group flex flex-col h-full overflow-hidden">
                   <div className="relative h-48 bg-white/5 border-b border-[#1a1a1a] overflow-hidden">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover opacity-10 group-hover:opacity-30 transition-all" />
                      <div className="absolute top-4 right-4 flex space-x-2">
                         <button className="p-2 bg-black/60 border border-white/10 text-gray-500 hover:text-white"><Edit3 size={14} /></button>
                         <button className="p-2 bg-black/60 border border-white/10 text-red-900 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                      <div className="absolute bottom-4 left-6">
                         <span className="px-2 py-0.5 text-[8px] font-black uppercase border border-cyan-500/20 text-cyan-500 bg-cyan-500/5">{p.status}</span>
                      </div>
                   </div>
                   <div className="p-8 flex-1 flex flex-col space-y-6">
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">{p.category}</p>
                            <h4 className="text-xl font-black text-white tracking-tighter uppercase">{p.name}</h4>
                         </div>
                         <p className="text-lg font-black text-cyan-500 font-mono">${p.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-px bg-[#1a1a1a] border border-[#1a1a1a]">
                         <div className="p-4 bg-[#050505]">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Stock</p>
                            <p className="text-sm font-bold text-white">{p.stock}</p>
                         </div>
                         <div className="p-4 bg-[#050505]">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Asset ID</p>
                            <p className="text-[10px] font-mono text-gray-600 uppercase">{p.id}</p>
                         </div>
                      </div>

                      <button className="mt-auto block w-full py-4 bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all">Configure Logic</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] bg-[#050505] overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-[#1a1a1a]">
                 <tr>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Order Reference</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">User Node</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Market Value ($)</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">WhatsApp</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black">Status</th>
                    <th className="px-8 py-5 text-[9px] uppercase tracking-widest text-gray-500 font-black text-right">Terminal</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#111]">
                 {orders.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-8 py-20 text-center text-[10px] text-gray-700 uppercase tracking-[0.5em] italic">No_Orders_Processed</td>
                   </tr>
                 ) : (
                   orders.map((o) => (
                    <tr key={o.id} className="group hover:bg-white/[0.01]">
                       <td className="px-8 py-6">
                          <div>
                             <p className="text-white text-xs font-bold font-mono tracking-tighter">{o.id}</p>
                             <p className="text-[10px] text-gray-600 font-medium uppercase">{o.date}</p>
                          </div>
                       </td>
                       <td className="px-8 py-6 text-sm font-bold text-gray-500">{o.user}</td>
                       <td className="px-8 py-6 text-sm font-black text-white font-mono">${o.total.toFixed(2)}</td>
                       <td className="px-8 py-6">
                          <div className="flex items-center space-x-2 text-cyan-500">
                             <MessageCircle size={14} />
                             <span className="text-[10px] font-black uppercase tracking-widest">{o.whatsapp}</span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase border ${o.status === 'shipping' ? 'border-blue-500/20 text-blue-500' : 'border-emerald-500/20 text-emerald-500'}`}>{o.status}</span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <button className="p-2 text-gray-700 hover:text-white transition-all"><Truck size={16} /></button>
                       </td>
                    </tr>
                   ))
                 )}
              </tbody>
           </table>
        </div>
      )}

      {/* Supply Chain Intelligence */}
      <div className="bg-[#050505] border border-[#1a1a1a] p-10 flex flex-col md:flex-row items-center justify-between gap-10">
         <div className="flex items-center space-x-6">
            <div className="p-4 bg-white/5 text-cyan-500 rounded-none border border-cyan-500/20 animate-pulse">
               <RefreshCw size={24} />
            </div>
            <div>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest font-equinox">Firebase Market Core</h3>
               <p className="text-[10px] text-gray-600 font-medium uppercase tracking-[0.2em] mt-2">Inventory assets and media blobs are synchronized with Global CDN.</p>
            </div>
         </div>
         <div className="flex items-center space-x-4">
            <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Active Sync: 100%</span>
            <div className="w-32 h-0.5 bg-white/5">
               <div className="h-full bg-cyan-500 w-full shadow-[0_0_10px_#06b6d4]"></div>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default BoutiquePage;
