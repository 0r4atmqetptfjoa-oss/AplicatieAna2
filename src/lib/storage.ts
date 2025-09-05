// src/lib/storage.ts
export type RunSession = {
  id: string;
  startedAt: number;
  durationSec: number;
  distanceM: number;
  paceAvg: number;
  splits: { km: number; sec: number }[];
};

const KEY = "run_sessions_v1";

export function loadRuns(): RunSession[]{
  try{
    const s = localStorage.getItem(KEY);
    if(!s) return [];
    return JSON.parse(s);
  }catch{ return []; }
}

export function saveRun(run: RunSession){
  const all = loadRuns();
  all.unshift(run);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
}

export function clearRuns(){
  localStorage.removeItem(KEY);
}
