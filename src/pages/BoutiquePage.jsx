import { useState, useEffect, useCallback } from "react";
// Google Sheets as primary storage (shop_products + shop_orders tables).
// Payment-link creation via Suby.fi.
import { createSubyPaymentLink, isSubyConfigured } from "../lib/suby-admin";
import { listTable, insertRow, updateRow, deleteRow } from "../lib/data-admin";
import { generateProduct, isChatReady } from "../lib/admin-ai";
import { 
  ShoppingBag, Plus, Search, Filter, 
  Image as ImageIcon, Video, Tag, 
  Package, DollarSign, Percent, 
  Trash2, Edit3, Eye, Download,
  RefreshCw, CheckCircle2, AlertTriangle,
  ArrowUpRight, Truck, Undo2, MessageCircle,
  X, MapPin, ExternalLink, Sparkles, Send, Clock,
  Link as LinkIcon, CreditCard, Globe,
  FileText, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLang } from "../context/LangContext";

const POLL_INTERVAL = 15000; // 15s refresh

const BoutiquePage = () => {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Creation Form State
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    type: "product", // "product" or "design"
    price: "",
    status: "active",
    image: "",
    category: "apparel",
    colors: ["#000000", "#FFFFFF"],
    sizes: ["S", "M", "L", "XL"],
    delivery_days: 14,
    material: "100% Coton Premium"
  });

  const [newMockupUrl, setNewMockupUrl] = useState("");
  const [unitPriceInput, setUnitPrice] = useState("");
  const [trackingInput, setTracking] = useState("");

  // Payment link state
  const [paymentLinks, setPaymentLinks] = useState({});
  const [customPrices, setCustomPrices] = useState({});
  const [generatingLink, setGeneratingLink] = useState(null);
  const [showPaymentLinks, setShowPaymentLinks] = useState(false);
  const [paymentLinksData, setPaymentLinksData] = useState({});
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [products, orders] = await Promise.all([
        listTable("shop_products", 100),
        listTable("shop_orders", 50),
      ]);
      // Normalize Sheets columns → UI fields
      const normalized = (Array.isArray(products) ? products : []).map((p) => ({
        ...p,
        price: p.price_suby || 0,
        image: p.image_url || "",
        type: p.metadata?.type || (p.price_suby > 0 ? "product" : "design"),
        material: p.metadata?.material || "",
        delivery_days: p.metadata?.delivery_days || 14,
        colors: p.metadata?.colors || ["#000000", "#FFFFFF"],
        sizes: p.metadata?.sizes || ["S","M","L","XL"],
      }));
      setInventory(normalized);
      setOrders(Array.isArray(orders) ? orders : []);
    } catch (e) {
      console.error("[boutique] fetch failed:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(iv);
  }, [fetchData]);

  const [editingItem, setEditingItem] = useState(null);

  async function updateItem() {
    if (!editingItem?.name) return;
    try {
      const { id, ...data } = editingItem;
      await updateRow("shop_products", "id", id, {
        ...data,
        price_suby: data.type === 'product' ? Number(data.price) : 0,
      });
      setEditingItem(null);
      fetchData();
      toast.success(t("boutique_deploy") || "Article mis à jour");
    } catch (e) {
      console.error(e);
      toast.error("Erreur mise à jour");
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error("Décris le produit à générer."); return; }
    setAiGenerating(true);
    try {
      const data = await generateProduct(aiPrompt);
      setNewItem((p) => ({
        ...p,
        name: data.name || "",
        description: data.description || "",
        price: data.price ? String(data.price) : "",
        type: "product",
        category: data.category || "apparel",
      }));
      toast.success("Produit généré par IA !");
      setAiPrompt("");
    } catch (err) {
      toast.error(err.message || "Erreur IA");
    } finally {
      setAiGenerating(false);
    }
  };

  async function createItem() {
    if (!newItem.name) return;
    try {
      await insertRow("shop_products", {
        name: newItem.name,
        description: newItem.description,
        price_suby: newItem.type === 'product' ? Number(newItem.price) : 0,
        category: 'merch',
        image_url: newItem.image || null,
        is_active: newItem.status === 'active',
        metadata: { colors: newItem.colors, sizes: newItem.sizes, delivery_days: newItem.delivery_days, material: newItem.material, type: newItem.type }
      });
      setShowCreateModal(false);
      setNewItem({ 
        name: "", description: "", type: "product", price: "", status: "active", image: "", category: "apparel",
        colors: ["#000000", "#FFFFFF"], sizes: ["S", "M", "L", "XL"], delivery_days: 14, material: "100% Coton Premium"
      });
      fetchData();
      toast.success(t("boutique_deploy") || "Article créé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur création");
    }
  }

  async function deleteItem(id) {
    if (!window.confirm(t("boutique_delete_item") || "Supprimer cet article ?")) return;
    try {
      await deleteRow("shop_products", "id", id);
      fetchData();
    } catch (e) { console.error(e); }
  }

  async function updateStatus(id, status, extra = {}) {
    try {
      await updateRow("shop_orders", "id", id, { status, ...extra });
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la mise à jour");
    }
  }

  async function sendPricing(id) {
    if (!unitPriceInput) return;
    await updateStatus(id, "pricing_sent", {
      unit_price: Number(unitPriceInput),
      total_price: Number(unitPriceInput)
    });
    setUnitPrice("");
  }

  async function addMockup(id) {
    if (!newMockupUrl) return;
    const order = orders.find(o => o.id === id);
    const mockups = order?.mockups || [];
    if (mockups.length >= 7) {
      toast.error("Maximum 7 maquettes autorisées.");
      return;
    }
    const updated = [...mockups, { id: Date.now().toString(), url: newMockupUrl, selected: false }];
    await updateStatus(id, "mockups_sent", { mockups: updated });
    setNewMockupUrl("");
  }

async function deleteOrder(id) {
  if (!window.confirm(t("boutique_delete_order") || "Supprimer cette commande ?")) return;
  await deleteRow("shop_orders", "id", id);
  setSelectedOrder(null);
  fetchData();
}

/**
 * Create a Suby payment link for a boutique product and persist it to Firestore.
 * Shared by the create & refresh flows so the two call sites stay in lock-step.
 */
async function postSubyPaymentLink(item, finalPrice, overridePrice) {
  try {
    const result = await createSubyPaymentLink({
      amount: finalPrice,
      currency: "USD",
      title: `${item.name} - RxFx Market`,
      description: item.description || `${item.name} - Achat unique`,
      maxUses: 0,
      metadata: {
        inventory_id: item.id,
        original_price: Number(item.price),
        override_price: overridePrice !== undefined ? Number(overridePrice) : null,
      },
    });
    const url = result?.paymentUrl || result?.url;
    const linkId = result?.linkId || result?.id;
    if (!url) {
      toast.error("Suby n'a pas retourné d'URL de paiement");
      return;
    }
    setPaymentLinks((prev) => ({ ...prev, [item.id]: url }));
    await updateRow("shop_products", "id", item.id, {
      metadata: { ...(item.metadata || {}), payment_link: url, payment_link_plid: linkId || null, payment_link_amount: finalPrice }
    });
    toast.success(
      `${t("boutique_link_created") || "Lien"} pour ${item.name} à $${finalPrice.toFixed(2)}!`,
    );
  } catch (err) {
    console.error("Suby payment link error:", err);
    toast.error("Suby: " + (err.message || "Erreur lien de paiement"));
  }
}

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 sm:p-6 lg:p-12 space-y-8 sm:space-y-12 text-white font-sans"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between pb-8 md:pb-12 gap-6" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
        <div className="space-y-3 sm:space-y-4">
           <div className="flex items-center space-x-2 text-cyan font-equinox">
              <ShoppingBag size={14} />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em]">{t("boutique_sub") || t("boutique_subtitle")}</span>
           </div>
           <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter uppercase font-equinox break-words">{t("boutique_title")}</h2>
        </div>             {/* ── Tab switcher — scrollable on mobile ── */}
        <div className="w-full md:w-auto overflow-x-auto scrollbar-none -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex items-center space-x-1 sm:space-x-2 rounded-xl p-1 min-w-max" style={{ background: "oklch(0.11 0.025 255 / 0.5)", border: "1px solid oklch(1 0 0 / 7%)" }}>
             <button 
              onClick={fetchData}
               className="px-3 sm:px-4 py-2.5 sm:py-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-cyan hover:text-white border-r border-white/5 flex items-center gap-1.5 shrink-0"
             >
               <RefreshCw size={12} /> Rafraîchir
             </button>
             <button
               onClick={() => setActiveTab("inventory")}
               className={`px-4 sm:px-8 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shrink-0 rounded-lg ${
                 activeTab === 'inventory' ? 'bg-cyan text-black' : 'text-white/30 hover:text-white'
               }`}
             >
               {t("boutique_tab_marketplace") || t("boutique_inventory_tab")}
             </button>
             <button
               onClick={() => setActiveTab("orders")}
               className={`px-4 sm:px-8 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shrink-0 rounded-lg ${
                 activeTab === 'orders' ? 'bg-cyan text-black' : 'text-white/30 hover:text-white'
               }`}
             >
               {t("boutique_tab_orders") || t("boutique_orders_tab")}
             </button>
             <button 
               onClick={() => setShowPaymentLinks(v => !v)}
               className={`px-4 sm:px-8 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shrink-0 rounded-lg flex items-center gap-1.5 ${
                 showPaymentLinks ? 'bg-emerald text-black' : 'text-white/30 hover:text-white'
               }`}
             >
               <CreditCard size={12} className="hidden sm:inline" />
               {t("boutique_payment_links_tab")}
             </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
         ORDERS TAB
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'orders' ? (
        <div className="space-y-6 sm:space-y-8">
           {/* ── Stats cards ── */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {[
                { label: t("boutique_stat_new_requests"), val: orders.filter(o => o.status === 'pending_verification').length, color: "text-cyan" },
                { label: t("boutique_stat_design_phase"), val: orders.filter(o => ['pricing_sent', 'paid', 'mockups_sent'].includes(o.status)).length, color: "text-amber-500" },
                { label: t("boutique_stat_awaiting_shipping"), val: orders.filter(o => o.status === 'finalized').length, color: "text-blue-500" },
                { label: t("boutique_stat_revenue"), val: `$${orders.reduce((a, b) => a + (b.total_price || 0), 0)}`, color: "text-emerald" },
              ].map((s, i) => (
                <div key={i} className="bento-card p-4 sm:p-6">
                   <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/25 mb-1.5 sm:mb-2">{s.label}</p>
                   <p className={"text-xl sm:text-2xl md:text-3xl font-black tracking-tighter " + s.color}>{s.val}</p>
                </div>
              ))}
           </div>

           {/* ── Orders table — horizontally scrollable on mobile ── */}
           <div className="overflow-x-auto rounded-2xl" style={{ background: "oklch(0.13 0.02 255 / 0.4)", border: "1px solid oklch(1 0 0 / 7%)" }}>
             <div className="min-w-[640px]">
              <table className="table-tech w-full">
                 <thead>
                    <tr>
                       <th className="text-[9px] sm:text-[10px]">{t("boutique_orders_ref")}</th>
                       <th className="text-[9px] sm:text-[10px]">{t("boutique_orders_config")}</th>
                       <th className="text-[9px] sm:text-[10px]">{t("boutique_orders_status")}</th>
                       <th className="text-right text-[9px] sm:text-[10px]">{t("boutique_orders_value")}</th>
                       <th className="text-right text-[9px] sm:text-[10px]">{t("boutique_orders_terminal")}</th>
                    </tr>
                 </thead>
                 <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-white/15 uppercase tracking-widest italic text-[10px] sm:text-xs py-12">{t("boutique_no_orders")}</td>
                      </tr>
                    ) : orders.map((o) => (
                       <tr key={o.id} className="cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setSelectedOrder(o)}>
                          <td>
                             <div className="flex items-center gap-2 sm:gap-4">
                                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/5 border border-white/10 rounded flex items-center justify-center shrink-0">
                                   <ImageIcon size={14} className="text-white/15" />
                                </div>
                                <div className="min-w-0">
                                   <p className="text-white text-[10px] sm:text-xs font-bold font-mono tracking-tighter truncate">{o.id?.slice(0,8) || '???'}</p>
                                   <p className="text-[8px] sm:text-[10px] text-white/30 uppercase font-black truncate">{o.user || 'Unknown'}</p>
                                </div>
                             </div>
                          </td>
                          <td>
                             <div className="flex flex-col gap-0.5 sm:gap-1">
                                <p className="text-[9px] sm:text-[10px] text-white font-black uppercase tracking-tighter truncate max-w-[120px] sm:max-w-none">{o.product_name || 'POD Item'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
                                   <span className="text-[7px] sm:text-[8px] text-white/20 uppercase">{o.size} | {o.color}</span>
                                   {o.media?.length > 0 && <span className="p-0.5 bg-amber-500/10 text-amber-500 rounded" title="Media attached"><ImageIcon size={7} /></span>}
                                   {o.design_notes && <span className="p-0.5 bg-cyan/10 text-cyan rounded" title="Design notes present"><FileText size={7} /></span>}
                                </div>
                             </div>
                          </td>
                          <td>
                             <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className={`h-1.5 w-1.5 rounded-full animate-pulse shrink-0 ${
                                   o.status === 'pending_verification' ? "bg-cyan" : 
                                   o.status === 'mockups_sent' ? "bg-amber-500" : "bg-emerald"
                                }`} />
                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/60 whitespace-nowrap">{(o.status || 'pending').replace('_', ' ')}</span>
                             </div>
                          </td>
                          <td className="text-right text-xs sm:text-sm font-black text-white font-mono">${(o.total_price || 0).toFixed(2)}</td>
                          <td className="text-right">
                             <button className="p-1.5 sm:p-2 text-cyan hover:bg-cyan/10 rounded transition-all"><ArrowUpRight size={14} /></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
             </div>
           </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════
           INVENTORY TAB
           ═══════════════════════════════════════════════════════════ */
        <div className="space-y-8 sm:space-y-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tighter">{t("boutique_inventory_title")}</h3>
                <p className="text-[9px] sm:text-[10px] text-white/25 uppercase font-bold tracking-widest">{t("boutique_inventory_subtitle")}</p>
             </div>
             <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-tech btn-tech-primary w-full sm:w-auto justify-center text-[9px] sm:text-[10px]"
             >
                <Plus size={16} /> {t("boutique_new_asset")}
             </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
             {inventory.map((item) => (
                <div key={item.id} className="bento-card group relative overflow-hidden !p-0">
                   <div className="aspect-square overflow-hidden relative" style={{ background: "oklch(0.06 0.015 255)" }}>
                      {(item.image_url || item.image) ? (
                         <img src={item.image_url || item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-white/15"><ImageIcon size={32} /></div>
                      )}
                      <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                         <span className={`text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${item.type === 'product' ? 'bg-emerald/20 text-emerald' : 'bg-amber-500/20 text-amber-500'}`}>
                            {item.type}
                         </span>
                      </div>
                      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="p-1.5 sm:p-2 bg-black/60 text-cyan hover:text-cyan rounded"><Edit3 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="p-1.5 sm:p-2 bg-black/60 text-red-900 hover:text-red-500 rounded"><Trash2 size={12} /></button>
                      </div>
                   </div>
                   <div className="p-3 sm:p-6 space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-start gap-2">
                         <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-tight truncate">{item.name}</h4>
                         {item.type === 'product' && <span className="text-[10px] sm:text-xs font-black font-mono text-emerald shrink-0">${item.price_suby || item.price || 0}</span>}
                      </div>
                      <p className="text-[8px] sm:text-[10px] text-white/25 uppercase tracking-widest truncate">{item.status}</p>
                   </div>
                </div>
             ))}
             {inventory.length === 0 && (
                <div className="col-span-full py-16 sm:py-20 text-center rounded-xl text-[9px] sm:text-[10px] text-white/15 uppercase font-black tracking-widest" style={{ border: "1px dashed oklch(1 0 0 / 7%)" }}>
                   {t("boutique_no_inventory")}
                </div>
             )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         PAYMENT LINKS SECTION
         ═══════════════════════════════════════════════════════════ */}
      {showPaymentLinks && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bento-card !p-4 sm:!p-6 lg:!p-8" style={{ borderColor: "oklch(0.87 0.27 142 / 20%)" }}>
            <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-emerald flex items-center space-x-2 mb-4 sm:mb-6">
              <CreditCard size={14} />
              <span>{t("boutique_payment_title")}</span>
            </h3>
              <p className="text-[8px] sm:text-[9px] text-white/25 mb-4 sm:mb-6 leading-relaxed">
              {t("boutique_payment_desc")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {inventory.filter(i => i.type === 'product' && (i.price_suby || i.price) > 0).map(item => {
                const overridePrice = customPrices[item.id];
                const originalPrice = Number(item.price_suby || item.price || 0);
                const finalPrice = overridePrice !== undefined ? Number(overridePrice) : originalPrice;
                const priceDiff = Math.abs(finalPrice - originalPrice);
                const exceedsLimit = overridePrice !== undefined && priceDiff > 3;

                return (
                <div key={item.id} className="p-3 sm:p-4 space-y-3 group rounded-xl" style={{ background: "oklch(0.09 0.025 255 / 0.6)", border: "1px solid oklch(1 0 0 / 7%)" }}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[8px] sm:text-[10px] text-white/20 font-mono">
                        {t("boutique_original_price")}: ${item.price} USD
                        {overridePrice !== undefined && !exceedsLimit && (
                          <span className="text-amber-500 ml-1">→ ${Number(overridePrice).toFixed(2)}</span>
                        )}
                      </p>
                    </div>
                    {paymentLinks[item.id] ? (
                      <span className="text-[7px] sm:text-[8px] bg-emerald/10 text-emerald border border-emerald/20 px-1.5 sm:px-2 py-0.5 uppercase font-black shrink-0">{t("boutique_link_created")}</span>
                    ) : null}
                  </div>

                  {/* Price override input */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-[7px] sm:text-[8px] text-white/20 uppercase font-bold">{t("boutique_price_override")}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={customPrices[item.id] !== undefined ? customPrices[item.id] : item.price}
                      onChange={e => setCustomPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={String(item.price)}
                      className={`input-tech w-20 sm:w-24 p-1.5 text-[9px] sm:text-[10px] text-center font-mono ${exceedsLimit ? '!border-rose' : ''}`}
                    />
                    {exceedsLimit && (
                      <span className="text-[7px] sm:text-[8px] text-rose font-bold uppercase">
                        ±$3 max (écart: ${priceDiff.toFixed(2)})
                      </span>
                    )}
                  </div>

                  {paymentLinks[item.id] ? (
                    <div className="space-y-2">
                      <input
                        readOnly
                        value={paymentLinks[item.id]}
                        className="input-tech p-1.5 sm:p-2 text-[7px] sm:text-[8px] font-mono text-cyan truncate"
                        onClick={e => { e.target.select(); navigator.clipboard.writeText(e.target.value); }}
                      />
                      <div className="flex gap-2">
                        <a href={paymentLinks[item.id]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[8px] sm:text-[9px] text-cyan hover:underline flex-1 truncate">
                          <ExternalLink size={10} /> {t("boutique_see_link")}
                        </a>
                        <button
                          onClick={async () => {
                            setGeneratingLink(item.id);
                            try {
                              if (exceedsLimit) {
                                toast.error(`Écart de $${priceDiff.toFixed(2)} > $3 max. Annulé.`);
                                return;
                              }
                              await postSubyPaymentLink(item, finalPrice, overridePrice);
                            } catch (err) {
                              toast.error("Erreur: " + err.message);
                            } finally {
                              setGeneratingLink(null);
                            }
                          }}
                          disabled={!isSubyConfigured() || generatingLink === item.id}
                          className="px-2 py-1 rounded text-[7px] sm:text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-pointer hover:opacity-80 transition-all disabled:opacity-50"
                          title={isSubyConfigured() ? t("boutique_refresh_link") : "BFF Suby HTTPS requis"}
                        >
                          {generatingLink === item.id ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setGeneratingLink(item.id);
                        try {
                          if (exceedsLimit) {
                            toast.error(`Écart de $${priceDiff.toFixed(2)} > $3 max. Annulé.`);
                            return;
                          }
                          await postSubyPaymentLink(item, finalPrice, overridePrice);
                        } catch (err) {
                          toast.error("Erreur: " + err.message);
                        } finally {
                          setGeneratingLink(null);
                        }
                      }}
                      disabled={!isSubyConfigured() || generatingLink === item.id}
                      className="btn-tech btn-tech-primary w-full justify-center text-[8px] sm:text-[9px] disabled:opacity-50"
                    >
                      {generatingLink === item.id ? <RefreshCw size={12} className="animate-spin" /> : <LinkIcon size={12} />}
                      {isSubyConfigured() ? t("boutique_generate_link") : "BFF Suby requis"}
                    </button>
                  )}
                </div>
                );
              })}
              {inventory.filter(i => i.type === 'product' && i.price > 0).length === 0 && (
                <div className="col-span-full py-10 sm:py-12 text-center text-[9px] sm:text-[10px] text-white/15 uppercase font-black tracking-widest">
                  {t("boutique_no_price_products")}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         CREATE MODAL — fullscreen on mobile
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] sm:rounded-2xl p-5 sm:p-8 lg:p-10 space-y-8 overflow-y-auto max-w-2xl"
              style={{ background: "oklch(0.13 0.02 255)", border: "1px solid oklch(1 0 0 / 7%)" }}
            >
              <div className="flex justify-between items-start">
                 <div>
                    <span className="text-[7px] sm:text-[8px] font-black uppercase text-cyan tracking-[0.2em] sm:tracking-[0.3em]">{t("boutique_modal_create_label")}</span>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter mt-2">{t("boutique_modal_create_title")}</h3>
                 </div>
                 <button onClick={() => setShowCreateModal(false)} className="p-2 text-white/25 hover:text-white shrink-0"><X size={20} /></button>
              </div>

              {/* AI Generator */}
              {isChatReady() && (
                <div className="flex items-center gap-2 p-4 rounded-xl border border-cyan/10 bg-cyan/[0.02]">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Décris le produit (ex: formation scalping forex pour débutants)..."
                    className="flex-1 bg-black/60 border border-white/10 px-4 py-2.5 text-xs focus:border-cyan outline-none placeholder:text-white/15"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAIGenerate(); }}
                  />
                  <button
                    onClick={handleAIGenerate}
                    disabled={aiGenerating || !aiPrompt.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan/10 border border-cyan/30 text-cyan text-[10px] font-black uppercase tracking-widest hover:bg-cyan/20 transition-all disabled:opacity-30 shrink-0"
                  >
                    {aiGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {aiGenerating ? "Génération..." : "IA Générer"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                 <div className="space-y-5 sm:space-y-6">
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Asset Name</label>
                       <input 
                          value={newItem.name}
                          onChange={e => setNewItem({...newItem, name: e.target.value})}
                          placeholder="e.g. RxFx Pro Hoodie" 
                          className="input-tech text-xs sm:text-sm" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/20 tracking-widest italic">Description</label>
                       <textarea 
                          value={newItem.description}
                          onChange={e => setNewItem({...newItem, description: e.target.value})}
                          rows={3}
                          placeholder="Technical specs..." 
                          className="input-tech text-xs sm:text-sm" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Material / Fabric</label>
                       <input 
                          value={newItem.material}
                          onChange={e => setNewItem({...newItem, material: e.target.value})}
                          placeholder="e.g. 100% Coton Premium" 
                          className="input-tech text-xs sm:text-sm" 
                       />
                    </div>
                 </div>

                 <div className="space-y-5 sm:space-y-6">
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Asset Type</label>
                       <div className="flex gap-2 p-1 rounded-xl" style={{ background: "oklch(0.11 0.025 255 / 0.5)", border: "1px solid oklch(1 0 0 / 7%)" }}>
                          <button 
                             onClick={() => setNewItem({...newItem, type: 'product'})}
                             className={`badge-status cursor-pointer flex-1 justify-center transition-all text-[9px] sm:text-[10px] ${newItem.type === 'product' ? 'badge-active' : 'text-white/20'}`}
                          >Product</button>
                          <button 
                             onClick={() => setNewItem({...newItem, type: 'design'})}
                             className={`badge-status cursor-pointer flex-1 justify-center transition-all text-[9px] sm:text-[10px] ${newItem.type === 'design' ? 'badge-warn' : 'text-white/20'}`}
                          >Design</button>
                       </div>
                    </div>

                    {newItem.type === 'product' && (
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Price (USD)</label>
                             <input 
                                type="number"
                                value={newItem.price}
                                onChange={e => setNewItem({...newItem, price: e.target.value})}
                                placeholder="0.00" 
                                className="input-tech font-mono text-xs sm:text-sm" 
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Delivery (Days)</label>
                             <input 
                                type="number"
                                value={newItem.delivery_days}
                                onChange={e => setNewItem({...newItem, delivery_days: e.target.value})}
                                placeholder="14" 
                                className="input-tech font-mono text-xs sm:text-sm" 
                             />
                          </div>
                       </div>
                    )}

                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Status</label>
                       <select 
                          value={newItem.status}
                          onChange={e => setNewItem({...newItem, status: e.target.value})}
                          className="input-tech cursor-pointer text-[9px] sm:text-[10px] font-black uppercase"
                       >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="out_of_stock">Out of Stock</option>
                       </select>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                 <div className="space-y-2">
                    <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Colors</label>
                    <input 
                       value={newItem.colors.join(", ")}
                       onChange={e => setNewItem({...newItem, colors: e.target.value.split(",").map(s => s.trim())})}
                       placeholder="#000000, #FFFFFF" 
                       className="input-tech font-mono text-xs sm:text-sm" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Sizes</label>
                    <input 
                       value={newItem.sizes.join(", ")}
                       onChange={e => setNewItem({...newItem, sizes: e.target.value.split(",").map(s => s.trim())})}
                       placeholder="S, M, L, XL" 
                       className="input-tech font-mono text-xs sm:text-sm" 
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Image URL (CDN preferred)</label>
                 <input 
                    value={newItem.image}
                    onChange={e => setNewItem({...newItem, image: e.target.value})}
                    placeholder="https://..." 
                    className="input-tech text-xs sm:text-sm" 
                 />
              </div>

              <button 
                 onClick={createItem}
                 className="btn-tech btn-tech-primary w-full justify-center text-[10px] sm:text-xs py-3 sm:py-4"
              >{t("boutique_deploy")}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
         EDIT MODAL — fullscreen on mobile
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] sm:rounded-2xl p-5 sm:p-8 lg:p-10 space-y-8 overflow-y-auto max-w-2xl"
              style={{ background: "oklch(0.13 0.02 255)", border: "1px solid oklch(1 0 0 / 7%)" }}
            >
              <div className="flex justify-between items-start">
                 <div>
                    <span className="text-[7px] sm:text-[8px] font-black uppercase text-cyan tracking-[0.2em] sm:tracking-[0.3em]">{t("boutique_modal_edit_label")}</span>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter mt-2">{t("boutique_modal_edit_title")}</h3>
                 </div>
                 <button onClick={() => setEditingItem(null)} className="p-2 text-white/25 hover:text-white shrink-0"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                 <div className="space-y-5 sm:space-y-6">
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Asset Name</label>
                       <input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="input-tech text-xs sm:text-sm" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/20 tracking-widest italic">Description</label>
                       <textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} rows={3} className="input-tech text-xs sm:text-sm" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Material</label>
                       <input value={editingItem.material} onChange={e => setEditingItem({...editingItem, material: e.target.value})} className="input-tech text-xs sm:text-sm" />
                    </div>
                 </div>

                 <div className="space-y-5 sm:space-y-6">
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Price (USD)</label>
                       <input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} className="input-tech font-mono text-xs sm:text-sm" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Delivery (Days)</label>
                       <input type="number" value={editingItem.delivery_days} onChange={e => setEditingItem({...editingItem, delivery_days: e.target.value})} className="input-tech font-mono text-xs sm:text-sm" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Status</label>
                       <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="input-tech cursor-pointer text-[9px] sm:text-[10px] font-black uppercase">
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="out_of_stock">Out of Stock</option>
                       </select>
                    </div>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[7px] sm:text-[8px] font-black uppercase text-white/25 tracking-widest italic">Image URL</label>
                 <input value={editingItem.image} onChange={e => setEditingItem({...editingItem, image: e.target.value})} className="input-tech text-xs sm:text-sm" />
              </div>

              <button onClick={updateItem} className="btn-tech btn-tech-primary w-full justify-center text-[10px] sm:text-xs py-3 sm:py-4">{t("boutique_commit")}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
         ORDER DETAIL MODAL — fullscreen on mobile
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setSelectedOrder(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-md"
             />
             <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 20, opacity: 0 }}
               className="relative w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-5xl sm:rounded-2xl overflow-hidden shadow-2xl"
               style={{ background: "oklch(0.13 0.02 255 / 0.98)", border: "1px solid oklch(1 0 0 / 10%)" }}
             >
                <div className="flex flex-col md:flex-row h-full">
                   {/* ── Order sidebar ── */}
                   <div className="w-full md:w-72 lg:w-80 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto shrink-0" 
                        style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.11 0.025 255 / 0.3)" }}
                   >
                      <div className="flex items-center justify-between md:hidden mb-2">
                        <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-1 text-[9px] text-cyan uppercase tracking-widest font-black">
                          <ChevronLeft size={14} /> Back
                        </button>
                        <button onClick={() => setSelectedOrder(null)} className="p-1 text-white/25"><X size={16} /></button>
                      </div>
                      <div className="space-y-4">
                         <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/25">{t("boutique_client_media")}</h4>
                         <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
                            {(selectedOrder.media?.length > 0 ? selectedOrder.media : []).map((m, i) => (
                               <a key={i} href={m} target="_blank" rel="noreferrer" className="aspect-square bg-black border border-white/5 rounded overflow-hidden group relative">
                                  <img src={m} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all" />
                                  <ExternalLink size={10} className="absolute top-1 right-1 text-white opacity-0 group-hover:opacity-100" />
                               </a>
                            ))}
                            {(!selectedOrder.media || selectedOrder.media.length === 0) && (
                              <div className="col-span-full text-[8px] text-white/20 italic">{t("boutique_no_media")}</div>
                            )}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/25">{t("boutique_instructions")}</h4>
                         <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed italic pl-3 sm:pl-4" style={{ borderLeft: "2px solid oklch(0.74 0.13 209)" }}>"{selectedOrder.custom_text || t("boutique_no_notes")}"</p>
                      </div>
                      <div className="space-y-2">
                         <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/25">{t("boutique_design_notes")}</h4>
                         <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed italic pl-3 sm:pl-4" style={{ borderLeft: "2px solid oklch(0.74 0.13 209)" }}>"{selectedOrder.design_notes || t("boutique_no_notes")}"</p>
                      </div>
                      <div className="space-y-3">
                         <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/25">{t("boutique_specifications")}</h4>
                         <div className="grid grid-cols-3 gap-2">
                            <div className="bg-black/40 p-2 border border-white/5 rounded">
                               <p className="text-[6px] sm:text-[7px] text-white/20 uppercase font-bold">Size</p>
                               <p className="text-[9px] sm:text-[10px] font-black">{selectedOrder.size || 'L'}</p>
                            </div>
                            <div className="bg-black/40 p-2 border border-white/5 rounded">
                               <p className="text-[6px] sm:text-[7px] text-white/20 uppercase font-bold">Qty</p>
                               <p className="text-[9px] sm:text-[10px] font-black">{selectedOrder.quantity || 1}</p>
                            </div>
                            <div className="bg-black/40 p-2 border border-white/5 rounded">
                               <p className="text-[6px] sm:text-[7px] text-white/20 uppercase font-bold">Color</p>
                               <div className="h-2 w-full rounded-full border border-white/10 mt-1" style={{ backgroundColor: selectedOrder.color || '#000' }} />
                            </div>
                         </div>
                      </div>
                      <div className="space-y-3">
                         <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/25">{t("boutique_logistics")}</h4>
                         <div className="flex gap-2 text-white/40">
                            <MapPin size={14} className="shrink-0" />
                            <p className="text-[9px] sm:text-[10px] leading-tight uppercase font-medium break-words">{selectedOrder.address || t("boutique_no_address")}</p>
                         </div>
                      </div>
                      <div className="pt-4 sm:pt-8">
                        <button 
                          onClick={() => deleteOrder(selectedOrder.id)}
                          className="flex items-center gap-2 text-red-900 hover:text-red-500 transition-colors text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
                        >
                          <Trash2 size={14} /> {t("boutique_delete_order")}
                        </button>
                      </div>
                   </div>

                   {/* ── Terminal Area ── */}
                   <div className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col space-y-6 sm:space-y-10 overflow-y-auto">
                      <div className="flex justify-between items-start">
                         <div className="min-w-0">
                            <span className="px-2 py-0.5 text-[7px] sm:text-[8px] font-black uppercase bg-cyan/10 text-cyan border border-cyan/20 mb-2 inline-block">Order Terminal v1.0</span>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter break-words">{selectedOrder.product_name}</h3>
                            <p className="text-[9px] sm:text-[10px] text-white/30 font-mono mt-1 truncate">ID: {selectedOrder.id?.slice(0,12)} • {selectedOrder.user_email}</p>
                         </div>
                         <button onClick={() => setSelectedOrder(null)} className="p-1.5 sm:p-2 text-white/25 hover:text-white shrink-0 hidden md:block"><X size={20} /></button>
                      </div>

                      {/* Logic Controls */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                         {/* Phase 1: Verification & Pricing */}
                         <div className="bento-card space-y-4 sm:space-y-6">
                            <h5 className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-cyan flex items-center gap-2">
                               <DollarSign size={10} /> Billing Control
                            </h5>
                            <div className="space-y-3 sm:space-y-4">
                               <div className="flex gap-2">
                                  <input 
                                     value={unitPriceInput}
                                     onChange={(e) => setUnitPrice(e.target.value)}
                                     placeholder="Unit Price (USD)" 
                                     className="input-tech flex-1 text-[10px] sm:text-xs font-mono" 
                                  />
                                  <button 
                                     onClick={() => sendPricing(selectedOrder.id)}
                                     className="btn-tech btn-tech-primary text-[8px] sm:text-[9px] whitespace-nowrap"
                                  >{t("boutique_devis")}</button>
                               </div>
                               <div className="flex justify-between text-[9px] sm:text-[10px] border-t border-white/5 pt-3 sm:pt-4">
                                  <span className="text-white/25">Current Unit:</span>
                                  <span className="text-white font-mono">${selectedOrder.unit_price || selectedOrder.unit_price_est || 0}.00</span>
                               </div>
                            </div>
                         </div>

                         {/* Phase 2: Design Deployment */}
                         <div className="bento-card space-y-4 sm:space-y-6">
                            <h5 className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                               <Sparkles size={10} /> Design Deployment ({selectedOrder.mockups?.length || 0}/7)
                            </h5>
                            <div className="space-y-3 sm:space-y-4">
                               <div className="flex gap-2">
                                  <input 
                                     value={newMockupUrl}
                                     onChange={(e) => setNewMockupUrl(e.target.value)}
                                     placeholder="Mockup URL (CDN)" 
                                     className="input-tech flex-1 text-[10px] sm:text-xs font-mono focus:!border-amber-500" 
                                  />
                                  <button 
                                     onClick={() => addMockup(selectedOrder.id)}
                                     className="btn-tech btn-tech-primary text-[8px] sm:text-[9px] !bg-amber-500 !border-amber-500 hover:!opacity-90 whitespace-nowrap"
                                  >{t("boutique_push_mockup")}</button>
                               </div>
                               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                  {(selectedOrder.mockups || []).map((m) => (
                                     <div key={m.id} className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded border relative ${m.selected ? "border-emerald" : "border-white/5"}`}>
                                        <img src={m.url} alt="" className="h-full w-full object-cover rounded" />
                                        {m.selected && <div className="absolute inset-0 bg-emerald/20 flex items-center justify-center rounded"><CheckCircle2 size={10} className="text-emerald" /></div>}
                                     </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Phase 3: Finalization & Logistics */}
                         <div className="p-4 sm:p-6 lg:p-8 bento-card space-y-6 sm:space-y-8">
                         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <h5 className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                               <Truck size={12} /> Fulfillment Protocol
                            </h5>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                               <span className="text-[9px] sm:text-[10px] text-white/25 font-bold uppercase">{selectedOrder.mockups?.filter(m => m.selected).length || 0} ITEMS</span>
                               <span className="text-lg sm:text-xl font-black font-mono text-emerald">${selectedOrder.total_price || 0}.00</span>
                            </div>
                         </div>
                         
                         <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <input 
                               value={trackingInput}
                               onChange={(e) => setTracking(e.target.value)}
                               placeholder="Carrier Tracking Number" 
                               className="input-tech flex-1 font-mono" 
                            />
                            <button 
                               onClick={() => updateStatus(selectedOrder.id, "shipping", { tracking_number: trackingInput })}
                               className="btn-tech btn-tech-primary !bg-blue-600 !border-blue-600 hover:!opacity-90 text-[9px] sm:text-[10px] w-full sm:w-auto justify-center"
                            >
                               <Send size={14} /> {t("boutique_shipping")}
                            </button>
                         </div>

                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-2 sm:pt-4">
                            <button onClick={() => updateStatus(selectedOrder.id, "finalized")} className="btn-tech text-[8px] sm:text-[9px] py-2">{t("boutique_finalize")}</button>
                            <button onClick={() => updateStatus(selectedOrder.id, "paid")} className="btn-tech text-[8px] sm:text-[9px] py-2">{t("boutique_paid")}</button>
                            <button onClick={() => updateStatus(selectedOrder.id, "delivered")} className="px-2 sm:px-4 py-2 text-[8px] sm:text-[9px] font-black uppercase rounded bg-emerald/10 text-emerald border border-emerald/20">{t("boutique_delivered")}</button>
                            <button onClick={() => updateStatus(selectedOrder.id, "mockups_sent")} className="px-2 sm:px-4 py-2 text-[8px] sm:text-[9px] font-black uppercase rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">{t("boutique_reset_mockups")}</button>
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
         SUPPLY CHAIN INTELLIGENCE
         ═══════════════════════════════════════════════════════════ */}
      <div className="bento-card flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10">
         <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="p-3 sm:p-4 bg-white/5 text-cyan rounded-none border border-cyan/20 animate-pulse">
               <RefreshCw size={20} />
            </div>
            <div>
               <h3 className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest font-equinox">Market Core</h3>
               <p className="text-[9px] sm:text-[10px] text-white/25 font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-1 sm:mt-2">Google Sheets — shop_products & shop_orders (polling).</p>
            </div>
         </div>
         <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
            <span className="text-[7px] sm:text-[8px] font-black text-white/15 uppercase tracking-widest">Global Sync: 100%</span>
            <div className="w-20 sm:w-32 h-0.5 bg-white/5">
               <div className="h-full bg-cyan w-full shadow-[0_0_10px_#06b6d4]"></div>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default BoutiquePage;
