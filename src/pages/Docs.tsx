import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ArrowLeft, CheckCircle2, XCircle, Zap, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`;
const OPENAI_BASE = `${SUPABASE_URL}/functions/v1/v1`;
const OPENAI_FULL = `${OPENAI_BASE}/chat/completions`;
const GEN_URL = `${SUPABASE_URL}/functions/v1/generate-key`;
const STATS_URL = `${SUPABASE_URL}/functions/v1/key-stats`;

type Stats = {
  key: { name: string | null; active: boolean; created_at: string };
  stats: { total_calls: number; success: number; errors: number; last_24h: number; working: boolean };
};

const ALL_MODELS: { id: string; label: string; group: string }[] = [
  { id: "xprivo", label: "xPrivo (default)", group: "xPrivo" },
  { id: "mistral-3", label: "Mistral 3", group: "xPrivo" },
];

const Docs = () => {
  // Generate key
  const [name, setName] = useState("");
  const [genKey, setGenKey] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  // Stats
  const [statsKey, setStatsKey] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Configure New Provider
  const [provider, setProvider] = useState("OpenAI Compatible");
  const [providerName, setProviderName] = useState("Lovable AI Cloud");
  const [baseUrl, setBaseUrl] = useState(OPENAI_BASE);
  const [providerKey, setProviderKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("xprivo");
  const [contextWindow, setContextWindow] = useState("128000");
  const [maxOutput, setMaxOutput] = useState("8192");
  const [temperature, setTemperature] = useState("0.7");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(null);

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
      setProviderKey(d.api_key);
      toast.success("API key created & auto-filled below");
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

  const testProvider = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(providerKey ? { Authorization: `Bearer ${providerKey}` } : {}),
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: "Say 'ok' in one word." }],
          stream: false,
          temperature: parseFloat(temperature) || 0.7,
        }),
      });
      const txt = await r.text();
      if (!r.ok) throw new Error(txt.slice(0, 200));
      setTestResult({ ok: true, msg: `Connected · ${selectedModel} responded successfully` });
      toast.success("Connection OK");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setTestResult({ ok: false, msg });
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copied");
  };

  // Auto-fill context window/max output based on selected model
  const autoFill = useMemo(() => {
    const m = selectedModel;
    if (m.includes("gemini-3.1-pro") || m.includes("gemini-2.5-pro") || m.includes("gemini-3-pro")) {
      return { context: "1000000", output: "8192" };
    }
    if (m.includes("flash")) return { context: "1000000", output: "8192" };
    if (m.includes("gpt-5")) return { context: "200000", output: "16384" };
    if (m.includes("gemma")) return { context: "32000", output: "8192" };
    return { context: "128000", output: "8192" };
  }, [selectedModel]);

  // Apply auto-fill when model changes
  const onModelChange = (m: string) => {
    setSelectedModel(m);
    const lower = m.toLowerCase();
    if (lower.includes("flux") || lower.includes("sdxl")) {
      setContextWindow("0"); setMaxOutput("0");
    } else if (lower.includes("gemini") || (lower.includes("flash") && !lower.includes("v4-flash"))) {
      setContextWindow("1000000"); setMaxOutput("8192");
    } else if (lower.includes("gpt-5") || lower.includes("gpt-4")) {
      setContextWindow("128000"); setMaxOutput("16384");
    } else if (lower.includes("llama-4") || lower.includes("scout")) {
      setContextWindow("131072"); setMaxOutput("8192");
    } else if (lower.includes("llama-3.3") || lower.includes("70b") || lower.includes("120b")) {
      setContextWindow("128000"); setMaxOutput("8192");
    } else if (lower.includes("deepseek") || lower.includes("v4-pro") || lower.includes("v4-flash")) {
      setContextWindow("64000"); setMaxOutput("8192");
    } else if (lower.includes("kimi")) {
      setContextWindow("200000"); setMaxOutput("8192");
    } else if (lower.includes("gemma")) {
      setContextWindow("32000"); setMaxOutput("8192");
    } else if (lower.includes("turbo") || lower.includes("router")) {
      setContextWindow("128000"); setMaxOutput("8192");
    } else {
      setContextWindow("32000"); setMaxOutput("4096");
    }
  };

  const curlExample = `curl ${OPENAI_FULL} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${providerKey || "YOUR_API_KEY"}" \\
  -d '{
    "model": "${selectedModel}",
    "messages": [{"role":"user","content":"Hello!"}],
    "stream": false
  }'`;

  const pyExample = `from openai import OpenAI

client = OpenAI(
  base_url="${OPENAI_BASE}",
  api_key="${providerKey || "YOUR_API_KEY"}"
)

resp = client.chat.completions.create(
  model="${selectedModel}",
  messages=[{"role": "user", "content": "Hello!"}]
)
print(resp.choices[0].message.content)`;

  const jsExample = `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "${OPENAI_BASE}",
  apiKey: "${providerKey || "YOUR_API_KEY"}",
});

const r = await openai.chat.completions.create({
  model: "${selectedModel}",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(r.choices[0].message.content);`;

  const toolsExample = `// Tool / function calling — works in n8n, Make, Cline, etc.
const r = await openai.chat.completions.create({
  model: "${selectedModel}",
  messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    },
  }],
  tool_choice: "auto",
});
console.log(r.choices[0].message.tool_calls);`;

  const visionExample = `// Vision / image input — attach an image with any model.
// Requests containing images are auto-routed to a vision-capable model.
const r = await openai.chat.completions.create({
  model: "${selectedModel}",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "What is in this image?" },
      { type: "image_url", image_url: {
          url: "https://example.com/photo.jpg"
          // or a data URL: "data:image/jpeg;base64,/9j/4AAQ..."
      }},
    ],
  }],
});
console.log(r.choices[0].message.content);`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Back</Button></Link>
          <h1 className="font-display text-lg font-semibold">API Documentation</h1>
          <Badge variant="secondary" className="hidden sm:inline-flex">OpenAI Compatible</Badge>
        </div>
        <span className="text-xs text-muted-foreground">Free · No login · Unlimited</span>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Hero */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Feature icon={<Zap className="h-4 w-4" />} title="OpenAI Compatible" desc="Drop-in replacement for OpenAI SDKs" />
          <Feature icon={<Globe className="h-4 w-4" />} title="40+ Models" desc="Llama 4, Gemini, DeepSeek, Kimi, Qwen, GPT, Flux, Perplexity" />
          <Feature icon={<Lock className="h-4 w-4" />} title="No Login Required" desc="Generate a key instantly, track usage" />
        </div>

        {/* Generate key */}
        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">1. Get an API Key</h2>
          <p className="mb-4 text-sm text-muted-foreground">Free. No signup. Used to track your usage.</p>
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

        {/* Configure New Provider */}
        <Card className="p-6">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-semibold">2. Configure New Provider</h2>
            <Badge variant="outline">Auto-filled</Badge>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            Add a new LLM provider configuration with API key and model settings.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs">Provider Type</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["OpenAI Compatible","ChatGPT Plus/Pro","GitHub Copilot","Qwen Code","Moonshot AI","Anthropic","OpenAI","Gemini","OpenRouter","Azure","Ollama","LM Studio","AWS Bedrock","BrowserOS"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">Use “OpenAI Compatible” for this API.</p>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Provider Name</Label>
              <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs">Base URL</Label>
              <div className="flex gap-2">
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="font-mono text-xs" />
                <Button variant="ghost" size="icon" onClick={() => copy(baseUrl)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs">API Key</Label>
              <Input
                type="password"
                placeholder="Generate one above or paste your key"
                value={providerKey}
                onChange={(e) => setProviderKey(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Your API key is sent over HTTPS. Optional — anonymous calls also work.</p>
            </div>

            <div className="sm:col-span-2">
              <h3 className="mb-2 mt-2 text-sm font-semibold">Model Configuration</h3>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Model</Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span>{m.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{m.group}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Context Window <span className="text-muted-foreground">(auto-filled)</span></Label>
              <Input value={contextWindow} onChange={(e) => setContextWindow(e.target.value)} />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Max Output Tokens <span className="text-muted-foreground">(auto-filled)</span></Label>
              <Input value={maxOutput} onChange={(e) => setMaxOutput(e.target.value)} />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Temperature <span className="text-muted-foreground">(0–2, controls randomness)</span></Label>
              <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            {testResult && (
              <span className={`mr-auto flex items-center gap-1.5 text-sm ${testResult.ok ? "text-green-500" : "text-red-500"}`}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <span className="max-w-[300px] truncate">{testResult.msg}</span>
              </span>
            )}
            <Button variant="outline" onClick={() => { setTestResult(null); setProviderKey(""); }}>Cancel</Button>
            <Button onClick={testProvider} disabled={testing}>
              {testing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Test
            </Button>
          </div>
        </Card>

        {/* Stats lookup */}
        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">3. Check Key Status & Usage</h2>
          <p className="mb-4 text-sm text-muted-foreground">Public stats — anyone with a key can view its activity.</p>
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
          <h2 className="mb-3 text-lg font-semibold">4. Endpoints (OpenAI Compatible)</h2>
          <div className="space-y-2">
            <EndpointRow method="POST" url={`${OPENAI_BASE}/chat/completions`} desc="Chat completions (streaming + non-streaming)" />
            <EndpointRow method="GET" url={`${OPENAI_BASE}/models`} desc="List all available models" />
            <EndpointRow method="POST" url={CHAT_URL} desc="Legacy simple chat endpoint (also supports image: true)" />
          </div>

          <h3 className="mt-5 mb-2 font-semibold">Available Models</h3>
          <div className="flex flex-wrap gap-1.5">
            {ALL_MODELS.map(m => (
              <code key={m.id} className="rounded bg-white/[0.04] px-2 py-1 text-xs">{m.id}</code>
            ))}
          </div>
        </Card>

        {/* Examples */}
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-semibold">5. Code Examples</h2>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JS/TS (OpenAI SDK)</TabsTrigger>
              <TabsTrigger value="py">Python (OpenAI SDK)</TabsTrigger>
              <TabsTrigger value="tools">Tool Calling</TabsTrigger>
            </TabsList>
            <TabsContent value="curl">
              <CodeBlock code={curlExample} onCopy={() => copy(curlExample)} />
            </TabsContent>
            <TabsContent value="js">
              <CodeBlock code={jsExample} onCopy={() => copy(jsExample)} />
            </TabsContent>
            <TabsContent value="py">
              <CodeBlock code={pyExample} onCopy={() => copy(pyExample)} />
            </TabsContent>
            <TabsContent value="tools">
              <CodeBlock code={toolsExample} onCopy={() => copy(toolsExample)} />
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
};

const Feature = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
    <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border border-white/10 bg-white/[0.04] p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

const EndpointRow = ({ method, url, desc }: { method: string; url: string; desc: string }) => (
  <div className="flex items-start gap-2 rounded bg-white/[0.04] p-2 font-mono text-xs">
    <Badge variant={method === "POST" ? "default" : "secondary"} className="shrink-0">{method}</Badge>
    <div className="flex-1 break-all">
      <div>{url}</div>
      <div className="mt-0.5 font-sans text-[11px] text-muted-foreground">{desc}</div>
    </div>
  </div>
);

const CodeBlock = ({ code, onCopy }: { code: string; onCopy: () => void }) => (
  <div className="relative">
    <Button size="icon" variant="ghost" className="absolute right-1 top-1" onClick={onCopy}><Copy className="h-4 w-4" /></Button>
    <pre className="overflow-x-auto rounded bg-white/[0.04] p-3 pr-10 text-xs">{code}</pre>
  </div>
);

export default Docs;