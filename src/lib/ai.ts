/**
 * Simple Gemini client for the browser.
 * Uses VITE_GEMINI_API_KEY (set it in .env and Netlify UI).
 *
 * NOTE: For stricter security, proxy this through a Netlify Function.
 */
export type AiModel = "gemini-1.5-flash" | "gemini-1.5-pro";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY is not set. AI features will be disabled.");
}

async function callGemini(model: AiModel, system: string, user: string, abort?: AbortSignal): Promise<string> {
  if (!API_KEY) throw new Error("Lipsă VITE_GEMINI_API_KEY");
  const url = `${API_BASE}/models/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [
      { role: "user", parts: [{ text: `${system}\n\n---\n${user}` }] }
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 1200
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: abort
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> "");
    throw new Error(`Gemini API ${res.status}: ${t || res.statusText}`);
  }
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) throw new Error("Răspuns AI gol");
  return out;
}

export async function aiSummarize(text: string, context: string = "") {
  const system = "You are a precise Romanian learning assistant. Summarize the content concisely in Romanian. Use bullet points and short headings. Keep legal names and citations intact. If the user asked for an outline, produce nested bullets.";
  return callGemini("gemini-1.5-flash", system, `Context:\n${context}\n\nText:\n${text}`);
}

export async function aiExplain(text: string, question?: string) {
  const system = "Ești un mentor prietenos. Explică pe scurt în română, pe nivel începător, apoi oferă o clarificare avansată. Structură: 'Pe scurt', 'Detaliat', 'Exemplu (dacă are sens)'.";
  const user = question
    ? `Întrebare: ${question}\nFragment:\n${text}`
    : `Explică următorul fragment:\n${text}`;
  return callGemini("gemini-1.5-flash", system, user);
}

export async function aiQuiz(text: string, n: number = 5) {
  const system = "Generează itemi grilă în română, dificili, fără indicii evidente. 4 opțiuni (A-D), exact 1 corectă. Returnează JSON: [{question, choices:[A,B,C,D], answer:'A', why:'...'}].";
  const out = await callGemini("gemini-1.5-flash", system, `Creează ${n} întrebări din textul:\n${text}`);
  try {
    const jsonStart = out.indexOf("[")>=0 ? out.indexOf("[") : 0;
    const jsonStr = out.slice(jsonStart).trim();
    return JSON.parse(jsonStr);
  } catch {
    return out;
  }
}

export async function aiFlashcards(text: string, n: number = 10) {
  const system = "Extrage concepte cheie și creează 10 flashcard-uri stil (front/back) în română. Returnează JSON: [{front, back}]";
  const out = await callGemini("gemini-1.5-flash", system, `Text:\n${text}\n\nCreează ${n} carduri.`);
  try {
    const jsonStart = out.indexOf("[")>=0 ? out.indexOf("[") : 0;
    const jsonStr = out.slice(jsonStart).trim();
    return JSON.parse(jsonStr);
  } catch {
    return out;
  }
}

export async function aiAsk(text: string, question: string) {
  const system = "Răspunde strict pe baza textului oferit. Dacă nu este în text, spune politicos că nu poți confirma. Limba: română.";
  return callGemini("gemini-1.5-flash", system, `Context:\n${text}\n\nÎntrebare:\n${question}`);
}

// Compatibility alias for older imports: import { askAI } from "@/lib/ai"
export const askAI = aiAsk;
