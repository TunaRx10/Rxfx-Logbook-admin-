import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Send, Clock, AlertCircle, Search,
  CheckCircle2, XCircle, User, Bot, RefreshCw, HeadphonesIcon,
  Loader2
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { DataState } from "../components/ui/DataState";
import {
  listSupportTickets,
  updateSupportTicket,
  subscribeToSupportTickets,
} from "../lib/supabase-admin";

const SupportPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [typingTicketId, setTypingTicketId] = useState(null);
  const typingTimer = React.useRef(null);

  function handleTyping(id) {
    if (typingTicketId === id) return;
    setTypingTicketId(id);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTypingTicketId(null);
    }, 3000);
  }

  // Tickets from Supabase (polling)
  useEffect(() => {
    const unsub = subscribeToSupportTickets((rows) => {
      setTickets(rows);
      setLoading(false);
      setError(null);
    }, 8000);
    return () => unsub();
  }, []);

  // Also try immediate fetch
  useEffect(() => {
    listSupportTickets("all", 100)
      .then((rows) => { setTickets(rows); setLoading(false); })
      .catch((err) => {
        if (err?.message?.includes("TABLE_MISSING")) {
          setError(
            "La table support_tickets n'existe pas dans Supabase. Applique la migration SQL : Dashboard Supabase → SQL Editor → colle le contenu de rxfx-logbook-admin/migrations/002_support_tickets.sql."
          );
        } else {
          setError(err?.message || "Erreur de chargement");
        }
        setLoading(false);
      });
  }, []);

  const filtered = tickets.filter(t => {
    const matchesFilter = filter === "all" || t.status === filter;
    const s = searchTerm.toLowerCase();
    const matchesSearch = !s ||
      (t.user_email || "").toLowerCase().includes(s) ||
      (t.user_name || "").toLowerCase().includes(s) ||
      (t.subject || "").toLowerCase().includes(s) ||
      (t.id || "").toLowerCase().includes(s);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  async function updateTicketStatus(id, status) {
    try {
      await updateSupportTicket(id, { status });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      toast.success(`Ticket ${status === "resolved" ? "résolu" : status === "in_progress" ? "en cours" : "réouvert"}`);
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  }

  async function sendReply(id) {
    if (!replyText.trim()) return;
    try {
      const ticket = tickets.find(t => t.id === id);
      const replies = Array.isArray(ticket?.replies) ? [...ticket.replies] : [];
      const newReply = { text: replyText, from: "admin", timestamp: new Date().toISOString() };
      replies.push(newReply);
      const newStatus = ticket?.status === "open" ? "in_progress" : ticket?.status;
      await updateSupportTicket(id, { replies, status: newStatus });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, replies, status: newStatus } : t
        )
      );
      setReplyText("");
      toast.success("Réponse envoyée");
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "border-amber-500/30 bg-amber-500/5 text-amber-500";
      case "in_progress": return "border-blue-500/30 bg-blue-500/5 text-blue-500";
      case "resolved": return "border-emerald/30 bg-emerald/5 text-emerald";
      default: return "border-white/10 bg-white/5 text-white/30";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "open": return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved": return <CheckCircle2 className="h-4 w-4 text-emerald" />;
      default: return <XCircle className="h-4 w-4 text-white/30" />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-6 lg:p-12 space-y-8 text-white font-sans">
      {/* Error banner — table missing or other */}
      {error && (
        <div className="mb-4">
          <DataState.Error
            title="Table support_tickets manquante"
            message={error}
          />
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20 transition"
          >
            Réessayer après migration
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
        <div>
          <div className="flex items-center gap-2 text-cyan mb-2">
            <HeadphonesIcon size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Support Center</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter uppercase">Tickets</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" size={14} />
            <input
              type="text"
              placeholder="Rechercher un ticket..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-tech pl-10 w-64"
            />
          </div>
          <button onClick={() => window.location.reload()} className="btn-tech">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Ouverts", value: stats.open, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "En cours", value: stats.in_progress, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Résolus", value: stats.resolved, color: "text-emerald", bg: "bg-emerald/10 border-emerald/20" },
        ].map((s) => (
          <div key={s.label} className="bento-card">
            <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-2">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{loading ? "..." : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
        {["all", "open", "in_progress", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${
              filter === s
                ? "border-cyan text-cyan"
                : "border-transparent text-white/25 hover:text-white/70"
            }`}
          >
            {s === "in_progress" ? "En cours" : s === "all" ? "Tous" : s}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan mx-auto mb-4" />
          <p className="text-[10px] uppercase tracking-widest text-white/20">Chargement des tickets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <MessageSquare className="h-12 w-12 text-white/10 mx-auto mb-4" />
          <p className="text-[10px] uppercase tracking-widest text-white/20">
            {error ? "Table non créée — applique la migration SQL" : "Aucun ticket trouvé"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bento-card overflow-hidden"
            >
              {/* Ticket Header */}
              <div
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {getStatusIcon(ticket.status)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-[10px] text-cyan">#{(ticket.id || "").slice(0, 8)}</span>
                      <span className="text-sm font-bold truncate">{ticket.subject || "Sans sujet"}</span>
                    </div>
                    <p className="text-[9px] text-white/30">
                      {ticket.user_name || ticket.user_email} • {ticket.created_at ? new Date(ticket.created_at).toLocaleString("fr-FR") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 text-[8px] font-black uppercase border ${getStatusColor(ticket.status)}`}>
                    {ticket.status === "in_progress" ? "En cours" : ticket.status}
                  </span>
                </div>
              </div>

              {/* Ticket Detail */}
              {selectedTicket?.id === ticket.id && (
                <div className="p-6 space-y-6" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0 0 0 / 30%)" }}>
                  {/* Chat Messages */}
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                    <p className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mb-4">Conversation Pipeline</p>

                    {/* Ensure messages is an array */}
                    {(Array.isArray(ticket.messages) ? ticket.messages : []).map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                        <div className={clsx(
                          "max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg",
                          msg.role === "user"
                            ? "bg-cyan/10 border border-cyan/20 text-cyan rounded-tl-sm"
                            : "bg-white/5 border border-white/5 text-white/40 rounded-tr-sm italic"
                        )}>
                          <div className="flex items-center gap-2 mb-1.5 opacity-40">
                            {msg.role === "user" ? <User size={10} /> : <Bot size={10} />}
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              {msg.role === "user" ? (ticket.user_name || "Client") : "AI Core"}
                            </span>
                          </div>
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {/* Admin Replies */}
                    {(Array.isArray(ticket.replies) ? ticket.replies : []).map((r, i) => (
                      <div key={i} className="flex justify-end gap-3">
                        <div className="max-w-[80%] bg-emerald/10 border border-emerald/20 rounded-2xl rounded-tr-sm px-4 py-3 text-xs text-emerald shadow-glow-sm">
                          <div className="flex items-center gap-2 mb-1.5 opacity-60">
                            <HeadphonesIcon size={10} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Admin Response</span>
                            <span className="ml-auto text-[7px] opacity-40 font-mono">
                              {r.timestamp ? new Date(r.timestamp).toLocaleTimeString("fr-FR") : ""}
                            </span>
                          </div>
                          {r.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  <div className="flex gap-3 items-end">
                    {typingTicketId === ticket.id && (
                      <span className="text-[9px] text-cyan animate-pulse flex items-center gap-1 shrink-0">
                        Écrit<span className="inline-flex gap-0.5"><span className="h-1 w-1 rounded-full bg-cyan animate-bounce" style={{animationDelay:"0ms"}}/><span className="h-1 w-1 rounded-full bg-cyan animate-bounce" style={{animationDelay:"150ms"}}/><span className="h-1 w-1 rounded-full bg-cyan animate-bounce" style={{animationDelay:"300ms"}}/></span>
                      </span>
                    )}
                    <textarea
                      value={replyText}
                      onChange={e => { setReplyText(e.target.value); handleTyping(ticket.id); }}
                      placeholder="Répondre au ticket..."
                      rows={2}
                      className="input-tech resize-none flex-1"
                    />
                    <button
                      onClick={() => sendReply(ticket.id)}
                      disabled={!replyText.trim()}
                      className="btn-tech btn-tech-primary disabled:opacity-30"
                    >
                      <Send size={12} /> Envoyer
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)" }}>
                    {ticket.status !== "in_progress" && ticket.status !== "resolved" && (
                      <button onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                        className="badge-status badge-trial cursor-pointer hover:opacity-80 transition">
                        Prendre en charge
                      </button>
                    )}
                    {ticket.status !== "resolved" && (
                      <button onClick={() => updateTicketStatus(ticket.id, "resolved")}
                        className="badge-status badge-active cursor-pointer hover:opacity-80 transition">
                        Marquer résolu
                      </button>
                    )}
                    {ticket.status === "resolved" && (
                      <button onClick={() => updateTicketStatus(ticket.id, "open")}
                        className="badge-status badge-warn cursor-pointer hover:opacity-80 transition">
                        Rouvrir
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default SupportPage;
