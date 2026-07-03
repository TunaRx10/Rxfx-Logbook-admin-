import React, { useState, useEffect } from "react";
import { Shield, Lock, Fingerprint, Cpu, AlertTriangle, Smartphone, ChevronRight } from "lucide-react";

const SecurityShield = ({ children }) => {
  console.log("SecurityShield: Initializing Shield Protocol...");
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("AWAITING_AUTH"); // AWAITING_AUTH, BIOMETRIC_CHECK, AUTH_SUCCESS, INTRUSION_ALERT, AWAITING_PIN
  const [failedAttempts, setFailedAttempts] = useState(0);

  const MASTER_PIN = "2026"; // Code PIN principal
  const AUTHORIZED_DEVICE = "RXFX-MAIN-CORE-X"; // Simulé: ID de l'appareil

  const handleBiometric = async () => {
    setStatus("BIOMETRIC_CHECK");
    
    // Vérification de la disponibilité de WebAuthn
    if (window.PublicKeyCredential) {
      try {
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (isAvailable) {
          // Simulation de succès
          setStatus("AUTH_SUCCESS");
          setTimeout(() => setIsLocked(false), 800);
        } else {
          throw new Error("Biometrics not supported");
        }
      } catch (error) {
        console.warn("Biometric Error, falling back to PIN:", error);
        setStatus("AWAITING_PIN");
      }
    } else {
      setStatus("AWAITING_PIN");
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === MASTER_PIN) {
      setStatus("AUTH_SUCCESS");
      setTimeout(() => setIsLocked(false), 800);
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setStatus("AUTH_ERROR");
      console.warn(`[SECURITY ALERT] Unauthorized access attempt #${newAttempts}`);
      setTimeout(() => setStatus("AWAITING_PIN"), 1500);
    }
  };

  if (!isLocked) return children;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center font-equinox text-[#888888]">
      <div className="w-full max-w-md p-10 space-y-12 text-center">
        {/* Header Integrity */}
        <div className="space-y-4">
           <div className="flex justify-center">
              <div className="p-4 bg-white/5 border border-white/10">
                 <Shield size={32} className={status === 'AUTH_ERROR' ? 'text-rose-600 animate-pulse' : 'text-premium-cyan'} />
              </div>
           </div>
           <h1 className="text-2xl font-black text-white tracking-[0.3em] uppercase">Security Mainframe</h1>
           <div className="flex items-center justify-center space-x-3 text-[10px] font-black text-white/20 uppercase tracking-widest">
              <Smartphone size={12} />
              <span>Verified Device: {AUTHORIZED_DEVICE}</span>
           </div>
        </div>

        {/* Auth Interface */}
        <div className="min-h-[200px] flex flex-col justify-center">
          {status === 'AWAITING_AUTH' && (
            <div className="space-y-8">
              <button 
                onClick={handleBiometric}
                className="biometric-ring mx-auto group hover:border-premium-cyan transition-all"
              >
                 <Fingerprint size={48} className="text-premium-cyan group-hover:scale-110 transition-transform" />
              </button>
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Scan Fingerprint or FaceID</p>
                 <button 
                   onClick={() => setStatus("AWAITING_PIN")}
                   className="text-[8px] font-black text-white/20 uppercase tracking-widest hover:text-premium-cyan transition-colors"
                 >
                   Use Security PIN Instead
                 </button>
              </div>
            </div>
          )}

          {status === 'BIOMETRIC_CHECK' && (
            <div className="space-y-4">
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-premium-cyan animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-[10px] font-black text-premium-cyan animate-pulse uppercase tracking-[0.3em]">Processing Biometrics...</p>
            </div>
          )}

          {(status === 'AWAITING_PIN' || status === 'AUTH_ERROR') && (
            <form onSubmit={handlePinSubmit} className="space-y-8">
              <div className="space-y-4">
                 <label className="tech-label">Enter Secondary Security PIN</label>
                 <input 
                   type="password"
                   maxLength={4}
                   autoFocus
                   value={pin}
                   onChange={(e) => setPin(e.target.value)}
                   className="w-full bg-[#0A0A0A] border border-[#222222] p-6 text-center text-5xl tracking-[0.5em] text-white font-black focus:outline-none focus:border-premium-cyan transition-all"
                   placeholder="****"
                 />
              </div>
              {status === 'AUTH_ERROR' && (
                <div className="flex items-center justify-center space-x-2 text-rose-600">
                   <AlertTriangle size={14} />
                   <span className="text-[10px] font-black uppercase">Unauthorized Access Detected</span>
                </div>
              )}
              <button type="submit" className="w-full btn-action py-5 flex items-center justify-center space-x-3">
                 <span>Authorize Root</span>
                 <ChevronRight size={16} />
              </button>
            </form>
          )}

          {status === 'AUTH_SUCCESS' && (
            <div className="space-y-4 text-emerald-500">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 inline-block">
                 <Lock size={32} className="rotate-180" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.5em]">Identity Confirmed. Accessing Core.</p>
            </div>
          )}
        </div>

        {/* Footer Intelligence */}
        <div className="pt-10 border-t border-[#222222]">
           <p className="text-[8px] font-black text-[#444444] uppercase tracking-widest">
              Every failed attempt is logged and transmitted to the primary owner node.
           </p>
        </div>
      </div>
    </div>
  );
};

export default SecurityShield;
