import { loadLeaflet } from "./loadLeaflet";

const GKEY = import.meta.env.VITE_GOOGLE_API_KEY;

type MapsAPI = { kind: "google" | "leaflet" | "none"; api: any };

// Funcție pentru a încărca scriptul Google Maps
async function loadGoogleMaps(): Promise<any> {
  return new Promise((resolve) => {
    // Verificăm dacă nu a fost deja încărcat
    if ((window as any).google?.maps) return resolve((window as any).google);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&loading=async`;
    script.async = true;
    script.defer = true;
    
    // Google caută această funcție globală după ce se încarcă scriptul
    (window as any).initMap = () => resolve((window as any).google);
    script.onload = () => resolve((window as any).google);
    script.onerror = () => resolve(null); // Returnează null în caz de eroare (ex: cheie API greșită)
    document.head.appendChild(script);
  });
}

// Funcția principală care încearcă Google Maps, apoi Leaflet
export async function loadMaps(pref: "auto" | "google" | "leaflet" = "auto"): Promise<MapsAPI> {
  // Dacă avem cheie API, încercăm să încărcăm Google Maps
  if (pref === "google" || (pref === "auto" && GKEY)) {
    const api = await loadGoogleMaps();
    if (api) return { kind: "google", api };
  }
  
  // Dacă Google Maps eșuează sau nu avem cheie, încărcăm Leaflet ca rezervă
  const api = await loadLeaflet();
  if (api) return { kind: "leaflet", api };
  
  // Dacă ambele eșuează
  return { kind: "none", api: null };
}