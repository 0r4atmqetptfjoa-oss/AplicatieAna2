import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'

type Props = { stem: string, options: string[], answerIndex: number, explanation: string, onNext?: ()=>void, onAskAI?: ()=>void }
export default function QuestionCard({ stem, options, answerIndex, explanation, onNext, onAskAI }: Props){
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <motion.div className="card" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}>
      <div className="font-extrabold text-text mb-2">{stem}</div>
      <div className="space-y-2">
        {options.map((opt, i)=>{
          const correct = picked !== null && i===answerIndex
          const wrong = picked !== null && i===picked && i!==answerIndex
          return <button key={i} onClick={()=> picked===null && setPicked(i)}
            className={"w-full text-left btn "+(correct?"bg-green-700/40 border border-green-400 text-green-200": wrong?"bg-red-800/40 border border-red-400 text-red-200":"btn-ghost")}>
            {opt}
          </button>
        })}
      </div>
      {picked!==null && <div className="mt-3 text-sm text-muted">Explicație: {explanation}</div>}
      <div className="mt-4 flex gap-2">
        <button className="btn btn-accent" onClick={onNext}>Următoarea întrebare</button>
        <button className="btn btn-ghost flex items-center gap-2" onClick={onAskAI}><Lightbulb size={16}/> Cere indiciu (AI)</button>
      </div>
    </motion.div>
  )
}