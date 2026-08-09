// ── Suby Checkout Links (Marketing) ──────────────────────────────────────
// Surfaces the 4 EUR-priced Suby.fi hosted-checkout URLs so admins can
// copy them into email campaigns, affiliate messages, social posts, or
// QR codes. These are the SAME URLs the consumer app's checkout flow
// redirects to when `SUBY_PAYMENT_LINKS[planId]` is configured (see
// `remix-of-trade-journal-pro/src/lib/suby.types.ts`). Keep in sync if
// the merchant ever rotates them in the Suby dashboard.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Link2, Copy, ExternalLink, Mail, Send, Check,
  Euro, Crown, Rocket, Globe, MessageCircle,
  Twitter, Linkedin, QrCode, Download, RefreshCw,
  Sparkles, Eye, EyeOff, Activity,
} from "lucide-react";
import { PageShell, PageHeader, Section } from "../components/ui/PagePrimitives";
import CrossAppHealthBadge from "../components/CrossAppHealthBadge";
import { SUBY_CHECKOUT_LINKS as SUBY_LINKS } from "../lib/suby-checkout-links";

/**
 * Source-of-truth Suby checkout URLs. Mirror of
 * `remix-of-trade-journal-pro/src/lib/suby.types.ts` `SUBY_PAYMENT_LINKS`.
 * Update both files together if a URL ever rotates.
 */
const SUBY_CHECKOUT_LINKS = [
  { planId: "starter", name: "Pro · Mensuel", priceEur: "29,99 €", period: "/ mois", audience: "Particuliers, traders débutants", pitch: "L'essentiel pour suivre et améliorer ses trades", url: SUBY_LINKS.starter },
  { planId: "starter_3m", name: "Pro · Trimestriel", priceEur: "83,99 €", period: "/ 3 mois (−7%)", audience: "Traders engagés, engagement trimestriel", pitch: "Pro sur 3 mois · équivalent 27,99 €/mois", url: SUBY_LINKS.starter_3m },
  { planId: "pro_max", name: "Elite · Mensuel", priceEur: "99,99 €", period: "/ mois", audience: "Traders actifs, recherche institutionnelle", pitch: "Tout Pro + analyses institutionnelles + API + hotline SOS", url: SUBY_LINKS.pro_max },
  { planId: "pro_max_3m", name: "Elite · Trimestriel", priceEur: "279,99 €", period: "/ 3 mois (−7%)", audience: "Pros sérieux, engagement trimestriel premium", pitch: "Elite sur 3 mois · équivalent 93,32 €/mois", url: SUBY_LINKS.pro_max_3m },
];

/**
 * Generates a downloadable QR-code PNG via the public `api.qrserver.com`
 * endpoint (no auth, no tracking). The QR encodes the full Suby URL so
 * a printed flyer / business card stays scannable even after the link
 * rotates (just re-print).
 */
const qrPngUrl = (url, size = 320) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=10`;

const SubyCheckoutLinksPage = () => {
  const [revealLinks, setRevealLinks] = useState(false);
  const [testRunning, setTestRunning] = useState(false);

  // Pre-built email campaign template — single template that loops the
  // admin can drop into Mailchimp / SendGrid / Brevo. Uses `{{firstName}}`
  // merge tags.
  const emailTemplate = useMemo(
    () => ({
      subject: "🧠 Ton journal de trading, en pilote automatique — RxFx Logbook",
      body: `Salut {{firstName}},

On a lancé un truc qui change la donne pour les traders qui veulent arrêter de se raconter des histoires : RxFx Logbook.

📒  Webhook RXFX → tes trades arrivent tout seuls dans le journal
🧭  Radar Analysis → ton type de trader (pas celui que tu crois)
🎯  Psychology Coach → corrige tes biais sans que tu le demandes

👉 3 formules, en €, sans engagement caché :

${SUBY_CHECKOUT_LINKS.map(
  (l) => `  • ${l.name} — ${l.priceEur} ${l.period}\n    ${l.url}`,
).join("\n")}

On a un plan gratuit pour tester, et la version Pro démarre à 29,99 €/mois.
Tu cliques, tu trades, tu vois.

— L'équipe RxFx`,
    }),
    [],
  );

  const socialCopy = useMemo(
    () => ({
      twitter: SUBY_CHECKOUT_LINKS[0].url, // 29,99€ as anchor
      linkedin: `J'ai enfin un journal de trading qui se remplit tout seul (webhook RXFX), un radar qui me dit mon vrai profil de trader, et un coach qui corrige mes biais sans que je le demande.\n\nRxFx Logbook — Pro dès 29,99 €/mois → ${SUBY_CHECKOUT_LINKS[0].url}`,
      discord: `**Nouveau dans la logbook :** Radar Analysis + Psychology Coach, en automatique.\n\nPro : ${SUBY_CHECKOUT_LINKS[0].url} (29,99 €)\nElite : ${SUBY_CHECKOUT_LINKS[2].url} (99,99 €)`,
    }),
    [],
  );

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié dans le presse-papiers`);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast.success(`${label} copié dans le presse-papiers`);
      } catch {
        toast.error("Impossible de copier — sélectionne manuellement");
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const testAllLinks = async () => {
    setTestRunning(true);
    try {
      // Probe each URL with a HEAD request so the admin can spot a 404 /
      // expired link BEFORE sending an email blast.
      const results = await Promise.allSettled(
        SUBY_CHECKOUT_LINKS.map(async (link) => {
          // `no-cors` keeps it simple — we can't read status, but a
          // network error will still reject the promise.
          const res = await fetch(link.url, { method: "HEAD", mode: "no-cors", redirect: "follow" });
          return { planId: link.planId, ok: res.type === "opaque" || res.ok, status: res.status };
        }),
      );
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length === 0) {
        toast.success(`✓ ${SUBY_CHECKOUT_LINKS.length} liens testés (HEAD OK)`);
      } else {
        toast.error(`${failures.length} lien(s) en erreur — vérifie manuellement`);
      }
    } catch (err) {
      toast.error("Test échoué: " + err.message);
    } finally {
      setTestRunning(false);
    }
  };

  const maskUrl = (url) => {
    if (revealLinks) return url;
    // Show only the Suby host + a partial product id, hide the rest.
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1] || "";
      const masked = last.length > 6
        ? `${last.slice(0, 4)}…${last.slice(-4)}`
        : "…";
      return `${u.origin}/p/${masked}`;
    } catch {
      return url;
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Suby · Marketing"
        title="Liens de checkout"
        highlight="Suby"
        subtitle="Les 4 liens Suby.fi EUR pour les campagnes email, affiliation et QR codes"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRevealLinks((v) => !v)}
              className="btn-tech hover:border-cyan/40 hover:text-cyan"
            >
              {revealLinks ? <EyeOff size={14} /> : <Eye size={14} />}
              {revealLinks ? "Masquer" : "Révéler"} les URLs
            </button>
            <button
              onClick={testAllLinks}
              disabled={testRunning}
              className="btn-tech hover:border-emerald/40 hover:text-emerald"
            >
              <RefreshCw size={14} className={testRunning ? "animate-spin" : ""} />
              Tester les {SUBY_CHECKOUT_LINKS.length} liens
            </button>
          </div>
        }
      />

      {/* ── Cross-app pipeline health ─────────────────────────────────── */}
      {/* This badge does a server-to-server HEAD against the consumer's
          `/api/webhooks/suby` endpoint via the `probeConsumerWebhook`
          Cloud Function. Together with the existing admin-side
          `getSubyConnectionDiagnostics` (in Settings / Security pages),
          it closes the gap "did the webhook actually ARRIVE at the
          consumer" — without the badge, the admin can verify the
          Suby.fi side without confirming the receiving endpoint is up.
          PIN-gated via the existing `requireAdminPin` flow; the PIN is
          typed once per page visit (held in component state, never
          persisted to sessionStorage — see Option A note in
          CrossAppHealthBadge.jsx header). */}
      <Section title="Santé du webhook consumer" icon={Activity}>
        <CrossAppHealthBadge />
        <p className="text-[9px] font-mono text-white/20 leading-relaxed px-1">
          Cible : <code className="text-cyan/50">https://rxfx.io/api/webhooks/suby</code> ·
          {" "}poll toutes les 60s · cache CF 30s · force-refresh via le bouton ·{" "}
          source : Cloud Function <code className="text-cyan/50">probeConsumerWebhook</code>.
        </p>
      </Section>

      {/* ── Link cards ──────────────────────────────────────────────── */}
      <Section title="Liens de paiement directs" icon={Link2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SUBY_CHECKOUT_LINKS.map((link, idx) => (
            <motion.div
              key={link.planId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border p-6 flex flex-col gap-4"
              style={{
                borderColor: "oklch(1 0 0 / 7%)",
                background: "oklch(0.12 0.015 255 / 0.3)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl border"
                    style={{
                      background: link.planId.startsWith("pro_max")
                        ? "oklch(0.74 0.13 209 / 10%)"
                        : "oklch(0.18 0.02 255 / 0.5)",
                      borderColor: link.planId.startsWith("pro_max")
                        ? "oklch(0.74 0.13 209 / 30%)"
                        : "oklch(1 0 0 / 10%)",
                    }}
                  >
                    {link.planId.startsWith("pro_max")
                      ? <Crown size={16} className="text-cyan" />
                      : <Rocket size={16} className="text-white/60" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{link.name}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{link.audience}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white leading-none">
                    {link.priceEur}
                  </p>
                  <p className="text-[9px] text-white/30 mt-1 font-mono uppercase tracking-wider">
                    {link.period}
                  </p>
                </div>
              </div>

              {/* Pitch */}
              <p className="text-[11px] text-white/50 leading-relaxed">
                {link.pitch}
              </p>

              {/* URL row */}
              <div
                className="flex items-center gap-2 p-3 rounded-xl border"
                style={{
                  borderColor: "oklch(1 0 0 / 6%)",
                  background: "oklch(0.08 0.01 255 / 0.5)",
                }}
              >
                <Link2 size={12} className="text-cyan/60 shrink-0" />
                <code className="text-[10px] font-mono text-white/70 flex-1 truncate">
                  {maskUrl(link.url)}
                </code>
                <button
                  onClick={() => copyToClipboard(link.url, link.name)}
                  className="btn-tech text-[9px] px-2.5 py-1.5"
                  title="Copier le lien"
                >
                  <Copy size={10} />
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tech text-[9px] px-2.5 py-1.5"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink size={10} />
                </a>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2">
                <a
                  href={qrPngUrl(link.url, 320)}
                  download={`suby-${link.planId}.png`}
                  className="btn-tech text-[9px] flex-1 justify-center"
                >
                  <QrCode size={11} />
                  QR code
                </a>
                <a
                  href={qrPngUrl(link.url, 1024)}
                  download={`suby-${link.planId}@2x.png`}
                  className="btn-tech text-[9px] flex-1 justify-center"
                  title="Version haute résolution pour impression"
                >
                  <Download size={11} />
                  QR HD
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Email campaign template ─────────────────────────────────── */}
      <Section title="Template email — campagne" icon={Mail}>
        <div
          className="rounded-2xl border p-6 space-y-4"
          style={{
            borderColor: "oklch(1 0 0 / 7%)",
            background: "oklch(0.12 0.015 255 / 0.3)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-cyan" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                Objet + corps — prêt pour Mailchimp / Brevo
              </p>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  `Subject: ${emailTemplate.subject}\n\n${emailTemplate.body}`,
                  "Template email",
                )
              }
              className="btn-tech text-[9px]"
            >
              <Copy size={10} />
              Copier sujet + corps
            </button>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1.5">
              Objet
            </p>
            <p className="text-sm font-bold text-white">{emailTemplate.subject}</p>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1.5">
              Corps
            </p>
            <pre
              className="text-[11px] font-mono text-white/70 leading-relaxed whitespace-pre-wrap p-4 rounded-xl border"
              style={{
                borderColor: "oklch(1 0 0 / 6%)",
                background: "oklch(0.08 0.01 255 / 0.5)",
              }}
            >
{emailTemplate.body}
            </pre>
          </div>
        </div>
      </Section>

      {/* ── Social copy snippets ────────────────────────────────────── */}
      <Section title="Posts réseaux sociaux" icon={Send}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Twitter / X */}
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{
              borderColor: "oklch(1 0 0 / 7%)",
              background: "oklch(0.12 0.015 255 / 0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Twitter size={14} className="text-white/60" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  X / Twitter
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(socialCopy.twitter, "Lien X")}
                className="btn-tech text-[8px] px-2 py-1"
              >
                <Copy size={9} />
              </button>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed font-mono">
              {socialCopy.twitter}
            </p>
          </div>

          {/* LinkedIn */}
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{
              borderColor: "oklch(1 0 0 / 7%)",
              background: "oklch(0.12 0.015 255 / 0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Linkedin size={14} className="text-white/60" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  LinkedIn
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(socialCopy.linkedin, "Post LinkedIn")}
                className="btn-tech text-[8px] px-2 py-1"
              >
                <Copy size={9} />
              </button>
            </div>
            <pre className="text-[10px] text-white/60 leading-relaxed font-sans whitespace-pre-wrap">
{socialCopy.linkedin}
            </pre>
          </div>

          {/* Discord */}
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{
              borderColor: "oklch(1 0 0 / 7%)",
              background: "oklch(0.12 0.015 255 / 0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-[#5865F2]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Discord
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(socialCopy.discord, "Post Discord")}
                className="btn-tech text-[8px] px-2 py-1"
              >
                <Copy size={9} />
              </button>
            </div>
            <pre className="text-[10px] text-white/60 leading-relaxed font-mono whitespace-pre-wrap">
{socialCopy.discord}
            </pre>
          </div>
        </div>
      </Section>

      {/* ── Affiliate tracking note ─────────────────────────────────── */}
      <div
        className="mt-8 p-5 rounded-2xl border flex items-start gap-3"
        style={{
          borderColor: "oklch(0.74 0.13 209 / 20%)",
          background: "oklch(0.74 0.13 209 / 5%)",
        }}
      >
        <Globe size={16} className="text-cyan shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan mb-1.5">
            Tracking d'affiliation
          </p>
          <p className="text-[11px] text-white/60 leading-relaxed">
            Si ton plan Suby supporte les paramètres de query string pour
            l'attribution, tu peux suffixer chaque URL avec un identifiant
            d'affilié (ex. <code className="text-cyan/80 font-mono">?ref=PARTNER01</code>)
            pour suivre les conversions. Vérifie la disponibilité de cette
            feature dans ton dashboard Suby avant d'envoyer une campagne
            avec des liens trackés.
          </p>
        </div>
      </div>

      {/* ── Source-of-truth note ────────────────────────────────────── */}
      <div
        className="mt-4 p-4 rounded-xl border"
        style={{
          borderColor: "oklch(1 0 0 / 5%)",
          background: "oklch(0.1 0.01 255 / 0.2)",
        }}
      >
        <p className="text-[9px] font-mono text-white/20 leading-relaxed">
          Source de vérité : <code className="text-cyan/50">remix-of-trade-journal-pro/src/lib/suby.types.ts</code> → <code className="text-cyan/50">SUBY_PAYMENT_LINKS</code>.
          Si tu fais tourner un lien dans le dashboard Suby, mets à jour
          les DEUX fichiers en même temps.
        </p>
      </div>
    </PageShell>
  );
};

export default SubyCheckoutLinksPage;
