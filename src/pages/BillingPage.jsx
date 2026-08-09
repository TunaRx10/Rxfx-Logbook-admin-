import { useState, useEffect, useCallback } from "react";
import { updateUserProfile, getPaymentConfig, getPayoutConfig, setPayoutConfig, listTable } from "../lib/supabase-admin";
import { createSubyPayment, createSubyPayout, isSubyConfigured } from "../lib/suby-admin";
import { getSubyCheckoutLink } from "../lib/suby-checkout-links";
import { DataState } from "../components/ui/DataState";
import {
  CreditCard, ShieldCheck, Zap, Activity,
  Search, Download, ExternalLink, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, Clock, User,
  DollarSign, Send, Loader2, Wallet,
  CheckCircle, Ban, Hourglass, ListTodo,
  Edit, X, TrendingUp, Bitcoin,
  ArrowUpRight, PiggyBank, Copy, Globe
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const BillingPage = () => {
  const [loading, setLoading] = useState(true);
  const [dataState, setDataState] = useState({ kind: "loading" });
  const [subscriptions, setSubscriptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payEmail, setPayEmail] = useState("");
  const [payPlan, setPayPlan] = useState("starter");
  const [payLoading, setPayLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit subscription state
  const [editingSub, setEditingSub] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Payout state
  const [activeSection, setActiveSection] = useState("overview"); // overview | payouts | products
  const [supportedCurrencies, setSupportedCurrencies] = useState([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutCurrency, setPayoutCurrency] = useState("USDT");
  const [payoutNetwork, setPayoutNetwork] = useState("TRON");
  const [payoutAddress, setPayoutAddress] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [savedPayoutConfig, setSavedPayoutConfig] = useState({ walletAddress: '', currency: 'USDT', network: 'TRON' });
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setDataState({ kind: "loading" });
    // Two parallel calls — if either fails with the "Supabase not configured"
    // precondition, we surface a clean empty state instead of an error toast.
    const result = await DataState.loadGuard(async () => {
      const [subsData, profilesData] = await Promise.all([
        listTable('subscriptions', 100),
        listTable('profiles', 100),
      ]);
      const profileMap = new Map();
      (profilesData || []).forEach(p => profileMap.set(p.id, p));
      return (subsData || []).map(sub => ({
        ...sub,
        profile: profileMap.get(sub.user_id) || null,
        customer_id: sub.subscription_id || sub.customer_id || null,
      }));
    });
    if (result.state === "ok") {
      setSubscriptions(result.data);
      setDataState({ kind: "ok" });
    } else if (result.state === "supabase-missing") {
      setDataState({ kind: "supabase-missing" });
    } else {
      toast.error("Failed to load subscriptions");
      setDataState({ kind: "error", message: result.message });
    }
    setLoading(false);
  }, []);

  const fetchPaymentLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await listTable('payment_logs', 100);
      setPaymentLogs(data || []);
    } catch (err) {
      console.error("Error fetching payment logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    if (showLogs) fetchPaymentLogs();
  }, [showLogs]);

  const exportCSV = () => {
    const headers = ["User ID","Email","Display Name","Plan","Status","Provider","Period End","Subscription ID","Updated At"];
    const rows = filteredSubscriptions.map(s => [
      s.user_id,
      s.profile?.email || '',
      s.profile?.display_name || '',
      s.plan || '',
      s.status || '',
      s.provider || '',
      s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '',
      s.subscription_id || '',
      s.updated_at ? new Date(s.updated_at).toLocaleString() : '',
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rxfx_billing_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    toast.success("CSV exporté !");
  };

  const toggleSub = async (uid, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'canceled' : 'active';
    if (!window.confirm(`Changer le statut abonnement → ${newStatus} ?`)) return;
    try {
      await updateUserProfile(uid, { subscriptionStatus: newStatus });
      toast.success(`Abonnement ${newStatus === 'active' ? 'activé' : 'annulé'}`);
      fetchSubscriptions();
    } catch (error) { toast.error("Erreur: " + error.message); }
  };

  const banUser = async (uid, email) => {
    if (!window.confirm(`Bannir ${email || uid.slice(0,12)} ?`)) return;
    try {
      await updateUserProfile(uid, { status: "BANNED", subscriptionStatus: "canceled" });
      toast.success("Utilisateur banni");
      fetchSubscriptions();
    } catch (error) { toast.error("Erreur: " + error.message); }
  };

  const handleEdit = (sub) => {
    setEditingSub(sub);
    setEditForm({
      plan: sub.plan || 'free',
      status: sub.status || 'inactive',
      provider: sub.provider || 'suby',
      subscription_id: sub.subscription_id || '',
      current_period_end: sub.current_period_end || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        plan: editForm.plan,
        status: editForm.status,
        provider: editForm.provider,
      };
      if (editForm.subscription_id) payload.subscription_id = editForm.subscription_id;
      if (editForm.current_period_end) payload.current_period_end = editForm.current_period_end;
      
      await updateUserProfile(editingSub.user_id, payload);
      toast.success("Abonnement mis à jour !");
      setEditingSub(null);
      fetchSubscriptions();
    } catch (error) { toast.error("Erreur: " + error.message); }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "COMPLETED":
      case "ACTIVE":
        return <CheckCircle className="h-3.5 w-3.5 text-emerald" />;
      case "TRIALING":
        return <Hourglass className="h-3.5 w-3.5 text-cyan" />;
      case "FAILED":
      case "REFUNDED":
        return <Ban className="h-3.5 w-3.5 text-rose" />;
      case "CANCELLED":
      case "EXPIRED":
        return <XCircle className="h-3.5 w-3.5 text-white/30" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const handleCreatePayment = async () => {
    if (!payEmail) {
      toast.error("Veuillez entrer un email");
      return;
    }
    setPayLoading(true);
    try {
      const amount = payPlan === "pro_max" ? 99.99 : 29.99;
      const planName = payPlan === "pro_max" ? "Elite" : "Starter";
      const orderRef = `admin_${Date.now()}`;

      let checkoutUrl;
      try {
        const result = await createSubyPayment({
          amount,
          currency: "USD",
          reference: orderRef,
          customerEmail: payEmail,
          successUrl: `${window.location.origin}/billing?payment=success`,
          cancelUrl: `${window.location.origin}/billing?payment=cancelled`,
          metadata: { uid: "admin", plan: planName.toLowerCase() },
        });
        checkoutUrl = result?.paymentUrl || result?.checkoutUrl;
      } catch (error) {
        if (error?.code !== "suby-not-configured") throw error;
        checkoutUrl = getSubyCheckoutLink(payPlan);
        toast.info("API Suby dynamique non configurée : ouverture du checkout hébergé.");
      }
      if (checkoutUrl) {
        toast.success("Checkout Suby créé ! Ouverture...");
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        setShowPaymentForm(false);
      } else {
        toast.error("Suby: pas de checkout URL retournée");
      }
    } catch (err) {
      console.error("Suby payment creation error:", err);
      toast.error(`Suby: ${err.message || "Impossible de créer le paiement"}`);
    } finally {
      setPayLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = s.user_id.toLowerCase().includes(term) ||
      (s.customer_id && s.customer_id.toLowerCase().includes(term)) ||
      (s.profile?.email && s.profile.email.toLowerCase().includes(term)) ||
      (s.profile?.display_name && s.profile.display_name.toLowerCase().includes(term));
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    active: subscriptions.filter(s => s.status === 'active').length,
    incomplete: subscriptions.filter(s => s.status === 'incomplete').length,
    pastDue: subscriptions.filter(s => s.status === 'past_due').length,
    canceled: subscriptions.filter(s => s.status === 'canceled').length,
  };

  const webhookStats = {
    completed: paymentLogs.filter(l => l.event_type === "COMPLETED" || l.event_type === "ACTIVE").length,
    failed: paymentLogs.filter(l => l.event_type === "FAILED" || l.event_type === "REFUNDED").length,
    pending: paymentLogs.filter(l => !["COMPLETED", "ACTIVE", "FAILED", "REFUNDED", "CANCELLED", "EXPIRED"].includes(l.event_type)).length,
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6 lg:p-10 space-y-10 text-white"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b pb-10 gap-8" style={{ borderColor: "oklch(1 0 0 / 7%)" }}>
        <div className="space-y-3">
           <div className="flex items-center gap-2 text-cyan">
              <ShieldCheck size={14} /><span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan/60">Billing Controller</span>
           </div>
           <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Billing</h2>
        </div>
        
        <div className="flex items-center space-x-4">
           <button 
             onClick={() => setShowPaymentForm(v => !v)}
             className="btn-tech btn-tech-primary"
           >
             <DollarSign size={14} />
             <span>Créer un paiement</span>
           </button>
           <button 
             onClick={fetchSubscriptions}
             className="btn-tech"
           >
             <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
             <span>Refresh Data</span>
           </button>
           <a
             href="https://dashboard.suby.fi"
             target="_blank"
             rel="noopener noreferrer"
             className="btn-tech btn-tech-primary"
           >
             <ExternalLink size={14} />
             <span>Suby Dashboard</span>
           </a>
        </div>
      </header>

      {/* Section Navigation */}
      <div className="flex border-b -mt-4" style={{ borderColor: "oklch(1 0 0 / 7%)" }}>
        {[
          { id: "overview", label: "Overview", icon: <Activity size={12} /> },
          { id: "payouts", label: "Crypto Payouts", icon: <TrendingUp size={12} /> },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeSection === s.id ? 'border-cyan' : 'border-transparent'} ${
              activeSection === s.id
                ? 'text-cyan bg-cyan/5'
                : 'border-transparent text-white/20 hover:text-white/40'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Payout Section */}
      {activeSection === "payouts" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Balance & Supported Currencies */}
            <div className="space-y-6">
              <div className="bento-card">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-3 flex items-center">
                  <PiggyBank size={12} className="mr-1.5" />
                  Account Balance (USD)
                </p>
                <p className="text-4xl font-black text-emerald font-mono">
                  $<span id="balance-amount">—</span>
                </p>
                <p className="text-[9px] text-white/25 mt-1">Vérifier dans Settings &gt; Payment Gateway &gt; Check Balance</p>
              </div>

              <div className="bento-card">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center">
                  <Bitcoin size={12} className="mr-1.5" />
                  Cryptocurrencies Supportées
                </p>
                <div className="space-y-3">
                  {[
                    { short: "USDT", name: "Tether", network: "TRON (TRC-20)", min: "5.00 USD", fee: "1.00 USD" },
                    { short: "USDC", name: "USD Coin", network: "BASE", min: "2.00 USD", fee: "0.10 USD" },
                    { short: "BTC", name: "Bitcoin", network: "BITCOIN", min: "10.00 USD", fee: "2.50 USD" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl p-4" style={{ background: "oklch(0.14 0.02 255 / 0.3)", border: "1px solid oklch(1 0 0 / 7%)" }}>
                      <div>
                        <p className="text-xs font-bold text-white">{c.short} <span className="text-white/30 font-normal">({c.name})</span></p>
                        <p className="text-[9px] text-white/20">Network: {c.network}</p>
                      </div>
                      <div className="text-right">
                        <span className="badge-status badge-active">{c.min}</span>
                        <p className="text-[9px] text-white/20 mt-1">Frais tx: {c.fee}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] text-white/15 mt-3 italic leading-relaxed">
                  Frais plateforme: 1%. Payout converti au taux spot. 2FA requis depuis 2j. Wallet doit être non-sanctionné. Limite journalière: 3,000 USD.
                </p>
              </div>
            </div>

            {/* Right: Crypto Wallet Config & Payout Form */}
            <div className="space-y-6">
              <div className="bento-card">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center">
                  <Globe size={12} className="mr-1.5" />
                  Crypto Wallet Config
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1 block">Wallet Address (destination)</label>
                    <input type="text" value={payoutAddress} onChange={e => setPayoutAddress(e.target.value)} placeholder="Adresse wallet crypto (USDT, USDC, BTC...)" className="input-tech" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1 block">Currency</label>
                      <select value={payoutCurrency} onChange={e => { setPayoutCurrency(e.target.value); const networkMap = { USDT: 'TRON', USDC: 'BASE', BTC: 'BITCOIN' }; setPayoutNetwork(networkMap[e.target.value] || 'TRON'); }} className="input-tech cursor-pointer">
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="BTC">BTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1 block">Network</label>
                      <select value={payoutNetwork} onChange={e => setPayoutNetwork(e.target.value)} className="input-tech cursor-pointer">
                        <option value="TRON">TRON (TRC-20)</option>
                        <option value="BASE">BASE</option>
                        <option value="BITCOIN">BITCOIN</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={async () => { if (!payoutAddress) { toast.error("Entrez une adresse wallet"); return; } try { await setPayoutConfig({ walletAddress: payoutAddress, currency: payoutCurrency, network: payoutNetwork }); setSavedPayoutConfig({ walletAddress: payoutAddress, currency: payoutCurrency, network: payoutNetwork }); toast.success("Configuration wallet sauvegardée !"); } catch (err) { toast.error("Erreur: " + err.message); } }} className="btn-tech btn-tech-primary w-full justify-center"><Copy size={12} />Save Wallet Config</button>
                </div>
              </div>

              <div className="bento-card">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-4 flex items-center">
                  <ArrowUpRight size={12} className="mr-1.5" />
                  Initier un Payout Crypto
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1 block">Montant en USD (1.01 – 100,000)</label>
                    <input type="number" step="0.01" min="1.01" max="100000" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="125.00" className="input-tech" />
                  </div>
                  {payoutResult && (
                    <div className={`p-4 border text-[10px] font-mono ${payoutResult.success ? 'bg-emerald/5 border-emerald/20 text-emerald' : 'bg-rose/5 border-rose/20 text-rose'}`}>
                      <p className="font-semibold">{payoutResult.success ? '✅ Payout initié' : '❌ Erreur'}</p>
                      <p className="mt-1 text-[10px]">{payoutResult.message}</p>
                      {payoutResult.link && (
                        <a href={payoutResult.link} target="_blank" rel="noopener noreferrer" className="text-cyan underline mt-2 inline-block text-[10px]">
                          Voir le payout →
                        </a>
                      )}
                    </div>
                  )}
                  <button onClick={async () => {
                    const amt = Number(payoutAmount);
                    if (!amt || amt < 1.01 || amt > 100000) { toast.error("Montant invalide"); return; }
                    const addr = payoutAddress || savedPayoutConfig.walletAddress;
                    if (!addr) { toast.error("Configurez d'abord une adresse wallet"); return; }
                    setPayoutLoading(true);
                    setPayoutResult(null);
                    try {
                      const result = await createSubyPayout({
                        amount: amt,
                        currency: payoutCurrency || savedPayoutConfig.currency,
                        network: payoutNetwork || savedPayoutConfig.network,
                        address: addr,
                        reference: `admin_payout_${Date.now()}`,
                      });
                      const payoutId = result?.payoutId || result?.id;
                      const link = result?.link || result?.transactionUrl;
                      setPayoutResult({
                        success: true,
                        message: `Payout initié ! Réf: ${payoutId || "—"}`,
                        link,
                      });
                      toast.success("Payout Suby initié !");
                    } catch (err) {
                      setPayoutResult({ success: false, message: err.message });
                      toast.error("Suby payout: " + err.message);
                    }
                    setPayoutLoading(false);
                  }} disabled={payoutLoading || !isSubyConfigured()} className="btn-tech btn-tech-primary w-full justify-center">
                    {payoutLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>{payoutLoading ? "Traitement..." : isSubyConfigured() ? "Initier le Payout Suby" : "BFF Suby requis"}</span>
                  </button>
                  <p className="text-[8px] text-white/15 mt-2 leading-relaxed">
                    ⚠️ Payout nécessite 2FA activé depuis 2 jours minimum. Wallet doit être non-sanctionné. Limite journalière: 3,000 USD.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Overview Section */}
      {activeSection === "overview" && (<>

      {/* Payment Creation Form */}
      {showPaymentForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card space-y-6"
          style={{ borderColor: "oklch(0.63 0.26 29 / 20%)" }}
        >
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald flex items-center space-x-2">
            <Wallet size={14} />
            <span>Create Payment</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-2 block">Email du client</label>
              <input
                type="email"
                value={payEmail}
                onChange={e => setPayEmail(e.target.value)}
                placeholder="user@example.com"
                className="input-tech"
              />
            </div>
            <div>
              <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-2 block">Plan</label>
              <select
                value={payPlan}
                onChange={e => setPayPlan(e.target.value)}
                className="input-tech cursor-pointer"
              >
                <option value="starter">Starter — $29.99/mois</option>
                <option value="pro_max">Elite — $99.99/mois</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreatePayment}
                disabled={payLoading}
                className="btn-tech btn-tech-primary w-full justify-center"
              >
                {payLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>{payLoading ? "Création..." : "Créer & ouvrir checkout"}</span>
              </button>
            </div>
          </div>
          <p className="text-[9px] text-white/30">
            Le lien de checkout s'ouvrira dans un nouvel onglet. Le client pourra y ajouter sa carte et payer.
          </p>
        </motion.div>
      )}

      {/* API Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">              <div className="bento-card space-y-4">
            <p className="text-[10px] uppercase text-white/30 tracking-widest italic font-bold">API Gateway</p>
            <div className="flex items-center justify-between">
               <h4 className="text-2xl font-black text-emerald uppercase tracking-tighter">Operational</h4>
               <div className="h-2 w-2 rounded-full bg-emerald animate-pulse shadow-[0_0_10px_#10b981]" />
            </div>
         </div>              <div className="bento-card space-y-4">
            <p className="text-[10px] uppercase text-white/30 tracking-widest italic font-bold">Sandbox Mode</p>
            <div className="flex items-center justify-between">
               <h4 className="text-2xl font-black text-cyan uppercase tracking-tighter">Active</h4>
               <Zap size={20} className="text-cyan" />
            </div>
         </div>              <div className="bento-card space-y-4">
            <p className="text-[10px] uppercase text-white/30 tracking-widest italic font-bold">Active Subs</p>
            <div className="flex items-center justify-between">
               <h4 className="text-4xl font-black text-white tracking-tighter">{stats.active}</h4>
               <CheckCircle2 size={20} className="text-emerald" />
            </div>
         </div>              <div className="bento-card space-y-4">
            <p className="text-[10px] uppercase text-white/30 tracking-widest italic font-bold">Incomplete</p>
            <div className="flex items-center justify-between">
               <h4 className="text-4xl font-black text-orange-500 tracking-tighter">{stats.incomplete}</h4>
               <Clock size={20} className="text-orange-700" />
            </div>
         </div>
      </div>

      {/* Webhook Events Status */}
      <div className="bento-card">
        <div className="flex items-center justify-between mb-4">            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan flex items-center space-x-2">
            <ListTodo size={14} />
            <span>Webhook Events — Payment Status</span>
          </h3>
          <button
            onClick={() => { setShowLogs(v => !v); if (!showLogs) fetchPaymentLogs(); }}
            className="btn-tech"
          >
            <RefreshCw size={12} className={logsLoading ? "animate-spin" : ""} />
            <span>{showLogs ? "Masquer" : "Voir logs"}</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <CheckCircle size={16} className="text-emerald" />
            <div>
              <p className="text-2xl font-black text-white">{webhookStats.completed}</p>
              <p className="text-[9px] uppercase tracking-widest text-emerald font-bold">Réussi</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <XCircle size={16} className="text-rose" />
            <div>
              <p className="text-2xl font-black text-white">{webhookStats.failed}</p>
              <p className="text-[9px] uppercase tracking-widest text-rose font-bold">Échoué</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock size={16} className="text-amber-500" />
            <div>
              <p className="text-2xl font-black text-white">{webhookStats.pending}</p>
              <p className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">En attente</p>
            </div>
          </div>
        </div>

        {/* Webhook Logs Table */}
        {showLogs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 pt-6"
            style={{ borderTop: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="table-tech">
                <thead className="sticky top-0" style={{ background: "oklch(0.14 0.02 255 / 0.5)" }}>
                  <tr>
                    <th>Date</th>
                    <th>User ID</th>
                    <th>Transaction</th>
                    <th>Event</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr><td colSpan="5" className="text-center text-white/20 animate-pulse">Loading logs...</td></tr>
                  ) : paymentLogs.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-white/20">No webhook events received yet</td></tr>
                  ) : paymentLogs.map((log, i) => (
                    <tr key={log.id || i}>
                      <td className="font-mono !text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="font-mono !text-[10px]">{log.user_id?.slice(0, 16)}…</td>
                      <td className="font-mono !text-[10px]">{log.txn_id || '—'}</td>
                      <td className="flex items-center gap-1.5">
                        {getEventIcon(log.event_type)}
                        <span>{log.event_type}</span>
                      </td>
                      <td>
                        <span className={`badge-status ${log.plan === 'elite' ? 'badge-active' : log.plan === 'pro' ? 'badge-trial' : ''}`}>
                          {log.plan || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Subscriptions Table */}
      <div className="space-y-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.5em] italic">Subscription_Database_Registry</h3>
            <div className="flex items-center space-x-4">
               <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search User ID or CID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-tech pl-10 w-64"
                  />
               </div>
               <div className="flex items-center space-x-3">
                 {/* Status filter tabs */}
                 {["all","active","incomplete","past_due","canceled","trialing"].map(s => (
                   <button key={s}
                     onClick={() => setStatusFilter(s)}
                     className={`badge-status cursor-pointer transition-all ${
                       statusFilter === s
                         ? 'badge-trial'
                         : 'text-white/15 hover:text-white/40'
                     }`}
                     style={statusFilter !== s ? { borderColor: 'oklch(1 0 0 / 7%)' } : {}}
                   >{s}</button>
                 ))}
                 <button onClick={exportCSV} className="btn-tech">
                    <Download size={14} />
                    <span>Export CSV</span>
                 </button>
               </div>
            </div>
         </div>

         <div className="overflow-hidden rounded-2xl" style={{ background: "oklch(0.13 0.02 255 / 0.4)", border: "1px solid oklch(1 0 0 / 7%)" }}>
            <div className="overflow-x-auto">
               <table className="table-tech">
                  <thead>
                     <tr>
                        <th>User / Identity</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Period End</th>
                        <th>Provider</th>
                        <th className="text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {dataState.kind === "loading" ? (
                       <tr>
                         <td colSpan="6" className="text-center">
                            <div className="skeleton-shimmer h-6 w-64 mx-auto mt-4" />
                         </td>
                       </tr>
                     ) : dataState.kind === "supabase-missing" ? (
                        <tr><td colSpan="6" className="py-12"><DataState.SupabaseMissing /></td></tr>
                     ) : dataState.kind === "error" ? (
                        <tr><td colSpan="6" className="py-12"><DataState.Error message={dataState.message} onRetry={fetchSubscriptions} /></td></tr>
                     ) : filteredSubscriptions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-[10px] font-black uppercase tracking-widest text-white/15">
                             No Data Found In Registry
                          </td>
                        </tr>
                     ) : filteredSubscriptions.map((sub) => (
                        <tr key={sub.id}>
                           <td>
                              <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "oklch(1 0 0 / 5%)" }}>
                                    <User size={14} className="text-white/30" />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-white text-xs font-bold font-mono tracking-tighter truncate">
                                      {sub.profile?.display_name || sub.user_id.slice(0, 12) + '...'}
                                    </p>
                                    <p className="text-[9px] text-white/30 font-medium uppercase tracking-widest">
                                      {sub.profile?.email || 'No email'}
                                    </p>
                                    <p className="text-[8px] text-white/15 font-mono">
                                      {sub.user_id.slice(0, 24)}
                                    </p>
                                 </div>
                              </div>
                           </td>
                           <td>
                              <span className={`badge-status ${sub.plan === 'elite' ? 'badge-active' : sub.plan === 'pro' ? 'badge-trial' : ''}`}>
                                {sub.plan}
                              </span>
                           </td>
                           <td>
                              <span className={`badge-status ${sub.status === 'active' ? 'badge-active' : sub.status === 'trialing' ? 'badge-trial' : sub.status === 'canceled' ? 'badge-inactive' : ''}`} style={sub.status === 'incomplete' ? { borderColor: 'oklch(0.7 0.18 55 / 30%)', color: 'oklch(0.7 0.18 55)' } : sub.status === 'past_due' ? { borderColor: 'oklch(0.6 0.24 15 / 30%)', color: 'oklch(0.6 0.24 15)' } : {}}>
                                 {sub.status}
                              </span>
                           </td>
                           <td>
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
                                {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'PERPETUAL'}
                              </p>
                           </td>
                           <td>
                              <span className="text-[8px] text-white/20 font-mono">{sub.provider || '—'}</span>
                           </td>
                           <td className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                 <button onClick={() => handleEdit(sub)} className="p-1.5 text-cyan hover:text-cyan transition-all" title="Éditer">
                                   <Edit size={13} />
                                 </button>
                                 <button onClick={() => toggleSub(sub.user_id, sub.status)} className={`p-1.5 transition-all ${sub.status === 'active' ? 'text-amber-500 hover:text-amber-400' : 'text-emerald hover:text-emerald'}`} title={sub.status === 'active' ? 'Désactiver' : 'Activer'}>
                                   {sub.status === 'active' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                                 </button>
                                 <button onClick={() => banUser(sub.user_id, sub.profile?.email)} className="p-1.5 text-white/20 hover:text-rose transition-all" title="Bannir">
                                   <Ban size={13} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setEditingSub(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="bento-card w-full max-w-md">
            <h3 className="text-lg font-black uppercase text-cyan mb-2 flex justify-between items-center">
              Modifier Abonnement
              <button onClick={() => setEditingSub(null)}><X size={18} className="text-white/30 hover:text-white transition-colors" /></button>
            </h3>
            <p className="text-[10px] text-white/30 font-mono mb-6">
              {editingSub.profile?.display_name || editingSub.user_id.slice(0, 16)}…
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5 block">Plan</label>
                <select value={editForm.plan} onChange={e => setEditForm({...editForm, plan: e.target.value})} className="input-tech cursor-pointer w-full">
                  <option value="free">Free</option>
                  <option value="pro">Starter (Pro)</option>
                  <option value="elite">Pro Max (Elite)</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5 block">Statut</label>
                <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="input-tech cursor-pointer w-full">
                  <option value="active">Actif</option>
                  <option value="canceled">Annulé</option>
                  <option value="trialing">Essai</option>
                  <option value="past_due">En retard</option>
                  <option value="incomplete">Incomplet</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5 block">Provider</label>
                <select value={editForm.provider} onChange={e => setEditForm({...editForm, provider: e.target.value})} className="input-tech cursor-pointer w-full">
                  <option value="suby">Suby.fi</option>
                  <option value="suby_sandbox_bypass">Sandbox Bypass</option>
                  <option value="manual">Manual (Admin)</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5 block">Subscription ID</label>
                <input type="text" value={editForm.subscription_id} onChange={e => setEditForm({...editForm, subscription_id: e.target.value})} placeholder="bypass_xxx / TRN_xxx" className="input-tech w-full font-mono" />
              </div>
              <div>
                <label className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5 block">Period End (ISO date)</label>
                <input type="text" value={editForm.current_period_end} onChange={e => setEditForm({...editForm, current_period_end: e.target.value})} placeholder="2026-08-20T00:00:00.000Z" className="input-tech w-full font-mono" />
              </div>
              <button onClick={handleSaveEdit} className="btn-tech btn-tech-primary w-full justify-center mt-2">
                Enregistrer les modifications
              </button>
            </div>
          </motion.div>
        </div>
      )}

      </>)}

      {/* Safety Controls */}
      <div className="bento-card space-y-6" style={{ borderColor: "oklch(0.63 0.26 29 / 20%)" }}>
         <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center space-x-3 text-rose">
            <AlertTriangle size={14} />
            <span>Emergency Access Override</span>
         </h3>
         <p className="text-[10px] text-white/25 font-medium uppercase tracking-[0.2em] leading-relaxed max-w-2xl">
            Manual override allows you to force subscription status changes in the local database. This does not sync with the payment gateway upstream. Use only for support or troubleshooting.
         </p>
         <div className="flex items-center space-x-4">
            <button className="btn-tech hover:border-rose/30 hover:text-rose">Force Clear Cache</button>
            <button className="btn-tech hover:border-amber-400/30 hover:text-amber-400">Audit Registry</button>
         </div>
      </div>
    </motion.div>
  );
};

export default BillingPage;
