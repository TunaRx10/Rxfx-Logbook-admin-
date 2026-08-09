/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { envVar } from "../lib/env";
import { safeCallProxy } from "../lib/supabase-admin";

const AuthContext = createContext();

// Dev PIN fallback counter (resets on successful login)
let verifyPinAttemptsRemaining = 5;

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(() => {
    return sessionStorage.getItem("rxfx_admin_pin_verified") === "true";
  });
  const [loading, setLoading] = useState(true);

  const fetchProfileRole = useCallback(async (user) => {
    if (!user) return false;
    // This browser-only escape hatch is strictly local development; never
    // let a persisted client flag grant production admin privileges.
    if (import.meta.env.DEV && localStorage.getItem("rxfx_force_admin") === "true") return true;
    try {
      const { data: adminData, error: adminErr } = await supabase
        .from('admins')
        .select('role, status')
        .eq('id', user.id)
        .single();

      if (!adminErr && adminData?.status === 'active') return true;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      return profileData?.role === 'admin';
    } catch (err) {
      console.error("AuthContext: Profile fetch error", err);
      return false;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          try {
            const { data: refreshData } = await supabase.auth.refreshSession();
            session = refreshData.session ?? null;
          } catch (e) {
            console.warn("[AuthContext] Session refresh failed", e);
          }
        }
        const user = session?.user ?? null;
        setCurrentUser(user);
        if (user) {
          const adminStatus = await fetchProfileRole(user);
          setIsAdmin(adminStatus);
        }
      } catch (err) {
        console.error("AuthContext: Initialization error", err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (user) {
        const adminStatus = await fetchProfileRole(user);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
        setIsPinVerified(false);
        sessionStorage.removeItem("rxfx_admin_pin_verified");
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfileRole]);

  const logout = async () => {
    setIsPinVerified(false);
    sessionStorage.removeItem("rxfx_admin_pin_verified");
    sessionStorage.removeItem("rxfx_admin_pin");
    setIsAdmin(false);
    verifyPinAttemptsRemaining = 5;
    await supabase.auth.signOut();
  };

  /** PIN verification is a local UX gate; production access is role-gated above. */
  const verifyPin = async (pin) => {
    if (!pin || typeof pin !== "string") {
      throw new Error("PIN requis.");
    }

    if (import.meta.env.PROD) {
      const result = await safeCallProxy("verifyAdminPin", { pin });
      if (result?.success) {
        sessionStorage.setItem("rxfx_admin_pin_verified", "true");
        setIsPinVerified(true);
      }
      return result;
    }

    const expectedPin = envVar("VITE_ADMIN_PIN", "");
    if (!expectedPin) {
      throw new Error("PIN admin non configuré. Définissez VITE_ADMIN_PIN pour le mode local.");
    }

    if (pin === expectedPin) {
      verifyPinAttemptsRemaining = 5;
      sessionStorage.setItem("rxfx_admin_pin_verified", "true");
      setIsPinVerified(true);
      return { success: true, attemptsRemaining: 5, isLocked: false };
    }

    const next = Math.max(0, verifyPinAttemptsRemaining - 1);
    verifyPinAttemptsRemaining = next;

    return {
      success: false,
      attemptsRemaining: next,
      isLocked: next === 0,
    };
  };

  const value = {
    currentUser,
    isAdmin,
    loading,
    logout,
    isPinVerified,
    verifyPin,
    emulatorStatus: { state: "ready", elapsedMs: 0 }, // toujours ready (plus de Firebase)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
