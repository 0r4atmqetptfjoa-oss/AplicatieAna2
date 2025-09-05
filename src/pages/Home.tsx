
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IconTile from '@/components/IconTile'
import { BookOpen, Globe, Shield, Library, Brain, Activity, Play } from 'lucide-react'

export default function Home(){
  const nav = useNavigate()
  const iconProps = { size: 36, strokeWidth: 2.2 } as any
  const [h, setH] = useState<number>(140)

  useEffect(()=>{
    function recalc(){
      const header = (document.querySelector('header') as HTMLElement)?.offsetHeight || 56
      const navH = (document.querySelector('nav') as HTMLElement)?.offsetHeight || 64
      const padding = 16*2
      const gap = 12
      const count = 6
      const free = window.innerHeight - header - navH - padding - (gap*(count-1))
      const tile = Math.max(106, Math.floor(free / count))
      setH(tile)
    }
    recalc()
    window.addEventListener('resize', recalc)
    return ()=> window.removeEventListener('resize', recalc)
  }, [])

  return <div className="space-y-3 bg-texture">
    <div className="grid grid-cols-1 gap-3">
      <IconTile icon={<BookOpen {...iconProps}/>} label="Mod învățare" hint="Rezumate mari & tematica completă" onClick={()=>nav('/learning')} style={{height:h}}/>
      <IconTile icon={<Globe {...iconProps}/>} label="Teste doar engleză" hint="Alegi nr. întrebări" onClick={()=>nav('/english')} gradient="from-emerald-400/25 to-cyan-400/15" style={{height:h}}/>
      <IconTile icon={<Shield {...iconProps}/>} label="Simulare examen (90)" hint="30 legislație + 60 specialitate • 180 min" onClick={()=>nav('/exam')} gradient="from-lime-400/25 to-amber-300/15" style={{height:h}}/>
      <IconTile icon={<Library {...iconProps}/>} label="Teste din toată tematica" hint="Filtre pe module + nr. itemi" onClick={()=>nav('/all-tests')} gradient="from-sky-400/20 to-indigo-400/10" style={{height:h}}/>
      <IconTile icon={<Brain {...iconProps}/>} label="Evaluare psihologică" hint="Cognitive • Situațional • Personalitate" onClick={()=>nav('/psychology')} gradient="from-pink-400/20 to-purple-400/10" style={{height:h}}/>
          <IconTile icon={<Activity {...iconProps}/>} label="Pregătire fizică" hint="2 km / 10 min • cronometru & GPS" onClick={()=>nav('/fitness')} gradient="from-rose-400/20 to-orange-400/10" style={{height:h}} quickAction={<button onClick={(e)=>{e.stopPropagation(); nav('/fitness?autoStart=1&gps=1')}} className='rounded-full bg-primary text-black px-3 py-2 flex items-center gap-1 text-xs shadow'><Play size={14}/> Start</button>}/>
    </div>
  </div>
}
