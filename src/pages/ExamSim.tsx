import { useEffect, useState } from "react"
import { buildExam, type Item } from "@/lib/quizEngine"

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

  useEffect(()=>{
    loadBank().then(({questions})=>{
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

  const [time, setTime] = useState<number>(180*60)
  useEffect(()=>{
    if(!started || idx === items.length -1) return
    const id = setInterval(()=> setTime(t=>Math.max(0, t-1)), 1000)
    return ()=> clearInterval(id)
  }, [started, idx, items.length])

  function onAnswer(choice:number){
    if (selected !== null) return
    setSelected(choice)
    const correct = choice === items[idx].answerIndex
    if (correct) setScore(s => s+1)
  }

  function next() {
    if (idx < items.length - 1) {
      setSelected(null)
      setIdx(i=> i+1)
    }
  }

  if(!ready) return <div className="p-4 text-sm text-muted">Se încarcă simularea…</div>

  const q = items[idx]
  const minutes = Math.floor(time/60).toString().padStart(2,'0')
  const seconds = (time%60).toString().padStart(2,'0')
  const finished = idx === items.length - 1 && selected !== null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Simulare examen — 90 întrebări</div>
        <div className="text-sm tabular-nums text-muted">⏱ {minutes}:{seconds}</div>
      </div>

      {!started ? (
        <div className="card space-y-3">
          <div className="text-sm">Seed: <input className="input" value={seed} onChange={e=>setSeed(parseInt(e.target.value||'0'))} /></div>
          <button className="btn btn-primary" onClick={()=>setStarted(true)}>Start</button>
        </div>
      ) : (
        <div className="space-y-3">
          {q.passage && <div className="p-3 rounded-lg bg-card whitespace-pre-wrap text-muted">{q.passage}</div>}
          <div className="text-base font-medium">{q.question || q.prompt}</div>
          <div className="space-y-2">
            {q.options.map((opt, i)=>{
              const isSelected = selected !== null;
              const isCorrect = isSelected && i === q.answerIndex;
              const isWrong = isSelected && i === selected && !isCorrect;

              let stateClasses = "border-border bg-card hover:bg-white/10";
              if (isCorrect) {
                stateClasses = "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
              } else if (isWrong) {
                stateClasses = "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
              }
              
              const clickable = selected === null ? "cursor-pointer" : "opacity-90";

              return (
                <div key={i}
                    className={`p-3 rounded-lg border ${stateClasses} ${clickable}`}
                    onClick={()=> onAnswer(i)}>
                  {opt}
                </div>
              )
            })}
          </div>
          {selected!==null && (
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
            <div className="text-sm font-semibold">Scor: {score} / {items.length}</div>
            {!finished ?
              <button className="btn btn-primary" onClick={next} disabled={selected === null}>Întrebarea următoare</button>
            : <div className="text-sm font-bold text-primary">Test finalizat!</div>
            }
          </div>
        </div>
      )}
    </div>
  )
}