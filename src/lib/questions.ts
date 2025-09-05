import eng from '@/data/v12/english.json'
import leg from '@/data/v12/legislation.json'
import spec from '@/data/v12/logistics.json'
import psy from '@/data/v12/psychology.json'
import type { Question } from '@/data/v12/types'

const Q = {
  english: eng.questions as Question[],
  legislation: leg.questions as Question[],
  logistics: spec.questions as Question[],
  psychology: psy.questions as Question[]
}
export function getPool(mods: ('english'|'legislation'|'logistics'|'psychology')[], count: number){
  const all = mods.flatMap(m=>Q[m])
  return shuffle(all).slice(0, Math.min(count, all.length))
}
export function shuffle<T>(a:T[]){ const x=[...a]; for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]] } return x }
export type { Question }