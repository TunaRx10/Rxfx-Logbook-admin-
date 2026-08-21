import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Sparkles, Bot, User, Trash2,
  Image, ChevronDown, Cpu, Check, Zap,
  Mic, MicOff, Shield, Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  openRouterChat, isChatReady,
  getAvailableModels, DEFAULT_MODEL,
  generateImage, useAIStatus,
} from "../lib/admin-ai";
import { buildAdminContext, formatContextForPrompt, SECURITY_RULES } from "../utils/aiContext";

const STORAGE_KEY = "rxfx_admin_chat_history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch { /* quota exceeded */ }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderMarkdown(text) {
  let html = escapeHtml(text);
  html = html
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^### (.*$)/gm, "<h3 class='text-xs font-black uppercase tracking-wider text-cyan mt-3 mb-1'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='text-sm font-black uppercase tracking-wider text-cyan mt-4 mb-2'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='text-base font-black uppercase tracking-wider text-cyan mt-4 mb-2'>$1</h1>")
    .replace(/^- (.*$)/gm, "<li class='ml-4 text-white/70'>$1</li>")
    .replace(/^• (.*$)/gm, "<li class='ml-4 text-white/70'>$1</li>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
  return html;
}

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "**Bonjour Admin !** 👋 Je suis **Lia**, votre assistante dédiée pour gérer **RxFx Logbook** au quotidien.\n\n" +
    "### 🛠️ Ce que je peux faire pour vous\n" +
    "• 📊 **Analyser la plateforme** — stats utilisateurs, trades, tendances, alertes\n" +
    "• 📧 **Créer du contenu** — emails marketing, campagnes promo, fiches produits\n" +
    "• 🎫 **Gérer le support** — prioriser les tickets, suggérer des réponses\n" +
    "• 📈 **Monitorer les KPIs** — win rate, P&L global, rétention, croissance\n" +
    "• 🎨 **Générer des visuels** — bannières, icônes, illustrations promo\n" +
    "• 🧠 **Conseiller stratégie** — growth, rétention, monétisation, contenu\n\n" +
    "### ⚡ Actions rapides\n" +
    "Cliquez sur un bouton ci-dessous ou écrivez-moi directement !\n\n" +
    "🛡️ *Je suis en lecture seule — vos données sont protégées.*",
};

const QUICK_PROMPTS = [
  { icon: "📊", label: "Résumé plateforme", prompt: "Fais un résumé complet de l'état actuel de la plateforme RxFx : utilisateurs, trades, P&L, taux de rétention. Donne-moi les points positifs et les alertes éventuelles." },
  { icon: "📧", label: "Créer une campagne", prompt: " Crée une campagne promotionnelle pour attirer de nouveaux traders sur RxFx. Inclus : titre accrocheur, description, type d'événement, lieu virtuel, et lien." },
  { icon: "🎫", label: "Trier les tickets", prompt: "Analyse la situation des tickets support actuellement ouverts. Lesquels sont urgents ? Propose des réponses types pour les plus fréquents." },
  { icon: "📈", label: "Audit croissance", prompt: "Analyse la croissance de la plateforme : acquisition, rétention, conversion vers les plans payants. Propose 3 actions concrètes pour accélérer la croissance." },
  { icon: "📝", label: "Email onboarding", prompt: "Rédige un email d'onboarding premium pour les nouveaux utilisateurs. Structure : bienvenue, setup rapide, fonctionnalités clés, call-to-action vers le premier trade." },
  { icon: "🛍️", label: "Nouveau produit", prompt: "Crée une fiche produit pour un indicateur de trading premium. Inclus : nom, description, prix, catégorie, et 3 features clés." },
];

const AIChatPanel = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState(() => {
    const saved = loadHistory();
    return saved.length > 0 ? saved : [WELCOME_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [adminContext, setAdminContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const modelPickerRef = useRef(null);
  const recognitionRef = useRef(null);

  const models = getAvailableModels();
  const currentModel = models.find((m) => m.id === selectedModel) || models[0];
  const { hasGemini } = useAIStatus();
  const canGenerateImage = hasGemini;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingText]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // Save history
  useEffect(() => {
    if (messages.length > 1) saveHistory(messages);
  }, [messages]);

  // Check voice dictation support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognition));
  }, []);

  // Load admin context when panel opens (read-only, non-confidential stats)
  useEffect(() => {
    if (isOpen && !adminContext && !contextLoading) {
      setContextLoading(true);
      buildAdminContext()
        .then((ctx) => setAdminContext(ctx))
        .catch(() => setAdminContext(null))
        .finally(() => setContextLoading(false));
    }
  }, [isOpen, adminContext, contextLoading]);

  // ── Voice Dictation ──
  const startVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Dictée vocale non supportée sur ce navigateur. Utilisez Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput((prev) => {
        // Replace last interim segment if present, otherwise append
        const final = event.results[event.results.length - 1]?.isFinal;
        if (final) {
          return prev + transcript + " ";
        }
        // For interim, update live
        return transcript;
      });
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      toast.error(`Erreur micro : ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.success("🎤 Écoute en cours... Parlez !");
  }, []);

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);
  useEffect(() => {
    function handleClick(e) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
    }
    if (showModelPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelPicker]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!isChatReady()) {
      toast.error("Clé API OpenRouter manquante.");
      return;
    }

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");

    // Build system prompt with admin context + security rules
    const contextText = formatContextForPrompt(adminContext);
    const systemContent =
      "Tu es **Lia**, l'assistante IA personnelle de l'administrateur de **RxFx Logbook**, " +
      "une plateforme premium de journal de trading.\n\n" +

      "**TA MISSION :** Aider l'administrateur à gérer et développer la plateforme au quotidien.\n\n" +

      "**TON RÔLE :**\n" +
      "- 📊 **Analyste** — Interpréter les statistiques, détecter les tendances, alerter sur les anomalies\n" +
      "- 📧 **Marketeur** — Rédiger emails, campagnes, promos, fiches produits\n" +
      "- 🎫 **Support** — Prioriser les tickets, suggérer des réponses, identifier les problèmes récurrents\n" +
      "- 📈 **Stratège** — Proposer des actions de croissance, rétention, monétisation\n" +
      "- 🧠 **Conseiller** — Expliquer les KPIs trading, former, recommander des best practices\n\n" +

      "**TON STYLE :**\n" +
      "- Concis, actionnable, orienté résultats\n" +
      "- Ton premium et professionnel, mais chaleureux (l'admin est ton collègue)\n" +
      "- Toujours proposer des **actions concrètes**, pas juste des analyses\n" +
      "- Format : Markdown bien structuré (titres, listes, tableaux si pertinent)\n" +
      "- Réponds en français (sauf si l'admin parle une autre langue)\n\n" +

      contextText +
      SECURITY_RULES;

    const apiMessages = [
      { role: "system", content: systemContent },
      ...newMessages.filter((m) => m.role !== "system"),
    ];

    abortRef.current = new AbortController();

    try {
      const stream = await openRouterChat(apiMessages, {
        signal: abortRef.current.signal,
        stream: true,
        model: selectedModel,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) { fullContent += delta; setStreamingText(fullContent); }
          } catch { /* skip malformed */ }
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
    } catch (err) {
      if (err.name === "AbortError") return;
      toast.error(err.message || "Erreur OpenRouter");
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Erreur: " + (err.message || "inconnue") }]);
    } finally {
      setLoading(false);
      setStreamingText("");
      abortRef.current = null;
    }
  }, [input, messages, loading, selectedModel]);

  const handleImageGen = async () => {
    const text = input.trim();
    if (!text) return;
    if (!canGenerateImage) {
      toast.error("Clé Gemini requise pour la génération d'image.");
      return;
    }
    setImageGenerating(true);
    const prompt = text;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: `🎨 Génère une image : ${prompt}` }]);

    try {
      const result = await generateImage(prompt);
      for (const img of result.images) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `![Image générée](${img.dataUrl})`,
          image: img.dataUrl,
        }]);
      }
      toast.success("Image générée !");
    } catch (err) {
      toast.error(err.message || "Erreur génération image");
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ " + (err.message || "Erreur génération image") }]);
    } finally {
      setImageGenerating(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
    // Auto-send after a tiny delay so the user sees the prompt
    setTimeout(() => {
      if (prompt === inputRef.current?.value) {
        // The input still has the prompt, send it
      }
    }, 100);
  };

  const handleClear = () => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Historique effacé");
  };

  const handleStop = () => abortRef.current?.abort();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && [
        // Chaque motion.div a une `key` stable pour que AnimatePresence
        // puisse tracker individuellement chaque enfant pendant l'exit
        // animation. Sans clé, framer-motion perd la trace et React lève
        // « NotFoundError: removeChild » quand l'animation d'exit race avec
        // un re-render parent.
        <motion.div
          key="ai-chat-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />,
        <motion.div
          key="ai-chat-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 z-[80] w-full max-w-lg flex flex-col shadow-2xl"
          style={{ background: "oklch(0.1 0.01 255 / 0.98)", borderLeft: "1px solid oklch(1 0 0 / 8%)" }}
        >
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-cyan/30"
                  style={{ background: "linear-gradient(135deg, oklch(0.74 0.13 209 / 15%), oklch(0.74 0.13 209 / 5%))", boxShadow: "0 0 20px oklch(0.74 0.13 209 / 15%)" }}
                >
                  <Bot size={18} className="text-cyan" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Lia · RxFx Admin
                    {adminContext && (
                      <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[8px] font-medium normal-case"
                        style={{ background: "oklch(0.87 0.15 164 / 10%)", color: "oklch(0.87 0.15 164 / 85%)", border: "1px solid oklch(0.87 0.15 164 / 20%)" }}
                      >
                        <Eye size={10} /> Connectée
                      </span>
                    )}
                  </h3>
                  <p className="text-[9px] text-white/25 font-medium mt-0.5">
                    {adminContext
                      ? `${adminContext.platform?.totalUsers ?? "?"} utilisateurs · ${adminContext.platform?.totalTrades ?? "?"} trades · P&L ${adminContext.platform?.totalPnl ?? "?"}`
                      : contextLoading ? "Connexion à la plateforme..." : "Assistante admin · OpenRouter"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {adminContext && (
                  <button
                    onClick={() => { setAdminContext(null); setContextLoading(false); }}
                    className="p-2 text-white/20 hover:text-cyan transition-colors rounded-lg hover:bg-white/5"
                    title="Rafraîchir les statistiques"
                  >
                    <Shield size={15} />
                  </button>
                )}
                <button onClick={handleClear} className="p-2 text-white/20 hover:text-rose transition-colors rounded-lg hover:bg-white/5" title="Effacer">
                  <Trash2 size={15} />
                </button>
                <button onClick={onClose} className="p-2 text-white/25 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Model Selector Bar ── */}
            <div className="px-4 py-2 shrink-0 flex items-center gap-2" style={{ borderBottom: "1px solid oklch(1 0 0 / 4%)", background: "oklch(0.08 0.015 255 / 0.4)" }}>
              <div className="relative flex-1" ref={modelPickerRef}>
                <button
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border"
                  style={{
                    background: "oklch(0.13 0.02 255 / 0.6)",
                    borderColor: "oklch(1 0 0 / 8%)",
                    color: "oklch(0.74 0.13 209 / 90%)",
                  }}
                >
                  <span>{currentModel.icon}</span>
                  <span className="flex-1 text-left">{currentModel.name}</span>
                  <span className="text-[8px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">{currentModel.provider}</span>
                  <ChevronDown size={12} className={showModelPicker ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>

                {/* Dropdown */}
                {showModelPicker && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl border"
                    style={{ background: "oklch(0.13 0.02 255 / 0.98)", borderColor: "oklch(1 0 0 / 10%)" }}
                  >
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 text-xs transition-all hover:bg-white/5 ${
                          m.id === selectedModel ? "bg-cyan/10 border-l-2 border-cyan" : "border-l-2 border-transparent"
                        }`}
                      >
                        <span className="text-base">{m.icon}</span>
                        <div className="flex-1 text-left">
                          <span className={`font-bold ${m.id === selectedModel ? "text-cyan" : "text-white/80"}`}>
                            {m.name}
                            {m.best && <Zap size={10} className="inline ml-1 text-amber-400" />}
                          </span>
                          <p className="text-[9px] text-white/25 mt-0.5">{m.desc}</p>
                        </div>
                        <span className="text-[8px] text-white/15 bg-white/5 px-1.5 py-0.5 rounded">{m.provider}</span>
                        {m.id === selectedModel && <Check size={14} className="text-cyan shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Image gen button */}
              {canGenerateImage && (
                <button
                  onClick={handleImageGen}
                  disabled={imageGenerating || !input.trim()}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-20 shrink-0 border"
                  style={{
                    background: "oklch(0.87 0.15 164 / 8%)",
                    borderColor: "oklch(0.87 0.15 164 / 20%)",
                    color: "oklch(0.87 0.15 164 / 85%)",
                  }}
                  title="Générer une image (Gemini)"
                >
                  {imageGenerating ? (
                    <span className="w-3 h-3 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin" />
                  ) : (
                    <Image size={13} />
                  )}
                  <span className="hidden sm:inline">{imageGenerating ? "..." : "Image"}</span>
                </button>
              )}
            </div>

            {/* ── Messages ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role !== "user" && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "oklch(0.74 0.13 209 / 10%)", border: "1px solid oklch(0.74 0.13 209 / 20%)" }}
                    >
                      <Bot size={14} className="text-cyan" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user" ? "bg-cyan/10 border border-cyan/20 text-white/90 rounded-br-md" : "text-white/80 rounded-bl-md"
                    }`}
                    style={msg.role !== "user" ? { background: "oklch(0.13 0.02 255 / 0.6)", border: "1px solid oklch(1 0 0 / 5%)" } : {}}
                  >
                    {/* Render image if present */}
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="AI Generated"
                        className="w-full rounded-lg mb-2 border border-white/10"
                        loading="lazy"
                      />
                    )}
                    <div
                      className="prose prose-invert prose-sm max-w-none [&_strong]:text-cyan [&_code]:text-amber-400 [&_code]:bg-black/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_ul]:pl-4 [&_li]:marker:text-cyan/50 [&_img]:rounded-lg [&_img]:border [&_img]:border-white/10"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "oklch(0.74 0.13 209 / 10%)", border: "1px solid oklch(0.74 0.13 209 / 20%)" }}
                    >
                      <User size={14} className="text-white/50" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && streamingText && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "oklch(0.74 0.13 209 / 10%)", border: "1px solid oklch(0.74 0.13 209 / 20%)" }}
                  >
                    <Bot size={14} className="text-cyan" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm text-white/80"
                    style={{ background: "oklch(0.13 0.02 255 / 0.6)", border: "1px solid oklch(1 0 0 / 5%)" }}
                  >
                    <div className="prose prose-invert prose-sm max-w-none [&_strong]:text-cyan"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }}
                    />
                    <span className="inline-block w-1.5 h-4 bg-cyan ml-0.5 animate-pulse align-middle" />
                  </div>
                </motion.div>
              )}

              {loading && !streamingText && (
                <div className="flex gap-3 items-center py-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.74 0.13 209 / 10%)", border: "1px solid oklch(0.74 0.13 209 / 20%)" }}
                  >
                    <Bot size={14} className="text-cyan" />
                  </div>
                  <div className="flex gap-1 px-4 py-3 rounded-2xl rounded-bl-md"
                    style={{ background: "oklch(0.13 0.02 255 / 0.6)", border: "1px solid oklch(1 0 0 / 5%)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={(el) => { if (el) el.scrollIntoView?.({ behavior: "smooth" }); }} />
            </div>

            {/* ── Quick Prompts ── */}
            {messages.length <= 2 && (
              <div className="px-4 pb-1 shrink-0 overflow-x-auto scrollbar-none">
                <div className="flex gap-1.5 pb-1">
                  {QUICK_PROMPTS.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(qp.prompt); inputRef.current?.focus(); }}
                      disabled={loading || imageGenerating}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all border shrink-0 hover:scale-[1.02] active:scale-95 disabled:opacity-30"
                      style={{
                        background: "oklch(0.13 0.02 255 / 0.5)",
                        borderColor: "oklch(1 0 0 / 6%)",
                        color: "oklch(1 0 0 / 60%)",
                      }}
                    >
                      <span className="text-xs">{qp.icon}</span>
                      <span>{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Input ── */}
            <div className="p-4 shrink-0" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.08 0.015 255 / 0.6)" }}>
              <div className="flex gap-2">
                {/* Voice button */}
                {voiceSupported && (
                  <button
                    onClick={isListening ? stopVoice : startVoice}
                    disabled={loading || imageGenerating}
                    className={`p-3 rounded-xl transition-all shrink-0 self-end border ${
                      isListening
                        ? "bg-rose/10 border-rose/30 text-rose"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-cyan hover:border-cyan/30"
                    }`}
                    title={isListening ? "Arrêter la dictée" : "Dicter un message"}
                  >
                    {isListening ? (
                      <>
                        <Mic size={18} className="animate-pulse" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose animate-ping" />
                      </>
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={canGenerateImage ? "Que voulez-vous gérer, analyser ou créer ?" : "Comment puis-je vous aider à gérer la plateforme ?"}
                  rows={1}
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-cyan/40 focus:outline-none resize-none transition-all"
                  style={{ maxHeight: "120px" }}
                  disabled={loading || imageGenerating}
                  onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                />
                {loading || imageGenerating ? (
                  <button onClick={handleStop} className="p-3 rounded-xl bg-rose/10 border border-rose/20 text-rose hover:bg-rose/20 transition-all shrink-0 self-end" title="Arrêter">
                    <X size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-3 rounded-xl bg-cyan text-black hover:bg-cyan/90 transition-all disabled:opacity-20 shrink-0 self-end"
                    style={{ boxShadow: "0 0 20px oklch(0.74 0.13 209 / 20%)" }}
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
              <p className="text-[8px] text-white/15 text-center mt-2 font-medium uppercase tracking-wider">
                {currentModel.icon} {currentModel.name} · Streaming
              </p>
            </div>
        </motion.div>,
      ]}
    </AnimatePresence>
  );
};

export default AIChatPanel;
