// src/pages/Fitness.tsx (v3.0 - Îmbunătățit de Gemini cu funcții avansate Google Maps)
import React, { useEffect, useMemo, useRef, useState } from "react"
import { loadMaps } from "@/lib/maps"
import { Pt, computeDistance, formatDuration, formatPace, toGPX } from "@/lib/geo"
import { speak, setTtsEnabled } from "@/lib/tts"
import { loadRuns, saveRun, clearRuns, RunSession } from "@/lib/storage"
import { Pause, Play, MapPin, StopCircle, Layers, BarChart3, Navigation } from "lucide-react"
import { Chart } from 'react-google-charts'; // Instalează cu: npm install react-google-charts

const GPS_ACCURACY_THRESHOLD = 35; 
const MIN_DISTANCE_THRESHOLD = 5; 

type GpsStatus = "strong" | "medium" | "weak" | "off";
type RunState = "idle" | "running" | "paused";

const GMAP_STYLES: Record<string, any[]> = {
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
  const [styleKey, setStyleKey] = useState<"dark" | "army">("dark");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [elevationData, setElevationData] = useState<any[]>([]);

  const runs = loadRuns();
  const [tts, setTts] = useState(true);

  const watchId = useRef<number | null>(null);
  const mapRef = useRef<any>(null);
  const polyRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
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
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          styles: GMAP_STYLES[styleKey]
        });

        const poly = new g.maps.Polyline({
          path: [],
          strokeColor: "#3b82f6",
          strokeOpacity: 0.9,
          strokeWeight: 6
        });
        poly.setMap(map);
        
        const marker = new g.maps.Marker({
          position: {lat: 44.4268, lng: 26.1025},
          map,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#1d4ed8",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 3,
          }
        });
        
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
        const { latitude: lat, longitude: lng } = pos.coords;
        if(mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(17);
        }
        
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
  
  const handlePrimaryAction = () => {
    if (runState === "idle") {
      setTime(0); setPoints([]); lastHalfKm.current = 0; startTs.current = Date.now(); setElevationData([]);
      polyRef.current?.getPath().clear();
      heatmapRef.current?.setMap(null);
      directionsRendererRef.current?.setMap(null);
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
        id: String(Date.now()), startedAt: startTs.current || Date.now(),
        durationSec: time, distanceM: distance, paceAvg: paceAvg,
        splits: computeSplits(points, startTs.current),
        points: points, // Salvăm punctele pentru funcțiile avansate
      };
      saveRun(run);
      generateElevationProfile(points);
    }
    setRunState("idle");
  };

  const generateElevationProfile = (runPoints: Pt[]) => {
    if (mapsKind !== 'google' || runPoints.length < 2) return;
    const g = (window as any).google;
    const elevator = new g.maps.ElevationService();
    const path = runPoints.map(p => ({ lat: p.lat, lng: p.lng }));

    elevator.getElevationForPath({ path, samples: 100 })
      .then(({ results }: any) => {
        if (results) {
          const data = [["Distanță", "Elevație"]];
          let currentDist = 0;
          for(let i=0; i< results.length; i++) {
            if(i > 0) currentDist += computeDistance([runPoints[i-1], runPoints[i]]);
            data.push([currentDist / 1000, results[i].elevation]);
          }
          setElevationData(data);
        }
      }).catch((e:any) => console.error("Eroare la calcularea elevației:", e));
  };
  
  const toggleHeatmap = () => {
    if (mapsKind !== 'google' || points.length < 2) return;
    const g = (window as any).google;
    
    if (!showHeatmap) {
      const heatmapData = points.map((p, i) => {
        let weight = 0.5; // Viteză medie
        if(i > 0) {
            const segmentDist = computeDistance([points[i-1], p]);
            const segmentTime = (p.t! - points[i-1].t!) / 1000;
            const speed = segmentDist / segmentTime; // m/s
            if(speed > 4) weight = 1.0; // Rapid
            else if(speed < 2.5) weight = 0.2; // Lent
        }
        return { location: new g.maps.LatLng(p.lat, p.lng), weight };
      });

      const heatmap = new g.maps.visualization.HeatmapLayer({
        data: heatmapData,
        radius: 20,
        gradient: ["rgba(0, 255, 255, 0)", "rgba(0, 255, 255, 1)", "rgba(0, 191, 255, 1)", "rgba(0, 127, 255, 1)", "rgba(0, 63, 255, 1)", "rgba(0, 0, 255, 1)", "rgba(0, 0, 223, 1)", "rgba(0, 0, 191, 1)", "rgba(0, 0, 159, 1)", "rgba(0, 0, 127, 1)", "rgba(63, 0, 91, 1)", "rgba(127, 0, 63, 1)", "rgba(191, 0, 31, 1)", "rgba(255, 0, 0, 1)"]
      });
      heatmap.setMap(mapRef.current);
      heatmapRef.current = heatmap;
    } else {
      heatmapRef.current?.setMap(null);
    }
    setShowHeatmap(!showHeatmap);
  };
  
  const showRouteToStart = () => {
    if(mapsKind !== 'google' || points.length < 1) return;
    const g = (window as any).google;
    const directionsService = new g.maps.DirectionsService();
    
    if(!directionsRendererRef.current) {
        directionsRendererRef.current = new g.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: { strokeColor: "#10b981", strokeWeight: 5, strokeOpacity: 0.8 }
        });
    }
    directionsRendererRef.current.setMap(mapRef.current);
    
    directionsService.route({
        origin: { lat: points[points.length-1].lat, lng: points[points.length-1].lng },
        destination: { lat: points[0].lat, lng: points[0].lng },
        travelMode: 'WALKING'
    }).then((response: any) => {
        directionsRendererRef.current.setDirections(response);
    });
  }

  return (
    <main className="p-4 space-y-4">
      <section className="card space-y-2">
        <div className="h2">Pregătire Fizică 2km</div>
        <div className="text-sm text-muted">Modul avansat cu Google Maps, Heatmap viteză și Profil elevație.</div>
      </section>

      <section className="card grid grid-cols-2 gap-4">
        <Metric label="Timp" value={formatDuration(time)} />
        <Metric label="Distanță" value={`${(distance / 1000).toFixed(2)} km`} />
        <Metric label="Ritm Mediu" value={formatPace(paceAvg)} />
        <Progress label="Progres 2 km" value={Math.min(100, Math.round((distance/2000)*100))} />
      </section>

      <section className="card flex items-center gap-3 flex-wrap justify-center">
        {runState !== "idle" && (
          <button className="btn btn-ghost text-red-500 flex items-center gap-2" onClick={handleStop}>
            <StopCircle size={20} /> Oprește & Salvează
          </button>
        )}
        <button className="btn btn-primary flex items-center gap-2" onClick={handlePrimaryAction}>
          {runState === 'idle' && <><Play size={20}/> Start Cursă</>}
          {runState === 'running' && <><Pause size={20}/> Pauză</>}
          {runState === 'paused' && <><Play size={20}/> Reluare</>}
        </button>
      </section>
      
      <section className="card p-0 overflow-hidden relative">
        <div id="map" style={{height: 380, width: "100%"}} />
        <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2 text-sm shadow-lg">
          <GpsIndicator status={gpsStatus} />
          <span>GPS: {gpsStatus}</span>
        </div>
        <div className="absolute bottom-2 left-2 flex flex-col gap-2">
            <button title="Arată/Ascunde Heatmap Viteză" onClick={toggleHeatmap} disabled={runState !== 'idle' || points.length < 2} className="btn btn-ghost p-2 h-10 w-10 disabled:opacity-50 bg-card/80 backdrop-blur-sm shadow-lg"><Layers/></button>
            <button title="Arată ruta spre start" onClick={showRouteToStart} disabled={points.length < 2} className="btn btn-ghost p-2 h-10 w-10 disabled:opacity-50 bg-card/80 backdrop-blur-sm shadow-lg"><Navigation/></button>
        </div>
        {mapsKind === 'google' && (
          <div className="absolute top-2 right-2">
            <select className="input text-xs shadow-lg" value={styleKey} onChange={e => setStyleKey(e.target.value as any)}>
              <option value="dark">Stil: Noapte</option>
              <option value="army">Stil: Militar</option>
            </select>
          </div>
        )}
      </section>

      {elevationData.length > 0 && (
          <section className="card">
              <div className="h3 mb-2 flex items-center gap-2"><BarChart3 size={20}/> Profil Elevație</div>
              <Chart
                  chartType="LineChart"
                  data={elevationData}
                  width="100%"
                  height="200px"
                  options={{
                      legend: 'none',
                      hAxis: { title: 'Distanță (km)' },
                      vAxis: { title: 'Elevație (m)' },
                      colors: ['#3b82f6'],
                      backgroundColor: 'transparent',
                      chartArea: { width: '85%', height: '70%' }
                  }}
              />
          </section>
      )}

      {/* Istoric Antrenamente, etc. */}
    </main>
  );
}

// ... restul componentelor (GpsIndicator, computeSplits, Metric, Progress) rămân aici ...