import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, Bot, User, Trash2,
  Image, ChevronDown, Zap, Check,
  Mic, Copy, RotateCcw, Clock, X,
  Brain, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  openRouterChat,
  getAvailableModels, DEFAULT_MODEL,
  generateImage, useAIStatus,
} from "../lib/admin-ai";

const STORAGE_KEY = "rxfx_admin_chat_ia_history";

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  } catch { /* quota exceeded */ }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    "**Bienvenue sur le Chat IA de RxFx Admin** — propulsé par les meilleurs modèles gratuits d'OpenRouter. 🚀\n\n" +
    "**Ce que je peux faire :**\n" +
    "• 🧠 **Analyser** les KPIs et métriques de trading\n" +
    "• 📧 **Rédiger** des emails marketing, promos, contenus\n" +
    "• 📊 **Expliquer** des concepts trading (drawdown, R:R, Sharpe...)\n" +
    "• 🎨 **Générer des images** via Gemini\n" +
    "• 🗣️ **Dicter** en vocal (micro)\n\n" +
    "**Modèles disponibles (cascade) :**\n" +
    "• 🌐 **Gemini 2.5 Flash** — par défaut (recommandé)\n" +
    "• 🌪️ Mistral Small 3.2 — fallback automatique\n" +
    "• ⚡ Nemotron Ultra 550B — raisonnement long contexte\n" +
    "• 🤖 GPT OSS 20B — rapide & efficace\n" +
    "• 🎲 Auto — meilleur modèle gratuit disponible\n\n" +
    "Posez votre question !",
};

const QUICK_PROMPTS = [
  { icon: "📊", label: "Analyse KPIs", prompt: "Analyse les KPIs de trading : que faut-il regarder en priorité (win rate, profit factor, drawdown, R:R) ? Donne des benchmarks pour un trader professionnel." },
  { icon: "📧", label: "Rédige promo", prompt: "Rédige une campagne promotionnelle pour le plan Pro Max de RxFx Logbook. Inclus : bénéfices clés, offre spéciale, call-to-action." },
  { icon: "📉", label: "Explique drawdown", prompt: "Explique ce qu'est le drawdown en trading, comment le calculer, et donne des stratégies concrètes pour le limiter." },
  { icon: "🧠", label: "Psychologie", prompt: "Quels sont les biais psychologiques les plus courants chez les traders et comment les surmonter ? Donne des exercices pratiques." },
  { icon: "📝", label: "Email bienvenue", prompt: "Rédige un email de bienvenue premium pour les nouveaux utilisateurs de RxFx Logbook. Ton marketing, inspiré de Notion. Design sobre et élégant." },
  { icon: "🎯", label: "Stratégie risque", prompt: "Propose une stratégie de risk management pour un trader Forex avec un compte de 10 000$. Inclus : risque par trade, règle des 2%, corrélation." },
  { icon: "📈", label: "Backtest expliqué", prompt: "Explique ce qu'est un backtest en trading, comment l'interpréter, et quels sont les pièges à éviter (sur-optimisation, look-ahead bias)." },
  { icon: "🤖", label: "Prompt tips", prompt: "Comment écrire de meilleurs prompts pour les IA ? Donne 10 astuces concrètes avec des exemples pour le trading." },
];

const ChatIAPage = () => {
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
  const [showPrompts, setShowPrompts] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const modelPickerRef = useRef(null);
  const recognitionRef = useRef(null);

  const models = getAvailableModels();
  const currentModel = models.find((m) => m.id === selectedModel) || models[0];
  const { chatReady, hasGemini } = useAIStatus();
  const canGenerateImage = hasGemini;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingText]);

  // Save history (skip during streaming to avoid localStorage thrashing)
  useEffect(() => {
    if (messages.length > 1 && !loading) saveHistory(messages);
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognition));
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close model picker on outside click
  useEffect(() => {
    function handleClick(e) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
    }
    if (showModelPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelPicker]);

  // Cleanup recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Voice dictation
  const startVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Dictée vocale non supportée sur ce navigateur.");
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
      const final = event.results[event.results.length - 1]?.isFinal;
      if (final) {
        setInput((prev) => prev + transcript + " ");
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      toast.error(`Erreur micro : ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

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

  const handleSend = useCallback(async (overrideText) => {
    const text = (typeof overrideText === "string" ? overrideText : input).trim();
    if (!text || loading) return;

    if (!chatReady) {
      toast.error("Erreur proxy AI. Vérifiez OPENROUTER_API_KEY dans .env côté serveur.");
      return;
    }

    const userMsg = { role: "user", content: text, time: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");
    setShowPrompts(false);

    const apiMessages = [
      {
        role: "system",
        content:
          "Tu es Lia, l'assistante IA de RxFx Admin, une plateforme premium de trading logbook. " +
          "Tu réponds en français (sauf si l'utilisateur parle une autre langue). " +
          "Tu es concise, professionnelle, experte en trading, marketing, et analyse de données. " +
          "Tu aides à analyser les KPIs, rédiger du contenu marketing, expliquer des concepts de trading, " +
          "et suggérer des stratégies. " +
          "Ton nom est Lia. Tu es chaleureuse mais pro. " +
          "Format : Markdown autorisé. Mets en gras les points clés.",
      },
      ...newMessages.filter((m) => m.role !== "system").map(({ role, content }) => ({ role, content })),
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
          } catch { /* skip */ }
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fullContent, time: Date.now() }]);
    } catch (err) {
      if (err.name === "AbortError") return;
      toast.error(err.message || "Erreur OpenRouter");
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Erreur: " + (err.message || "inconnue"), time: Date.now() }]);
    } finally {
      setLoading(false);
      setStreamingText("");
      abortRef.current = null;
    }
  }, [input, messages, loading, selectedModel, chatReady]);

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
    setShowPrompts(false);
    setMessages((prev) => [...prev, { role: "user", content: `🎨 Génère une image : ${prompt}`, time: Date.now() }]);

    try {
      const result = await generateImage(prompt);
      for (const img of result.images) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `![Image générée](${img.dataUrl})`,
          image: img.dataUrl,
          time: Date.now(),
        }]);
      }
      toast.success("Image générée !");
    } catch (err) {
      toast.error(err.message || "Erreur génération image");
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ " + (err.message || "Erreur génération image"), time: Date.now() }]);
    } finally {
      setImageGenerating(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content).then(() => toast.success("Copié !")).catch(() => toast.error("Erreur copie"));
  };

  const handleRegenerate = () => {
    // Remove last assistant message and resend
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const lastUser = [...messages].reverse()[lastUserIdx];
    setMessages((prev) => prev.slice(0, -1));
    setInput(lastUser.content);
    handleSend(lastUser.content);
  };

  const handleClear = () => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
    setShowPrompts(true);
    toast.success("Historique effacé");
  };

  const handleStop = () => abortRef.current?.abort();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  // ── Status Banner ──
  if (!chatReady) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg text-center p-12 rounded-3xl border"
          style={{
            background: "oklch(0.1 0.01 255 / 0.8)",
            borderColor: "oklch(1 0 0 / 8%)",
          }}
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center border border-amber/30"
            style={{ background: "oklch(0.87 0.12 95 / 8%)", boxShadow: "0 0 30px oklch(0.87 0.12 95 / 15%)" }}
          >
            <Wand2 size={36} className="text-amber" />
          </div>
          <h2 className="text-lg font-black uppercase tracking-wider text-white mb-3">Chat IA — Configuration requise</h2>
          <p className="text-sm text-white/50 leading-relaxed mb-6">
            Pour activer le Chat IA, ajoute la clé API OpenRouter dans le fichier <code className="bg-cyan/10 text-cyan px-1.5 py-0.5 rounded text-xs">.env</code> (côté serveur, sans préfixe VITE_) :
          </p>
          <div className="bg-black/50 border border-white/10 rounded-xl p-4 mb-6 text-left">
            <code className="text-xs text-cyan/80">OPENROUTER_API_KEY=sk-or-v1-...</code>
          </div>
          <p className="text-[10px] text-white/20">
            Crée un compte gratuit sur <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-cyan/60 hover:text-cyan underline">openrouter.ai</a> pour obtenir ta clé.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] max-w-5xl mx-auto">
      {/* ── Header Bar ── */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan/30"
            style={{
              background: "linear-gradient(135deg, oklch(0.74 0.13 209 / 15%), oklch(0.74 0.13 209 / 5%))",
              boxShadow: "0 0 20px oklch(0.74 0.13 209 / 15%)",
            }}
          >
            <Brain size={20} className="text-cyan" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">Lia — Chat IA</h1>
            <p className="text-[9px] text-white/25 font-medium">
Gemini → Mistral → OpenRouter · {models.length} modèles · Streaming · {currentModel.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div className="relative" ref={modelPickerRef}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border"
              style={{
                background: "oklch(0.13 0.02 255 / 0.6)",
                borderColor: "oklch(1 0 0 / 8%)",
                color: "oklch(0.74 0.13 209 / 90%)",
              }}
            >
              <span>{currentModel.icon}</span>
              <span>{currentModel.name}</span>
              <ChevronDown size={12} className={showModelPicker ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>

            {showModelPicker && (
              <div
                className="absolute top-full right-0 mt-1 w-72 rounded-xl overflow-hidden z-50 shadow-2xl border"
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
                    {m.id === selectedModel && <Check size={14} className="text-cyan shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image gen */}
          {canGenerateImage && (
            <button
              onClick={handleImageGen}
              disabled={imageGenerating || !input.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-20 shrink-0 border"
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
              <span className="hidden sm:inline">Image</span>
            </button>
          )}

          {/* Clear */}
          <button
            onClick={handleClear}
            className="p-2 text-white/20 hover:text-rose transition-colors rounded-lg hover:bg-white/5"
            title="Effacer l'historique"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 1 && messages[0] === WELCOME_MESSAGE && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan/10 bg-cyan/5 mb-6">
              <Sparkles size={14} className="text-cyan" />
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan/70">Assistant IA prêt</span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role !== "user" && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "oklch(0.74 0.13 209 / 10%)", border: "1px solid oklch(0.74 0.13 209 / 20%)" }}
              >
                <Bot size={15} className="text-cyan" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-cyan/10 border border-cyan/20 text-white/90 rounded-br-md"
                    : "rounded-bl-md"
                }`}
                style={msg.role !== "user" ? { background: "oklch(0.13 0.02 255 / 0.6)", border: "1px solid oklch(1 0 0 / 5%)" } : {}}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="AI Generated"
                    className="w-full rounded-lg mb-2 border border-white/10 max-h-96 object-contain"
                    loading="lazy"
                  />
                )}
                <div
                  className="prose prose-invert prose-sm max-w-none [&_strong]:text-cyan [&_code]:text-amber-400 [&_code]:bg-black/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_ul]:pl-4 [&_li]:marker:text-cyan/50 [&_img]:rounded-lg [&_img]:border [&_img]:border-white/10"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              </div>
              {/* Message actions */}
              <div className={`flex items-center gap-1 mt-1 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.time && (
                  <span className="text-[8px] text-white/15 flex items-center gap-1">
                    <Clock size={8} />
                    {formatTime(msg.time)}
                  </span>
                )}
                {msg.role === "assistant" && !msg.image && (
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="p-0.5 text-white/10 hover:text-white/40 transition-colors"
                    title="Copier"
                  >
                    <Copy size={10} />
                  </button>
                )}
              </div>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "oklch(0.74 0.13 209 / 5%)", border: "1px solid oklch(1 0 0 / 5%)" }}
              >
                <User size={15} className="text-white/35" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Streaming message */}
        {loading && streamingText && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "oklch(0.74 0.13 209 / 10%)", border: "1px solid oklch(0.74 0.13 209 / 20%)" }}
            >
              <Bot size={15} className="text-cyan" />
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-md px-4 py-3 text-sm"
              style={{ background: "oklch(0.13 0.02 255 / 0.6)", border: "1px solid oklch(1 0 0 / 5%)" }}
            >
              <div
                className="prose prose-invert prose-sm max-w-none [&_strong]:text-cyan"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }}
              />
              <span className="inline-block w-1.5 h-4 bg-cyan ml-0.5 animate-pulse align-middle" />
            </div>
          </motion.div>
        )}

        {/* Loading dots */}
        {loading && !streamingText && (
          <div className="flex gap-3 items-center py-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.74 0.13 209 / 10%)", border: "1px solid oklch(0.74 0.13 209 / 20%)" }}
            >
              <Bot size={15} className="text-cyan" />
            </div>
            <div className="flex gap-1 px-4 py-3 rounded-2xl rounded-bl-md"
              style={{ background: "oklch(0.13 0.02 255 / 0.6)", border: "1px solid oklch(1 0 0 / 5%)" }}
            >
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-cyan/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={(el) => { if (el) el.scrollIntoView?.({ behavior: "smooth" }); }} />
      </div>

      {/* ── Quick Prompts ── */}
      {showPrompts && messages.length <= 1 && (
        <div className="shrink-0 px-6 pb-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/15 mb-2">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => { setInput(qp.prompt); inputRef.current?.focus(); }}
                disabled={loading || imageGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all border shrink-0 hover:scale-[1.02] active:scale-95 disabled:opacity-30"
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

      {/* ── Input Area ── */}
      <div className="shrink-0 px-6 py-4" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.08 0.015 255 / 0.6)" }}>
        <div className="flex gap-2 max-w-3xl mx-auto">
          {/* Voice */}
          {voiceSupported && (
            <button
              onClick={isListening ? stopVoice : startVoice}
              disabled={loading || imageGenerating}
              className={`p-3 rounded-xl transition-all shrink-0 self-end border relative ${
                isListening
                  ? "bg-rose/10 border-rose/30 text-rose"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-cyan hover:border-cyan/30"
              }`}
              title={isListening ? "Arrêter la dictée" : "Dicter un message"}
            >
              <Mic size={18} className={isListening ? "animate-pulse" : ""} />
              {isListening && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose animate-ping" />}
            </button>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={canGenerateImage ? "Posez votre question ou décrivez une image..." : "Posez votre question à Lia..."}
            rows={1}
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-cyan/40 focus:outline-none resize-none transition-all"
            style={{ maxHeight: "120px" }}
            disabled={loading || imageGenerating}
            onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
          />

          {loading || imageGenerating ? (
            <button
              onClick={handleStop}
              className="p-3 rounded-xl bg-rose/10 border border-rose/20 text-rose hover:bg-rose/20 transition-all shrink-0 self-end"
              title="Arrêter"
            >
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

        {/* Status footer */}
        <div className="flex items-center justify-between max-w-3xl mx-auto mt-2">
          <p className="text-[8px] text-white/15 font-medium uppercase tracking-wider">
            {currentModel.icon} {currentModel.name} · Streaming
          </p>
          {messages.length > 1 && (
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="text-[8px] text-white/20 hover:text-cyan transition-colors flex items-center gap-1 disabled:opacity-30"
            >
              <RotateCcw size={9} /> Régénérer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatIAPage;
