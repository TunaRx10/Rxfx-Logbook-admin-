import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Save, ToggleLeft, ToggleRight, RefreshCw, Package,
  Globe, Lock, AlertCircle,
} from "lucide-react";
import { getAllSystemSettings, setSystemSetting } from "../lib/supabase-admin";
import { PageShell, PageHeader, Section } from "../components/ui/PagePrimitives";
import { DataState } from "../components/ui/DataState";

const PRODUCT_KEYS = {
  starter_sandbox: "suby_product_starter_sandbox",
  starter_prod: "suby_product_starter_prod",
  starter_3m_sandbox: "suby_product_starter_3m_sandbox",
  starter_3m_prod: "suby_product_starter_3m_prod",
  pro_max_sandbox: "suby_product_pro_max_sandbox",
  pro_max_prod: "suby_product_pro_max_prod",
  pro_max_3m_sandbox: "suby_product_pro_max_3m_sandbox",
  pro_max_3m_prod: "suby_product_pro_max_3m_prod",
};

const DEFAULT_PRODUCTS = [
  { id: "starter", name: "Pro (Mensuel)", price: "$29.99", frequency: "30 jours" },
  { id: "starter_3m", name: "Pro (Trimestriel)", price: "$83.67", frequency: "90 jours" },
  { id: "pro_max", name: "Elite (Mensuel)", price: "$99.99", frequency: "30 jours" },
  { id: "pro_max_3m", name: "Elite (Trimestriel)", price: "$279.97", frequency: "90 jours" },
];

const SubyProductsPage = () => {
  const [products, setProducts] = useState({});
  const [state, setState] = useState({ kind: "loading" });
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState({ card: false, crypto: true });

  const loadProducts = useCallback(async () => {
    setState({ kind: "loading" });
    const result = await DataState.loadGuard(() => getAllSystemSettings());
    if (result.state === "ok") {
      const config = {};
      Object.values(PRODUCT_KEYS).forEach((key) => {
        if (result.data[key] !== undefined) config[key] = result.data[key];
      });
      setProducts(config);
      const pmValue = result.data["suby_payment_methods"];
      if (pmValue) {
        try {
          setPaymentMethods(typeof pmValue === "string" ? JSON.parse(pmValue) : pmValue);
        } catch {
          setPaymentMethods({ card: false, crypto: true });
        }
      } else {
        setPaymentMethods({ card: false, crypto: true });
      }
      setState({ kind: "ok" });
    } else if (result.state === "supabase-missing") {
      setState({ kind: "supabase-missing" });
    } else {
      setState({ kind: "error", message: result.message });
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const saveProductId = async (productId, env, value) => {
    const key = PRODUCT_KEYS[`${productId}_${env}`];
    if (!key) return;
    try {
      await setSystemSetting(key, value.trim());
      setProducts((prev) => ({ ...prev, [key]: value.trim() }));
      toast.success(`${productId} (${env}) mis à jour`);
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  };

  const savePaymentMethods = async () => {
    try {
      await setSystemSetting("suby_payment_methods", JSON.stringify(paymentMethods));
      toast.success("Moyens de paiement mis à jour");
    } catch (err) {
      toast.error("Erreur: " + err.message);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Suby Payments"
        title="Produits"
        highlight="Suby"
        subtitle="Gérez les identifiants de produits Suby (Sandbox / Production)"
        actions={
          <button
            onClick={loadProducts}
            className="btn-tech hover:border-cyan/40 hover:text-cyan"
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        }
      />

      {/* Payment Methods Toggle — always render so the operator can still
          see the toggle UI even when Supabase is missing. Save is gated on
          the products state to avoid spurious error toasts. */}
      <div className="bento-card mb-10">
        <div className="flex items-center gap-2 mb-6">
          <Globe size={14} className="text-cyan" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25">
            Moyens de paiement
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.14 0.02 255 / 0.3)" }}>
            <div>
              <p className="text-xs font-bold text-white/60">Paiement crypto</p>
              <p className="text-[9px] text-white/20 mt-0.5">USDC, USDT, ETH, SOL...</p>
            </div>
            <span className="badge-status badge-active">Activé</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.14 0.02 255 / 0.3)" }}>
            <div>
              <p className="text-xs font-bold text-white/60">Paiement par carte</p>
              <p className="text-[9px] text-white/20 mt-0.5">Visa, Mastercard, Apple Pay, Google Pay</p>
            </div>
            <button
              onClick={async () => {
                if (state.kind !== "ok") {
                  toast.error("Configurez Supabase d'abord pour activer la carte");
                  return;
                }
                const newVal = !paymentMethods.card;
                setPaymentMethods((prev) => ({ ...prev, card: newVal }));
                setSaving(true);
                await savePaymentMethods();
                setSaving(false);
                toast.success(newVal ? "Cartes activées (si approuvé par Suby)" : "Cartes désactivées");
              }}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                paymentMethods.card
                  ? "bg-emerald/10 border border-emerald/20 text-emerald"
                  : "bg-white/5 border border-white/10 text-white/30"
              }`}
            >
              {paymentMethods.card ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {paymentMethods.card ? "Activé" : "Désactivé"}
              {!paymentMethods.card && (
                <span className="text-[7px] text-amber-400/50 ml-1">(activation future)</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Product IDs — DataState-driven */}
      <Section title="Identifiants de produits" icon={Package}>
        {state.kind === "loading" && (
          <DataState.Loading label="Chargement des produits Suby…" rows={4} />
        )}
        {state.kind === "supabase-missing" && (
          <DataState.SupabaseMissing onGoToSettings={() => (window.location.href = "/settings")} />
        )}
        {state.kind === "error" && (
          <DataState.Error message={state.message} onRetry={loadProducts} />
        )}
        {state.kind === "ok" && (
          <div className="grid grid-cols-1 gap-6">
            {DEFAULT_PRODUCTS.map((prod) => {
              const sandboxKey = PRODUCT_KEYS[`${prod.id}_sandbox`];
              const prodKey = PRODUCT_KEYS[`${prod.id}_prod`];
              return (
                <motion.div
                  key={prod.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border p-6"
                  style={{ borderColor: "oklch(1 0 0 / 7%)", background: "oklch(0.12 0.015 255 / 0.3)" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-cyan/10 border border-cyan/20">
                      <Package size={16} className="text-cyan" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{prod.name}</p>
                      <p className="text-[10px] text-white/30 font-mono">{prod.price} · {prod.frequency}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border" style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.14 0.02 255 / 0.3)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Lock size={10} className="text-amber-400/50" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/50">
                          Product ID Sandbox
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={products[sandboxKey] || ""}
                          onChange={(e) => setProducts((prev) => ({ ...prev, [sandboxKey]: e.target.value }))}
                          placeholder="prod_sandbox_xxx"
                          className="input-tech flex-1 font-mono text-[11px]"
                        />
                        <button
                          onClick={() => saveProductId(prod.id, "sandbox", products[sandboxKey] || "")}
                          className="btn-tech text-[9px] px-3 py-2"
                        >
                          <Save size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border" style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(0.14 0.02 255 / 0.3)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={10} className="text-emerald/50" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald/50">
                          Product ID Production
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={products[prodKey] || ""}
                          onChange={(e) => setProducts((prev) => ({ ...prev, [prodKey]: e.target.value }))}
                          placeholder="prod_live_xxx"
                          className="input-tech flex-1 font-mono text-[11px]"
                        />
                        <button
                          onClick={() => saveProductId(prod.id, "prod", products[prodKey] || "")}
                          className="btn-tech text-[9px] px-3 py-2"
                        >
                          <Save size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Info footer */}
      <div className="mt-8 p-4 rounded-xl border flex items-start gap-3" style={{ borderColor: "oklch(1 0 0 / 5%)", background: "oklch(0.1 0.01 255 / 0.2)" }}>
        <AlertCircle size={14} className="text-cyan/50 mt-0.5 shrink-0" />
        <p className="text-[9px] font-mono text-white/30 leading-relaxed">
          Les Product IDs sont stockés dans <code>system_config</code>. Le système sélectionne automatiquement
          l'ID Sandbox ou Production selon la variable <code>SUBY_ENVIRONMENT</code>. Aucune modification de code
          nécessaire pour ajouter un nouveau produit — créez-le dans Suby puis ajoutez son ID ici.
        </p>
      </div>
    </PageShell>
  );
};

export default SubyProductsPage;