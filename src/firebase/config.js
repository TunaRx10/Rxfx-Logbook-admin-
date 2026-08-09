/**
 * Firebase bridge — DISABLED (Supabase-only admin).
 *
 * L'admin utilise Supabase comme backend unique via dev-supabase-direct
 * (local) ou supabase-admin.js (prod). Firebase n'est plus nécessaire.
 * Toutes les pages admin ont des gardes `if (!db)` et fonctionnent en
 * mode dégradé quand Firebase est absent.
 */

// Tous les exports à null — les pages vérifient `if (!db)` avant usage.
const auth = null;
const db = null;
const functions = null;
const storage = null;
const analytics = null;
let app = null;

export { auth, db, functions, storage, analytics };
export default app;
