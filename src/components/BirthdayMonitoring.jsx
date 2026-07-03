import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Mail, Calendar, CheckCircle2, Loader2, Sparkles, ChevronRight } from 'lucide-react';

const BirthdayMonitoring = () => {
  // Simulation de données pour la prévisualisation
  const birthdays = [
    { id: 1, name: "Alexandre R.", city: "Port-au-Prince", status: "completed", time: "09:00" },
    { id: 2, name: "Sarah M.", city: "Paris", status: "processing", time: "09:00" },
    { id: 3, name: "Jean-Luc D.", city: "New York", status: "pending", time: "09:00" },
  ];

  return (
    <div className="p-8 bg-black min-h-screen text-white font-sans">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Birthday Operations
          </h2>
          <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest">Real-time Automated Lifecycle</p>
        </div>
        <div className="px-4 py-2 bg-cyan-950/20 border border-cyan-500/30 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-cyan-500 uppercase">System Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {birthdays.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(6, 182, 212, 0.5)' }}
              className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 rounded-lg relative group transition-all"
            >
              {/* Status Header */}
              <div className="flex justify-between items-start mb-8">
                <div className={`p-3 rounded-xl ${item.status === 'completed' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  <Cake size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Scheduled Time</span>
                  <span className="text-sm font-mono font-bold">{item.time} {item.city === 'Paris' ? 'CET' : 'EST'}</span>
                </div>
              </div>

              {/* User Info */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-1 tracking-tight">{item.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles size={12} className="text-cyan-500" />
                  Timezone: {item.city}
                </p>
              </div>

              {/* Automated Steps */}
              <div className="space-y-4">
                <Step 
                  icon={<Sparkles size={14} />} 
                  label="Gemini AI Content" 
                  status={item.status === 'completed' ? 'done' : (item.status === 'processing' ? 'active' : 'wait')} 
                />
                <Step 
                  icon={<Mail size={14} />} 
                  label="SendGrid Delivery" 
                  status={item.status === 'completed' ? 'done' : (item.status === 'processing' ? 'wait' : 'wait')} 
                />
                <Step 
                  icon={<Calendar size={14} />} 
                  label="Google Calendar" 
                  status={item.status === 'completed' ? 'done' : 'wait'} 
                />
              </div>

              {/* Hover Effect Detail */}
              <div className="mt-8 pt-6 border-t border-[#1a1a1a] flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest">View Generated HTML</span>
                <ChevronRight size={14} className="text-cyan-500" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Step = ({ icon, label, status }) => {
  const colors = {
    done: "text-cyan-500",
    active: "text-white font-bold",
    wait: "text-gray-700"
  };

  return (
    <div className={`flex items-center justify-between text-[11px] uppercase tracking-wider ${colors[status]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {status === 'done' ? (
        <CheckCircle2 size={14} />
      ) : status === 'active' ? (
        <Loader2 size={14} className="animate-spin text-cyan-500" />
      ) : (
        <div className="w-1 h-1 bg-gray-800 rounded-full" />
      )}
    </div>
  );
};

export default BirthdayMonitoring;
