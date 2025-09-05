// src/lib/haptics.ts
// Safe web haptics wrapper (PWA). Works even if navigator.vibrate is absent.
// Provides BOTH default export and named `haptics` for compatibility.

const vib = (pattern: number | number[]) => {
  try {
    if (!isHapticsEnabled()) return
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      // @ts-ignore
      navigator.vibrate(pattern)
    }
  } catch {}
}

export const light = () => vib(15)
export const small = () => vib(10)        // legacy alias used around the app
export const medium = () => vib([10, 20])
export const heavy = () => vib([20, 40])
export const success = () => vib([15, 40, 15])
export const error = () => vib([60, 40, 60])

const HAPTICS_KEY = "haptics"

export const isHapticsEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(HAPTICS_KEY)
    if (raw == null) return true
    const v = raw.trim().toLowerCase()
    if (v === "on" || v === "true") return true
    if (v === "off" || v === "false") return false
    return JSON.parse(raw)
  } catch {
    return true
  }
}

export const setHapticsEnabled = (on: boolean) => {
  try { localStorage.setItem(HAPTICS_KEY, JSON.stringify(on)) } catch {}
}

const api = { light, small, medium, heavy, success, error, isHapticsEnabled, setHapticsEnabled }
export default api
// ✅ Named alias for compatibility with `import { haptics } from "@/lib/haptics"`
export const haptics = api
