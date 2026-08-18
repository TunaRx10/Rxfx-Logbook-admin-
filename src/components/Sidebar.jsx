import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, Settings,
  Ticket, Zap, ShoppingBag,
  CreditCard, Award,
  Shield, PieChart,
  Smartphone, X, Globe, Send, RefreshCw, Calendar,
  LayoutDashboard, MessageCircle, Package, Handshake, FileCheck,
  Link2, Bell, MessageSquare,
} from "lucide-react";
import { useLang } from "../context/LangContext";
import { getDiscordInviteLink } from "../lib/data-admin";

const Sidebar = ({ onClose }) => {
  const { lang, setLang, languages, t } = useLang();
  const [discordLink, setDiscordLink] = useState("https://discord.gg/saY2b2qCZ5");

  useEffect(() => {
    getDiscordInviteLink().then(res => {
      if (res?.link) setDiscordLink(res.link);
    }).catch(() => {});
  }, []);

  const groups = [
    {
      title: t("core"),
      items: [
        { name: "Dashboard", path: "/", icon: <LayoutDashboard size={16} /> },
        { name: "Logs", path: "/analytics", icon: <PieChart size={16} /> },
        { name: t("referrals"), path: "/referrals", icon: <Users size={16} /> },
      ]
    },
    {
      title: t("management"),
      items: [
        { name: t("registry"), path: "/users", icon: <Users size={16} /> },
        { name: t("economy"), path: "/economy", icon: <CreditCard size={16} /> },
        { name: "Billing", path: "/billing", icon: <Zap size={16} /> },
        { name: t("boutique"), path: "/boutique", icon: <ShoppingBag size={16} /> },
        { name: t("suby_products"), path: "/suby-products", icon: <Package size={16} /> },
        { name: "Checkout Links", path: "/suby-checkout-links", icon: <Link2 size={16} /> },
      ]
    },
    {
      title: "Notifications",
      items: [
        { name: "Notifications", path: "/notifications", icon: <Bell size={16} /> },
      ]
    },
    {
      title: t("assets"),
      items: [
        { name: t("identity"), path: "/identity", icon: <Award size={16} /> },
        { name: t("campaigns"), path: "/promotions", icon: <Ticket size={16} /> },
        { name: t("asset_rules"), path: "/assets", icon: <Award size={16} /> },
      ]
    },
    {
      title: t("autres"),
      items: [
        { name: "Certifications", path: "/certifications", icon: <FileCheck size={16} /> },
        { name: "Partnerships", path: "/partnerships", icon: <Handshake size={16} /> },
      ]
    },
    {
      title: "Chat IA",
      items: [
        { name: "💬 Chat avec Lia", path: "/chat-ia", icon: <MessageSquare size={16} /> },
      ]
    },
    {
      title: t("automations"),
      items: [
        { name: "Calendar", path: "/calendar", icon: <Calendar size={16} /> },
        { name: t("email"), path: "/email", icon: <Send size={16} /> },
        { name: t("sync"), path: "/sync", icon: <RefreshCw size={16} /> },
      ]
    },
    {
      title: t("system"),
      items: [
        { name: t("security"), path: "/security", icon: <Shield size={16} /> },
        { name: t("support"), path: "/support", icon: <Smartphone size={16} /> },
        { name: t("settings"), path: "/settings", icon: <Settings size={16} /> },
      ]
    }
  ];

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-full flex-col overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center px-6 py-8 justify-between border-b"
        style={{ borderColor: "oklch(1 0 0 / 7%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-[0_0_12px_rgba(0,188,212,0.15)]"
            style={{ background: "#000", borderColor: "color-mix(in oklab, var(--cyan) 30%, transparent)" }}
          >
            <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
          </div>
          <h1 className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80 font-heading leading-tight">
            RxFx<br/>Admin
          </h1>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-6">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 mb-2 text-[8px] font-black uppercase tracking-[0.4em] text-white/10">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                // Action items (non-routing) — dispatch custom event
                if (item.action) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("admin-open-meme"));
                        onClose?.();
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 text-white/30 hover:text-white/70 hover:bg-white/5"
                    >
                      <div className="shrink-0">{item.icon}</div>
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] font-heading">{item.name}</span>
                    </button>
                  );
                }
                return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${
                      isActive
                        ? "text-white shadow-[0_0_20px_rgba(0,188,212,0.15)]"
                        : "text-white/30 hover:text-white/70 hover:bg-white/5"
                    }`
                  }
                  style={({ isActive }) => isActive
                    ? { 
                        background: "oklch(0.74 0.13 209 / 12%)", 
                        borderLeft: "2px solid var(--cyan)",
                        boxShadow: "inset 0 0 12px oklch(0.74 0.13 209 / 5%)"
                      }
                    : {}
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`shrink-0 transition-colors ${isActive ? "text-cyan" : ""}`}>{item.icon}</div>
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] font-heading">{item.name}</span>
                    </>
                  )}
                </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Discord Community */}
      <div className="px-3 mb-2">
        <a
          href={discordLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 text-white/30 hover:text-white hover:bg-[#5865F2]/10 border border-transparent hover:border-[#5865F2]/30"
        >
          <MessageCircle size={16} className="text-[#5865F2]" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Discord Community</span>
        </a>
      </div>

      {/* Footer */}
      <div className="p-5 mt-auto border-t" style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.08 0.015 255 / 0.4)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-white/25">
            <Globe size={11} className="text-cyan/50" />
            <span className="text-[8px] font-black uppercase tracking-widest">{t("language")}</span>
          </div>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-transparent text-[9px] font-bold text-cyan uppercase outline-none cursor-pointer"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code} className="bg-black text-white">{l.code}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-[7px] font-black text-cyan/30 uppercase tracking-widest">{t("terminal_secure")}</span>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
