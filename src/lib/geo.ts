// src/lib/geo.ts
export type Pt = { lat: number; lng: number; t?: number };

export function toRad(d: number){ return (d * Math.PI) / 180 }
export function haversine(a: Pt, b: Pt){
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sa = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(sa))
}

export function computeDistance(pts: Pt[]){
  let d = 0
  for(let i=1;i<pts.length;i++) d += haversine(pts[i-1], pts[i])
  return d
}

export function formatDuration(s: number){
  const h = Math.floor(s/3600)
  const m = Math.floor((s%3600)/60)
  const sec = Math.floor(s%60)
  if (h>0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
  return `${m}:${String(sec).padStart(2,"0")}`
}

export function formatPace(secPerKm: number){
  if (!isFinite(secPerKm) || secPerKm<=0) return "—"
  const m = Math.floor(secPerKm/60)
  const s = Math.round(secPerKm%60)
  return `${m}:${String(s).padStart(2,"0")} /km`
}

export function toGPX(pts: Pt[], name = "Run"){
  const trkpts = pts.map(p => `<trkpt lat="${p.lat}" lon="${p.lng}">${p.t?`<time>${new Date(p.t).toISOString()}</time>`:""}</trkpt>`).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AplicatieANA" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${name}</name><trkseg>
    ${trkpts}
  </trkseg></trk>
</gpx>`
}
