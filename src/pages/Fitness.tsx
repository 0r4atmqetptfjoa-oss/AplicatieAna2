// src/pages/Fitness.tsx (v5.0 - Final, cu logică duală Google Maps / Leaflet)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadMaps } from "@/lib/maps";
import { Pt, computeDistance, formatDuration, formatPace } from "@/lib/geo";
import { speak, setTtsEnabled } from "@/lib/tts";
import { loadRuns, saveRun, clearRuns, RunSession } from "@/lib/storage";
import { Pause, Play, MapPin, StopCircle } from "lucide-react";

const GPS_ACCURACY_THRESHOLD = 35;
const MIN_DISTANCE_THRESHOLD = 5;

type GpsStatus = "puternic" | "mediu" | "slab" | "inactiv";
type RunState = "idle" | "running" | "paused";
type MapKind = "google" | "leaflet" | "none";

const GMAP_STYLES: Record<string, any[]> = {
  dark: [ { elementType: "geometry", stylers: [{color: "#1f2937"}] }, { elementType: "labels.text.fill", stylers: [{color: "#e5e7eb"}] }, { elementType: "labels.text.stroke", stylers: [{color: "#111827"}] }, { featureType: "road", elementType: "geometry", stylers: [{color: "#374151"}] }, { featureType: "water", elementType: "geometry", stylers: [{color: "#0ea5e9"}] }, { featureType: "poi.park", elementType: "geometry", stylers: [{color: "#064e3b"}] }, ],
  army: [ { elementType: "geometry", stylers: [{color: "#2b3a20"}] }, { elementType: "labels.text.fill", stylers: [{color: "#fef3c7"}] }, { elementType: "labels.text.stroke", stylers: [{color: "#1a2314"}] }, { featureType: "road", elementType: "geometry", stylers: [{color: "#5b7a3a"}] }, { featureType: "water", elementType: "geometry", stylers: [{color: "#264653"}] }, { featureType: "poi.park", elementType: "geometry", stylers: [{color: "#3a5a40"}] }, ]
};

export default function Fitness() {
  const [runState, setRunState] = useState<RunState>("idle");
  const [time, setTime] = useState(0);
  const [points, setPoints] = useState<Pt[]>([]);
  const [error, setError] = useState<string>("");
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("inactiv");
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapKind, setMapKind] = useState<MapKind>("none");
  const [styleKey, setStyleKey] = useState<"dark" | "army">("dark");

  const runs = loadRuns();
  const [tts, setTts] = useState(true);

  const watchId = useRef<number | null>(null);
  const mapApiRef = useRef<any>({});
  const lastHalfKm = useRef(0);
  const startTs = useRef<number>(0);

  const distance = useMemo(() => computeDistance(points), [points]);
  const paceAvg = useMemo(() => (distance > 0 ? time / (distance / 1000) : Infinity), [time, distance]);

  // Inițializează harta o singură dată
  useEffect(() => {
    (async () => {
      const el = document.getElementById("map");
      if (!el || (el as any)._map_init) return;
      (el as any)._map_init = true;

      const loaded = await loadMaps();
      setMapKind(loaded.kind);

      if (loaded.kind === "google") {
        const g = loaded.api;
        const map = new g.maps.Map(el, {
          center: {lat: 44.4268, lng: 26.1025}, zoom: 15, disableDefaultUI: true, zoomControl: true,
          styles: GMAP_STYLES[styleKey]
        });
        const polyline = new g.maps.Polyline({ path: [], strokeColor: "#3b82f6", strokeOpacity: 0.9, strokeWeight: 6, map });
        const marker = new g.maps.Marker({
          position: {lat: 44.4268, lng: 26.1025}, map,
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#1d4ed8", fillOpacity: 1, strokeColor: "white", strokeWeight: 3 }
        });
        mapApiRef.current = { g, map, marker, polyline };
      } else if (loaded.kind === "leaflet") {
        const L = loaded.api;
        const map = L.map(el, { zoomControl: false }).setView([44.4268, 26.1025], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap' }).addTo(map);
        const polyline = L.polyline([], { color: "#3b82f6", weight: 6, opacity: 0.8 }).addTo(map);
        const marker = L.circleMarker([44.4268, 26.1025], { radius: 8, color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
        mapApiRef.current = { L, map, marker, polyline };
      }
      setIsMapReady(true);
    })();
  }, []);
  
  // Cronometru
  useEffect(() => {
    let interval: any = null;
    if (runState === "running") interval = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [runState]);
  
  // Schimbă stilul hărții Google
  useEffect(() => {
    if (mapKind === 'google' && mapApiRef.current.map) {
      mapApiRef.current.map.setOptions({ styles: GMAP_STYLES[styleKey] });
    }
  }, [styleKey, mapKind]);

  const addPoint = (p: Pt, accuracy: number) => {
    setGpsStatus(accuracy < 15 ? "puternic" : accuracy < 30 ? "mediu" : "slab");
    if (accuracy > GPS_ACCURACY_THRESHOLD) return;
  
    setPoints((prev) => {
      if (prev.length > 0 && computeDistance([prev[prev.length - 1], p]) < MIN_DISTANCE_THRESHOLD) return prev;
      
      const next = [...prev, p];
      const { map, marker, polyline } = mapApiRef.current;
      
      if (mapKind === 'google') {
          const g = mapApiRef.current.g;
          const latLng = new g.maps.LatLng(p.lat, p.lng);
          polyline.getPath().push(latLng);
          marker.setPosition(latLng);
      } else if (mapKind === 'leaflet') {
          const L = mapApiRef.current.L;
          const latLng = L.latLng(p.lat, p.lng);
          polyline.addLatLng(latLng);
          marker.setLatLng(latLng);
      }
  
      if (tts && next.length > 1 && computeDistance(next) - lastHalfKm.current >= 500) {
        lastHalfKm.current += 500;
        speak(`Ai trecut de ${(lastHalfKm.current / 1000).toFixed(1)} kilometri`);
      }
      return next;
    });
  };

  const startTracking = () => {
    if (!("geolocation" in navigator)) { setError("Geolocația nu este suportată."); return; }
    if (watchId.current != null) return;
    
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const { map } = mapApiRef.current;
        if (mapKind === 'google') map.setCenter({ lat, lng });
        else if (mapKind === 'leaflet') map.setView([lat, lng], 17);
        
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (runState === "running") addPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() }, pos.coords.accuracy);
          },
          (err) => setError(err.message),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      },
      (err) => setError(`Eroare la obținerea locației: ${err.message}`),
      { enableHighAccuracy: true }
    );
  };

  const stopTracking = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setGpsStatus("inactiv");
  };

  const handlePrimaryAction = () => {
    if (runState === "idle") {
      setTime(0); setPoints([]); lastHalfKm.current = 0; startTs.current = Date.now();
      if(mapKind === 'google') mapApiRef.current.polyline.getPath().clear();
      else if (mapKind === 'leaflet') mapApiRef.current.polyline.setLatLngs([]);
      setRunState("running");
      startTracking();
    } else if (runState === "running") setRunState("paused");
    else if (runState === "paused") setRunState("running");
  };

  const handleStop = () => {
    if (points.length >= 2) {
      saveRun({ id: String(Date.now()), startedAt: startTs.current || Date.now(),
        durationSec: time, distanceM: distance, paceAvg: paceAvg, splits: [] });
    }
    setRunState("idle");
    stopTracking();
  };

  return (
    <main className="p-4 space-y-4">
      <section className="card space-y-2">
        <div className="h2">Pregătire Fizică 2km</div>
        <div className="text-sm text-muted">Antrenament cu GPS. Tip hartă: <span className="font-semibold capitalize">{mapKind}</span></div>
      </section>
      <section className="card grid grid-cols-2 gap-4">
        <Metric label="Timp" value={formatDuration(time)} />
        <Metric label="Distanță" value={`${(distance / 1000).toFixed(2)} km`} />
        <Metric label="Ritm Mediu" value={formatPace(paceAvg)} />
        <Progress label="Progres 2 km" value={Math.min(100, Math.round((distance / 2000) * 100))} />
      </section>
      <section className="card flex items-center gap-3 flex-wrap justify-center">
        {runState !== "idle" && (
          <button className="btn btn-ghost text-red-500 flex items-center gap-2" onClick={handleStop}>
            <StopCircle size={20} /> Oprește & Salvează
          </button>
        )}
        <button className="btn btn-primary flex items-center gap-2" onClick={handlePrimaryAction} disabled={!isMapReady}>
          {runState === 'idle' && <><Play size={20} /> Start Cursă</>}
          {runState === 'running' && <><Pause size={20} /> Pauză</>}
          {runState === 'paused' && <><Play size={20} /> Reluare</>}
        </button>
      </section>
      <section className="card p-0 overflow-hidden relative">
        <div id="map" style={{ height: 380, width: "100%" }} />
        <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2 text-sm shadow-lg">
          <GpsIndicator status={gpsStatus} /> <span>GPS: {gpsStatus}</span>
        </div>
        {mapKind === 'google' && (
          <div className="absolute top-2 right-2">
            <select className="input text-xs shadow-lg" value={styleKey} onChange={e => setStyleKey(e.target.value as any)}>
              <option value="dark">Stil: Noapte</option>
              <option value="army">Stil: Militar</option>
            </select>
          </div>
        )}
        {error && <div className="absolute bottom-2 left-2 right-2 text-center text-xs bg-red-500/80 text-white p-1 rounded">{error}</div>}
      </section>
      <section className="card">
        <div className="h3 mb-2 flex items-center justify-between">
          <span>Istoric antrenamente</span>
          {runs.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => { clearRuns(); window.location.reload(); }}>Șterge istoric</button>}
        </div>
        {runs.length === 0 ? <div className="text-sm text-muted">Nu ai sesiuni salvate.</div> :
          <ul className="text-sm space-y-2">
            {runs.map(r => (
              <li key={r.id} className="p-2 rounded-lg bg-card border border-border">
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

function GpsIndicator({ status }: { status: GpsStatus }) {
  const color = { puternic: "text-green-500", mediu: "text-yellow-500", slab: "text-red-500", inactiv: "text-gray-500" }[status];
  return <MapPin className={`${color} transition-colors`} size={20} />;
}
function Metric({ label, value }: { label: string; value: string }) {
  return ( <div className="p-3 rounded-xl bg-card border border-border text-center"> <div className="text-xs text-muted">{label}</div> <div className="text-xl font-semibold">{value}</div> </div> );
}
function Progress({ label, value }: { label: string; value: number }) {
  return ( <div className="p-3 rounded-xl bg-card border border-border col-span-2"> <div className="text-xs text-muted mb-1">{label}</div> <div className="w-full bg-border rounded-full h-2.5 overflow-hidden"> <div className="bg-primary h-full transition-all duration-500" style={{ width: `${value}%` }} /> </div> <div className="text-xs mt-1 text-right font-mono">{value}%</div> </div> );
}