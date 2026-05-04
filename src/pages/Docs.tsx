import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`;
const GEN_URL = `${SUPABASE_URL}/functions/v1/generate-key`;
const STATS_URL = `${SUPABASE_URL}/functions/v1/key-stats`;

type Stats = {
  key: { name: string | null; active: boolean; created_at: string };
  stats: { total_calls: number; success: number; errors: number; last_24h: number; working: boolean };
};

const Docs = () => {
  const [name, setName] = useState("");
  const [genKey, setGenKey] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [statsKey, setStatsKey] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const create = async () => {
    setGenLoading(true);
    setGenKey(null);
    try {
      const r = await fetch(GEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Failed");
      setGenKey(d.api_key);
      toast.success("API key created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenLoading(false);
    }
  };

  const lookup = async () => {
    if (!statsKey.trim()) return;
    setStatsLoading(true);
    setStats(null);
    try {
      const r = await fetch(`${STATS_URL}?key=${encodeURIComponent(statsKey.trim())}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setStats(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setStatsLoading(false);
    }
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copied");
  };

  const curlExample = `curl -X POST ${CHAT_URL} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "model": "xprivo",
    "web": false,
    "messages": [{"role":"user","content":"Hello!"}]
  }'`;

  const jsExample = `const res = await fetch("${CHAT_URL}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    model: "xprivo",
    web: false,
    image: false,
    messages: [{ role: "user", content: "Hello!" }]
  })
});
// Streams SSE (text/event-stream) for chat models
// Returns JSON { image, text } when image:true`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Back</Button></Link>
          <h1 className="font-display text-lg font-semibold">API Documentation</h1>
        </div>
        <span className="text-xs text-muted-foreground">Free · No login · No limits</span>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Generate key */}
        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">1. Get an API Key</h2>
          <p className="mb-4 text-sm text-muted-foreground">No signup. No limits. Just a key for tracking your own usage.</p>
          <div className="flex gap-2">
            <Input placeholder="Optional name (e.g. my-app)" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={create} disabled={genLoading}>
              {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>
          {genKey && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="mb-1 text-xs text-muted-foreground">Your API Key (save it now):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all text-sm">{genKey}</code>
                <Button size="icon" variant="ghost" onClick={() => copy(genKey)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </Card>

        {/* Stats lookup */}
        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">2. Check Key Status & Usage</h2>
          <p className="mb-4 text-sm text-muted-foreground">Anyone with the key can view its public stats.</p>
          <div className="flex gap-2">
            <Input placeholder="Paste API key" value={statsKey} onChange={(e) => setStatsKey(e.target.value)} />
            <Button onClick={lookup} disabled={statsLoading}>
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
            </Button>
          </div>
          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Status" value={stats.stats.working ? "✅ Working" : "❌ Disabled"} />
              <Stat label="Total calls" value={String(stats.stats.total_calls)} />
              <Stat label="Last 24h" value={String(stats.stats.last_24h)} />
              <Stat label="Errors" value={String(stats.stats.errors)} />
            </div>
          )}
        </Card>

        {/* Endpoints */}
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-semibold">3. Endpoint</h2>
          <div className="rounded bg-white/[0.04] p-3 font-mono text-sm break-all">POST {CHAT_URL}</div>
          <h3 className="mt-4 mb-2 font-semibold">Body parameters</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><code className="text-foreground">model</code> — one of: <code>xprivo</code>, <code>qwen-latest</code>, <code>kimi-2.5</code>, <code>mistral-3</code>, <code>gpt-5.2</code>, <code>gemini-3-pro</code>, <code>gemini-3-pro-reasoning</code>, <code>image</code></li>
            <li><code className="text-foreground">messages</code> — array of {`{role, content}`}</li>
            <li><code className="text-foreground">web</code> — boolean, enable web search (xprivo models)</li>
            <li><code className="text-foreground">image</code> — boolean, generate an image instead</li>
          </ul>
          <h3 className="mt-4 mb-2 font-semibold">Headers</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><code className="text-foreground">x-api-key</code> — optional; for usage tracking</li>
          </ul>
        </Card>

        {/* Examples */}
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-semibold">4. Examples</h2>
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">cURL</span>
              <Button size="icon" variant="ghost" onClick={() => copy(curlExample)}><Copy className="h-4 w-4" /></Button>
            </div>
            <pre className="overflow-x-auto rounded bg-white/[0.04] p-3 text-xs">{curlExample}</pre>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">JavaScript / TypeScript</span>
              <Button size="icon" variant="ghost" onClick={() => copy(jsExample)}><Copy className="h-4 w-4" /></Button>
            </div>
            <pre className="overflow-x-auto rounded bg-white/[0.04] p-3 text-xs">{jsExample}</pre>
          </div>
        </Card>
      </main>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border border-white/10 bg-white/[0.04] p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

export default Docs;
