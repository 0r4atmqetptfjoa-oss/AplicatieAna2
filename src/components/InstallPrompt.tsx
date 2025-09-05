import React, { useEffect, useState } from 'react'

export default function InstallPrompt(){
  const [deferred, setDeferred] = useState<any>(null)
  const [open, setOpen] = useState(false)
  useEffect(()=>{
    const onPrompt = (e: any)=>{ e.preventDefault(); setDeferred(e); setOpen(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return ()=> window.removeEventListener('beforeinstallprompt', onPrompt)
  },[])
  if(!open) return null
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
      <div className="text-text font-bold">Instalează aplicația</div>
      <div className="ml-auto flex gap-2">
        <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Nu acum</button>
        <button className="btn btn-primary" onClick={async()=>{ if(deferred){ deferred.prompt(); const _ = await deferred.userChoice; setOpen(false); }}}>Instalează</button>
      </div>
    </div>
  )
}