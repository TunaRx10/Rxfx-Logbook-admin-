import React, { useState, useEffect } from "react";
import { 
  FileText, Search, Filter, ArrowDownToLine, 
  RefreshCw, Trash2, ShieldAlert, Activity,
  Clock, Server, ChevronLeft, ChevronRight
} from "lucide-react";

const LogsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mocking log data
    const mockLogs = [
      { id: 1, type: "SECURITY", message: "Failed login attempt from 192.168.1.45", timestamp: "2024-03-21 14:20:05", status: "critical" },
      { id: 2, type: "SYSTEM", message: "Workspace synchronization completed successfully", timestamp: "2024-03-21 13:45:12", status: "success" },
      { id: 3, type: "USER", message: "Admin 'martha_nexus' updated user permissions", timestamp: "2024-03-21 12:30:45", status: "info" },
      { id: 4, type: "API", message: "Endpoint /v1/telemetry reached rate limit", timestamp: "2024-03-21 11:15:00", status: "warning" },
      { id: 5, type: "SECURITY", message: "New admin claim assigned to user_9928", timestamp: "2024-03-21 10:55:22", status: "info" },
      { id: 6, type: "DATABASE", message: "Firestore query optimization triggered", timestamp: "2024-03-21 09:20:11", status: "success" },
      { id: 7, type: "SYSTEM", message: "Kernel update scheduled for 03:00 UTC", timestamp: "2024-03-20 23:45:59", status: "info" },
      { id: 8, type: "ERROR", message: "Cloud Function 'processLog' timeout", timestamp: "2024-03-20 22:10:33", status: "critical" },
    ];
    
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 800);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'success': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-[1600px] mx-auto space-y-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-premium-cyan font-black text-xs tracking-[0.3em] uppercase">
            <Activity size={16} />
            <span>Forensic Data Streams</span>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-none">
            Audit <span className="text-gradient-cyan">Logs</span>
          </h2>
          <p className="text-white/30 text-lg font-medium">Real-time system event monitoring and inspection.</p>
        </div>
        
        <div className="flex items-center space-x-4">
           <button className="flex items-center space-x-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/60 font-bold transition-all">
             <ArrowDownToLine size={18} />
             <span>Export CSV</span>
           </button>
           <button className="btn-premium py-3 px-8">
             <RefreshCw size={18} />
             <span>Refresh</span>
           </button>
        </div>
      </header>

      {/* Control Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/20 group-focus-within:text-premium-cyan transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search through event logs, IPs, or UIDs..."
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-premium-cyan/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="lg:col-span-4 flex items-center space-x-4">
           <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/20">
                <Filter size={18} />
              </div>
              <select 
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-premium-cyan/50 transition-all text-white/60"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Event Types</option>
                <option value="security">Security Alerts</option>
                <option value="system">System Core</option>
                <option value="api">API Traffic</option>
                <option value="user">User Actions</option>
              </select>
           </div>
           <button className="p-4 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-2xl text-rose-500 transition-all">
             <Trash2 size={20} />
           </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Timestamp</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Event Type</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Description</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Priority</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-8 py-6">
                      <div className="h-6 bg-white/5 rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <Clock size={14} className="text-white/20" />
                        <span className="text-sm font-medium text-white/60 tabular-nums">{log.timestamp}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        {log.type === 'SECURITY' ? <ShieldAlert size={14} className="text-rose-400" /> : <Server size={14} className="text-blue-400" />}
                        <span className="text-xs font-black tracking-widest text-white/80">{log.type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-white/70 font-medium max-w-md truncate group-hover:text-white transition-colors">{log.message}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-premium-cyan font-black text-[10px] uppercase tracking-widest hover:underline">Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Showing 1-8 of 2,450 entries</p>
          <div className="flex items-center space-x-2">
             <button className="p-2 bg-white/5 border border-white/5 rounded-xl text-white/20 cursor-not-allowed">
               <ChevronLeft size={18} />
             </button>
             <div className="flex items-center px-4 space-x-4">
                <span className="text-xs font-black text-premium-cyan underline decoration-2 underline-offset-8">1</span>
                <span className="text-xs font-black text-white/20">2</span>
                <span className="text-xs font-black text-white/20">3</span>
                <span className="text-xs font-black text-white/20">...</span>
                <span className="text-xs font-black text-white/20">42</span>
             </div>
             <button className="p-2 bg-white/5 border border-white/5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
               <ChevronRight size={18} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
