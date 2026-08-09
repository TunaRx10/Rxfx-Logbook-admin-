import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SPLASH_KEY = "rxfx_admin_splash_seen";
const SPLASH_DURATION_MS = 1800;

function readSplashPreference() {
  try {
    return window.localStorage.getItem(SPLASH_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberSplash() {
  try {
    window.localStorage.setItem(SPLASH_KEY, "true");
  } catch {
    // Storage may be blocked; the splash still closes normally.
  }
}

const SplashScreen = ({ children }) => {
  const [showSplash, setShowSplash] = useState(() => !readSplashPreference());

  useEffect(() => {
    if (!showSplash) return undefined;
    const timer = window.setTimeout(() => {
      rememberSplash();
      setShowSplash(false);
    }, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [showSplash]);

  const closeSplash = () => {
    rememberSplash();
    setShowSplash(false);
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            role="status"
            aria-live="polite"
            aria-label="Chargement de RxFx Logbook Admin"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="rxfx-splash fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0B0B0B]"
          >
            <div className="rxfx-splash__halo" aria-hidden="true" />
            <div className="relative z-10 flex flex-col items-center px-6 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.78, filter: "blur(14px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="rxfx-splash__mark"
              >
                <img src="/favicon.svg" alt="RxFx" className="h-20 w-20" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.55 }}
                className="mt-7"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/90">
                  RxFx <span className="text-[#00D9FF]">Logbook</span>
                </p>
                <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.34em] text-white/30">
                  Administrator console
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.45, duration: 0.9, ease: "easeOut" }}
                className="rxfx-splash__progress mt-10"
                aria-hidden="true"
              />
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                type="button"
                onClick={closeSplash}
                className="mt-8 text-[9px] font-semibold uppercase tracking-[0.28em] text-white/25 transition-colors hover:text-[#00D9FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00D9FF]"
              >
                Passer
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SplashScreen;
