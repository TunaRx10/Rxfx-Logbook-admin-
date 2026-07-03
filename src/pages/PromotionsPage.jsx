import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import { Plus, Trash2, Tag, Calendar, Percent, Ticket, Zap, X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    discount: "",
    expiryDate: "",
    type: "promotion"
  });

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
            <Ticket size={16} />
            <span>Campaign Management</span>
          </div>
          <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Campaigns</h2>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          <span>New Directive</span>
        </button>
      </div>

      {/* Empty State / Grid */}
      {promotions.length === 0 ? (
        <div className="p-24 text-center border border-dashed border-[#1a1a1a] bg-[#050505]">
          <Zap size={40} className="mx-auto text-gray-800 mb-6" />
          <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-xs">No active growth campaigns detected.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="mt-8 text-orange-500 font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            Initiate First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Mapping real promos here */}
        </div>
      )}

      {/* Modal Placeholder */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
           <div className="bg-[#0a0a0a] border border-[#1a1a1a] w-full max-w-xl p-10 relative">
              <h3 className="text-2xl font-black mb-8 uppercase font-equinox">New Directive</h3>
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-10">Access restricted to Root Admin only.</p>
              <button onClick={() => setShowModal(false)} className="w-full py-4 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:text-white">Cancel</button>
           </div>
        </div>
      )}
    </motion.div>
  );
};

export default PromotionsPage;
