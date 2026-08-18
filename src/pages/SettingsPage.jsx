import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Settings, Save, Shield,
  Database, Globe, Cpu,
  RefreshCw, AlertTriangle, Cloud,
  CreditCard, Eye, EyeOff, CheckCircle2, XCircle,
  ExternalLink, Wallet, Key, Copy, Lock, MessageCircle,
  User, Camera, BadgeCheck, Star
} from "lucide-react";
import { getAllSystemSettings, setSystemSetting, getPaymentConfig, setPaymentConfig, getDiscordInviteLink, setDiscordInviteLink } from "../lib/data-admin";
import { getSubyBalance, isSubyConfigured } from "../lib/suby-admin";
import { PageShell, PageHeader, Section } from "../components/ui/PagePrimitives";

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General settings
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [globalCDN, setGlobalCDN] = useState(true);
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("1 hour");
  const [retentionPolicy, setRetentionPolicy] = useState("90 Days");

  // Payment gateway config
  const [merchantId, setMerchantId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [sandboxMode, setSandboxMode] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [gatewayBalance, setGatewayBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Webhook state
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [checkingWebhook, setCheckingWebhook] = useState(false);

  // Discord state
  const [discordLink, setDiscordLink] = useState('https://discord.gg/saY2b2qCZ5');
  const [discordSaving, setDiscordSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const data = await getAllSystemSettings();
        const setting = (key, fallback) => data?.[key] === undefined ? fallback : data[key];
        setMaintenanceMode(setting("maintenanceMode", false) === true || setting("maintenanceMode", false) === "true");
        setAutoBackup(setting("autoBackup", true) === true || setting("autoBackup", true) === "true");
        setGlobalCDN(setting("globalCDN", true) === true || setting("globalCDN", true) === "true");
        setEnforce2FA(setting("enforce2FA", true) === true || setting("enforce2FA", true) === "true");
        if (data.sessionTimeout) setSessionTimeout(data.sessionTimeout);
        if (data.retentionPolicy) setRetentionPolicy(data.retentionPolicy);

        const paymentConfig = await getPaymentConfig();
        setMerchantId(paymentConfig?.merchantId || "");
        setPrivateKey("");
        setSandboxMode(paymentConfig?.sandbox !== false);
        if (paymentConfig?.merchantId && paymentConfig?.hasPrivateKey) {
          setKeySaved(true);
        }

        const discord = await getDiscordInviteLink();
        if (discord?.link) setDiscordLink(discord.link);
      } catch (error) {
        console.error("[settings] load failed", error);
        toast.error("Impossible de charger les paramètres. Vérifiez le backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const savePaymentConfig = async () => {
    if (!merchantId || (!privateKey && !keySaved)) {
      toast.error("Merchant ID et Private Key sont requis pour une première configuration");
      return;
    }
    setSaving(true);
    try {
      await setPaymentConfig({
        merchantId: merchantId.trim(),
        privateKey: privateKey.trim(),
        sandbox: sandboxMode,
      });
      setKeySaved(true);
      toast.success("Configuration de paiement enregistrée !");
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
    setSaving(false);
  };

  const checkGatewayBalance = async () => {
    setBalanceLoading(true);
    setGatewayBalance(null);
    try {
      const result = await getSubyBalance("USD");
      setGatewayBalance({ balance: result.balance || result.available, currency: result.currency || 'USD' });
      toast.success("Solde Suby récupéré !");
    } catch (err) {
      toast.error("Impossible de vérifier le solde: " + err.message);
      setGatewayBalance({ error: err.message });
    }
    setBalanceLoading(false);
  };

  const checkWebhookStatus = async () => {
    setCheckingWebhook(true);
    setWebhookStatus(null);
    try {
      await getSubyBalance("USD");
      setWebhookStatus({
        ok: true,
        message: "Suby API authentifiée. Configurez le webhook côté marchand sur dashboard.suby.fi.",
      });
      toast.success("Webhook Suby configuré !");
    } catch (err) {
      setWebhookStatus({ ok: false, message: err.message });
      toast.error("Erreur webhook: " + err.message);
    }
    setCheckingWebhook(false);
  };

  const updateSetting = async (key, value, setter) => {
    try {
      await setSystemSetting(key, value);
      setter(value);
      toast.success("Paramètre mis à jour");
    } catch (error) {
      console.error(`Failed to update ${key}`, error);
      toast.error("Erreur de mise à jour");
    }
  };

  const WEBHOOK_URL = `${import.meta.env.VITE_APP_URL || import.meta.env.VITE_API_URL || ''}/api/webhooks/suby`;

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="skeleton-shimmer h-10 w-48 rounded-xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Control Plane Configuration — system_config (Sheets)"
        title="System"
        highlight="Settings"
        subtitle="Global orchestration and security parameters."
      />

      {/* Security warning banner */}
      <div
        className="p-4 flex items-start gap-3 rounded-xl mb-10"
        style={{
          border: "1px solid oklch(0.9 0.15 85 / 20%)",
          background: "oklch(0.9 0.15 85 / 2%)",
        }}
      >
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
            Security Notice — Admin Environment Only
          </p>
          <p className="text-[9px] text-white/25 mt-1">
            La clé privée est enregistrée uniquement côté serveur et n’est jamais renvoyée à l’application. Laissez le champ vide pour conserver la clé déjà configurée.
          </p>
        </div>
      </div>

      {/* ── ADMIN PROFILE ── */}
      <Section title="Admin Profile" icon={User}>
        <div className="bento-card">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center relative group cursor-pointer border-2 border-dashed border-white/10 hover:border-cyan/40 transition-all overflow-hidden"
                style={{ background: "linear-gradient(135deg, oklch(0.74 0.13 209 / 10%), oklch(0.1 0.01 255))" }}
              >
                <User size={36} className="text-white/20 group-hover:text-cyan/50 transition-colors" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-cyan" />
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-cyan">
                <BadgeCheck size={10} />
                Super Admin
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 block">Prénom</label>
                  <input
                    type="text"
                    defaultValue="Admin"
                    placeholder="Admin"
                    className="input-tech"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 block">Nom</label>
                  <input
                    type="text"
                    defaultValue="RxFx"
                    placeholder="RxFx"
                    className="input-tech"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 block">Email</label>
                <input
                  type="email"
                  defaultValue="admin@rxfx.app"
                  placeholder="admin@rxfx.app"
                  className="input-tech"
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-tech btn-tech-primary">
                  <Save size={14} />
                  <span>Sauvegarder le profil</span>
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald/20 bg-emerald/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="text-[9px] font-bold text-emerald uppercase tracking-wider">Session active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── PAYMENT GATEWAY ── */}
      <Section title="Payment Gateway" icon={CreditCard}>
        <div className="bento-card">
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  keySaved ? "bg-emerald animate-pulse shadow-[0_0_10px_#10b981]" : "bg-rose"
                }`}
              />
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  keySaved ? "text-emerald" : "text-rose"
                }`}
              >
                {keySaved ? "Connected" : "Not Configured"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: API Keys */}
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 block flex items-center gap-1.5">
                  <Lock size={12} /> Merchant ID
                </label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={(e) => { setMerchantId(e.target.value); setKeySaved(false); }}
                  placeholder="6A518A77AD1BE"
                  className="input-tech font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 block flex items-center gap-1.5">
                  <Key size={12} /> Private Key
                </label>
                <div className="flex">
                  <input
                    type={showKey ? "text" : "password"}
                    value={privateKey}
                    onChange={(e) => { setPrivateKey(e.target.value); setKeySaved(false); }}
                    placeholder="sec_sandbox_..."
                    className="input-tech font-mono flex-1"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 text-white/30 hover:text-cyan transition-all"
                    style={{
                      background: "oklch(0.14 0.02 255 / 0.5)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                      borderLeft: "none",
                    }}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[9px] text-white/15 mt-1 font-mono">
                  {privateKey ? "Nouvelle clé prête à être enregistrée" : keySaved ? "Clé serveur configurée (masquée)" : "Non définie"}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 block">
                  Mode
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSandboxMode(true)}
                    className={`badge-status cursor-pointer transition-all ${
                      sandboxMode ? "badge-warn" : "text-white/15"
                    }`}
                    style={!sandboxMode ? { borderColor: "oklch(1 0 0 / 7%)" } : {}}
                  >
                    <Cloud size={12} className="mr-1.5 inline" /> Sandbox
                  </button>
                  <button
                    onClick={() => setSandboxMode(false)}
                    className={`badge-status cursor-pointer transition-all ${
                      !sandboxMode ? "badge-active" : "text-white/15"
                    }`}
                    style={sandboxMode ? { borderColor: "oklch(1 0 0 / 7%)" } : {}}
                  >
                    <Globe size={12} className="mr-1.5 inline" /> Live
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={savePaymentConfig}
                  disabled={saving}
                  className="btn-tech btn-tech-primary disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{saving ? "Saving…" : "Save Config"}</span>
                </button>
                <button
                  onClick={checkGatewayBalance}
                  disabled={balanceLoading || !keySaved || !isSubyConfigured()}
                  className="btn-tech disabled:opacity-30"
                >
                  <RefreshCw size={14} className={balanceLoading ? "animate-spin" : ""} />
                  <span>{isSubyConfigured() ? "Check Balance" : "BFF Suby requis"}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Status */}
            <div className="space-y-6">
              <div className="bento-card">
                <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-3 flex items-center gap-1.5">
                  <Wallet size={12} /> Account Balance
                </p>
                {balanceLoading ? (
                  <div className="animate-pulse flex items-center space-x-3">
                    <div className="h-8 w-24 bg-white/5 rounded" />
                    <div className="h-4 w-16 bg-white/5 rounded" />
                  </div>
                ) : gatewayBalance ? (
                  gatewayBalance.error ? (
                    <div className="text-rose text-sm font-mono">{gatewayBalance.error}</div>
                  ) : (
                    <div>
                      <div className="text-3xl font-black text-emerald font-mono">
                        ${Number(gatewayBalance.balance || gatewayBalance.available || 0).toFixed(2)}
                      </div>
                      <div className="text-[9px] text-white/25 font-mono mt-1">
                        Currency: {gatewayBalance.currency || 'USD'}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-white/15 text-xs italic">Click "Check Balance" to fetch</div>
                )}
              </div>

              <div className="bento-card">
                <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-3 flex items-center gap-1.5">
                  <ExternalLink size={12} /> Webhook URL
                </p>
                <div
                  className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{
                    background: "oklch(0.09 0.025 255 / 0.6)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                  }}
                >
                  <code className="text-[10px] text-cyan font-mono truncate">{WEBHOOK_URL}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(WEBHOOK_URL);
                      toast.success("URL copiée !");
                    }}
                    className="text-white/30 hover:text-white ml-2 shrink-0"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <p className="text-[8px] text-white/15 mt-1">Configure this URL in your provider dashboard → Webhooks</p>

                <button
                  onClick={checkWebhookStatus}
                  disabled={checkingWebhook || !keySaved || !isSubyConfigured()}
                  className="btn-tech w-full justify-center disabled:opacity-30 mt-3"
                >
                  <RefreshCw size={12} className={checkingWebhook ? "animate-spin" : ""} />
                  <span>Test Webhook Connection</span>
                </button>

                {webhookStatus && (
                  <div
                    className={`mt-3 p-3 border text-[10px] font-mono flex items-start gap-2 ${
                      webhookStatus.ok
                        ? "bg-emerald/5 border-emerald/20 text-emerald"
                        : "bg-rose/5 border-rose/20 text-rose"
                    }`}
                  >
                    {webhookStatus.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
                    <span>{webhookStatus.message}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://dashboard.suby.fi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tech flex-1 justify-center"
                >
                  <ExternalLink size={12} />
                  <span>Suby Dashboard</span>
                </a>
                <a
                  href="https://documentation.suby.fi/v2/api-reference/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tech flex-1 justify-center"
                >
                  <ExternalLink size={12} />
                  <span>API Docs</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── CORE INFRASTRUCTURE ── */}
      <Section title="Core Infrastructure" icon={Cpu}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingCard
            name="Maintenance Mode"
            desc="Disable public access for scheduled updates."
            type="toggle"
            value={maintenanceMode}
            onChange={(v) => updateSetting("maintenanceMode", v, setMaintenanceMode)}
          />
          <SettingCard
            name="Region Affinity"
            desc="Optimize latency by pinning services to us-central1."
            type="text"
            value="us-central1 (Low Latency)"
          />
          <SettingCard
            name="Global CDN"
            desc="Distribute static assets via Edge locations."
            type="toggle"
            value={globalCDN}
            onChange={(v) => updateSetting("globalCDN", v, setGlobalCDN)}
          />
        </div>
      </Section>

      {/* ── SECURITY & ACCESS ── */}
      <Section title="Security & Access" icon={Shield}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingCard
            name="2FA Enforcement"
            desc="Require two-factor authentication for all admin roles."
            type="toggle"
            value={enforce2FA}
            onChange={(v) => updateSetting("enforce2FA", v, setEnforce2FA)}
          />
          <SettingCard
            name="Session Timeout"
            desc="Auto-logout after inactivity period."
            type="select"
            value={sessionTimeout}
            options={["15 minutes", "1 hour", "4 hours", "Never"]}
            onChange={(v) => updateSetting("sessionTimeout", v, setSessionTimeout)}
          />
          <SettingCard
            name="IP Whitelisting"
            desc="Restrict dashboard access to specific CIDR blocks."
            type="button"
            label="Configure Blocks"
          />
        </div>
      </Section>

      {/* ── DATA MANAGEMENT ── */}
      <Section title="Data Management" icon={Database}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingCard
            name="Automated Backups"
            desc="Perform daily Google Sheets snapshots."
            type="toggle"
            value={autoBackup}
            onChange={(v) => updateSetting("autoBackup", v, setAutoBackup)}
          />
          <SettingCard
            name="Retention Policy"
            desc="Purge logs older than specified days."
            type="select"
            value={retentionPolicy}
            options={["30 Days", "90 Days", "1 Year", "Infinite"]}
            onChange={(v) => updateSetting("retentionPolicy", v, setRetentionPolicy)}
          />
        </div>
      </Section>

      {/* ── DISCORD COMMUNITY ── */}
      <Section title="Discord Community" icon={MessageCircle}>
        <div className="bento-card">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "#5865F2/15", border: "1px solid #5865F2/25" }}
              >
                <MessageCircle size={24} className="text-[#5865F2]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Serveur Discord Officiel</p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  Gérez le lien d'invitation du serveur communautaire RxFx.
                </p>
              </div>
            </div>
            <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tech flex items-center gap-2"
            >
              <MessageCircle size={14} className="text-[#5865F2]" />
              <span>Tester le lien</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2 block">
                Lien d'invitation Discord
              </label>
              <input
                type="text"
                value={discordLink}
                onChange={(e) => setDiscordLink(e.target.value)}
                placeholder="https://discord.gg/saY2b2qCZ5"
                className="input-tech font-mono"
              />
              <p className="text-[9px] text-white/15 mt-1">
                Modifiez ce lien pour changer le serveur Discord de la communauté.
              </p>
            </div>
            <button
              onClick={async () => {
                setDiscordSaving(true);
                try {
                  await setDiscordInviteLink(discordLink);
                  toast.success('Lien Discord mis à jour !');
                } catch (err) {
                  toast.error('Erreur: ' + err.message);
                }
                setDiscordSaving(false);
              }}
              disabled={discordSaving}
              className="btn-tech btn-tech-primary shrink-0"
            >
              <Save size={14} />
              <span>{discordSaving ? 'Enregistrement…' : 'Enregistrer'}</span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "oklch(0.14 0.02 255 / 0.4)", border: "1px solid oklch(1 0 0 / 5%)" }}>
            <div className="h-2 w-2 rounded-full bg-emerald animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-[9px] text-emerald font-bold uppercase tracking-widest">Invitation Active</span>
            <span className="text-[9px] text-white/20 ml-2">Le lien est distribué dans l'application utilisateur et le dashboard.</span>
          </div>
        </div>
      </Section>

      {/* ── DANGER ZONE ── */}
      <div
        className="p-10 relative overflow-hidden rounded-2xl mt-10"
        style={{
          border: "1px solid oklch(0.63 0.26 29 / 20%)",
          background: "oklch(0.63 0.26 29 / 2%)",
        }}
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-rose/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-rose/10 border border-rose/20 flex items-center justify-center text-rose shadow-[0_0_30px_rgba(244,63,94,0.1)]">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Danger Zone</h3>
              <p className="text-white/30 text-sm font-medium">Irreversible system-wide operations. Proceed with extreme caution.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-tech">Purge Cache</button>
            <button className="btn-tech btn-tech-primary !bg-rose !border-rose hover:!opacity-90 shadow-lg shadow-rose-500/10">
              Factory Reset
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

/* ── Reusable Setting Card (kept local to Settings) ── */
const SettingCard = ({ name, desc, type, value, onChange, options, label }) => (
  <div
    className="p-6 rounded-xl group hover:bg-white/[0.02] transition-all"
    style={{
      background: "oklch(0.11 0.025 255 / 0.5)",
      border: "1px solid oklch(1 0 0 / 7%)",
    }}
  >
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-bold text-white text-sm mb-1">{name}</h4>
        <p className="text-[10px] text-white/25 font-medium leading-relaxed">{desc}</p>
      </div>

      {type === 'toggle' && (
        <button
          onClick={() => onChange && onChange(!value)}
          className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${
            value ? "bg-cyan" : "bg-white/10"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full transition-all bg-black ${
              value ? "right-1" : "left-1"
            }`}
          />
        </button>
      )}

      {type === 'select' && (
        <select
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          className="rounded-xl px-3 py-1.5 text-[10px] font-black text-cyan uppercase outline-none cursor-pointer shrink-0"
          style={{
            background: "oklch(0.14 0.02 255 / 0.5)",
            border: "1px solid oklch(1 0 0 / 8%)",
          }}
        >
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
          ))}
        </select>
      )}

      {type === 'text' && (
        <input
          type="text"
          value={value}
          readOnly
          className="rounded-xl px-3 py-1.5 text-[10px] font-bold text-cyan outline-none w-32 text-right shrink-0"
          style={{
            background: "oklch(0.14 0.02 255 / 0.5)",
            border: "1px solid oklch(1 0 0 / 8%)",
          }}
        />
      )}

      {type === 'button' && (
        <button className="text-[10px] font-black text-cyan uppercase tracking-widest hover:underline shrink-0">
          {label}
        </button>
      )}
    </div>
  </div>
);

export default SettingsPage;
