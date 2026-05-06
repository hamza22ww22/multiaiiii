import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, Globe, Image as ImageIcon, Code2 } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; image?: string };
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const MODELS = [
  // Default
  { id: "xprivo", label: "xPrivo", badge: "" },
  { id: "qwen-latest", label: "Qwen 3", badge: "Reasoning" },
  { id: "mistral-3", label: "Mistral 3", badge: "" },
  // Groq
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", badge: "Groq" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B", badge: "Groq" },
  { id: "qwen/qwen3-32b", label: "Qwen 3 32B", badge: "Groq" },
  { id: "gpt-oss-120b", label: "GPT-OSS 120B", badge: "Groq" },
  // NVIDIA
  { id: "deepseek-ai/deepseek-v4-pro", label: "DeepSeek V4 Pro", badge: "NVIDIA" },
  { id: "deepseek-ai/deepseek-v4-flash", label: "DeepSeek V4 Flash", badge: "NVIDIA" },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", badge: "NVIDIA" },
  { id: "llama-3.1-8b", label: "Llama 3.1 8B", badge: "NVIDIA" },
  { id: "granite-4", label: "Granite 4", badge: "NVIDIA" },
  { id: "dolphin-3-8b", label: "Dolphin 3 8B", badge: "NVIDIA" },
  { id: "exaone-3.5", label: "EXAONE 3.5", badge: "NVIDIA" },
  { id: "nemotron-3-super", label: "Nemotron 3 Super", badge: "NVIDIA" },
  { id: "command-r-plus", label: "Command R+", badge: "NVIDIA" },
  { id: "aya-expanse-32b", label: "Aya Expanse 32B", badge: "NVIDIA" },
  { id: "google/gemma-4-31B-it", label: "Gemma 4 31B", badge: "NVIDIA" },
  { id: "google/gemma-4-26B-A4B-it", label: "Gemma 4 26B", badge: "NVIDIA" },
  { id: "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning", label: "Nemotron 3 Nano Omni", badge: "Reasoning" },
  // gpt4free.pro
  { id: "llama-4-scout", label: "Llama 4 Scout", badge: "gpt4free" },
  { id: "deepseek-r1-32b", label: "DeepSeek R1 32B", badge: "Reasoning" },
  { id: "qwen-3.6-instant", label: "Qwen 3.6 Instant", badge: "Fast" },
  { id: "grok-4.1-mini:free", label: "Grok 4.1 Mini", badge: "Free" },
  { id: "minimax-m2.5", label: "MiniMax M2.5", badge: "" },
  // Pollinations
  { id: "openai", label: "OpenAI (Polli)", badge: "" },
  { id: "openai-fast", label: "OpenAI Fast", badge: "Fast" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", badge: "" },
  { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", badge: "Fast" },
  { id: "moirai-agent", label: "Moirai Agent", badge: "" },
  { id: "llamascout", label: "LlamaScout", badge: "" },
  { id: "deepseek-reasoning", label: "DeepSeek Reasoning", badge: "Reasoning" },
  { id: "deepseek-r1", label: "DeepSeek R1", badge: "Reasoning" },
  { id: "mistral", label: "Mistral", badge: "" },
  // Gemini (g4f)
  { id: "models/gemini-3-flash-preview", label: "Gemini 3 Flash", badge: "PRO" },
  { id: "models/gemini-2.5-flash", label: "Gemini 2.5 Flash", badge: "" },
  { id: "models/gemini-2.0-flash", label: "Gemini 2.0 Flash", badge: "" },
  // Search
  { id: "turbo", label: "Perplexity Turbo", badge: "Web" },
  // Router
  { id: "model-router3", label: "Azure Router", badge: "Auto" },
  // Image
  { id: "flux", label: "Flux Image", badge: "Image" },
  { id: "flux-schnell", label: "Flux Schnell", badge: "Image" },
  { id: "flux-dev", label: "Flux Dev", badge: "Image" },
  { id: "sdxl-turbo", label: "SDXL Turbo", badge: "Image" },
];

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("xprivo");
  const [web, setWeb] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, model, web, image: imageMode }),
      });

      const ct = res.headers.get("content-type") || "";

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed (${res.status})`);
      }

      // JSON response (image gen)
      if (ct.includes("application/json")) {
        const data = await res.json();
        if (data.image) {
          setMessages([...next, { role: "assistant", content: data.text || "", image: data.image }]);
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          setMessages([...next, { role: "assistant", content: data.text || "(no response)" }]);
        }
        return;
      }

      // SSE stream
      if (!res.body) throw new Error("No response body");
      setMessages([...next, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const chunk = j?.choices?.[0]?.delta?.content ?? j?.choices?.[0]?.message?.content ?? "";
            if (chunk) {
              full += chunk;
              setMessages([...next, { role: "assistant", content: full }]);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-display text-lg font-semibold">AI Chat</h1>
          <p className="text-xs text-muted-foreground">Free · No login · Multi-model</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span>{m.label}</span>
                  {m.badge && <span className="ml-2 text-xs text-muted-foreground">{m.badge}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/docs">
            <Button variant="outline" size="sm"><Code2 className="mr-1 h-4 w-4" />API</Button>
          </Link>
        </div>
      </header>

      <div ref={scrollRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">Ask me anything…</p>
            <p className="mt-2 text-xs text-muted-foreground">Toggle 🌐 for web search · 🖼 for image generation</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === "user" ? "bg-foreground text-background" : "border border-white/10 bg-white/[0.04]"
            }`}>
              {m.image && <img src={m.image} alt="generated" className="mb-2 max-w-full rounded-lg" />}
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || (loading && i === messages.length - 1 ? "…" : "")}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              <span>Web search</span>
              <Switch checked={web} onCheckedChange={setWeb} />
            </label>
            <label className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Image mode</span>
              <Switch checked={imageMode} onCheckedChange={setImageMode} />
            </label>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={imageMode ? "Describe the image…" : "Type a message..."}
              className="min-h-[48px] resize-none"
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-12 w-12 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
