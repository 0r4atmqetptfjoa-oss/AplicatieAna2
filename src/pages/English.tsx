import { useEffect, useState } from "react"
import type { Item } from "@/lib/quizEngine"

type EngData = { tests: Item[][], meta: any }

export default function English(){
  const [data, setData] = useState<EngData|null>(null)
  const [ti, setTi] = useState<number|null>(null) // test index
  const [qi, setQi] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [score, setScore] = useState(0)

  useEffect(()=>{
    fetch("/data/v12/english.json").then(r=>r.json()).then(setData)
  }, [])

  useEffect(()=>{ setQi(0); setSel(null); setScore(0) }, [ti])

  if(!data) return <div className="p-4 text-sm text-muted">Se încarcă testele de engleză…</div>

  if(ti===null){
    return (
      <div className="p-4 space-y-3">
        <div className="text-lg font-semibold">Teste doar engleză — 30 teste</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.tests.map((_,i)=>(
            <button key={i}
              className="py-3 px-4 rounded-xl bg-card hover:bg-white/10 border border-border"
              onClick={()=> setTi(i)}>
              Test {i+1}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const test = data.tests[ti]
  const q = test[qi]

  function onAnswer(i:number){
    if(sel!==null) return
    setSel(i)
    if(i===q.answerIndex) setScore(s=>s+1)
  }

  function next(){
    setSel(null)
    setQi(x=> Math.min(test.length-1, x+1))
  }

  const finished = qi===test.length-1 && sel!==null
  const grade = ((score + (sel === q.answerIndex ? 1 : 0)) / test.length) * 10

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm underline text-muted hover:text-text" onClick={()=> setTi(null)}>← Înapoi la lista de teste</button>
        <div className="text-sm text-muted">Progres: {qi+1}/{test.length}</div>
      </div>

      {q.passage && <div className="p-3 rounded-lg bg-card whitespace-pre-wrap text-muted">{q.passage}</div>}
      <div className="text-base font-medium">{q.prompt}</div>
      <div className="space-y-2">
        {q.options.map((opt, i)=>{
          const isSelected = sel !== null;
          const isCorrect = isSelected && i === q.answerIndex;
          const isWrong = isSelected && i === sel && !isCorrect;

          let stateClasses = "border-border bg-card hover:bg-white/10";
          if (isCorrect) {
            stateClasses = "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
          } else if (isWrong) {
            stateClasses = "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
          }
          
          const clickable = sel === null ? "cursor-pointer" : "opacity-90";

          return (
            <div key={i}
                className={`p-3 rounded-lg border ${stateClasses} ${clickable}`}
                onClick={()=> onAnswer(i)}>
              {opt}
            </div>
          )
        })}
      </div>
      {sel!==null && (
        <div className="text-sm p-3 rounded-lg bg-card mt-3">
          <div className="font-semibold mb-1">Explicație:</div>
          <div className="text-muted">{q.explanation || "—"}</div>
          {q.rationales && (
            <ul className="list-disc list-inside ml-1 mt-2 space-y-1 text-muted">
              {q.rationales.map((r,ri)=><li key={ri}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm font-semibold">Scor curent: {sel === null ? score : (q.answerIndex === sel ? score : score -1)} / {test.length}</div>
        {!finished ? (
          <button className="btn btn-primary" onClick={next} disabled={sel === null}>Întrebarea următoare</button>
        ) : (
          <div className={`text-sm font-bold ${grade >= 6 ? 'text-green-500' : 'text-red-500'}`}>
            Finalizat — Nota: {grade.toFixed(2)} — {grade >= 6 ? "Admis" : "Respins"}
          </div>
        )}
      </div>
    </div>
  )
}