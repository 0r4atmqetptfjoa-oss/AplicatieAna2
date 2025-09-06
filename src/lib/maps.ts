// src/lib/maps.ts
import { loadLeaflet } from "./loadLeaflet";

const GKEY = import.meta.env.VITE_GOOGLE_API_KEY;

type MapsAPI = { kind: "google" | "leaflet" | "none"; api: any };

async function loadGoogleMaps(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps) return resolve((window as any).google);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&loading=async`;
    script.async = true;
    script.defer = true;
    // Google Maps API va căuta o funcție globală numită initMap. O definim temporar.
    (window as any).initMap = () => resolve((window as any).google);
    script.onload = () => resolve((window as any).google);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

// AM ADĂUGAT 'export' AICI
export async function loadMaps(pref: "auto" | "google" | "leaflet" = "auto"): Promise<MapsAPI> {
  if (pref === "google" || (pref === "auto" && GKEY)) {
    const api = await loadGoogleMaps();
    if (api) return { kind: "google", api };
  }
  const api = await loadLeaflet();
  if (api) return { kind: "leaflet", api };
  return { kind: "none", api: null };
}