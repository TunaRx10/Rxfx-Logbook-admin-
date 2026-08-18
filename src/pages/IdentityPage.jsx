import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Award, User, Mail, Shield, Zap } from "lucide-react";
import { getAllUsersWithSubs } from "../lib/data-admin";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { DataState } from "../components/ui/DataState";

const IdentityPage = () => {
  const [users, setUsers] = useState([]);
  const [dataState, setDataState] = useState({ kind: "loading" });

  const load = useCallback(async () => {
    setDataState({ kind: "loading" });
    const result = await DataState.loadGuard(() => getAllUsersWithSubs());
    if (result.state === "ok") {
      setUsers(result.data);
      setDataState({ kind: "ok" });
    } else if (result.state === "backend-missing") {
      setDataState({ kind: "backend-missing" });
    } else {
      setDataState({ kind: "error", message: result.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Identity Management — Google Sheets"
        title="User"
        highlight="Identities"
        subtitle="Browse every registered trader with their plan and subscription status."
      />

      {dataState.kind === "loading" && (
        <DataState.Loading label="Chargement des identités…" rows={4} />
      )}
      {dataState.kind === "backend-missing" && (
        <DataState.BackendMissing onGoToSettings={() => (window.location.href = "/settings")} />
      )}
      {dataState.kind === "error" && (
        <DataState.Error message={dataState.message} onRetry={load} />
      )}
      {dataState.kind === "ok" && (
        users.length === 0 ? (
          <DataState.Empty
            icon={Award}
            title="Aucun utilisateur"
            message="Les utilisateurs inscrits apparaîtront ici dès qu'ils rejoignent la plateforme."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div key={user.id} className="bento-card hover:border-cyan/30 transition-colors cursor-pointer">
                <h3 className="text-sm font-black uppercase mb-6 text-cyan flex items-center gap-2">
                  <User size={16} /> {user.firstName || user.first_name || "Unknown"} {user.lastName || user.last_name || "User"}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-xs">
                    <Mail size={14} className="text-white/20" />
                    <span className="text-white/60 font-mono truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <Shield size={14} className="text-white/20" />
                    <span className={`uppercase tracking-widest px-2 py-0.5 text-[8px] font-black rounded-full ${
                      user.plan === "elite" ? "bg-cyan/10 text-cyan border border-cyan/20" :
                      user.plan === "pro" ? "bg-emerald/10 text-emerald border border-emerald/20" :
                      "bg-white/5 text-white/40 border border-white/10"
                    }`}>
                      {user.plan || "free"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <Zap size={14} className="text-white/20" />
                    <span className={`uppercase tracking-widest text-[10px] font-bold ${user.subscriptionStatus === 'active' || user.subscription_status === 'active' ? 'text-emerald' : 'text-white/30'}`}>
                      {user.subscriptionStatus || user.subscription_status || "inactive"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </PageShell>
  );
};

export default IdentityPage;
