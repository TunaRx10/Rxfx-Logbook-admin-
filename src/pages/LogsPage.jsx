import { useState, useEffect } from "react";
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
    setLoading(false);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'text-rose bg-rose/10 border-rose/20';
      case 'warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'success': return 'text-emerald bg-emerald/10 border-emerald/20';
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
           <button className="btn-tech">
             <ArrowDownToLine size={18} />
             <span>Export CSV</span>
           </button>
           <button className="btn-tech">
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
           <button className="p-4 bg-rose/5 hover:bg-rose/10 border border-rose/10 rounded-2xl text-rose transition-all">
             <Trash2 size={20} />
           </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl" style={{ background: "oklch(0.13 0.02 255 / 0.4)", border: "1px solid oklch(1 0 0 / 7%)" }}>
        <div className="overflow-x-auto">
          <table className="table-tech">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Description</th>
                <th>Priority</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="5">
                      <div className="skeleton-shimmer h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <Clock size={14} className="text-white/20" />
                        <span className="text-white/60 tabular-nums">{log.timestamp}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {log.type === 'SECURITY' ? <ShieldAlert size={14} className="text-rose" /> : <Server size={14} className="text-blue-400" />}
                        <span className="text-xs font-black tracking-widest text-white/80">{log.type}</span>
                      </div>
                    </td>
                    <td>
                      <p className="text-white/70 font-medium max-w-md truncate group-hover:text-white transition-colors">{log.message}</p>
                    </td>
                    <td>
                      <span className={`badge-status ${log.status === 'critical' ? 'badge-error' : log.status === 'warning' ? 'badge-warn' : log.status === 'success' ? 'badge-active' : 'badge-trial'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="text-cyan font-black text-[10px] uppercase tracking-widest hover:underline">Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-8 flex items-center justify-between" style={{ borderTop: "1px solid oklch(1 0 0 / 5%)", background: "oklch(1 0 0 / 1%)" }}>
          <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Showing 1-8 of 2,450 entries</p>
          <div className="flex items-center gap-2">
             <button className="p-2 rounded-xl text-white/20 cursor-not-allowed" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 5%)" }}>
               <ChevronLeft size={18} />
             </button>
             <div className="flex items-center px-4 gap-4">
                <span className="text-xs font-black text-cyan underline decoration-2 underline-offset-8">1</span>
                <span className="text-xs font-black text-white/20">2</span>
                <span className="text-xs font-black text-white/20">3</span>
                <span className="text-xs font-black text-white/20">...</span>
                <span className="text-xs font-black text-white/20">42</span>
             </div>
             <button className="p-2 rounded-xl text-white/60 hover:text-white transition-all" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 5%)" }}>
               <ChevronRight size={18} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
