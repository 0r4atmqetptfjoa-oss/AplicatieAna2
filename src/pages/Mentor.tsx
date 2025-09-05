
import React, { useEffect, useRef, useState } from 'react'
import { askAI } from '@/lib/ai'

type Msg = { role: 'user'|'ai', text: string }
export default function Mentor(){
  const [input, setInput] = useState('Explică-mi pe scurt rolul CSAT.')
  const [msgs, setMsgs] = useState<Msg[]>([{role:'ai', text:'Salut! Sunt Mentor. Întreabă-mă orice din tematică.'}])
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs, loading])

  async function send(){
    const t = input.trim(); if(!t) return
    setMsgs(m=>[...m, {role:'user', text:t}]); setInput(''); setLoading(true)
    const out = await askAI(t)
    setMsgs(m=>[...m, {role:'ai', text: out}])
    setLoading(false)
  }

  return <div className="flex flex-col h-[calc(100vh-9rem)]">
    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      {msgs.map((m, i)=> <Bubble key={i} role={m.role} text={m.text} />)}
      {loading && <div className="text-muted text-sm">Mentor tastează…</div>}
      <div ref={endRef}/>
    </div>
    <div className="mt-2 flex gap-2">
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={2}
        className="flex-1 rounded-xl bg-bg border border-border text-text p-2" placeholder="Scrie mesajul…"
        onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }}
      />
      <button className="btn btn-primary" onClick={send}>Trimite</button>
    </div>
  </div>
}

function Bubble({role, text}:{role:'user'|'ai', text:string}){
  const isUser = role==='user'
  return (
    <div className={"w-full flex "+(isUser?'justify-end':'justify-start')}>
      <div className={(isUser?'bg-primary text-black':'bg-card text-text border border-border') + " max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap"}>
        {text}
      </div>
    </div>
  )
}
