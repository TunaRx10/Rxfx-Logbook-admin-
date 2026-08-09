import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PinGate from "./PinGate";

const AuthGuard = ({ children }) => {
  const { currentUser, isAdmin, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0B0B0B] text-white">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.svg" alt="RxFx" className="h-12 w-12 animate-pulse" />
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">
            Initialisation du terminal…
          </p>
        </div>
      </div>
    );
  }

  // Local-only escape hatch for installation and UI work. Vite removes this
  // branch from production builds; it never substitutes for server auth.
  const localDevelopmentBypass = import.meta.env.DEV && (() => {
    try {
      return window.localStorage.getItem("rxfx_force_admin") === "true";
    } catch {
      return false;
    }
  })();

  if (!currentUser && !localDevelopmentBypass) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin && !localDevelopmentBypass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] p-6 text-white">
        <div className="glass-panel w-full max-w-md p-8 text-center">
          <img src="/favicon.svg" alt="RxFx" className="mx-auto mb-5 h-14 w-14" />
          <h1 className="text-xl font-semibold">Accès administrateur requis</h1>
          <p className="mt-2 text-sm text-white/45">
            Ce compte est authentifié mais ne possède pas le rôle administrateur.
          </p>
          <button type="button" onClick={logout} className="btn-tech mt-6 w-full justify-center">
            Changer de compte
          </button>
        </div>
      </div>
    );
  }

  return <PinGate>{children}</PinGate>;
};

export default AuthGuard;
