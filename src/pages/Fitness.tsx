// src/pages/Fitness.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import h, { haptics as hNamed } from "@/lib/haptics"
// Am eliminat temporar importul pentru loadMaps pentru a folosi doar Leaflet
import { loadLeaflet } from "@/lib/loadLeaflet";
import { Pt, computeDistance, formatDuration, formatPace, toGPX } from "@/lib/geo"
import { speak, setTtsEnabled, ttsEnabled } from "@/lib/tts"
import { loadRuns, saveRun, clearRuns, RunSession } from "@/lib/storage"

const vib = () => { try { (h as any)?.small?.() ?? (hNamed as any)?.small?.() } catch {} }

type MapsKind = "google"|"leaflet"|"none"

// Stilurile GMAP nu mai sunt necesare momentan
// const GMAP_STYLES: Record<string, any[]> = { ... }

export default function Fitness(){
  const [running, setRunning] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [time, setTime] = useState(0)
  const [points, setPoints] = useState<Pt[]>([])
  const [error, setError] = useState<string>("")
  const [mapsKind, setMapsKind] = useState<MapsKind>("none")
  const [styleKey, setStyleKey] = useState<"default"|"dark"|"army">("default")
  const [runs, setRuns] = useState<RunSession[]>(loadRuns())
  const [tts, setTts] = useState<boolean>(ttsEnabled)

  const watchId = useRef<number | null>(null)
  const mapRef = useRef<any>(null)
  const polyRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const lastHalfKm = useRef(0)
  const startTs = useRef<number>(0)

  const distance = useMemo(()=> computeDistance(points), [points])
  const paceAvg = useMemo(()=> distance>0 ? time / (distance/1000) : Infinity, [time, distance])

  useEffect(()=>{
    if(!running) return
    const id = setInterval(()=> setTime(t=>t+1), 1000)
    return ()=> clearInterval(id)
  }, [running])

  useEffect(()=>{
    (async ()=>{
      // Am modificat logica pentru a încărca direct Leaflet, ocolind Google Maps
      const L = await loadLeaflet();
      if (L) {
        setMapsKind("leaflet");
        const el = document.getElementById("map")
        if(!el || mapRef.current) return // Verificăm dacă harta a fost deja inițializată
        
        const map = L.map(el).setView([44.4268, 26.1025], 13)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19, attribution: '&copy; OpenStreetMap',
        }).addTo(map)
        const poly = L.polyline([], { color: "#0ea5e9", weight: 4 }).addTo(map)
        const marker = L.circleMarker([44.4268, 26.1025], { radius: 6, color: "#22c55e", weight: 3 }).addTo(map)
        mapRef.current = map; polyRef.current = poly; markerRef.current = marker
      } else {
        setMapsKind("none");
      }
    })()
  }, []) // Dependința de styleKey a fost eliminată deoarece nu se mai aplică la Leaflet

  const addPoint = (p: Pt) => {
    setPoints(prev => {
      const next = [...prev, p]
      try {
        if (mapsKind === "leaflet"){
          const L = (window as any).L
          if (L && polyRef.current){
            polyRef.current.addLatLng(L.latLng(p.lat, p.lng))
            markerRef.current?.setLatLng(L.latLng(p.lat, p.lng))
            if (next.length === 1) mapRef.current?.setView([p.lat, p.lng], 16)
          }
        }
      } catch {}
      const d = computeDistance(next)
      if (d - lastHalfKm.current >= 500){
        lastHalfKm.current += 500
        speak(`Ai trecut de ${(lastHalfKm.current/1000).toFixed(1)} kilometri`)
      }
      return next
    })
  }
  
  // Restul funcțiilor (startRun, stopRun, etc.) rămân exact la fel
  const startRun = () => { vib(); setRunning(true); setTime(0); setPoints([]); lastHalfKm.current = 0; startTs.current = Date.now() }
  const stopRun = () => {
    vib(); setRunning(false);
    if (points.length >= 2){
      const splits = computeSplits(points, startTs.current);
      const run: RunSession = {
        id: String(Date.now()),
        startedAt: startTs.current || Date.now(),
        durationSec: time,
        distanceM: distance,
        paceAvg: paceAvg,
        splits
      };
      saveRun(run);
      setRuns(loadRuns());
    }
  }
  const toggleRun = () => running ? stopRun() : startRun()

  const startTracking = async () => {
    vib()
    if (!("geolocation" in navigator)) { setError("Geolocație indisponibilă"); return }
    if (watchId.current != null) return
    watchId.current = navigator.geolocation.watchPosition(
      (pos)=>{
        const { latitude: lat, longitude: lng } = pos.coords
        addPoint({ lat, lng, t: Date.now() })
      },
      (err)=> setError(err.message),
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
    )
    setTracking(true)
  }

  const stopTracking = () => {
    vib()
    if (watchId.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current as number)
      watchId.current = null
    }
    setTracking(false)
  }

  const exportGpx = () => {
    const gpx = toGPX(points, "Antrenament 2km")
    const blob = new Blob([gpx], { type: "application/gpx+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "antrenament_2km.gpx"; a.click()
    URL.revokeObjectURL(url)
  }

  const resetAll = () => { setRunning(false); setTracking(false); setTime(0); setPoints([]); lastHalfKm.current=0; }

  const currentPace = useMemo(()=>{
    if (points.length<2) return Infinity
    let d=0, t=0
    for(let i=points.length-1; i>0; i--){
      const dd = computeDistance([points[i-1], points[i]])
      d += dd
      if (d >= 200) { t = (points[i].t??0) - (points[i-1].t??0); break }
    }
    const seconds = t>0 ? t/1000 : 0
    return d>0 ? seconds / (d/1000) : Infinity
  }, [points])

  const km = (distance/1000)
  const goal = 2.0
  const progress = Math.min(100, Math.round(km/goal*100))

  useEffect(()=>{ setTtsEnabled(tts) }, [tts])

  return (
    <main className="p-4 space-y-4">
      <section className="card space-y-2">
        <div className="h2">Țintă: 2 km sub 10:00</div>
        <div className="text-sm text-muted">Cronometru + GPS + hartă OSM. Audio cues la fiecare 0.5 km.</div>
      </section>

      <section className="card grid grid-cols-2 gap-4">
        <Metric label="Timp" value={formatDuration(time)} />
        <Metric label="Distanță" value={`${km.toFixed(2)} km`} />
        <Metric label="Ritm mediu" value={formatPace(paceAvg)} />
        <Metric label="Ritm curent" value={formatPace(currentPace)} />
        <Progress label="Progres 2 km" value={progress} />
      </section>

      <section className="card flex items-center gap-2 flex-wrap">
        <button className="btn btn-primary" onClick={toggleRun}>{running ? "Stop" : "Start"}</button>
        {!tracking ? (
          <button className="btn" onClick={startTracking}>GPS Pornește</button>
        ) : (
          <button className="btn btn-ghost" onClick={stopTracking}>GPS Oprește</button>
        )}
        <button className="btn btn-ghost" onClick={exportGpx} disabled={points.length<2}>Export GPX</button>
        <button className="btn btn-ghost" onClick={resetAll}>Reset</button>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={tts} onChange={e=>setTts(e.target.checked)} /> Audio
          </label>
           {/* Meniul de stiluri pentru hartă a fost eliminat temporar */}
          <span className="opacity-60">({mapsKind})</span>
        </div>
      </section>

      <section className="card p-0 overflow-hidden">
        <div id="map" style={{height: 360, width: "100%"}} />
        {mapsKind==="none" && <div className="p-3 text-sm text-red-500">Nu s-a putut încărca harta.</div>}
      </section>
      
      <section className="card">
        <div className="h3 mb-2">Split-uri</div>
        <Splits points={points} startTs={startTs.current} />
      </section>

      <section className="card">
        <div className="h3 mb-2 flex items-center justify-between">
          <span>Istoric antrenamente</span>
          {runs.length>0 && <button className="btn btn-ghost btn-sm" onClick={()=>{ clearRuns(); setRuns([]) }}>Șterge istoric</button>}
        </div>
        {runs.length===0 ? <div className="text-sm text-muted">Nu ai sesiuni salvate încă.</div> :
          <ul className="text-sm space-y-2">
            {runs.map(r=>(
              <li key={r.id} className="p-2 rounded-lg bg-bg/60 border border-border">
                <div className="flex justify-between">
                  <div><b>{new Date(r.startedAt).toLocaleString()}</b></div>
                  <div>{(r.distanceM/1000).toFixed(2)} km • {formatDuration(r.durationSec)} • {formatPace(r.paceAvg)}</div>
                </div>
                {r.splits.length>0 && <div className="mt-1 opacity-80">Splits: {r.splits.map(s=>`${s.km}km ${formatDuration(s.sec)}`).join(" · ")}</div>}
              </li>
            ))}
          </ul>
        }
      </section>

      {error && <div className="text-sm text-red-500">{error}</div>}
    </main>
  )
}
// Restul componentelor (computeSplits, Metric, Progress, Splits) rămân exact la fel
function computeSplits(points: Pt[], startTs: number): {km:number; sec:number}[]{
  if(points.length<2) return []
  let out: {km:number; sec:number}[] = []
  let acc = 0, lastMark = 0, lastTime = startTs || points[0].t || Date.now()
  for(let i=1;i<points.length;i++){
    const d = computeDistance([points[i-1], points[i]])
    acc += d
    const t = (points[i].t || Date.now())
    if (acc - lastMark >= 1000){
      const sec = Math.round((t - lastTime)/1000)
      out.push({ km: Math.round((lastMark+1000)/1000), sec })
      lastMark += 1000
      lastTime = t
    }
  }
  return out
}

function Metric({label, value}:{label:string, value:string}){
  return (
    <div className="p-3 rounded-xl bg-bg/60 border border-border">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function Progress({label, value}:{label:string, value:number}){
  return (
    <div className="p-3 rounded-xl bg-bg/60 border border-border">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="w-full bg-border rounded-full h-2 overflow-hidden">
        <div className="bg-primary h-2" style={{width: `${value}%`}} />
      </div>
      <div className="text-xs mt-1">{value}%</div>
    </div>
  )
}

function Splits({points, startTs}:{points: Pt[], startTs: number}){
  const splits = computeSplits(points, startTs)
  if (splits.length===0) return <div className="text-sm text-muted">Se vor afișa după primii 1000 m.</div>
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {splits.map(s=>(
        <div key={s.km} className="p-2 rounded-lg bg-bg/60 border border-border flex justify-between">
          <span>Km {s.km}</span>
          <span>{formatDuration(s.sec)}</span>
        </div>
      ))}
    </div>
  )
}