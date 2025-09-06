// src/pages/Fitness.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { loadMaps } from "@/lib/maps"
import { Pt, computeDistance, formatDuration, formatPace, toGPX } from "@/lib/geo"
import { speak, setTtsEnabled } from "@/lib/tts"
import { loadRuns, saveRun, clearRuns, RunSession } from "@/lib/storage"
import { Pause, Play, MapPin, StopCircle } from "lucide-react"

const GPS_ACCURACY_THRESHOLD = 30; 
const MIN_DISTANCE_THRESHOLD = 5; 

type GpsStatus = "strong" | "medium" | "weak" | "off";
type RunState = "idle" | "running" | "paused";

// Stilurile personalizate pentru Google Maps
const GMAP_STYLES: Record<string, any[]> = {
  default: [],
  dark: [
    { elementType: "geometry", stylers: [{color: "#1f2937"}] },
    { elementType: "labels.text.fill", stylers: [{color: "#e5e7eb"}] },
    { elementType: "labels.text.stroke", stylers: [{color: "#111827"}] },
    { featureType: "road", elementType: "geometry", stylers: [{color: "#374151"}] },
    { featureType: "water", elementType: "geometry", stylers: [{color: "#0ea5e9"}] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{color: "#064e3b"}] },
  ],
  army: [
    { elementType: "geometry", stylers: [{color: "#2b3a20"}] },
    { elementType: "labels.text.fill", stylers: [{color: "#fef3c7"}] },
    { elementType: "labels.text.stroke", stylers: [{color: "#1a2314"}] },
    { featureType: "road", elementType: "geometry", stylers: [{color: "#5b7a3a"}] },
    { featureType: "water", elementType: "geometry", stylers: [{color: "#264653"}] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{color: "#3a5a40"}] },
  ]
};

export default function Fitness(){
  const [runState, setRunState] = useState<RunState>("idle");
  const [time, setTime] = useState(0);
  const [points, setPoints] = useState<Pt[]>([]);
  const [error, setError] = useState<string>("");
  const [isTracking, setIsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("off");
  const [mapsKind, setMapsKind] = useState<"google" | "leaflet" | "none">("none");
  const [styleKey, setStyleKey] = useState<"default" | "dark" | "army">("dark");
  
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

  useEffect(() => {
    let interval: any = null;
    if (runState === "running") {
      interval = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [runState]);

  useEffect(() => {
    (async () => {
      const loaded = await loadMaps("auto");
      setMapsKind(loaded.kind);
      
      const el = document.getElementById("map");
      if (!el || mapRef.current) return;

      if (loaded.kind === "google") {
        const g = loaded.api;
        const map = new g.maps.Map(el, {
          center: {lat: 44.4268, lng: 26.1025},
          zoom: 14,
          disableDefaultUI: true,
          styles: GMAP_STYLES[styleKey]
        });
        const poly = new g.maps.Polyline({ path: [], strokeColor: "#0ea5e9", strokeWeight: 5, strokeOpacity: 0.8 });
        poly.setMap(map);
        const marker = new g.maps.Marker({ position: {lat: 44.4268, lng: 26.1025}, map });
        mapRef.current = map; polyRef.current = poly; markerRef.current = marker;
      } else if (loaded.kind === "leaflet") {
        const L = loaded.api;
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

  useEffect(() => {
    if (mapRef.current && mapsKind === 'google') {
      mapRef.current.setOptions({ styles: GMAP_STYLES[styleKey] });
    }
  }, [styleKey, mapsKind]);

  const addPoint = (p: Pt, accuracy: number) => {
    setGpsStatus(accuracy < 15 ? "strong" : accuracy < 30 ? "medium" : "weak");
    if (accuracy > GPS_ACCURACY_THRESHOLD) return;

    setPoints(prev => {
      if (prev.length > 0 && computeDistance([prev[prev.length - 1], p]) < MIN_DISTANCE_THRESHOLD) {
        return prev;
      }
      
      const next = [...prev, p];
      try {
        if (mapsKind === "google") {
          const g = (window as any).google;
          const latLng = new g.maps.LatLng(p.lat, p.lng);
          polyRef.current.getPath().push(latLng);
          markerRef.current.setPosition(latLng);
        } else if (mapsKind === "leaflet") {
          const L = (window as any).L;
          const latLng = L.latLng(p.lat, p.lng);
          polyRef.current.addLatLng(latLng);
          markerRef.current.setLatLng(latLng);
        }
      } catch {}

      if (tts && next.length > 1 && (computeDistance(next) - lastHalfKm.current >= 500)) {
        lastHalfKm.current += 500;
        speak(`Ai trecut de ${(lastHalfKm.current / 1000).toFixed(1)} kilometri`);
      }
      return next;
    });
  };
  
  const startTracking = () => {
    if (!("geolocation" in navigator)) { setError("Geolocație indisponibilă"); return; }
    if (watchId.current != null) return;
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if(mapRef.current) {
            if (mapsKind === 'google') mapRef.current.setCenter({ lat, lng });
            else if (mapsKind === 'leaflet') mapRef.current.setView([lat, lng], 17);
        }
        setGpsStatus(accuracy < 15 ? "strong" : "medium");

        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            if (runState === 'running') {
              addPoint({ lat, lng, t: Date.now() }, accuracy);
            }
          },
          (err) => { setError(err.message); setGpsStatus("off"); },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        setIsTracking(true);
      },
      (err) => { setError(err.message); setGpsStatus("off"); },
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

  const handlePrimaryAction = () => {
    if (runState === "idle") {
      setTime(0); setPoints([]); lastHalfKm.current = 0; startTs.current = Date.now();
      setRunState("running");
      if (!isTracking) startTracking();
    } else if (runState === "running") {
      setRunState("paused");
    } else if (runState === "paused") {
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
      {/* ... restul JSX-ului rămâne la fel ca în versiunea anterioară, doar am adăugat meniul de stiluri pentru hartă înapoi ... */}
      <section className="card space-y-2">
        <div className="h2">Țintă: 2 km sub 10:00</div>
        <div className="text-sm text-muted">Cronometru, GPS cu filtru de acuratețe, Pauză/Reluare și istoric.</div>
      </section>

      <section className="card grid grid-cols-2 gap-4">
        {/* ... Metrics ... */}
      </section>

      <section className="card flex items-center gap-2 flex-wrap justify-center">
        {/* ... Butoane ... */}
      </section>
      
      <section className="card p-0 overflow-hidden relative">
        <div id="map" style={{height: 360, width: "100%"}} />
        <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2 text-sm">
          {/* ... Indicator GPS ... */}
        </div>
        {mapsKind === 'google' && (
          <div className="absolute top-2 right-2">
            <select className="input text-xs" value={styleKey} onChange={e => setStyleKey(e.target.value as any)}>
              <option value="dark">Stil: Noapte</option>
              <option value="default">Stil: Normal</option>
              <option value="army">Stil: Militar</option>
            </select>
          </div>
        )}
      </section>

      <section className="card">
        {/* ... Istoric Antrenamente ... */}
      </section>
    </main>
  );
}
// ... restul componentelor helper ...