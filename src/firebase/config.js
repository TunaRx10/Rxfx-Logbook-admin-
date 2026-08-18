/**
 * Firebase bridge — DISABLED (Google Sheets via Apps Script uniquement).
 *
 * L'admin utilise Google Sheets (Apps Script) comme backend unique.
 * Firebase n'est plus nécessaire — les pages ont des gardes `if (!db)`
 * et fonctionnent en mode dégradé quand Firebase est absent.
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
