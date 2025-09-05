import React, { useState } from 'react'
import { Bot, X } from 'lucide-react'

export default function ChatFAB(){
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-20 right-4 rounded-full p-4 bg-primary text-black shadow-lg">
      <Bot/>
    </button>
    {open && <ChatPanel onClose={()=>setOpen(false)}/>}
  </>
}

function ChatPanel({onClose}:{onClose:()=>void}){
  const [input, setInput] = useState('Explică-mi pe scurt rolul CSAT.')
  const [loading, setLoading] = useState(false)
  const [out, setOut] = useState('')
  async function ask(){
    setLoading(true); setOut('')
    const r = await fetch('/.netlify/functions/gemini', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: input }) })
    const j = await r.json()
    setOut(j.text || '—')
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/50 z-20 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="font-extrabold text-text">Asistent AI (Gemini)</div>
          <button onClick={onClose} className="text-muted"><X/></button>
        </div>
        <textarea value={input} onChange={e=>setInput(e.target.value)} className="w-full h-24 rounded-xl bg-bg border border-border text-text p-2" />
        <div className="mt-2 flex gap-2">
          <button className="btn btn-primary" onClick={ask} disabled={loading}>{loading?'Se gândește…':'Trimite'}</button>
          <button className="btn btn-ghost" onClick={()=>setInput('Explică-mi pe scurt rolul CSAT.')}>Exemplu</button>
        </div>
        {out && <div className="mt-3 text-sm text-muted whitespace-pre-wrap">{out}</div>}
      </div>
    </div>
  )
}