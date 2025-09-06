// v2.8 ExamSim patch: seed + difficulty mix + adaptive optional
import { useEffect, useMemo, useRef, useState } from "react"
import { buildExam, buildAdaptiveQueue, type Item } from "@/lib/quizEngine"

type Bank = { questions: Item[] }
async function loadBank(): Promise<Bank> {
  const [leg, spec] = await Promise.all([
    fetch("/data/v12/legislation.json").then(r=>r.json()),
    fetch("/data/v12/logistics.json").then(r=>r.json())
  ])
  const questions = [...(leg?.questions||[]), ...(spec?.questions||[])]
  return { questions }
}

export default function ExamSim() {
  const [ready, setReady] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number|null>(null)
  const [score, setScore] = useState(0)
  const [started, setStarted] = useState(false)
  const [seed, setSeed] = useState<number>(Math.floor(Math.random()*100000))
  const [adaptive, setAdaptive] = useState<boolean>(true)
  const [time, setTime] = useState<number>(180*60) // 180 min

  useEffect(()=>{
    loadBank().then(({questions})=>{
      // Fixed 30 legislație + 60 specialitate (approx by module tag), difficulty mix
      const legislation = questions.filter(q=>q.module==='legislation')
      const specialty   = questions.filter(q=>q.module==='specialty')
      const picked = [
        ...buildExam(legislation, {limit:30, ratios:{easy:0.3, medium:0.5, hard:0.2}, seed, antiGuessing:true}),
        ...buildExam(specialty,   {limit:60, ratios:{easy:0.3, medium:0.5, hard:0.2}, seed: seed+99, antiGuessing:true}),
      ]
      setItems(picked)
      setReady(true)
    })
  }, [seed])

  useEffect(()=>{
    if(!started) return
    const id = setInterval(()=> setTime(t=>Math.max(0, t-1)), 1000)
    return ()=> clearInterval(id)
  }, [started])

  function onAnswer(choice:number){
    if (selected !== null) return
    setSelected(choice)
    const correct = choice === items[idx].answerIndex
    if (correct) setScore(s => s+1)
  }

  function next() {
    setSelected(null)
    setIdx(i=> Math.min(items.length-1, i+1))
  }

  if(!ready) return <div className="p-4 text-sm">Se încarcă simularea…</div>

  const q = items[idx]
  const minutes = Math.floor(time/60).toString().padStart(2,'0')
  const seconds = (time%60).toString().padStart(2,'0')

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Simulare examen — 90 întrebări</div>
        <div className="text-sm tabular-nums">⏱ {minutes}:{seconds}</div>
      </div>

      {!started ? (
        <div className="space-y-3">
          <div className="text-sm">Seed: <input className="border px-2 py-1 rounded" value={seed} onChange={e=>setSeed(parseInt(e.target.value||'0'))} /></div>
          <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={()=>setStarted(true)}>Start</button>
        </div>
      ) : (
        <div className="space-y-3">
          {q.passage && <div className="p-3 rounded-lg bg-muted whitespace-pre-wrap">{q.passage}</div>}
          <div className="text-base font-medium">{q.question || q.prompt}</div>
          <div className="space-y-2">
            {q.options.map((opt, i)=>{
              const state = selected===null ? "border" : (i===q.answerIndex?"border-green-500 bg-green-50":"border-red-500 bg-red-50")
              const clickable = selected===null ? "cursor-pointer hover:bg-muted" : "opacity-75"
              return (
                <div key={i}
                    className={`p-3 rounded border ${state} ${clickable}`}
                    onClick={()=> onAnswer(i)}>
                  {opt}
                </div>
              )
            })}
          </div>
          {selected!==null && (
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
            <div className="text-sm">Scor: {score} / {items.length}</div>
            <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={next}>Întrebarea următoare</button>
          </div>
        </div>
      )}
    </div>
  )
}