import { create } from 'zustand'

type State = {
  primary: string
  setPrimary: (v:string)=>void
  accent: string
  setAccent: (v:string)=>void
  scale: number
  setScale: (n:number)=>void
  haptics: boolean
  setHaptics: (v:boolean)=>void
  theme: 'army'|'dark'|'light'
  setTheme: (t: 'army'|'dark'|'light')=>void
}

// Funcție robustă pentru a citi setarea de haptics din localStorage
function getHapticsSetting(): boolean {
  try {
    const raw = localStorage.getItem('haptics');
    if (raw === null) return true; // Valoare implicită dacă nu există
    const v = raw.trim().toLowerCase();
    if (v === 'true' || v === 'on') return true;
    if (v === 'false' || v === 'off') return false;
    // Încearcă să parseze ca JSON pentru compatibilitate
    return JSON.parse(v);
  } catch {
    return true; // Revine la valoarea implicită în caz de eroare
  }
}

export const useStore = create<State>((set)=> ({
  theme: (localStorage.getItem('theme') as any) || 'army',
  scale: Number(localStorage.getItem('scale')||'1'),
  setScale: (n)=> set(()=>{ localStorage.setItem('scale', String(n)); document.documentElement.style.setProperty('--scale', String(n)); return { scale: n }; }),
  
  // Am înlocuit linia problematică cu noua funcție sigură
  haptics: getHapticsSetting(),

  primary: localStorage.getItem('primary') || getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#9acd32',
  setPrimary: (v)=> set(()=>{ localStorage.setItem('primary', v); document.documentElement.style.setProperty('--primary', v); return { primary: v }; }),
  accent: localStorage.getItem('accent') || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6ee7b7',
  setAccent: (v)=> set(()=>{ localStorage.setItem('accent', v); document.documentElement.style.setProperty('--accent', v); return { accent: v }; }),
  setHaptics: (v)=> set(()=>{ localStorage.setItem('haptics', JSON.stringify(v)); return { haptics: v }; }),
  setTheme: (t)=> set(()=>{ localStorage.setItem('theme', t); document.documentElement.setAttribute('data-theme', t); return { theme: t }; })
}))

// initialize theme on load
document.documentElement.setAttribute('data-theme', (localStorage.getItem('theme') as any) || 'army');
document.documentElement.style.setProperty('--scale', (localStorage.getItem('scale')||'1'));