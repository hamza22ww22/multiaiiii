import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const Index = () => {
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
      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, stream: true }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed (${res.status})`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Upstream error");
      }
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
            const chunk = j?.choices?.[0]?.delta?.content ?? "";
            if (chunk) {
              full += chunk;
              setMessages([...next, { role: "assistant", content: full }]);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="font-display text-lg font-semibold">DeepSeek Chat</h1>
        <p className="text-xs text-muted-foreground">Free · Public · No login</p>
      </header>
      <div ref={scrollRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Ask me anything…</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
              m.role === "user" ? "bg-foreground text-background" : "border border-white/10 bg-white/[0.04]"
            }`}>
              {m.content || (loading && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message..."
            className="min-h-[48px] resize-none"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-12 w-12 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;