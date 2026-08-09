import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

/**
 * PIN gate with server-side brute-force protection.
 * - PIN is verified by the `verifyAdminPin` Cloud Function.
 * - Failed attempts are tracked server-side per UID with a 15-minute lockout.
 */
const MAX_ATTEMPTS = 5;

const PinGate = ({ children }) => {
  const [pin, setPin] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);
  const [isWrong, setIsWrong] = useState(false);
  const [isLockedDisplay, setIsLockedDisplay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isPinVerified, verifyPin } = useAuth();

  if (isPinVerified) {
    return children;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLockedDisplay || isLoading) return;

    setIsLoading(true);
    try {
      const response = await verifyPin(pin);

      if (response.success) {
        toast.success("Accès administrateur déverrouillé");
        return;
      }

      setIsWrong(true);
      setPin("");
      setTimeout(() => setIsWrong(false), 500);

      if (response.isLocked) {
        setIsLockedDisplay(true);
        toast.error("Trop de tentatives. Console bloquée pendant 15 minutes.");
      } else if (response.attemptsRemaining === undefined) {
        // Server returned an invalid/unexpected response.
        toast.error("Réponse du serveur invalide. Vérifiez la configuration.");
      } else {
        setAttemptsRemaining(response.attemptsRemaining);
        toast.error(
          `PIN incorrect (${response.attemptsRemaining}/${MAX_ATTEMPTS} tentatives restantes)`,
        );
      }
    } catch (error) {
      if (error?.code === "resource-exhausted") {
        setIsLockedDisplay(true);
        toast.error(error.message || "Trop de tentatives. Console bloquée pendant 15 minutes.");
      } else {
        toast.error(error.message || "Erreur lors de la vérification du PIN.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-6" style={{ background: "oklch(0.09 0.025 255)" }}>
      {/* Subtle radial background to match Auth page */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, var(--cyan) 0%, transparent 70%)" }}
      />

      <motion.form
        animate={isWrong ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl border p-8 backdrop-blur-xl"
        style={{
          borderColor: "oklch(1 0 0 / 10%)",
          background: "oklch(0.13 0.02 255 / 0.6)",
        }}
      >
        <div className="mb-6 text-center">
          <h2 className="text-cyan mb-2 text-[10px] font-black uppercase tracking-[0.3em]">
            Console de Sécurité
          </h2>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/30">
            Authentification Administrateur Requise
          </p>
        </div>

        <div className="relative mb-6">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            disabled={isLockedDisplay || isLoading}
            maxLength={8}
            autoFocus
            placeholder="••••••"
            className="w-full rounded-xl border bg-black/40 p-4 text-center font-mono text-2xl tracking-[0.6em] pl-[0.6em] text-white outline-none transition-all focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 disabled:opacity-50"
            style={{ borderColor: "oklch(1 0 0 / 10%)" }}
            aria-label="Code PIN"
          />
        </div>

        <button
          type="submit"
          disabled={isLockedDisplay || pin.length === 0 || isLoading}
          className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-cyan py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:opacity-90 disabled:opacity-40"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          ) : isLockedDisplay ? (
            "Système Verrouillé"
          ) : (
            "Déverrouiller"
          )}
        </button>



        {attemptsRemaining < MAX_ATTEMPTS && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-rose/10 bg-rose/5 py-2">
            <span className="h-1 w-1 animate-pulse rounded-full bg-rose shadow-[0_0_8px_#f43f5e]" />
            <p className="text-[9px] font-black uppercase tracking-widest text-rose/70">
              {MAX_ATTEMPTS - attemptsRemaining}/{MAX_ATTEMPTS} tentatives utilisées
            </p>
          </div>
        )}
      </motion.form>
    </div>
  );
};

export default PinGate;
