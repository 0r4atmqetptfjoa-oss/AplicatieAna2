export async function askAI(prompt: string){
  const r = await fetch('/.netlify/functions/gemini', {
    method:'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      system: 'Ești un asistent pentru învățare (română). Oferă explicații clare și scurte.',
      prompt
    })
  })
  const j = await r.json()
  return j.text || '—'
}