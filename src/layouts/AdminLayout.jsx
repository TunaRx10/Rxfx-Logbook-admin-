import { useState, useEffect, Suspense } from "react";
import Sidebar from "../components/Sidebar";
import AIChatPanel from "../components/AIChatPanel";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft, Shield, Activity, Sparkles } from "lucide-react";
import { isChatReady } from "../lib/admin-ai";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const location = useLocation();
  const showChatButton = isChatReady();

  // Listen for chat-open events from sidebar + dashboard
  useEffect(() => {
    const handler = () => setIsChatOpen(true);
    window.addEventListener("admin-open-meme", handler);
    window.addEventListener("admin-open-chat", handler);
    return () => {
      window.removeEventListener("admin-open-meme", handler);
      window.removeEventListener("admin-open-chat", handler);
    };
  }, []);

  return (
    <div className="flex min-h-screen font-sans">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } h-screen overflow-y-auto`}
        style={{
          background: "oklch(0.1 0.01 255 / 0.95)",
          borderRight: "1px solid var(--card-border)",
        }}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Topbar */}
        <div className="lg:hidden p-4 flex items-center justify-between z-30"
          style={{
            background: "oklch(0.08 0.02 255 / 0.92)",
            borderBottom: "1px solid oklch(1 0 0 / 7%)",
          }}
        >
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white/40 hover:text-cyan transition">
            <PanelLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center border border-cyan/30 bg-black shadow-[0_0_10px_rgba(0,188,212,0.2)]">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest font-heading">RxFx Admin</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {/* Desktop Header Bar */}
          <div className="hidden lg:flex px-8 py-4 items-center justify-between border-b transition-colors"
            style={{
              background: "oklch(0.08 0.02 255 / 0.85)",
              borderBottom: "1px solid oklch(1 0 0 / 6%)",
            }}
          >
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/25">
              <Shield size={12} className="text-cyan shadow-[0_0_8px_rgba(0,188,212,0.4)]" />
              <span className="text-white/60">
                {(location?.pathname === "/" || !location?.pathname) 
                  ? "Nexus Core Dashboard" : 
                  location.pathname.slice(1).replace(/-/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {showChatButton && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border"
                  style={{
                    background: "oklch(0.74 0.13 209 / 8%)",
                    borderColor: "oklch(0.74 0.13 209 / 20%)",
                    color: "oklch(0.74 0.13 209 / 90%)",
                  }}
                >
                  <Sparkles size={13} className="text-cyan" />
                  AI Chat
                </button>
              )}
              <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald/70 uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse shadow-[0_0_8px_#10b981]" />
                System Online
              </span>
            </div>
          </div>

          {/* Page Content — Suspense inside layout so sidebar stays visible */}
          <div className="min-h-full">
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/20">Chargement…</p>
                </div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </div>

      </main>

      {/* AI Chat Panel */}
      <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default AdminLayout;
