import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { envVar } from "../lib/env";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";

// 🔒 SECURITY: No fallback. If VITE_SUPREME_ADMIN_EMAIL is missing the
//     signup path is completely disabled at runtime (see canSignup below).
const SUPREME_ADMIN_EMAIL = envVar("VITE_SUPREME_ADMIN_EMAIL", "")
  .trim()
  .toLowerCase();

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();

  // 🔒 SECURITY: Signup flow requires a configured supreme admin email.
  //     If the env var is empty we hide the signup tab entirely so an
  //     attacker cannot create an admin account by guessing the fallback.
  const canSignup = SUPREME_ADMIN_EMAIL.length > 0;

  // Redirect once the auth context confirms an admin session
  useEffect(() => {
    if (currentUser && isAdmin) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    // 🔒 SECURITY: Block signup unless an admin email is configured AND the
    //     supplied email matches it. Case-insensitive comparison.
    if (!isLogin && (!canSignup || email.toLowerCase() !== SUPREME_ADMIN_EMAIL)) {
      toast.error("Inscription non autorisée : accès restreint aux administrateurs.");
      setLoading(false);
      return;
    }

    try {
      console.log("[Auth] Attempting login with:", email);
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log("[Auth] Supabase response:", { data, error });
        if (error) throw error;
        
        toast.info("Connexion réussie, validation des droits...");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        console.log("[Auth] Supabase signup response:", { data, error });
        if (error) throw error;
        toast.success("Inscription réussie. Vérifiez votre email.");
      }
    } catch (error) {
      console.error("[Auth] Login error:", error);
      setFormError(error.message || "Une erreur inconnue est survenue.");
      toast.error(error.message || "Échec de l'authentification");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-11 rounded-lg border bg-transparent pl-10 pr-4 text-[13px] outline-none transition-colors focus:border-cyan/50";

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "oklch(0.06 0.015 255)", color: "#f5f5f5", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,188,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,188,212,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Subtle radial */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,188,212,0.04) 0%, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[380px]"
      >
        <div
          className="rounded-xl border p-8"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "rgba(10,15,25,0.85)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Logo + Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
            >
              <img src="/logo.png" alt="RxFx" className="h-7 w-7 object-contain" />
            </div>
            <h1 className="text-[20px] font-medium tracking-[-0.02em] text-white">
              RxFx{" "}
              <span className="font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>
                Admin
              </span>
            </h1>
            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: "rgba(0,188,212,0.6)" }}>
              Administrator Console
            </p>

            {/* Toggle — pill style. Signup tab only renders if a supreme
                admin email is configured. */}
            <div
              className="mt-5 inline-flex items-center rounded-lg p-0.5"
              style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
            >
              <button
                type="button"
                onClick={() => { setIsLogin(true); setFormError(null); }}
                className="rounded-md px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] transition-all"
                style={{
                  background: isLogin ? "rgba(255,255,255,0.06)" : "transparent",
                  color: isLogin ? "#fff" : "rgba(255,255,255,0.35)",
                }}
              >
                Connexion
              </button>
              {canSignup && (
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setFormError(null); }}
                  className="rounded-md px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] transition-all"
                  style={{
                    background: !isLogin ? "rgba(255,255,255,0.06)" : "transparent",
                    color: !isLogin ? "#fff" : "rgba(255,255,255,0.35)",
                  }}
                >
                  Inscription
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rxfx.io"
                className={inputClass}
                style={{
                  background: "transparent",
                  color: "#f5f5f5",
                }}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                style={{
                  background: "transparent",
                  color: "#f5f5f5",
                  paddingRight: "2.5rem",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Submit */}
            <button
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[12px] font-medium uppercase tracking-[0.05em] transition-all disabled:opacity-50"
              style={{
                background: "rgb(0,188,212)",
                color: "#000",
              }}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              ) : (
                <>
                  {isLogin ? "Connexion" : "S'inscrire"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            {formError && (
              <p className="text-center text-[11px]" style={{ color: "oklch(0.63 0.26 29)" }}>
                {formError}
              </p>
            )}

            {currentUser && !isAdmin && !loading && (
              <div className="mt-4 p-3 rounded-lg border border-rose/20 bg-rose/5 text-center">
                <p className="text-[10px] uppercase tracking-widest text-rose font-bold mb-1">
                  Accès Non-Admin
                </p>
                <p className="text-[10px] text-white/40">
                  Connecté en tant que {currentUser.email}, mais ce compte n'a pas les droits d'accès.
                </p>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="mt-2 text-[9px] uppercase tracking-widest text-white/60 hover:text-white underline"
                >
                  Changer de compte
                </button>
              </div>
            )}

            {/* Development Helper (DEV + localhost only — tree-shaken from
                `npm run build` because `import.meta.env.DEV` becomes
                statically `false` there, so Vite removes the entire
                branch. Hosts a tightened dev-only admin bypass AND a
                dev-only PIN bypass for local iteration. NEVER reachable
                in a real deploy. */}
            {import.meta.env.DEV &&
              (window.location.hostname === "localhost" ||
                window.location.hostname.startsWith("10.")) && (
              <div className="mt-8 pt-6 border-t border-white/5 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("rxfx_force_admin", "true");
                    window.location.reload();
                  }}
                  className="w-full py-2 rounded-lg bg-cyan/10 border border-cyan/20 text-[9px] font-black uppercase tracking-[0.2em] text-cyan hover:bg-cyan/20 transition"
                >
                  [DEV] Forcer l'accès Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // 🔒 SECURITY: inlined deliberately — see the
                    //   comment block above the dev-helper JSX. No helper
                    //   binding is referenced so Vite tree-shakes the
                    //   entire onClick with the gated JSX subtree.
                    sessionStorage.setItem("rxfx_admin_pin_verified", "true");
                    window.location.reload();
                  }}
                  className="w-full py-2 rounded-lg bg-cyan/10 border border-cyan/20 text-[9px] font-black uppercase tracking-[0.2em] text-cyan hover:bg-cyan/20 transition"
                >
                  [DEV] Bypass PIN
                </button>
                <p className="text-[8px] text-center text-white/20 italic">
                  Utilisez ces boutons si vous êtes bloqué lors de l'installation locale.
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" style={{ color: "rgba(255,255,255,0.15)" }} />
            <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.15)" }}>
              Secured · RxFx v1.0
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
