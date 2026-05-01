import { forwardRef, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTilt } from "@/hooks/use-tilt";

type Msg = { role: "user" | "assistant"; content: string };

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// We hardcode a public-demo key by minting one on first load so the on-site
// chat just works. Each browser session gets its own key.
async function mintDemoKey(): Promise<string> {
  const cached = localStorage.getItem("glm_demo_key");
  if (cached) return cached;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "site-demo" }),
  });
  const data = await res.json();
  if (!data?.api_key) throw new Error("Failed to mint key");
  localStorage.setItem("glm_demo_key", data.api_key);
  return data.api_key;
}

const Bubble = ({ m, isStreaming }: { m: Msg; isStreaming: boolean }) => {
  const ref = useTilt<HTMLDivElement>({ max: 6, scale: 1.02, glare: false });
  return (
    <div className={`flex reveal-up ${m.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        ref={ref}
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20 ${
          m.role === "user"
            ? "bg-foreground text-background"
            : "border border-white/10 bg-white/[0.04] text-foreground"
        }`}
      >
        {m.content}
        {isStreaming && <span className="blink" />}
      </div>
    </div>
  );
};

const ChatBox = forwardRef<HTMLDivElement>((_, ref) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
      const apiKey = await mintDemoKey();
      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ messages: next, stream: true }),
      });
      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Request failed (${res.status})`);
      }
      // Append empty assistant msg, fill it as tokens arrive.
      // Use rAF-batched flushes so React re-renders at most once per frame
      // (keeps the UI buttery-smooth even on very long streams).
      setMessages([...next, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      let pending = false;
      const flush = () => {
        pending = false;
        setMessages([...next, { role: "assistant", content: full }]);
      };
      const schedule = () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(flush);
      };
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
            const chunk = typeof j.content === "string" ? j.content : "";
            if (chunk) {
              full += chunk;
              schedule();
            }
          } catch { /* ignore */ }
        }
      }
      // Final flush to ensure last tokens are committed
      setMessages([...next, { role: "assistant", content: full }]);
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
      setMessages(messages); // rollback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="flex h-[600px] flex-col bg-card">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
            <Sparkles className="h-4 w-4 text-background" />
            <span className="pulse-ring absolute inset-0 rounded-xl" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold">GLM 5.1</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Streaming · Unlimited
            </p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          Online
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="font-display text-2xl font-semibold tracking-tight text-muted-foreground">
              Ask me anything.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["Write a haiku", "Explain quantum physics", "Plan my day", "Debug my code"].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble
            key={i}
            m={m}
            isStreaming={m.role === "assistant" && i === messages.length - 1 && loading}
          />
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" style={{ animationDelay: "0.2s" }} />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-white/[0.02] p-4">
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
            placeholder="Ask GLM anything..."
            className="min-h-[48px] resize-none border-white/10 bg-white/[0.03] focus-visible:ring-white/30"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-12 w-12 shrink-0 rounded-xl bg-foreground text-background hover:bg-white/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Press Enter to send · Shift + Enter for newline
        </p>
      </div>
    </div>
  );
});
ChatBox.displayName = "ChatBox";

export default ChatBox;