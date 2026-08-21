/**
 * Email Templates — Gestion des templates d'emails automatiques
 * =============================================================
 * Les templates vivent dans la feuille `email_templates` du Google Sheet
 * (backend Apps Script `google-sheets-db/Code.gs`) :
 *
 *   | id                        | subject            | body_html | updated_at |
 *   |---------------------------|--------------------|-----------|------------|
 *   | welcome                   | Bienvenue...       | <html>... | 2026-...   |
 *   | subscription_activated    | ...                | ...       | ...        |
 *   | shop_purchase             | ...                | ...       | ...        |
 *   | affiliation               | ...                | ...       | ...        |
 *   | partnership               | ...                | ...       | ...        |
 *   | subscription_expiring_soon| ...                | ...       | ...        |
 *   | subscription_expired      | ...                | ...       | ...        |
 *   | subscription_renewed      | ...                | ...       | ...        |
 *
 * Si un id n'a pas de ligne dans la feuille, le backend utilise son
 * template par défaut (Code.gs → `defaultTemplate_`) — supprimer la ligne
 * revient donc à "réinitialiser" le template d'origine.
 *
 * Protocole : POST { action, payload } vers VITE_GOOGLE_APPS_SCRIPT_URL.
 * Auth : token de session admin (`payload._token`) — pas de clé API au client.
 */

import { getStoredSession } from "./apps-script-auth";

const APPS_SCRIPT_URL_RAW = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

// En dev (localhost) : reverse-proxy via Vite pour contourner CORS /
// COEP / CORP. En prod : appel direct.
function proxiedAppsScriptUrl() {
  if (typeof window === "undefined") return APPS_SCRIPT_URL_RAW;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return APPS_SCRIPT_URL_RAW.replace(
      /^https:\/\/script\.google\.com/,
      `${origin}/__proxy_apps_script`,
    );
  }
  // prod : relais same-origin via la fonction serverless Vercel (évite CORS).
  return `${origin}/api/proxy-apps-script`;
}

const APPS_SCRIPT_URL = proxiedAppsScriptUrl();

/** Métadonnées des templates connus (labels FR + placeholders). */
export const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    label: "Bienvenue",
    description: "Après inscription d'un nouvel utilisateur",
    placeholders: ["name", "brand", "support_email"],
  },
  {
    id: "subscription_activated",
    label: "Abonnement activé",
    description: "Confirmation de mise en service d'un plan",
    placeholders: ["name", "plan", "expiry_date", "link", "brand"],
  },
  {
    id: "shop_purchase",
    label: "Achat boutique",
    description: "Confirmation d'un achat dans la boutique",
    placeholders: ["name", "product_name", "amount", "order_id", "brand"],
  },
  {
    id: "affiliation",
    label: "Affiliation",
    description: "Inscription au programme d'affiliation (avec code)",
    placeholders: ["name", "code", "link", "brand"],
  },
  {
    id: "partnership",
    label: "Partenariat",
    description: "Candidature partenariat (statut / message)",
    placeholders: ["name", "status", "message", "support_email", "brand"],
  },
  {
    id: "subscription_expiring_soon",
    label: "Expiration J-3",
    description: "Alerte 3 jours avant l'expiration de l'abonnement",
    placeholders: ["name", "plan", "expiry_date", "link", "brand"],
  },
  {
    id: "subscription_expired",
    label: "Abonnement expiré",
    description: "Alerte après expiration de l'abonnement",
    placeholders: ["name", "plan", "expiry_date", "link", "brand"],
  },
  {
    id: "subscription_renewed",
    label: "Abonnement renouvelé",
    description: "Confirmation de renouvellement",
    placeholders: ["name", "plan", "expiry_date", "brand"],
  },
  {
    id: "birthday",
    label: "Anniversaire",
    description: "Email envoyé automatiquement le jour de l'anniversaire",
    placeholders: ["name", "first_name", "brand"],
  },
  {
    id: "password_reset",
    label: "Mot de passe oublié",
    description: "Lien de réinitialisation de mot de passe (valable 1h)",
    placeholders: ["name", "reset_link", "brand"],
  },
  {
    id: "payment_failed",
    label: "Échec de paiement",
    description: "Paiement d'abonnement refusé (après 3 échecs → past_due)",
    placeholders: ["name", "plan", "attempt", "link", "support_email", "brand"],
  },
  {
    id: "certification_approved",
    label: "Certification approuvée",
    description: "Certification validée + lien de téléchargement du certificat",
    placeholders: ["name", "certificate_url", "brand"],
  },
  {
    id: "certification_rejected",
    label: "Certification rejetée",
    description: "Certification refusée avec motif",
    placeholders: ["name", "comment", "brand"],
  },
];

/** Données d'exemple pour prévisualiser / tester un template. */
export function sampleDataFor(templateId) {
  const base = {
    name: "Jean Dupont",
    brand: "RxFx",
    support_email: "support@rxfx.io",
    link: typeof window !== "undefined" ? window.location.origin : "",
  };
  switch (templateId) {
    case "welcome":
      return base;
    case "subscription_activated":
    case "subscription_expiring_soon":
    case "subscription_expired":
    case "subscription_renewed":
      return { ...base, plan: "pro", expiry_date: "15/09/2026" };
    case "shop_purchase":
      return { ...base, product_name: "Cours Pro Trading", amount: "99 $", order_id: "ORD-2026-0842" };
    case "affiliation":
      return { ...base, code: "RXFX-JEAN25" };
    case "partnership":
      return { ...base, status: "en attente", message: "Notre équipe revient vers vous sous 48h." };
    case "birthday":
      return { ...base, first_name: "Jean" };
    case "password_reset":
      return { ...base, reset_link: `${base.link || "https://app.rxfx.io"}/reset-password?token=exemple123` };
    case "payment_failed":
      return { ...base, plan: "pro", attempt: "2" };
    case "certification_approved":
      return { ...base, certificate_url: `${base.link || "https://app.rxfx.io"}/certificats/jean-dupont.pdf` };
    case "certification_rejected":
      return { ...base, comment: "Merci de compléter votre journal avec au moins 20 trades." };
    default:
      return base;
  }
}

async function callAppsScript(action, payload = {}) {
  if (!APPS_SCRIPT_URL_RAW) {
    throw new Error("VITE_GOOGLE_APPS_SCRIPT_URL non configuré");
  }
  const session = getStoredSession();
  if (session?.token) payload._token = session.token;
  // text/plain → pas de preflight CORS, Apps Script parse quand même via
  // JSON.parse(e.postData.contents).
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`);
  // Garde-fou : si le déploiement répond en HTML (expiré / mal configuré)
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("Apps Script non déployé — l'URL répond en HTML au lieu de JSON. Redéployez le Code.gs.");
  }
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur Apps Script");
  return json.data;
}

/** Liste les templates personnalisés (lignes présentes dans la feuille). */
export async function listEmailTemplates() {
  try {
    // Action dédiée du Code.gs : renvoie directement le tableau de rows.
    const rows = await callAppsScript("listEmailTemplates");
    if (Array.isArray(rows)) return rows;
    // Rétrocompat : si l'action n'existe pas encore, passer par listTable.
    const legacy = await callAppsScript("listTable", { tableName: "email_templates", limit: 500 });
    if (Array.isArray(legacy)) return legacy;
    return Array.isArray(legacy?.data) ? legacy.data : [];
  } catch (err) {
    console.error("[email-templates] list failed:", err?.message || err);
    throw err;
  }
}

/** Sauvegarde (ajout ou modification) d'un template. */
export async function saveEmailTemplate(id, subject, bodyHtml) {
  return callAppsScript("upsertRow", {
    tableName: "email_templates",
    idColumn: "id",
    data: {
      id,
      subject: String(subject || ""),
      body_html: String(bodyHtml || ""),
      updated_at: new Date().toISOString(),
    },
  });
}

/** Supprime la personnalisation → le backend revient au template par défaut. */
export async function resetEmailTemplate(id) {
  return callAppsScript("deleteRow", {
    tableName: "email_templates",
    idColumn: "id",
    idValue: id,
  });
}

/** Envoie un email de test (action sendEmail du backend, file d'attente incluse). */
export async function sendTemplateTestEmail(to, subject, bodyHtml) {
  return callAppsScript("sendEmail", { to, subject, bodyHtml });
}

/** Remplace les placeholders {{key}} côté client (prévisualisation). */
export function renderTemplateText(text, data = {}) {
  return String(text || "").replace(/\{\{(\w+)\}\}/g, (m, key) => {
    const v = data[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
