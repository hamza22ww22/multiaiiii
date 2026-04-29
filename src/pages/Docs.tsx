import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, KeyRound, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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

  const curl = `curl -X POST ${CHAT_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${exampleKey}" \\
  -d '{"message":"Hello GLM!"}'`;

  const js = `const res = await fetch("${CHAT_ENDPOINT}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${exampleKey}"
  },
  body: JSON.stringify({ message: "Hello GLM!" })
});
const data = await res.json();
console.log(data.response);`;

  const py = `import requests

res = requests.post(
    "${CHAT_ENDPOINT}",
    headers={"x-api-key": "${exampleKey}"},
    json={"message": "Hello GLM!"},
)
print(res.json()["response"])`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="container max-w-4xl py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold md:text-4xl">API Documentation</h1>
          <p className="mt-2 text-muted-foreground">
            Generate a key, send messages, get answers. The backend is always on (24/7).
          </p>
        </div>

        {/* Generate key */}
        <Card className="mb-10 border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Generate an API key</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            No login required. Give it an optional label and click Generate.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Optional label (e.g. 'my-app')"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={generate} disabled={loading} className="glow">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Key
            </Button>
          </div>

          {apiKey && (
            <div className="mt-5 rounded-lg border border-primary/40 bg-primary/5 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Your API key</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-3 py-2 text-sm">{apiKey}</code>
                <Button size="icon" variant="secondary" onClick={() => copy(apiKey, "key")}>
                  {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                ⚠️ Save this somewhere safe — for security it cannot be retrieved later.
              </p>
            </div>
          )}
        </Card>

        {/* Endpoint */}
        <Card className="mb-10 border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Endpoint</h2>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary">POST</span>
            <code className="flex-1 break-all rounded bg-background px-3 py-2 text-sm">{CHAT_ENDPOINT}</code>
            <Button size="icon" variant="secondary" onClick={() => copy(CHAT_ENDPOINT, "url")}>
              {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold">Headers</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><code className="rounded bg-background px-2 py-0.5">Content-Type: application/json</code></li>
            <li><code className="rounded bg-background px-2 py-0.5">x-api-key: YOUR_API_KEY</code></li>
          </ul>

          <h3 className="mt-6 mb-2 text-sm font-semibold">Request body</h3>
          <pre className="overflow-x-auto rounded-lg bg-background p-4 text-xs">{`{
  "message": "Hello GLM!"
}

// or for multi-turn conversation:
{
  "messages": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" },
    { "role": "user", "content": "Tell me a joke" }
  ]
}`}</pre>

          <h3 className="mt-6 mb-2 text-sm font-semibold">Response</h3>
          <pre className="overflow-x-auto rounded-lg bg-background p-4 text-xs">{`{
  "success": true,
  "response": "Hello! I'm GLM..."
}`}</pre>
        </Card>

        {/* Examples */}
        <Card className="border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Code examples</h2>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="py">Python</TabsTrigger>
            </TabsList>
            {[
              { id: "curl", code: curl },
              { id: "js", code: js },
              { id: "py", code: py },
            ].map((ex) => (
              <TabsContent key={ex.id} value={ex.id}>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-background p-4 text-xs">{ex.code}</pre>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-2"
                    onClick={() => copy(ex.code, ex.id)}
                  >
                    {copied === ex.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Backend running 24/7 on serverless infrastructure · Powered by GLM 5.1
        </p>
      </div>
    </div>
  );
};

export default Docs;