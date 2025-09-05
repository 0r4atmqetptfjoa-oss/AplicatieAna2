// src/lib/loadLeaflet.ts
export type LeafletNS = any

const CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
const JS_URL  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"

function ensureCss(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${CSS_URL}"]`)) return resolve()
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = CSS_URL
    link.onload = () => resolve()
    link.onerror = () => resolve()
    document.head.appendChild(link)
  })
}

function ensureJs(): Promise<void> {
  return new Promise((resolve) => {
    // @ts-ignore
    if (window.L) return resolve()
    const script = document.createElement("script")
    script.src = JS_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })
}

export async function loadLeaflet(): Promise<LeafletNS | null> {
  try {
    await ensureCss()
    await ensureJs()
    // @ts-ignore
    return window.L || null
  } catch {
    return null
  }
}
