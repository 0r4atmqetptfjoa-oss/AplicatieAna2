
import type { Item } from './quizEngine'

export function countByDifficulty(items: Item[]) {
  return items.reduce((acc:any, it:Item)=>{
    const d = it.difficulty || 'medium'
    acc[d] = (acc[d]||0)+1
    return acc
  }, {easy:0, medium:0, hard:0})
}

export function countByModule(items: Item[]) {
  return items.reduce((acc:any, it:Item)=>{
    const m = it.module || 'unknown'
    acc[m] = (acc[m]||0)+1
    return acc
  }, {} as Record<string, number>)
}
