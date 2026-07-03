import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  Settings, Save, Shield, Bell, 
  Database, Globe, Cpu, Lock,
  RefreshCw, Power, AlertTriangle, Cloud
} from "lucide-react";

const SettingsPage = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, "metadata", "system_settings");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMaintenanceMode(docSnap.data().maintenanceMode || false);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const toggleMaintenance = async () => {
    const newMode = !maintenanceMode;
    const docRef = doc(db, "metadata", "system_settings");
    await updateDoc(docRef, { maintenanceMode: newMode });
    setMaintenanceMode(newMode);
  };

  const sections = [
    {
      title: "Core Infrastructure",
      icon: <Cpu size={20} />,
      settings: [
        { name: "Maintenance Mode", description: "Disable public access for scheduled updates.", type: "toggle", value: maintenanceMode, setter: toggleMaintenance },
        { name: "Region Affinity", description: "Optimize latency by pinning services to us-central1.", type: "text", value: "us-central1 (Low Latency)" },
        { name: "Global CDN", description: "Distribute static assets via Edge locations.", type: "toggle", value: true },
      ]
    },
    {
      title: "Security & Access",
      icon: <Shield size={20} />,
      settings: [
        { name: "2FA Enforcement", description: "Require two-factor authentication for all admin roles.", type: "toggle", value: true },
        { name: "Session Timeout", description: "Auto-logout after inactivity period.", type: "select", options: ["15 minutes", "1 hour", "4 hours", "Never"], value: "1 hour" },
        { name: "IP Whitelisting", description: "Restrict dashboard access to specific CIDR blocks.", type: "button", label: "Configure Blocks" },
      ]
    },
    {
      title: "Data Management",
      icon: <Database size={20} />,
      settings: [
        { name: "Automated Backups", description: "Perform daily Firestore and Storage snapshots.", type: "toggle", value: autoBackup, setter: setAutoBackup },
        { name: "Retention Policy", description: "Purge logs older than specified days.", type: "select", options: ["30 Days", "90 Days", "1 Year", "Infinite"], value: "90 Days" },
      ]
    }
  ];

  return (
    <div className="p-6 md:p-12 max-w-[1200px] mx-auto space-y-12">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-premium-cyan font-black text-xs tracking-[0.3em] uppercase">
            <Settings size={16} />
            <span>Control Plane Configuration</span>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-none">
            System <span className="text-gradient-cyan">Settings</span>
          </h2>
          <p className="text-white/30 text-lg font-medium">Global orchestration and security parameters.</p>
        </div>
        
        <button className="btn-premium py-3 px-10">
          <Save size={18} />
          <span>Save Changes</span>
        </button>
      </header>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-12">
        {sections.map((section) => (
          <div key={section.title} className="space-y-6">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-white/5 text-premium-cyan rounded-2xl border border-white/10">
                 {section.icon}
               </div>
               <h3 className="text-xl font-black text-white">{section.title}</h3>
               <div className="flex-1 h-px bg-white/5"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {section.settings.map((setting) => (
                 <div key={setting.name} className="glass-card p-8 group hover:bg-white/[0.04] transition-all">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                         <h4 className="font-bold text-white mb-1">{setting.name}</h4>
                         <p className="text-xs text-white/30 font-medium leading-relaxed">{setting.description}</p>
                       </div>
                       
                       {setting.type === 'toggle' && (
                         <button 
                           onClick={() => setting.setter && setting.setter(!setting.value)}
                           className={`w-12 h-6 rounded-full transition-all relative ${setting.value ? 'bg-premium-cyan' : 'bg-white/10'}`}
                         >
                           <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${setting.value ? 'right-1 bg-black' : 'left-1 bg-white/40'}`}></div>
                         </button>
                       )}

                       {setting.type === 'select' && (
                         <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                            <span className="text-[10px] font-black text-premium-cyan uppercase">{setting.value}</span>
                         </div>
                       )}

                       {setting.type === 'button' && (
                         <button className="text-[10px] font-black text-premium-cyan uppercase tracking-widest hover:underline">
                           {setting.label}
                         </button>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-10 border-rose-500/20 bg-rose-500/[0.02] overflow-hidden relative">
         <div className="absolute -right-12 -top-12 w-48 h-48 bg-rose-500/5 blur-3xl"></div>
         <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center space-x-6">
               <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                 <AlertTriangle size={32} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white">Danger Zone</h3>
                  <p className="text-white/30 text-sm font-medium">Irreversible system-wide operations. Proceed with extreme caution.</p>
               </div>
            </div>
            <div className="flex items-center space-x-4">
               <button className="px-8 py-3 bg-white/5 border border-white/5 rounded-xl text-white/60 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                 Purge Cache
               </button>
               <button className="px-8 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10">
                 Factory Reset
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsPage;
