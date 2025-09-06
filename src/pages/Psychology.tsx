import { useEffect, useMemo, useState } from "react"
import type { Item } from "@/lib/quizEngine"

type PItem = Item & { category?: 'cognitive'|'personality'|'situational' }

type Bank = { questions: PItem[] }

export default function Psychology(){
  const [bank, setBank] = useState<PItem[]>([])
  const [length, setLength] = useState(20)
  const [cats, setCats] = useState<Array<'cognitive'|'personality'|'situational'>>(['cognitive','personality','situational'])
  const [started, setStarted] = useState(false)

  useEffect(()=>{
    fetch("/data/v12/psychology.json").then(r=>r.json()).then((d:Bank)=>{
      setBank((d?.questions||[]) as PItem[])
    })
  }, [])

  function toggle(cat: 'cognitive'|'personality'|'situational'){
    setCats(prev => prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev, cat])
  }

  const pool = useMemo(()=>{
    if(cats.length===0) return []
    const hasCat = bank.some(q=> !!q.category)
    return hasCat ? bank.filter(q=> q.category && cats.includes(q.category)) : bank
  }, [bank, cats])

  // Build exam locally: simple shuffle + slice
  const [items, setItems] = useState<PItem[]>([])
  function start(){
    const shuffled = [...pool].sort(()=> Math.random()-0.5)
    setItems(shuffled.slice(0, Math.max(5, Math.min(length, shuffled.length))))
    setStarted(true)
    setQi(0); setSel(null); setScore(0)
  }

  const [qi, setQi] = useState(0)
  const [sel, setSel] = useState<number|null>(null)
  const [score, setScore] = useState(0)
  const q = items[qi]

  function onAnswer(i:number){
    if(sel!==null) return
    setSel(i); if(i===q.answerIndex) setScore(s=>s+1)
  }
  function next(){
    if(qi < items.length-1){ setQi(qi+1); setSel(null) }
  }
  const finished = started && qi===items.length-1 && sel!==null
  const finalScore = finished ? score + (sel===q.answerIndex?1:0) : score

  return (
    <div className="p-4 space-y-4">
      {!started && (
        <div className="card space-y-3">
          <div className="text-lg font-semibold">Evaluare psihologică — configurare</div>
          <div className="text-sm">Alege tipurile de itemi și numărul de întrebări.</div>
          <div className="flex flex-wrap gap-2">
            {(['cognitive','personality','situational'] as const).map(cat=>{
              const labels:any = {cognitive:'Aptitudini cognitive', personality:'Chestionar personalitate', situational:'Test situațional (ofițeri)'}
              const active = cats.includes(cat)
              return (
                <button key={cat} onClick={()=> toggle(cat)}
                  className={`px-3 py-1 rounded-full border ${active? "bg-primary text-primary-foreground border-primary":"bg-muted"}`}>
                  {labels[cat]}
                </button>
              )
            })}
          </div>
          <label className="text-sm">Întrebări:
            <input className="ml-2 w-20 border px-2 py-1 rounded" type="number" min={5} max={120}
                   value={length} onChange={e=> setLength(parseInt(e.target.value||'0'))}/>
          </label>
          <div className="flex justify-end">
            <button className="btn btn-primary" disabled={cats.length===0 || pool.length===0} onClick={start}>
              Start evaluare
            </button>
          </div>
          {cats.length===0 && <div className="text-xs text-red-600">Selectează cel puțin o categorie.</div>}
          {cats.length>0 && pool.length===0 && <div className="text-xs text-yellow-700">Nu există întrebări pentru categoriile selectate în baza curentă.</div>}
        </div>
      )}

      {started && items.length>0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button className="text-sm underline" onClick={()=> window.location.reload()}>← Schimbă setările</button>
            <div className="text-sm">Progres: {qi+1}/{items.length}</div>
          </div>

          <div className="text-base font-medium">{q.prompt}</div>
          <div className="space-y-2">
            {q.options.map((opt:any, i:number)=>{
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
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm">Scor: {finalScore} / {items.length}</div>
            {qi < items.length-1 ? (
              <button className="btn btn-primary" onClick={next}>Întrebarea următoare</button>
            ) : (
              <div className="text-sm font-semibold">Finalizat — Nota: {((finalScore/items.length)*10).toFixed(2)} — {((finalScore/items.length)*10)>=6?'Apt':'Necesită re-evaluare'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}