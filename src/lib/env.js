/**
 * Safe env var accessor (client).
 *
 * ⚠️ SECURITY: do NOT use dynamic `import.meta.env[key]` access — Vite cannot
 * statically analyse it and inlines the ENTIRE `import.meta.env` object,
 * including every `VITE_*` secret, into the bundle. Only the non-secret vars
 * whitelisted below may reach the client.
 *
 * Returns the fallback if the var is missing, an empty string, or the literal
 * "undefined" (which Vite leaves behind when the consumer references an
 * undeclared env var by mistake).
 */

// Static map: Vite substitutes these dot-notation literals at build time.
// Anything NOT listed here is never readable from the client.
function clientEnv() {
  try {
    return {
      VITE_GA_ID: import.meta.env.VITE_GA_ID,
      VITE_SUPREME_ADMIN_EMAIL: import.meta.env.VITE_SUPREME_ADMIN_EMAIL,
    };
  } catch {
    // Non-Vite runtime (SSR / raw Node / Vitest): no client env available.
    return {};
  }
}

export function envVar(key, fallback = "") {
  const v = clientEnv()[key];
  if (v && v !== "undefined" && v !== "null") return v;
  return fallback;
}
