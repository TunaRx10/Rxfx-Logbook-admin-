import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, FileText, Activity, Settings, 
  Ticket, Zap, ShoppingBag, Swords, 
  CreditCard, MessageSquare, Award, 
  Bell, Shield, Home, PieChart, Database,
  Smartphone, X, Cake
} from "lucide-react";

const Sidebar = ({ onClose }) => {
  const groups = [
    {
      title: "Core",
      items: [
        { name: "Mainframe", path: "/", icon: <Activity size={18} /> },
        { name: "Analytics", path: "/analytics", icon: <PieChart size={18} /> },
        { name: "Monitoring", path: "/monitoring/api", icon: <Database size={18} /> },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Registry", path: "/users", icon: <Users size={18} /> },
        { name: "Economy", path: "/economy", icon: <CreditCard size={18} /> },
        { name: "BL4CKESS", path: "/boutique", icon: <ShoppingBag size={18} /> },
      ]
    },
    {
      title: "Engine",
      items: [
        { name: "Arena", path: "/arena", icon: <Swords size={18} /> },
        { name: "Social", path: "/social", icon: <MessageSquare size={18} /> },
      ]
    },
    {
      title: "Assets",
      items: [
        { name: "Identity", path: "/badges", icon: <Award size={18} /> },
        { name: "Campaigns", path: "/promotions", icon: <Ticket size={18} /> },
      ]
    },
    {
      title: "Automations",
      items: [
        { name: "Birthdays", path: "/birthdays", icon: <Cake size={18} /> },
      ]
    },
    {
      title: "System",
      items: [
        { name: "Security", path: "/security", icon: <Shield size={18} /> },
        { name: "Support", path: "/support", icon: <Smartphone size={18} /> },
        { name: "Alerts", path: "/notifications", icon: <Bell size={18} /> },
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { staggerChildren: 0.05, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.aside 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex h-full w-full flex-col bg-black text-white border-r border-[#222222] overflow-y-auto no-scrollbar font-geist"
    >
      {/* Sidebar Header */}
      <motion.div 
        variants={itemVariants}
        className="flex items-center px-8 py-10 justify-between border-b border-[#222222] bg-white/[0.01]"
      >
        <div className="flex items-center space-x-3">
          <motion.div 
            whileHover={{ rotate: 180 }}
            className="w-8 h-8 bg-cyan-500 flex items-center justify-center text-black font-black font-equinox"
          >
            R
          </motion.div>
          <h1 className="text-[10px] font-black tracking-[0.4em] uppercase font-equinox text-white">RxFx Logbook Admin</h1>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-[#444444] hover:text-white">
          <X size={20} />
        </button>
      </motion.div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-8 space-y-8">
        {groups.map((group) => (
          <motion.div variants={itemVariants} key={group.title} className="space-y-4">
            <p className="px-4 text-[7px] font-black uppercase tracking-[0.5em] text-white/10">
               {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-none transition-all duration-300 group border-l-2 ${
                      isActive 
                        ? "bg-white/5 text-white border-cyan-500" 
                        : "text-[#444444] border-transparent hover:text-white hover:bg-white/[0.02]"
                    }`
                  }
                >
                  <motion.div 
                    whileHover={{ x: 5 }}
                    className="flex items-center space-x-4"
                  >
                    <div className="group-hover:text-cyan-500 transition-colors">{item.icon}</div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.name}</span>
                  </motion.div>
                </NavLink>
              ))}
            </div>
          </motion.div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <motion.div variants={itemVariants} className="p-6 border-t border-[#222222] bg-[#050505]">
        <div className="flex items-center space-x-3">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
           <span className="text-[7px] font-black text-[#444444] uppercase tracking-widest font-mono text-cyan-500/50">Terminal_Secure_Link</span>
        </div>
      </motion.div>
    </motion.aside>
  );
};

export default Sidebar;
