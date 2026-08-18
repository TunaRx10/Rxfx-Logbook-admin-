import { useState } from "react";
import { useRealtimeSubscription } from "../lib/realtime";
import {
  Landmark,
  Search, Download, Bitcoin
} from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { cn } from "../lib/utils";

const EconomyPage = () => {
  const [activeTab, setActiveTab] = useState("ledger");
  const transactions = useRealtimeSubscription("transactions", { orderBy: "created_at", ascending: false });

  const volumeData = [
    { name: "MON", value: 0 },
    { name: "TUE", value: 0 },
    { name: "WED", value: 0 },
    { name: "THU", value: 0 },
    { name: "FRI", value: 0 },
    { name: "SAT", value: 0 },
    { name: "SUN", value: 0 },
  ];

  const tabs = [
    { key: "ledger", label: "Master Ledger" },
    { key: "withdrawals", label: "Withdrawals" },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Economic Engine — Google Sheets"
        title="Economic"
        highlight="Mainframe"
        subtitle="Platform ledger, transactions, gateway liquidity."
        actions={
          <div
            className="flex items-center gap-1 rounded-xl p-1"
            style={{
              background: "oklch(0.11 0.025 255 / 0.5)",
              border: "1px solid oklch(1 0 0 / 7%)",
            }}
          >
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "badge-status cursor-pointer transition-all",
                  activeTab === t.key ? "badge-active" : "text-white/20 hover:text-white/50"
                )}
                style={activeTab !== t.key ? { borderColor: "oklch(1 0 0 / 7%)" } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Stats Grid & Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-4 space-y-4">
          <div className="bento-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/5 blur-3xl pointer-events-none" />
            <p className="text-[10px] uppercase text-white/25 tracking-widest mb-2 italic">Total Platform Revenue</p>
            <h4 className="text-4xl font-black text-white tracking-tighter">$0.00</h4>
          </div>
          <div className="bento-card" style={{ borderColor: "oklch(0.74 0.13 209 / 20%)" }}>
            <p className="text-[10px] uppercase text-cyan tracking-widest mb-2 italic">Net Profit (MTD)</p>
            <h4 className="text-4xl font-black text-white tracking-tighter">$0.00</h4>
          </div>
        </div>
        <div className="lg:col-span-8 bento-card">
          <h3 className="text-[10px] uppercase text-white/25 tracking-[0.5em] mb-6 italic flex items-center gap-2">
            Transaction Volume Pulse
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <Bar dataKey="value" fill="oklch(0.74 0.13 209)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {activeTab === 'ledger' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] italic flex items-center gap-2">
              <Landmark size={12} /> Intelligence Ledger Feed
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" size={14} />
                <input
                  type="text"
                  placeholder="Search Transaction ID…"
                  className="input-tech pl-9 w-64"
                />
              </div>
              <button className="btn-tech">
                <Download size={14} />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="bento-card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="table-tech">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Method</th>
                    <th>Impact ($)</th>
                    <th>Status</th>
                    <th className="text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-white/15 text-[10px] uppercase">
                        No transactions yet
                      </td>
                    </tr>
                  ) : transactions.map((trx) => (
                    <tr key={trx.id} className="cursor-pointer">
                      <td>
                        <p className="text-white text-xs font-bold font-mono tracking-tighter">{trx.id}</p>
                        <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">{trx.user} • {trx.type}</p>
                      </td>
                      <td>
                        <span className="badge-status">{trx.method}</span>
                      </td>
                      <td>
                        <span className={`text-sm font-black tracking-tight font-mono ${trx.amount >= 0 ? 'text-emerald' : 'text-rose'}`}>
                          {trx.amount >= 0 ? '+' : '-'}${Math.abs(trx.amount).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${trx.status === 'completed' ? 'badge-active' : 'badge-warn'}`}>
                          {trx.status}
                        </span>
                      </td>
                      <td className="text-right text-white/15 uppercase tracking-widest font-mono">
                        {trx.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div
          className="p-20 text-center rounded-2xl flex flex-col items-center justify-center gap-6"
          style={{
            border: "1px dashed oklch(1 0 0 / 7%)",
            background: "oklch(0.11 0.025 255 / 0.3)",
          }}
        >
          <h3 className="text-xl font-black text-white uppercase tracking-[0.5em]">Withdrawal Audit Required</h3>
          <p className="text-[10px] text-white/25 font-medium uppercase tracking-[0.2em]">0 manual audits pending. Authorized Root only.</p>
          <button className="btn-tech btn-tech-primary">Begin Security Audit</button>
        </div>
      )}

      {/* Gateway Configuration */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10 mt-10"
        style={{ borderTop: "1px solid oklch(1 0 0 / 7%)" }}
      >
        <div className="bento-card space-y-4">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <Landmark size={14} className="text-cyan" /> Gateway Auth: STRIPE
          </h3>
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 5%)" }}
          >
            <span className="text-[10px] font-black text-white/25 uppercase tracking-widest">Live Sync Status</span>
            <span className="text-[10px] font-black text-emerald uppercase">Authorized</span>
          </div>
        </div>
        <div className="bento-card space-y-4">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <Bitcoin size={14} className="text-amber-400" /> Gateway Auth: CRYPTO
          </h3>
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 5%)" }}
          >
            <span className="text-[10px] font-black text-white/25 uppercase tracking-widest">Liquidity Link</span>
            <span className="text-[10px] font-black text-amber-400 uppercase">Active</span>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default EconomyPage;
