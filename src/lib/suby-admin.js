// Suby admin client.
// Dynamic Suby operations require a server-side BFF because SUBY_API_KEY must
// never be bundled in the APK/browser. Until a documented BFF URL and API
// contract are configured, fail clearly and keep static hosted checkout links
// available through suby-checkout-links.js.
import * as appsScriptAuth from "./apps-script-auth";

function configuredBffUrl() {
  return import.meta.env.VITE_SUBY_BFF_URL || "";
}

export function isSubyConfigured() {
  return Boolean(configuredBffUrl());
}

function unavailableError() {
  const error = new Error(
    "Les actions Suby dynamiques ne sont pas configurées. Utilisez un lien checkout hébergé ou configurez un BFF HTTPS côté serveur.",
  );
  error.code = "suby-not-configured";
  error.degraded = true;
  return error;
}

async function callSubyFunction(action, payload = {}) {
  const explicitBff = configuredBffUrl();
  if (!explicitBff) throw unavailableError();

  const url = explicitBff;

  const stored = appsScriptAuth.getStoredSession();
  const headers = { "Content-Type": "application/json" };
  if (stored?.token) headers.Authorization = `Bearer ${stored.token}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, payload }),
  });
  let body = null;
  try { body = await response.json(); } catch { /* handled below */ }
  if (!response.ok) {
    const error = new Error(body?.error || `Suby BFF indisponible (${response.status})`);
    error.code = body?.code || "suby-bff-error";
    throw error;
  }
  return body?.data ?? body;
}

export function createSubyPayment(payload) { return callSubyFunction("subyCreatePayment", payload); }
export function createSubyPaymentLink(payload) { return callSubyFunction("subyCreatePaymentLink", payload); }
export function getSubyBalance(currency = "USD") { return callSubyFunction("subyGetBalance", { currency }); }
export function createSubyPayout(payload) { return callSubyFunction("subyCreatePayout", payload); }
export function listSubyProducts() { return callSubyFunction("subyListProducts", {}); }
export function createSubyAdminProduct(payload) { return callSubyFunction("subyCreateProduct", payload); }
export function toggleSubyProductStatus(productId, active) { return callSubyFunction("subyToggleProduct", { productId, active }); }
export function listSubyTransactions(filters = {}) { return callSubyFunction("subyListTransactions", filters); }
export function listSubySubscriptions(filters = {}) { return callSubyFunction("subyListSubscriptions", filters); }
export function cancelSubySubscription(subscriptionId) { return callSubyFunction("subyCancelSubscription", { subscriptionId }); }
export function listSubyCustomers() { return callSubyFunction("subyListCustomers", {}); }
export function searchSubyCustomer(email) { return callSubyFunction("subySearchCustomer", { email }); }
export function listSubyWebhookLogs() { return callSubyFunction("subyWebhookLogs", {}); }
export function replaySubyWebhook(eventId) { return callSubyFunction("subyReplayWebhook", { eventId }); }
export function testSubyWebhook() { return callSubyFunction("subyTestWebhook", {}); }
export function getSubyDashboardStats() { return callSubyFunction("subyDashboardStats", {}); }
