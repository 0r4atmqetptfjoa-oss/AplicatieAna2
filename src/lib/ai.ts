/**
 * Gemini client pentru browser.
 * IMPORTANT: Această implementare expune cheia API în browser.
 * Este recomandat să migrați toate apelurile AI către funcții Netlify
 * pentru a proteja cheia API.
 */
export type AiModel = "gemini-1.5-flash" | "gemini-1.5-pro";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY nu este setată. Funcționalitățile AI din client vor fi dezactivate.");
}

async function callGemini(model: AiModel, system: string, user: string, abort?: AbortSignal): Promise<string> {
  if (!API_KEY) throw new Error("Cheia VITE_GEMINI_API_KEY lipsește. Seteaz-o în variabilele de mediu.");
  
  const url = `${API_BASE}/models/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [
      { role: "user", parts: [{ text: user }] }
    ],
    systemInstruction: {
      role: "system",
      parts: [{ text: system }]
    },
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
    throw new Error(`Eroare API Gemini ${res.status}: ${t || res.statusText}`);
  }

  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) throw new Error("Răspunsul de la AI este gol.");
  return out;
}

export async function aiSummarize(text: string, context: string = "") {
  const system = "Ești un asistent de învățare precis, în limba română. Rezumă concis conținutul oferit. Folosește liste (bullet points) și titluri scurte. Păstrează intacte denumirile legale și citatele.";
  return callGemini("gemini-1.5-flash", system, `Context:\n${context}\n\nText de rezumat:\n${text}`);
}

export async function aiExplain(text: string, question?: string) {
  const system = "Ești un mentor prietenos. Explică pe scurt în română, la un nivel de începător, apoi oferă o clarificare avansată. Folosește structura: 'Pe scurt', 'Detaliat', și 'Exemplu' (dacă este relevant).";
  const user = question
    ? `Întrebare: ${question}\nFragment de text:\n${text}`
    : `Explică următorul fragment:\n${text}`;
  return callGemini("gemini-1.5-flash", system, user);
}

export async function aiQuiz(text: string, n: number = 5) {
  const system = "Generează întrebări grilă dificile în limba română, fără indicii evidente în textul întrebării. Formatul trebuie să fie 4 opțiuni (A-D), cu exact un răspuns corect. Returnează un array JSON valid: [{question, choices:[A,B,C,D], answer:'A', why:'Explicație...'}].";
  const out = await callGemini("gemini-1.5-flash", system, `Creează ${n} întrebări din textul următor:\n${text}`);
  try {
    const jsonStart = out.indexOf("[");
    const jsonEnd = out.lastIndexOf("]") + 1;
    const jsonStr = out.slice(jsonStart, jsonEnd).trim();
    return JSON.parse(jsonStr);
  } catch(e) {
    console.error("Eroare la parsarea JSON-ului de la AI pentru Quiz:", e, "\nText primit:", out);
    return "Am primit un format invalid de la AI. Încearcă din nou.";
  }
}

export async function aiFlashcards(text: string, n: number = 10) {
  const system = "Extrage concepte cheie și creează flashcard-uri (față/verso) în limba română. Returnează un array JSON valid: [{front, back}].";
  const out = await callGemini("gemini-1.5-flash", system, `Text:\n${text}\n\nCreează ${n} flashcard-uri.`);
   try {
    const jsonStart = out.indexOf("[");
    const jsonEnd = out.lastIndexOf("]") + 1;
    const jsonStr = out.slice(jsonStart, jsonEnd).trim();
    return JSON.parse(jsonStr);
  } catch(e) {
    console.error("Eroare la parsarea JSON-ului de la AI pentru Flashcards:", e, "\nText primit:", out);
    return "Am primit un format invalid de la AI. Încearcă din nou.";
  }
}

export async function aiAsk(text: string, question: string) {
  const system = "Răspunde la întrebare strict pe baza textului oferit. Dacă informația nu se găsește în text, menționează politicos acest lucru. Limba de răspuns este română.";
  return callGemini("gemini-1.5-flash", system, `Context:\n${text}\n\nÎntrebare:\n${question}`);
}

// Alias pentru compatibilitate cu importuri mai vechi
export const askAI = aiAsk;