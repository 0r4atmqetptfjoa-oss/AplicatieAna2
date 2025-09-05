
import React from 'react'
import { motion } from 'framer-motion'

export default function BigCard({children, onClick}:{children:React.ReactNode, onClick?:()=>void}){
  return (
    <motion.div whileTap={{scale:0.98}} onClick={onClick} className="card active:opacity-90">
      {children}
    </motion.div>
  )
}
