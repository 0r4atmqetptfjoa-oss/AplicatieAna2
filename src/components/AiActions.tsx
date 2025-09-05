import { useMemo, useRef, useState } from "react";
import { aiSummarize, aiExplain, aiQuiz, aiFlashcards, aiAsk } from "@/lib/ai";

export default function AiActions({ text, compact=false }: { text: string; compact?: boolean; }){
  const [out, setOut] = useState<string>("");
  const [loading, setLoading] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [n, setN] = useState<number>(5);
  const abortRef = useRef<AbortController|null>(null);

  const disabled = useMemo(()=> !import.meta.env.VITE_GEMINI_API_KEY, []);

  const run = async (label: string, fn: ()=>Promise<any>)=>{
    setErr(""); setLoading(label); setOut("");
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const r = await fn();
      if (typeof r === "string") setOut(r);
      else setOut("```json\n" + JSON.stringify(r, null, 2) + "\n```");
    } catch(e:any){
      setErr(e?.message || "Eroare AI");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className={`rounded-2xl border bg-bg/50 p-3 space-y-3 ${compact ? "mt-2" : "mt-4"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm opacity-70">Asistent AI</span>
        <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-accent/10 disabled:opacity-50"
          disabled={disabled || !!loading}
          onClick={()=> run("Rezumat", ()=> aiSummarize(text))}>Rezumat</button>
        <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-accent/10 disabled:opacity-50"
          disabled={disabled || !!loading}
          onClick={()=> run("Explică", ()=> aiExplain(text))}>Explică</button>
        <div className="flex items-center gap-1">
          <input type="number" min={3} max={20} value={n} onChange={e=>setN(parseInt(e.target.value||"5"))}
            className="w-16 rounded-lg border px-2 py-1 text-sm" />
          <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-accent/10 disabled:opacity-50"
            disabled={disabled || !!loading}
            onClick={()=> run("Quiz", ()=> aiQuiz(text, n))}>Quiz</button>
          <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-accent/10 disabled:opacity-50"
            disabled={disabled || !!loading}
            onClick={()=> run("Flashcards", ()=> aiFlashcards(text, n))}>Flashcards</button>
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-[200px]">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Întreabă pe baza acestui text…"
            className="w-full rounded-lg border px-3 py-1.5 text-sm" />
          <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-accent/10 disabled:opacity-50"
            disabled={disabled || !q || !!loading}
            onClick={()=> run("Întrebare", ()=> aiAsk(text, q))}>Trimite</button>
        </div>
        {!!loading && <span className="text-xs opacity-70">({loading}…)</span>}
        {disabled && <span className="text-xs text-amber-600">Setează VITE_GEMINI_API_KEY ca variabilă de mediu.</span>}
      </div>

      {!!err && <div className="text-sm text-red-600">{err}</div>}

      {!!out && (
        <div className="rounded-xl border bg-white/60 dark:bg-black/20 p-3 prose max-w-none overflow-x-auto text-sm">
          <pre className="whitespace-pre-wrap"><code>{out}</code></pre>
        </div>
      )}
    </div>
  );
}
