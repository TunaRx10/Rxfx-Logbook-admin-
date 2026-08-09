import { useState } from "react";
import { 
  Award, Zap, Plus, Trash2, Edit3, 
  Search, Settings, Upload, History,
  CheckCircle2, AlertTriangle, UserPlus, Star
} from "lucide-react";

const AssetsPage = () => {
  const [activeTab, setActiveTab] = useState("rules");
  const [badges, setBadges] = useState([
    { id: "B-01", name: "Early Adopter", desc: "Joined during v1.0", condition: "Manual", status: "active" },
    { id: "B-02", name: "Duel Master", desc: "Won 100 duels", condition: "Automatic", status: "active" },
  ]);

  const [titles, setTitles] = useState([
    { id: "T-01", name: "Architect", color: "#00F0FF", condition: "Admin Assigned" },
    { id: "T-02", name: "Survivor", color: "#FF4D00", condition: "Won Battle Royale" },
  ]);

  const [newAsset, setNewAsset] = useState({ name: "", type: "badge", condition: "" });

  const addAsset = () => {
    if (newAsset.type === "badge") {
      setBadges([...badges, { id: `B-${badges.length + 1}`, name: newAsset.name, desc: "New Asset", condition: newAsset.condition, status: "active" }]);
    } else {
      setTitles([...titles, { id: `T-${titles.length + 1}`, name: newAsset.name, color: "#FFFFFF", condition: newAsset.condition }]);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6 lg:p-12 space-y-12 text-white/40 font-geist">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-12 gap-8">
        <div className="space-y-4">
           <div className="flex items-center space-x-2 text-premium-cyan font-equinox">
              <Award size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Identity Asset Orchestration</span>
           </div>
           <h2 className="text-7xl font-black text-white tracking-tighter uppercase font-equinox">Asset Rules</h2>
        </div>
        
        <div className="flex items-center space-x-8 border border-white/10 rounded-none p-1 bg-black/60">
           <button 
             onClick={() => setActiveTab("rules")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'rules' ? 'bg-white text-black' : 'text-white/25 hover:text-white'}`}
           >
             Subscription Rules
           </button>
           <button 
             onClick={() => setActiveTab("creation")}
             className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'creation' ? 'bg-white text-black' : 'text-white/25 hover:text-white'}`}
           >
             Dynamic Creation
           </button>
        </div>
      </header>

      {activeTab === 'rules' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {[...badges, ...titles].map((asset, i) => (
             <div key={i} className="bento-card p-10 flex items-center justify-between group">
                <div className="flex items-center space-x-6">
                   <div className="p-4 bg-white/5 border border-white/10 rounded-none text-white/20 group-hover:text-premium-cyan transition-colors">
                      {asset.desc ? <Award size={24} /> : <Zap size={24} />}
                   </div>
                   <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter font-equinox">{asset.name}</h4>
                      <p className="tech-label mt-1">Rule: {asset.condition}</p>
                   </div>
                </div>
                <button className="p-3 border border-white/10 text-white/25 hover:text-white hover:border-white/20 transition-colors rounded-xl"><Edit3 size={18} /></button>
             </div>
           ))}
        </div>
      ) : (
        <div className="tech-card p-12 space-y-10 border-white/5">
           <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] font-equinox">Dynamic Asset Generator</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input className="input-tech p-4" placeholder="Asset Name" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} />
              <select className="input-tech p-4" value={newAsset.type} onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}>
                 <option value="badge">Badge</option>
                 <option value="title">Title</option>
              </select>
              <input className="input-tech p-4" placeholder="Trigger Condition" value={newAsset.condition} onChange={(e) => setNewAsset({...newAsset, condition: e.target.value})} />
           </div>
           <button onClick={addAsset} className="w-full btn-action py-6 text-xl">Deploy Asset to Registry</button>
        </div>
      )}
    </div>
  );
};

export default AssetsPage;
