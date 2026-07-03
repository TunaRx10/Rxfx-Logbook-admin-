import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, Shield } from "lucide-react";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-[#000000] text-[#888888] font-geist overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[40] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-[50] w-64 transform bg-black transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Floating Control Bar (Mobile Only) */}
        <div className="lg:hidden p-4 border-b border-[#222222] flex items-center justify-between bg-black z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white/40 hover:text-cyan-500"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-cyan-500 flex items-center justify-center text-black font-black text-[10px] font-equinox">R</div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest font-equinox">RxFx Logbook Admin</span>
          </div>
          <div className="w-8"></div> {/* Spacer */}
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden border-l border-[#222222]">
          {/* Internal Navigation Trigger (Desktop) */}
          <div className="hidden lg:flex p-6 border-b border-[#222222] items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
             <div className="flex items-center space-x-4 text-[10px] font-black uppercase tracking-[0.4em]">
                <Shield size={12} className="text-cyan-500" />
                <span>Operational_Node_X_Authenticated</span>
             </div>
             <div className="flex items-center space-x-4">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Sync_Active</span>
             </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
