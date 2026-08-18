// Shared auth guard for the /api/admin-ai/* serverless functions.
//
// Verifies the caller is a logged-in RxFx admin by validating their session
// token against the Apps Script backend (`getCurrentUser` → `role === "admin"`).
// The static API_KEY is never used here — it stays server-side / in the backend.
// Fails closed: if the token or the Apps Script URL is missing, the request is
// rejected rather than silently allowed.

import type { VercelRequest } from "@vercel/node";

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "";

// Best-effort in-memory rate limit (per admin token). Serverless cold starts
// reset it, so it is a backstop, not a hard guarantee.
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_MIN = 60;

function readBearer(req: VercelRequest): string {
  const raw = req.headers?.authorization;
  const h = Array.isArray(raw) ? raw[0] : raw || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

async function isAdminToken(token: string): Promise<boolean> {
  if (!token || !APPS_SCRIPT_URL) return false; // fail closed
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getCurrentUser", payload: { _token: token } }),
    });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as any;
    const user = json?.ok ? json.data : null;
    return !!(user && user.role === "admin");
  } catch {
    return false;
  }
}

export type Denial = { status: number; message: string };

/** Returns null when authorized, or a Denial to write back to the client. */
export async function requireAdmin(req: VercelRequest): Promise<Denial | null> {
  const token = readBearer(req);
  if (!token) return { status: 401, message: "Authentication required" };

  const ok = await isAdminToken(token);
  if (!ok) return { status: 403, message: "Admin session required" };

  const now = Date.now();
  let b = buckets.get(token);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
  }
  b.count += 1;
  buckets.set(token, b);
  if (b.count > MAX_PER_MIN) return { status: 429, message: "Too many requests" };

  return null;
}
