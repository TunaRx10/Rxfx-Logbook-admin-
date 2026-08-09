/**
 * Safe env var accessor.
 *
 * Vite substitutes `import.meta.env.VITE_*` literals at build time, so in
 * production this just returns the baked-in value. The try/catch + optional
 * chain protect against non-Vite runtimes (SSR, Vitest, raw Node) where
 * `import.meta.env` is undefined or throws.
 *
 * Returns the fallback if the var is missing, an empty string, or the literal
 * "undefined" (which Vite leaves behind when the consumer references an
 * undeclared env var by mistake).
 */
export function envVar(key, fallback = "") {
  try {
    const v = import.meta.env?.[key];
    if (v && v !== "undefined" && v !== "null") return v;
    return fallback;
  } catch {
    return fallback;
  }
}
