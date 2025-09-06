import { loadLeaflet } from "./loadLeaflet";

const GKEY = import.meta.env.VITE_GOOGLE_API_KEY;

type MapsAPI = { kind: "google" | "leaflet" | "none"; api: any };

// --- ADAUGAT PENTRU DEBUGGING ---
// Această funcție va fi apelată automat de scriptul Google Maps dacă există o eroare de autentificare
(window as any).gm_authFailure = () => {
  console.error("*******************************************************");
  console.error("EROARE GOOGLE MAPS: Autentificare eșuată!");
  console.error("Verifică următoarele:");
  console.error("1. Cheia API VITE_GOOGLE_API_KEY este corectă în Netlify?");
  console.error("2. Serviciul 'Maps JavaScript API' este ACTIVAT în Google Cloud?");
  console.error("3. Nu ai restricții de domeniu (HTTP referrers) care blochează site-ul?");
  console.error("*******************************************************");
};
// --- FINAL ADAUGIRI DEBUGGING ---

async function loadGoogleMaps(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps) return resolve((window as any).google);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        // Verificăm dacă obiectul 'maps' a fost încărcat corect
        if ((window as any).google && (window as any).google.maps) {
            console.log("Google Maps script încărcat cu succes.");
            resolve((window as any).google);
        } else {
            console.error("Google Maps script s-a încărcat, dar obiectul 'google.maps' nu este disponibil. Verifică cheia API.");
            resolve(null);
        }
    };
    
    script.onerror = (error) => {
        console.error("Eroare la încărcarea scriptului Google Maps:", error);
        resolve(null);
    };
    
    document.head.appendChild(script);
  });
}

export async function loadMaps(pref: "auto" | "google" | "leaflet" = "auto"): Promise<MapsAPI> {
  if (pref === "google" || (pref === "auto" && GKEY)) {
    const api = await loadGoogleMaps();
    if (api) return { kind: "google", api };
  }
  
  console.warn("Nu s-a putut încărca Google Maps. Se încarcă harta de rezervă (Leaflet).");
  const api = await loadLeaflet();
  if (api) return { kind: "leaflet", api };
  
  return { kind: "none", api: null };
}