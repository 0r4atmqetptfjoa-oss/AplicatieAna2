// src/pages/Fitness.tsx (v2 - Îmbunătățit de Gemini)
import { useEffect, useMemo, useRef, useState } from "react"
import { loadLeaflet } from "@/lib/loadLeaflet"
import { Pt, computeDistance, formatDuration, formatPace, toGPX } from "@/lib/geo"
import { speak, setTtsEnabled } from "@/lib/tts"
import { loadRuns, saveRun, clearRuns, RunSession } from "@/lib/storage"
import { Pause, Play, MapPin, StopCircle } from "lucide-react"

// --- CONSTANTE PENTRU FILTRUL GPS ---
const GPS_ACCURACY_THRESHOLD = 30; // Ignoră punctele cu acuratețe mai slabă de 30m
const MIN_DISTANCE_THRESHOLD = 5; // Ignoră punctele mai apropiate de 5m de cel anterior

type GpsStatus = "strong" | "medium" | "weak" | "off";
type RunState = "idle" | "running" | "paused";

export default function Fitness(){
  const [runState, setRunState] = useState<RunState>("idle");
  const [time, setTime] = useState(0);
  const [points, setPoints] = useState<Pt[]>([]);
  const [error, setError] = useState<string>("");
  const [isTracking, setIsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("off");
  
  const [runs, setRuns] = useState<RunSession[]>(loadRuns());
  const [tts, setTts] = useState(true);

  const watchId = useRef<number | null>(null);
  const mapRef = useRef<any>(null);
  const polyRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const lastHalfKm = useRef(0);
  const startTs = useRef<number>(0);
  
  const distance = useMemo(() => computeDistance(points), [points]);
  const paceAvg = useMemo(() => distance > 0 ? time / (distance / 1000) : Infinity, [time, distance]);

  // Efect pentru cronometru
  useEffect(() => {
    let interval: any = null;
    if (runState === "running") {
      interval = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [runState]);

  // Efect pentru inițializarea hărții
  useEffect(() => {
    (async () => {
      const L = await loadLeaflet();
      if (L && !mapRef.current) {
        const el = document.getElementById("map");
        if (!el) return;
        
        const map = L.map(el, { zoomControl: false }).setView([44.4268, 26.1025], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19, attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        
        const poly = L.polyline([], { color: "#0ea5e9", weight: 5, opacity: 0.8 }).addTo(map);
        const marker = L.circleMarker([44.4268, 26.1025], { radius: 7, color: "#fff", weight: 2, fillColor: "#22c55e", fillOpacity: 1 }).addTo(map);
        
        mapRef.current = map; polyRef.current = poly; markerRef.current = marker;
      }
    })();
  }, []);
  
  // Funcție îmbunătățită pentru adăugarea punctelor
  const addPoint = (p: Pt, accuracy: number) => {
    setGpsStatus(accuracy < 15 ? "strong" : accuracy < 30 ? "medium" : "weak");

    if (accuracy > GPS_ACCURACY_THRESHOLD) {
      console.warn(`Semnal GPS slab (acuratețe: ${accuracy}m), punctul a fost ignorat.`);
      return; // Ignorăm punctul dacă acuratețea e prea slabă
    }

    setPoints(prev => {
      if (prev.length > 0) {
        const lastPoint = prev[prev.length - 1];
        if (computeDistance([lastPoint, p]) < MIN_DISTANCE_THRESHOLD) {
          return prev; // Ignorăm punctul dacă e prea aproape de anteriorul
        }
      }
      
      const next = [...prev, p];
      try {
        const L = (window as any).L;
        if (L && polyRef.current && markerRef.current) {
          polyRef.current.addLatLng(L.latLng(p.lat, p.lng));
          markerRef.current.setLatLng(L.latLng(p.lat, p.lng));
          mapRef.current?.setView([p.lat, p.lng], 17);
        }
      } catch {}

      // Audio cues
      const d = computeDistance(next);
      if (tts && d - lastHalfKm.current >= 500) {
        lastHalfKm.current += 500;
        speak(`Ai trecut de ${(lastHalfKm.current / 1000).toFixed(1)} kilometri`);
      }
      return next;
    });
  };

  // --- LOGICĂ NOUĂ PENTRU START/STOP GPS ---
  const startTracking = () => {
    if (!("geolocation" in navigator)) { setError("Geolocație indisponibilă"); return; }
    if (watchId.current != null) return;
    
    // 1. Obținem locația curentă O SINGURĂ DATĂ pentru a centra harta rapid
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        mapRef.current?.setView([lat, lng], 17);
        markerRef.current?.setLatLng([lat, lng]);
        setGpsStatus(accuracy < 15 ? "strong" : "medium");

        // 2. Pornim urmărirea continuă
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            if (runState === 'running') { // Adăugăm puncte doar dacă alergarea e activă
              addPoint({ lat, lng, t: Date.now() }, accuracy);
            }
          },
          (err) => { setError(err.message); setGpsStatus("off"); },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        setIsTracking(true);
      },
      (err) => {
        setError(err.message);
        setGpsStatus("off");
      },
      { enableHighAccuracy: true }
    );
  };
  
  const stopTracking = () => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    setGpsStatus("off");
  };

  // --- LOGICĂ NOUĂ PENTRU START/PAUZĂ/STOP CURSĂ ---
  const handlePrimaryAction = () => {
    if (runState === "idle") {
      // START
      setTime(0);
      setPoints([]);
      lastHalfKm.current = 0;
      startTs.current = Date.now();
      setRunState("running");
      if (!isTracking) startTracking();
    } else if (runState === "running") {
      // PAUZĂ
      setRunState("paused");
    } else if (runState === "paused") {
      // RELUARE
      setRunState("running");
    }
  };
  
  const handleStop = () => {
    if (points.length >= 2) {
      const run: RunSession = {
        id: String(Date.now()),
        startedAt: startTs.current || Date.now(),
        durationSec: time,
        distanceM: distance,
        paceAvg: paceAvg,
        splits: computeSplits(points, startTs.current)
      };
      saveRun(run);
      setRuns(loadRuns());
    }
    setRunState("idle");
  };

  const km = (distance / 1000);
  const goal = 2.0;
  const progress = Math.min(100, Math.round(km / goal * 100));

  useEffect(() => { setTtsEnabled(tts) }, [tts]);

  return (
    <main className="p-4 space-y-4">
      <section className="card space-y-2">
        <div className="h2">Țintă: 2 km sub 10:00</div>
        <div className="text-sm text-muted">Cronometru, GPS cu filtru de acuratețe, Pauză/Reluare și istoric.</div>
      </section>

      <section className="card grid grid-cols-2 gap-4">
        <Metric label="Timp" value={formatDuration(time)} />
        <Metric label="Distanță" value={`${km.toFixed(2)} km`} />
        <Metric label="Ritm mediu" value={formatPace(paceAvg)} />
        <Progress label="Progres 2 km" value={progress} />
      </section>

      <section className="card flex items-center gap-2 flex-wrap justify-center">
        {runState !== "idle" && (
          <button className="btn btn-ghost text-red-500 flex items-center gap-2" onClick={handleStop}>
            <StopCircle size={20} /> Oprește și Salvează
          </button>
        )}
        <button className="btn btn-primary flex items-center gap-2" onClick={handlePrimaryAction}>
          {runState === 'idle' && <><Play size={20}/> Start Cursă</>}
          {runState === 'running' && <><Pause size={20}/> Pauză</>}
          {runState === 'paused' && <><Play size={20}/> Reluare</>}
        </button>
      </section>
      
      <section className="card p-0 overflow-hidden relative">
        <div id="map" style={{height: 360, width: "100%"}} />
        <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2 text-sm">
          <GpsIndicator status={gpsStatus} />
          <span>GPS: {gpsStatus}</span>
          {!isTracking ? (
            <button className="ml-2 text-xs underline" onClick={startTracking}>Pornește</button>
          ) : (
             <button className="ml-2 text-xs underline" onClick={stopTracking}>Oprește</button>
          )}
        </div>
      </section>

      <section className="card">
        <div className="h3 mb-2">Istoric antrenamente</div>
        {runs.length === 0 ? <div className="text-sm text-muted">Nu ai sesiuni salvate.</div> :
          <ul className="text-sm space-y-2">
            {runs.map(r => (
              <li key={r.id} className="p-2 rounded-lg bg-bg/60 border border-border">
                <div className="flex justify-between flex-wrap">
                  <div><b>{new Date(r.startedAt).toLocaleString()}</b></div>
                  <div className="font-mono">{(r.distanceM / 1000).toFixed(2)} km | {formatDuration(r.durationSec)} | {formatPace(r.paceAvg)}</div>
                </div>
              </li>
            ))}
          </ul>
        }
      </section>
    </main>
  );
}

// --- COMPONENTE HELPER ---
function GpsIndicator({ status }: { status: GpsStatus }) {
  const color = {
    strong: "text-green-500",
    medium: "text-yellow-500",
    weak: "text-red-500",
    off: "text-gray-500",
  }[status];
  return <MapPin className={color} size={20} />;
}

const computeSplits = (points: Pt[], startTs: number): { km: number; sec: number }[] => {
  if (points.length < 2) return [];
  let out: { km: number; sec: number }[] = [];
  let acc = 0, lastMark = 0, lastTime = startTs || points[0].t || Date.now();
  for (let i = 1; i < points.length; i++) {
    const d = computeDistance([points[i - 1], points[i]]);
    acc += d;
    const t = (points[i].t || Date.now());
    if (acc - lastMark >= 1000) {
      const sec = Math.round((t - lastTime) / 1000);
      out.push({ km: Math.round((lastMark + 1000) / 1000), sec });
      lastMark += 1000;
      lastTime = t;
    }
  }
  return out;
};

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
    <div className="p-3 rounded-xl bg-bg/60 border border-border col-span-2">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
        <div className="bg-primary h-full transition-all duration-500" style={{width: `${value}%`}} />
      </div>
      <div className="text-xs mt-1 text-right font-mono">{value}%</div>
    </div>
  )
}