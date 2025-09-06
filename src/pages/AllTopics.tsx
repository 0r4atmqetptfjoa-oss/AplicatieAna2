import { useEffect, useMemo, useState } from "react"
import { buildExam, type Item } from "@/lib/quizEngine"

type Bank = { questions: Item[] }
async function loadAll(): Promise<Bank> {
  const [leg, spec, psy] = await Promise.all([
    fetch("/data/v12/legislation.json").then(r=>r.json()).catch(()=>({questions:[]})),
    fetch("/data/v12/logistics.json").then(r=>r.json()).catch(()=>({questions:[]})),
    fetch("/data/v12/psychology.json").then(r=>r.json()).catch(()=>({questions:[]}))
  ])
  const questions = [...(leg?.questions||[]), ...(spec?.questions||[]), ...(psy?.questions||[])]
  return { questions }
}

function useExamPlay(items: Item[], limit: number){
  const [started, setStarted] = useState(false)
  const [qi, setQi] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [score, setScore] = useState(0)
  const q = items[qi]

  function start(){ setStarted(true); setQi(0); setSel(null); setScore(0) }
  function onAnswer(i:number){
    if(sel!==null) return
    setSel(i); if(i===q.answerIndex) setScore(s=>s+1)
  }
  function next(){
    if(qi < items.length-1){ setQi(qi+1); setSel(null) }
  }
  const finished = started && qi===items.length-1 && sel!==null
  const finalScore = finished ? score + (sel===q.answerIndex?1:0) : score
  return {started, start, qi, q, sel, onAnswer, next, finished, finalScore, total: items.length}
}

export default function AllTopics() {
  const [questions, setQuestions] = useState<Item[]>([])
  const [seed, setSeed] = useState<number>(1234)
  const [limit, setLimit] = useState<number>(30)
  const [modules, setModules] = useState<string[]>(["legislation","specialty","psychology"])

  useEffect(()=>{ loadAll().then(({questions})=> setQuestions(questions)) }, [])

  function toggleModule(id:string){
    setModules(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const filtered = useMemo(()=> {
    if(modules.length===0) return []
    return questions.filter(q=> modules.includes(q.module||""))
  }, [questions, modules])

  const built = useMemo(()=> buildExam(filtered, {limit, ratios:{easy:0.3,medium:0.5,hard:0.2}, seed, antiGuessing:true}), [filtered, limit, seed])

  const play = useExamPlay(built, limit)

  return (
    <div className="p-4 space-y-4">
      {!play.started && (
        <>
          <div className="text-lg font-semibold">Teste din toată tematica</div>
          <div className="card space-y-3">
            <div className="font-medium">Alege modulele</div>
            <div className="flex flex-wrap gap-2">
              {["legislation","specialty","psychology"].map(m=>{
                const labels:any = {legislation:"Legislație", specialty:"Specialitate", psychology:"Psihologie"}
                const active = modules.includes(m)
                return (
                  <button key={m} onClick={()=> toggleModule(m)}
                    className={`px-3 py-1 rounded-full border ${active? "bg-primary text-primary-foreground border-primary":"bg-muted"}`}>
                    {labels[m]}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 items-center flex-wrap">
              <label className="text-sm">Întrebări:
                <input className="ml-2 w-20 border px-2 py-1 rounded" type="number" min={5} max={120} value={limit} onChange={e=>setLimit(parseInt(e.target.value||'0'))}/>
              </label>
              <label className="text-sm">Seed:
                <input className="ml-2 w-28 border px-2 py-1 rounded" value={seed} onChange={e=>setSeed(parseInt(e.target.value||'0'))}/>
              </label>
            </div>

            <div className="text-xs text-muted-foreground">
              Set pregătit: {built.length} întrebări • Module selectate: {modules.length>0?modules.join(", "):"—"}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                disabled={modules.length===0 || built.length===0}
                onClick={play.start}
                className="btn btn-primary">
                Start test
              </button>
            </div>
          </div>
        </>
      )}

      {play.started && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button className="text-sm underline" onClick={()=> window.location.reload()}>← Schimbă setările</button>
            <div className="text-sm">Progres: {play.qi+1}/{play.total}</div>
          </div>

          <div className="text-base font-medium">{play.q.prompt}</div>
          <div className="space-y-2">
            {play.q.options.map((opt:any, i:number)=>{
              const state = play.sel===null ? "border" : (i===play.q.answerIndex?"border-green-500 bg-green-50":"border-red-500 bg-red-50")
              const clickable = play.sel===null ? "cursor-pointer hover:bg-muted" : "opacity-75"
              return (
                <div key={i}
                    className={`p-3 rounded border ${state} ${clickable}`}
                    onClick={()=> play.onAnswer(i)}>
                  {opt}
                </div>
              )
            })}
          </div>

          {play.sel!==null && (
            <div className="text-sm p-3 rounded bg-muted">
              <div className="font-semibold mb-1">Explicație:</div>
              <div>{play.q.explanation || "—"}</div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">Scor: {play.finalScore} / {play.total}</div>
            {!play.finished ? (
              <button className="btn btn-primary" onClick={play.next}>Întrebarea următoare</button>
            ) : (
              <div className="text-sm font-semibold">Finalizat — Nota: {((play.finalScore/play.total)*10).toFixed(2)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
