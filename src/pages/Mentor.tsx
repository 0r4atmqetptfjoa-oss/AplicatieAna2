import React, { useEffect, useRef, useState } from 'react'
// Am schimbat importul pentru a folosi noua funcție
import { aiMentorChat } from '@/lib/ai' 

type Msg = { role: 'user'|'ai', text: string }

export default function Mentor(){
  const [input, setInput] = useState('')
  // Mesaj de întâmpinare îmbunătățit
  const [msgs, setMsgs] = useState<Msg[]>([{role:'ai', text:'Salut! Eu sunt Mentor, asistentul tău virtual pentru admitere. Mă poți întreba orice despre legislație, logistică sau psihologie. Cu ce te pot ajuta astăzi?'}])
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs, loading])

  async function send(){
    const t = input.trim(); if(!t) return
    setMsgs(m=>[...m, {role:'user', text:t}]); 
    setInput(''); 
    setLoading(true);
    
    try {
      // Apelăm noua funcție, mai inteligentă
      const out = await aiMentorChat(t)
      setMsgs(m=>[...m, {role:'ai', text: out}])
    } catch (e: any) {
      // Gestionăm erorile (ex: cheia API lipsește)
      setMsgs(m=>[...m, {role:'ai', text: `A apărut o eroare: ${e.message}`}])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {msgs.map((m, i)=> <Bubble key={i} role={m.role} text={m.text} />)}
        {loading && <Bubble role="ai" text="..." loading={true} />}
        <div ref={endRef}/>
      </div>
      <div className="mt-2 flex gap-2">
        <textarea value={input} onChange={e=>setInput(e.target.value)} rows={2}
          className="flex-1 rounded-xl bg-card border border-border text-text p-2 focus:outline-none focus:ring-2 focus:ring-primary" 
          placeholder="Scrie mesajul tău..."
          onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }}
        />
        <button className="btn btn-primary self-end" onClick={send} disabled={loading || !input.trim()}>Trimite</button>
      </div>
    </div>
  )
}

function Bubble({role, text, loading}:{role:'user'|'ai', text:string, loading?:boolean}){
  const isUser = role==='user'
  
  const loadingDots = (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 bg-current rounded-full animate-bounce delay-0"></span>
      <span className="h-2 w-2 bg-current rounded-full animate-bounce delay-150"></span>
      <span className="h-2 w-2 bg-current rounded-full animate-bounce delay-300"></span>
    </div>
  );

  return (
    <div className={"w-full flex "+(isUser?'justify-end':'justify-start')}>
      <div className={(isUser?'bg-primary text-white':'bg-card text-text border border-border') + " max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap"}>
        {loading ? loadingDots : text}
      </div>
    </div>
  )
}