import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, KeyRound, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Tilt } from "@/components/fx/Tilt";
import { Reveal } from "@/components/fx/Reveal";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CHAT_ENDPOINT = `${SUPABASE_URL}/functions/v1/chat`;
const KEY_ENDPOINT = `${SUPABASE_URL}/functions/v1/generate-key`;

const Docs = () => {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(KEY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null }),
      });
      const data = await res.json();
      if (!data?.api_key) throw new Error(data?.error || "Failed");
      setApiKey(data.api_key);
      toast.success("API key generated! Save it — it won't be shown again.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate key");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const exampleKey = apiKey || "YOUR_API_KEY";

  const curl = `curl -N -X POST ${CHAT_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${exampleKey}" \\
  -d '{"message":"Hello GLM!"}'`;

  const js = `const res = await fetch("${CHAT_ENDPOINT}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${exampleKey}",
  },
  body: JSON.stringify({ message: "Hello GLM!" }),
});

// Stream tokens as they arrive
const reader = res.body.getReader();
const dec = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process.stdout.write(dec.decode(value));
}`;

  const py = `import requests

with requests.post(
    "${CHAT_ENDPOINT}",
    headers={"x-api-key": "${exampleKey}"},
    json={"message": "Hello GLM!"},
    stream=True,
) as r:
    for line in r.iter_lines():
        if line: print(line.decode())`;

  return (
    <div className="relative min-h-screen bg-background noise">
      <SiteHeader />

      {/* Hero */}
      <section className="relative border-b border-white/5">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="container relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Documentation · v1
            </span>
            <h1 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-7xl">
              Build with <span className="gradient-text">GLM</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              One endpoint. Streaming responses. No login required.
              Generate your API key below and start shipping.
            </p>
          </div>
        </div>
      </section>

      <div className="container max-w-4xl py-16 space-y-10">
        {/* Generate key */}
        <Reveal>
        <Tilt max={5} scale={1.005} depth={20} glare={false} className="rounded-3xl">
        <section className="glow-ring rounded-3xl border border-white/10 bg-card p-8">
          <div className="mb-2 flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h2 className="font-display text-2xl font-semibold tracking-tight">Generate API key</h2>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            No login. No verification. Optional label, then click Generate.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Optional label (e.g. 'my-app')"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 flex-1 rounded-xl border-white/10 bg-white/[0.03]"
            />
            <Button
              onClick={generate}
              disabled={loading}
              className="h-12 rounded-xl bg-foreground px-6 text-background hover:bg-white/90"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Key
            </Button>
          </div>

          {apiKey && (
            <div className="reveal-up mt-6 rounded-2xl border border-white/20 bg-white/[0.04] p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Your API key
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-background px-3 py-2.5 font-mono text-sm">
                  {apiKey}
                </code>
                <Button size="icon" variant="secondary" className="rounded-lg" onClick={() => copy(apiKey, "key")}>
                  {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                ⚠ Save this somewhere safe — for security it cannot be retrieved later.
              </p>
            </div>
          )}
        </section>
        </Tilt>
        </Reveal>

        {/* Endpoint */}
        <Reveal delay={80}>
        <Tilt max={4} scale={1.005} depth={15} glare={false} className="rounded-3xl">
        <section className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">Endpoint</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-foreground px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-background">
              POST
            </span>
            <code className="flex-1 break-all rounded-lg bg-background px-3 py-2.5 font-mono text-sm">
              {CHAT_ENDPOINT}
            </code>
            <Button size="icon" variant="secondary" className="rounded-lg" onClick={() => copy(CHAT_ENDPOINT, "url")}>
              {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <h3 className="mt-8 mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Headers</h3>
          <ul className="space-y-2 text-sm">
            <li><code className="rounded-md bg-background px-2.5 py-1 font-mono">Content-Type: application/json</code></li>
            <li><code className="rounded-md bg-background px-2.5 py-1 font-mono">x-api-key: YOUR_API_KEY</code></li>
          </ul>

          <h3 className="mt-8 mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Request body</h3>
          <pre className="overflow-x-auto rounded-xl border border-white/5 bg-background p-5 font-mono text-xs leading-relaxed">{`{
  "message": "Hello GLM!"
}

// or for multi-turn conversation:
{
  "messages": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" },
    { "role": "user", "content": "Tell me a joke" }
  ],
  "stream": true
}`}</pre>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Zap className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h4 className="font-display text-sm font-semibold">Streaming (default)</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tokens stream as Server-Sent Events for instant feedback. Pass <code className="rounded bg-background px-1.5 py-0.5 font-mono">{`"stream": false`}</code> to receive a single JSON object.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-3 font-mono text-[11px]">{`data: {"content":"Hello"}
data: {"content":" world"}
data: [DONE]`}</pre>
            </div>
          </div>
        </section>
        </Tilt>
        </Reveal>

        {/* Examples */}
        <Reveal delay={160}>
        <Tilt max={4} scale={1.005} depth={15} glare={false} className="rounded-3xl">
        <section className="rounded-3xl border border-white/10 bg-card p-8">
          <h2 className="mb-5 font-display text-2xl font-semibold tracking-tight">Code examples</h2>
          <Tabs defaultValue="curl">
            <TabsList className="rounded-full border border-white/10 bg-white/[0.03] p-1">
              <TabsTrigger value="curl" className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">cURL</TabsTrigger>
              <TabsTrigger value="js" className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">JavaScript</TabsTrigger>
              <TabsTrigger value="py" className="rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">Python</TabsTrigger>
            </TabsList>
            {[
              { id: "curl", code: curl },
              { id: "js", code: js },
              { id: "py", code: py },
            ].map((ex) => (
              <TabsContent key={ex.id} value={ex.id} className="mt-4">
                <div className="relative">
                  <pre className="overflow-x-auto rounded-xl border border-white/5 bg-background p-5 font-mono text-xs leading-relaxed">{ex.code}</pre>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-3 top-3 rounded-lg"
                    onClick={() => copy(ex.code, ex.id)}
                  >
                    {copied === ex.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>
        </Tilt>
        </Reveal>

        <p className="pt-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Backend running 24/7 · Powered by GLM 5.1 · Edge functions
        </p>
      </div>
    </div>
  );
};

export default Docs;
