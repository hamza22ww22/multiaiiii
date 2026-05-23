import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, Globe, Image as ImageIcon, Code2, Terminal } from "lucide-react";
import { toast } from "sonner";
import AgentPanel from "@/components/AgentPanel";
import chatBg from "@/assets/chat-bg.png";
import { PROVIDER_MODELS } from "@/lib/g4f-catalog";

type Msg = { role: "user" | "assistant"; content: string; image?: string };
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Built from the g4f.dev catalog: every provider + every model.
// IDs use "<provider>:<model>" format for unambiguous routing.
const MODEL_GROUPS: { provider: string; models: { id: string; label: string }[] }[] = [
  { provider: "xPrivo", models: [
    { id: "xprivo", label: "xPrivo" },
    { id: "qwen-latest", label: "Qwen 3 (Reasoning)" },
    { id: "mistral-3", label: "Mistral 3" },
  ]},
  ...Object.entries(PROVIDER_MODELS).map(([prov, list]) => ({
    provider: prov,
    models: list.map((m) => ({ id: `${prov}:${m}`, label: m })),
  })),
];

const STORAGE_KEY = "xprivo.chat.history.v1";

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" />
    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" />
  </div>
);

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("xprivo");
  const [web, setWeb] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Persist chat history (cap last 200 messages to avoid storage bloat)
  useEffect(() => {
    try {
      const trimmed = messages.slice(-200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch { /* quota */ }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

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
    <div
      className="relative flex min-h-screen flex-col bg-background"
      style={{
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.82), hsl(var(--background) / 0.92)), url(${chatBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-display text-lg font-semibold">AI Chat</h1>
          <p className="text-xs text-muted-foreground">Free · No login · Multi-model</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !agentMode && (
            <Button variant="ghost" size="sm" onClick={clearChat} title="Clear chat history">Clear</Button>
          )}
          <Button
            variant={agentMode ? "default" : "outline"}
            size="sm"
            onClick={() => setAgentMode((v) => !v)}
            title="Agent mode: AI gets a real Linux sandbox"
          >
            <Terminal className="mr-1 h-4 w-4" />Agent
          </Button>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[480px]">
              {MODEL_GROUPS.map((g) => (
                <div key={g.provider}>
                  <div className="sticky top-0 z-10 bg-popover px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.provider} · {g.models.length}
                  </div>
                  {g.models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="truncate">{m.label}</span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Link to="/docs">
            <Button variant="outline" size="sm"><Code2 className="mr-1 h-4 w-4" />API</Button>
          </Link>
        </div>
      </header>

      {agentMode ? (
        <div className="flex-1 overflow-hidden"><AgentPanel /></div>
      ) : (
      <>
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
              m.role === "user" ? "bg-foreground text-background shadow-lg" : "border border-white/10 bg-white/[0.04] backdrop-blur-sm"
            }`}>
              {m.image && <img src={m.image} alt="generated" className="mb-2 max-w-full rounded-lg" />}
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none break-words">
                  {m.content
                    ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    : (loading && i === messages.length - 1 ? <TypingDots /> : null)}
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
              <TypingDots />
            </div>
          </div>
        )}
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
      </>
      )}
    </div>
  );
};

export default Index;
