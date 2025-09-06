import { loadLeaflet } from "./loadLeaflet";

const GKEY = import.meta.env.VITE_GOOGLE_API_KEY;

type MapsAPI = { kind: "google" | "leaflet" | "none"; api: any };

// Funcție pentru a încărca scriptul Google Maps
async function loadGoogleMaps(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps) return resolve((window as any).google);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&loading=async&libraries=visualization,places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        if ((window as any).google && (window as any).google.maps) {
            resolve((window as any).google);
        } else {
            resolve(null);
        }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

// Funcția principală care alege harta
export async function loadMaps(): Promise<MapsAPI> {
  // Dacă avem cheie API, încercăm să încărcăm Google Maps
  if (GKEY) {
    const api = await loadGoogleMaps();
    if (api) return { kind: "google", api };
  }
  
  // Dacă Google Maps eșuează sau nu avem cheie, încărcăm Leaflet ca rezervă
  console.warn("Nu s-a putut încărca Google Maps. Se încarcă harta de rezervă (Leaflet).");
  const api = await loadLeaflet();
  if (api) return { kind: "leaflet", api };
  
  return { kind: "none", api: null };
}