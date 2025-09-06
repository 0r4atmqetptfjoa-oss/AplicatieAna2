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

  if(!data) return <div className="p-4 text-sm">Se încarcă testele de engleză…</div>

  if(ti===null){
    return (
      <div className="p-4 space-y-3">
        <div className="text-lg font-semibold">Teste doar engleză — 30 teste</div>
        <div className="grid grid-cols-2 gap-3">
          {data.tests.map((_,i)=>(
            <button key={i}
              className="py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30"
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
  const grade = ((score + (finished? (sel===q.answerIndex?1:0):0)) / test.length) * 10

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm underline" onClick={()=> setTi(null)}>← Înapoi la lista de teste</button>
        <div className="text-sm">Progres: {qi+1}/{test.length}</div>
      </div>

      {q.passage && <div className="p-3 rounded bg-muted whitespace-pre-wrap">{q.passage}</div>}
      <div className="text-base font-medium">{q.prompt}</div>
      <div className="space-y-2">
        {q.options.map((opt, i)=>{
          const state = sel===null ? "border" : (i===q.answerIndex?"border-green-500 bg-green-50":"border-red-500 bg-red-50")
          const clickable = sel===null ? "cursor-pointer hover:bg-muted" : "opacity-75"
          return (
            <div key={i}
                className={`p-3 rounded border ${state} ${clickable}`}
                onClick={()=> onAnswer(i)}>
              {opt}
            </div>
          )
        })}
      </div>
      {sel!==null && (
        <div className="text-sm p-3 rounded bg-muted">
          <div className="font-semibold mb-1">Explicație:</div>
          <div>{q.explanation || "—"}</div>
          {q.rationales && (
            <ul className="list-disc ml-5 mt-2">
              {q.rationales.map((r,ri)=><li key={ri}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm">Scor curent: {score}{sel!==null && (q.answerIndex===sel?"+1":"")} / {test.length}</div>
        {!finished ? (
          <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={next}>Întrebarea următoare</button>
        ) : (
          <div className="text-sm font-semibold">Finalizat — Nota: {grade.toFixed(2)} — {grade >= 6 ? "Admis" : "Respins"}</div>
        )}
      </div>
    </div>
  )
}