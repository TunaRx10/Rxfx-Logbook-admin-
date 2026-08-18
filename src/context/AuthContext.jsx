/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { safeCallProxy, updateUserProfile } from "../lib/data-admin";
import * as appsScriptAuth from "../lib/apps-script-auth";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Local-only escape hatch for installation/UI work. Vite removes this branch
// from production builds (`import.meta.env.DEV` becomes statically `false`).
const devAdminOverride = () =>
  import.meta.env.DEV && localStorage.getItem("rxfx_force_admin") === "true";

/**
 * Le rôle admin se lit directement dans `profiles.role` (le profil renvoyé par
 * `login`/`register`/`getCurrentUser` inclut déjà `role`, `status` et
 * `subscription_tier`). On n'a donc plus besoin d'un round-trip supplémentaire.
 */
const userIsAdmin = (user) => {
  if (!user) return false;
  if (devAdminOverride()) return true;
  if (user.status && user.status !== "active") return false;
  return user.role === "admin";
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(() => {
    return sessionStorage.getItem("rxfx_admin_pin_verified") === "true";
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const stored = appsScriptAuth.getStoredSession();
        if (stored?.token) {
          try {
            // Valide la session persistée et rafraîchit le profil (rôle/statut).
            const user = await appsScriptAuth.getCurrentUser(stored.token);
            appsScriptAuth.storeSession({ token: stored.token, user });
            setCurrentUser(user);
            setIsAdmin(userIsAdmin(user));
          } catch (err) {
            console.warn("[AuthContext] getCurrentUser failed:", err?.message);
            appsScriptAuth.clearSession();
          }
        }
      } catch (err) {
        console.error("AuthContext: Initialization error", err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const applySession = useCallback((session) => {
    if (!session?.token || !session?.user) return null;
    appsScriptAuth.storeSession({ token: session.token, user: session.user });
    setCurrentUser(session.user);
    setIsAdmin(userIsAdmin(session.user));
    // Un nouveau login doit refranchir la grille PIN.
    setIsPinVerified(false);
    sessionStorage.removeItem("rxfx_admin_pin_verified");
    return session.user;
  }, []);

  const login = useCallback(
    async (email, password) => {
      const session = await appsScriptAuth.login(email, password);
      return applySession(session);
    },
    [applySession],
  );

  /**
   * `register` — inscrit via l'action `register` du script puis, si demandé,
   * tente de promouvoir le compte en `admin`. La promotion passe par
   * `updateUserProfile` (action admin) : elle n'est possible que pour une
   * session déjà admin. Pour le bootstrap du premier admin, définir
   * manuellement `role=admin` dans la feuille `profiles`, puis se reconnecter.
   */
  const register = useCallback(
    async (data, { promoteAdmin = false } = {}) => {
      const session = await appsScriptAuth.register(data);
      if (promoteAdmin && session?.user?.id) {
        try {
          await updateUserProfile(session.user.id, { role: "admin" });
          session.user.role = "admin";
        } catch (err) {
          console.warn(
            "[AuthContext] Promotion admin impossible (session non-admin) — définissez role=admin dans la feuille profiles, puis reconnectez-vous.",
            err?.message,
          );
        }
      }
      return applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    setIsPinVerified(false);
    sessionStorage.removeItem("rxfx_admin_pin_verified");
    sessionStorage.removeItem("rxfx_admin_pin");
    setIsAdmin(false);
    setCurrentUser(null);
    const stored = appsScriptAuth.getStoredSession();
    if (stored?.token) await appsScriptAuth.logout(stored.token);
    appsScriptAuth.clearSession();
  }, []);

  /**
   * Vérification du PIN admin — TOUJOURS côté serveur (action `verifyAdminPin`
   * du Code.gs, avec lockout anti-bruteforce). Le PIN n'est jamais embarqué
   * dans le bundle client.
   */
  const verifyPin = async (pin) => {
    if (!pin || typeof pin !== "string") {
      throw new Error("PIN requis.");
    }
    const result = await safeCallProxy("verifyAdminPin", { pin });
    if (result?.success) {
      sessionStorage.setItem("rxfx_admin_pin_verified", "true");
      setIsPinVerified(true);
    }
    return result;
  };

  const value = {
    currentUser,
    isAdmin,
    loading,
    login,
    register,
    logout,
    isPinVerified,
    verifyPin,
    emulatorStatus: { state: "ready", elapsedMs: 0 }, // toujours ready (plus de Firebase)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
