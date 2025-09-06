// src/lib/gemini.ts
// Single-key setup: reads API key from Vite env: VITE_API_KEY
// Safe drop-in. Exports aiAsk() and askAI (alias).

export const GEMINI_KEY: string | undefined = import.meta.env.VITE_API_KEY;

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export type AiAskOptions = {
  temperature?: number;
  system?: string;
};

export async function aiAsk(prompt: string, opts: AiAskOptions = {}): Promise<string> {
  if (!GEMINI_KEY) {
    console.warn("VITE_API_KEY is not set. AI features will be disabled.");
    return "AI este dezactivat (lipsește VITE_API_KEY).";
  }
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
    },
  };
  // Optional system instruction (server supports 'systemInstruction')
  if (opts.system) {
    (body as any).systemInstruction = { role: "system", parts: [{ text: opts.system }] };
  }
  const url = `${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`Gemini HTTP ${res.status} – ${txt}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.trim();
}

// Backward-compat alias (Mentor.tsx may import { askAI })
export const askAI = aiAsk;
