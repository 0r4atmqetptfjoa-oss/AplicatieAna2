import React, { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { haptics } from '@/lib/haptics'

type Counts = { legislation:number, logistics:number, psychology:number, englishTests:number }

async function loadCounts(): Promise<Counts>{
  try{
    const [leg, log, psy, eng] = await Promise.all([
      fetch("/data/v12/legislation.json").then(r=>r.json()).catch(()=>({})),
      fetch("/data/v12/logistics.json").then(r=>r.json()).catch(()=>({})),
      fetch("/data/v12/psychology.json").then(r=>r.json()).catch(()=>({})),
      fetch("/data/v12/english.json").then(r=>r.json()).catch(()=>({})),
    ])
    const cLeg = leg?.meta?.count ?? leg?.questions?.length ?? 0
    const cLog = log?.meta?.count ?? log?.questions?.length ?? 0
    const cPsy = psy?.meta?.count ?? psy?.questions?.length ?? 0
    const cEng = eng?.meta?.testsCount ?? (eng?.tests?.length ?? 0)
    return { legislation:cLeg, logistics:cLog, psychology:cPsy, englishTests:cEng }
  }catch{ return { legislation:0, logistics:0, psychology:0, englishTests:0 } }
}

// --- MODIFICARE AICI: Am simplificat lista de teme ---
const THEMES = [
  { id:'light', label:'Day' },
  { id:'dark', label:'Night' },
] as const

export default function Settings(){
  const [counts, setCounts] = useState<Counts>({legislation:0, logistics:0, psychology:0, englishTests:0})
  useEffect(()=>{ loadCounts().then(setCounts) }, [])

  // Asigurăm că tema implicită este 'light' dacă nu e setată
  const { theme, setTheme, scale, setScale, haptics, setHaptics } = useStore()
  const currentTheme = theme === 'army' || theme === 'system' ? 'light' : theme;

  return (
    <div className="p-4 space-y-4">
      <section className="card">
        <div className="h2 mb-2">Temă vizuală</div>
        <div className="flex flex-wrap items-center gap-2">
          {THEMES.map(t => (
            <button key={t.id}
              onClick={()=> setTheme(t.id)}
              className={`btn ${currentTheme === t.id ? 'btn-primary' : 'btn-ghost'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="h2 mb-2">Scală text</div>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost" onClick={()=> setScale(s=> Math.max(0.85, +(s-0.05).toFixed(2)))}>-</button>
          <div className="text-sm tabular-nums">x{scale.toFixed(2)}</div>
          <button className="btn btn-ghost" onClick={()=> setScale(s=> Math.min(1.40, +(s+0.05).toFixed(2)))}>+</button>
          <button className="btn btn-ghost ml-2" onClick={()=> setScale(1)}>Reset</button>
        </div>
      </section>

      <section className="card">
        <div className="h2 mb-2">Feedback tactil</div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={haptics} onChange={e=> setHaptics(e.target.checked)} />
            <span>Activează haptics (unde este disponibil)</span>
          </label>
        </div>
      </section>

      <section className="card">
        <div className="h2 mb-2">Statistici bază de date</div>
        <ul className="text-sm text-muted space-y-1">
          <li>Legislație: <b>{counts.legislation}</b> întrebări</li>
          <li>Specialitate: <b>{counts.logistics}</b> întrebări</li>
          <li>Psihologie: <b>{counts.psychology}</b> întrebări</li>
          <li>Engleză: <b>{counts.englishTests}</b> teste</li>
        </ul>
      </section>
    </div>
  )
}