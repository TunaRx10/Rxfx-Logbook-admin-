import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { listTable, insertRow } from "../lib/supabase-admin";
import {
  Send, Mail, Users, Search, CheckCircle2, Clock,
  XCircle, RefreshCw, FileText,
  Inbox, Sparkles
} from "lucide-react";
import { cn } from "../lib/utils";
import { getAllUsersWithSubs } from "../lib/supabase-admin";
import { DataState } from "../components/ui/DataState";
import { PageShell, PageHeader } from "../components/ui/PagePrimitives";
import { generateEmail, isChatReady } from "../lib/admin-ai";

const EmailBroadcastPage = () => {
  const [users, setUsers] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [template, setTemplate] = useState("custom");
  const [activeTab, setActiveTab] = useState("compose");
  const [dataState, setDataState] = useState({ kind: "loading" });

  const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";
  const loadQueueRef = useRef(null);

  const loadUsers = useCallback(async () => {
    setDataState({ kind: "loading" });
    const result = await DataState.loadGuard(() => getAllUsersWithSubs());
    if (result.state === "ok") {
      setUsers(result.data);
      setDataState({ kind: "ok" });
    } else if (result.state === "supabase-missing") {
      setDataState({ kind: "supabase-missing" });
    } else {
      setDataState({ kind: "error", message: result.message });
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Load mail queue (Supabase polling)
  useEffect(() => {
    async function loadQueue() {
      try {
        const rows = await listTable("mail_queue", 100);
        setQueue(rows || []);
      } catch (e) {
        console.error("[email] queue fetch failed:", e);
      }
    }
    loadQueueRef.current = loadQueue;
    loadQueue();
    const t = setInterval(loadQueue, 10000);
    return () => clearInterval(t);
  }, []);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error("Décris l'email que tu veux générer."); return; }
    setAiGenerating(true);
    try {
      const result = await generateEmail(aiPrompt);
      setSubject(result.subject || "");
      setHtmlBody(result.body || "");
      setTemplate("custom");
      toast.success("Email généré par IA !");
      setAiPrompt("");
    } catch (err) {
      toast.error(err.message || "Erreur IA");
    } finally {
      setAiGenerating(false);
    }
  };

  const templates = {
    custom: { subject: "", body: "" },
    welcome: {
      subject: "🎯 Bienvenue sur RxFx Logbook !",
      body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:linear-gradient(135deg,#0a0f1a 0%,#0d1525 100%);color:#e2e8f0;border-radius:16px;border:1px solid rgba(6,182,212,0.15)">
        <div style="text-align:center;margin-bottom:32px">
          <h2 style="color:#06b6d4;font-size:24px;font-weight:800;margin:0 0 8px">Bienvenue dans l'élite du trading</h2>
          <p style="color:#64748b;font-size:14px;margin:0">Votre compte RxFx Logbook est maintenant actif.</p>
        </div>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Commencez à journaliser vos trades et laissez notre IA vous guider vers la performance. Analysez vos patterns, optimisez votre risk management, et rejoignez une communauté de traders d'élite.</p>
        <div style="text-align:center">
          <a href="${BASE_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#000;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">Accéder au Dashboard</a>
        </div>
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
          <p style="color:#475569;font-size:11px;margin:0">RxFx Logbook — Trade Smarter, Not Harder</p>
        </div>
      </div>`
    },
    promo: {
      subject: "⚡ Offre Exclusive — Passez au Plan Pro Max",
      body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:linear-gradient(135deg,#0a0f1a 0%,#0d1525 100%);color:#e2e8f0;border-radius:16px;border:1px solid rgba(34,197,94,0.15)">
        <div style="text-align:center;margin-bottom:32px">
          <h2 style="color:#22c55e;font-size:24px;font-weight:800;margin:0 0 8px">Débloquez votre plein potentiel</h2>
          <p style="color:#64748b;font-size:14px;margin:0">Passez au Plan Pro Max et accédez à toutes les fonctionnalités.</p>
        </div>
        <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <p style="font-size:28px;font-weight:800;color:#22c55e;margin:0">99$/mois</p>
          <p style="color:#64748b;font-size:12px;margin:4px 0 0">Essai gratuit 7 jours</p>
        </div>
        <ul style="list-style:none;padding:0;margin:0 0 24px">
          <li style="padding:8px 0;color:#94a3b8;font-size:13px">✓ IA Mentor 24/7</li>
          <li style="padding:8px 0;color:#94a3b8;font-size:13px">✓ Analyse technique institutionnelle</li>
          <li style="padding:8px 0;color:#94a3b8;font-size:13px">✓ Synchronisation API illimitée</li>
        </ul>
        <div style="text-align:center">
          <a href="${BASE_URL}/settings" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#000;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">Upgrader maintenant</a>
        </div>
      </div>`
    },
    report: {
      subject: "📊 Votre Rapport de Trading Hebdomadaire",
      body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;background:linear-gradient(135deg,#0a0f1a 0%,#0d1525 100%);color:#e2e8f0;border-radius:16px;border:1px solid rgba(6,182,212,0.15)">
        <div style="text-align:center;margin-bottom:32px">
          <h2 style="color:#06b6d4;font-size:24px;font-weight:800;margin:0 0 8px">Résumé de votre semaine de trading</h2>
          <p style="color:#64748b;font-size:14px;margin:0">Consultez vos statistiques détaillées sur votre dashboard.</p>
        </div>
        <div style="text-align:center">
          <a href="${BASE_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#000;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">Voir mon Dashboard</a>
        </div>
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
          <p style="color:#475569;font-size:11px;margin:0">RxFx Logbook — Rapport automatique</p>
        </div>
      </div>`
    }
  };

  const applyTemplate = (key) => {
    setTemplate(key);
    if (key === "custom") return;
    setSubject(templates[key].subject);
    setHtmlBody(templates[key].body);
  };

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    const filtered = filteredUsers.map((u) => u.id);
    setSelectedUsers(filtered);
  };

  const clearSelection = () => setSelectedUsers([]);

  const sendEmails = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Sélectionnez au moins un destinataire.");
      return;
    }
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error("Sujet et contenu HTML requis.");
      return;
    }

    setSending(true);
    try {
      const recipients = selectedUsers
        .map((uid) => users.find((u) => u.id === uid))
        .filter((u) => u?.email)
        .map((user) => ({
          to: user.email,
          subject,
          body: htmlBody.replace(/\{\{name\}\}/g, `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Trader"),
        }));

      // Log to Supabase mail_queue
      for (const r of recipients) {
        try {
          await insertRow("mail_queue", {
            to_email: r.to,
            subject: r.subject,
            body: r.body.slice(0, 2000),
            status: "queued",
          });
        } catch (e) {
          console.warn("[email] queue insert failed:", e);
        }
      }

      toast.success(`${recipients.length} emails mis en file (Supabase mail_queue).`);
      setSelectedUsers([]);
      setSubject("");
      setHtmlBody("");
      setTemplate("custom");
      loadQueueRef.current && loadQueueRef.current();
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendSingleEmail = async (user) => {
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error("Remplissez le sujet et le contenu d'abord.");
      return;
    }
    try {
      const body = htmlBody.replace(/\{\{name\}\}/g, `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Trader");
      await insertRow("mail_queue", {
        to_email: user.email,
        subject,
        body: body.slice(0, 2000),
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      toast.success(`Email mis en file pour ${user.email}`);
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      u.firstName?.toLowerCase().includes(term) ||
      u.lastName?.toLowerCase().includes(term)
    );
  });

  const pendingInQueue = queue.filter((q) => q.status === "queued" || q.status === "pending").length;
  const sentInQueue = queue.filter((q) => q.status === "sent").length;
  const failedInQueue = queue.filter((q) => q.status === "failed").length;

  const queueBadge = (
    <div className="flex items-center gap-2 bento-card !p-2 !px-4 text-xs">
      <Inbox size={14} className="text-cyan" />
      <span className="text-white/40">Queue: </span>
      <span className="text-cyan font-bold">{pendingInQueue} pending</span>
      <span className="text-white/25">|</span>
      <span className="text-emerald">{sentInQueue} sent</span>
      <span className="text-white/25">|</span>
      <span className="text-red-500">{failedInQueue} failed</span>
    </div>
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Email Operations Center"
        title="Email"
        highlight="Broadcast"
        subtitle="Supabase users + Gmail-powered messaging via gws-gmail-send."
        actions={queueBadge}
      />

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-white/5">
        {[
          { key: "compose", label: "Compose", icon: FileText },
          { key: "queue", label: "Mail Queue", icon: Clock },
          { key: "users", label: "Recipients", icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
              activeTab === tab.key
                ? "border-cyan text-cyan"
                : "border-transparent text-white/25 hover:text-white"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap gap-3">
              {isChatReady() && (
                <>
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Décris l'email à générer (ex: email de bienvenue pour nouveaux traders pro)..."
                      className="flex-1 bg-black/60 border border-cyan/20 px-4 py-2.5 text-xs focus:border-cyan outline-none transition-all placeholder:text-white/15"
                      onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                    />
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan/10 border border-cyan/30 text-cyan text-[10px] font-black uppercase tracking-widest hover:bg-cyan/20 transition-all disabled:opacity-30 shrink-0"
                    >
                      {aiGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {aiGenerating ? "Génération..." : "IA Générer"}
                    </button>
                  </div>
                  <div className="w-full h-px bg-white/5" />
                </>
              )}
              {Object.keys(templates).map((key) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className={cn(
                    "px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all",
                    template === key
                      ? "border-cyan bg-cyan/10 text-cyan"
                      : "border-white/5 text-white/30 hover:border-white/30"
                  )}
                >
                  {key === "custom" ? "Custom" : key === "welcome" ? "Welcome" : key === "promo" ? "Promo" : "Report"}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line..."
                className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm focus:border-cyan outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">
                HTML Body <span className="text-cyan">({"{{name}}"} = recipient name)</span>
              </label>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={12}
                placeholder="<h1>Your HTML email...</h1>"
                className="w-full bg-black/60 border border-white/10 px-4 py-3 text-xs font-mono focus:border-cyan outline-none transition-all resize-y"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/25">
                {selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""} selected
              </p>
              <button
                onClick={sendEmails}
                disabled={sending || selectedUsers.length === 0}
                className="flex items-center gap-2 bg-cyan text-black px-8 py-3 font-black text-xs uppercase tracking-widest hover:bg-cyan transition-all disabled:opacity-30"
              >
                {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? "Queueing..." : `Send to ${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          <div className="bento-card !p-6 space-y-4 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Recipients (Supabase)</h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[9px] text-cyan uppercase tracking-widest hover:underline">All</button>
                <button onClick={clearSelection} className="text-[9px] text-white/25 uppercase tracking-widest hover:underline">Clear</button>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                placeholder="Filter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-white/10 pl-10 pr-3 py-2 text-xs focus:border-cyan outline-none"
              />
            </div>
            <div className="space-y-1">
              {dataState.kind === "loading" && (
                <p className="text-[9px] uppercase tracking-widest text-white/20 animate-pulse py-4 text-center">Loading recipients…</p>
              )}
              {dataState.kind === "supabase-missing" && (
                <div className="py-6"><DataState.SupabaseMissing /></div>
              )}
              {dataState.kind === "error" && (
                <div className="py-6"><DataState.Error message={dataState.message} onRetry={loadUsers} /></div>
              )}
              {dataState.kind === "ok" && filteredUsers.length === 0 && (
                <p className="text-[9px] uppercase tracking-widest text-white/20 py-6 text-center">No matching recipients</p>
              )}
              {dataState.kind === "ok" && filteredUsers.slice(0, 50).map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={cn(
                    "flex items-center justify-between p-2 cursor-pointer transition-all text-xs border border-transparent",
                    selectedUsers.includes(user.id)
                      ? "bg-cyan/10 border-cyan/20"
                      : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2
                      size={14}
                      className={cn(
                        "shrink-0",
                        selectedUsers.includes(user.id) ? "text-cyan" : "text-white/20"
                      )}
                    />
                    <span className="truncate text-white/40">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); sendSingleEmail(user); }}
                    className="text-white/20 hover:text-cyan transition-colors shrink-0"
                    title="Send to this user only"
                  >
                    <Send size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "queue" && (
        <div className="bento-card !p-0 overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">Status</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">To</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">Subject</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">Created</th>
                <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111]">
              {queue.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-white/25 uppercase text-[10px]">Queue is empty</td></tr>
              ) : queue.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.01] text-[11px]">
                  <td className="px-6 py-4">
                    {item.status === "sent" ? (
                      <span className="flex items-center gap-1 text-emerald"><CheckCircle2 size={12} /> Sent</span>
                    ) : item.status === "failed" ? (
                      <span className="flex items-center gap-1 text-red-500"><XCircle size={12} /> Failed</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500"><Clock size={12} /> Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-white/40 font-mono text-xs">{item.to_email || item.to || "—"}</td>
                  <td className="px-6 py-4 text-white/70 text-xs max-w-[300px] truncate">{item.message?.subject}</td>
                  <td className="px-6 py-4 text-white/25 text-[10px]">
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : ""}
                  </td>
                  <td className="px-6 py-4 text-white/25 text-[10px]">
                    {item.error && <span className="text-red-500">{item.error.slice(0, 60)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bento-card !p-0 overflow-hidden">
          {dataState.kind === "loading" ? (
            <div className="py-20"><DataState.Loading label="Chargement des destinataires…" rows={3} /></div>
          ) : dataState.kind === "supabase-missing" ? (
            <div className="py-12"><DataState.SupabaseMissing /></div>
          ) : dataState.kind === "error" ? (
            <div className="py-12"><DataState.Error message={dataState.message} onRetry={loadUsers} /></div>
          ) : filteredUsers.length === 0 ? (
            <p className="px-6 py-20 text-center text-[10px] uppercase tracking-widest text-white/25">No recipients yet</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">User</th>
                  <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">Email</th>
                  <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black">Plan</th>
                  <th className="px-6 py-4 text-[9px] uppercase tracking-widest text-white/30 font-black text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111]">
                {filteredUsers.slice(0, 100).map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4">
                      <p className="text-white text-xs font-bold">{user.firstName} {user.lastName}</p>
                    </td>
                    <td className="px-6 py-4 text-white/40 text-xs">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase",
                        user.plan === "elite" ? "bg-cyan text-black" : user.plan === "pro" ? "bg-emerald/20 text-emerald" : "bg-white/10 text-white/40"
                      )}>{user.plan || "free"}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => sendSingleEmail(user)} className="text-white/25 hover:text-cyan transition-colors">
                        <Send size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default EmailBroadcastPage;
