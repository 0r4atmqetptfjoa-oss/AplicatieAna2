// src/lib/maps.ts
// Single-key setup: reads API key from Vite env: VITE_API_KEY
// Exports helpers to load Google Maps JS API safely in PWA.

export const MAPS_KEY: string | undefined = import.meta.env.VITE_API_KEY;

/** Returns the Maps API key (for Static/Embed/Places requests). */
export function mapsApiKey(): string {
  if (!MAPS_KEY) {
    console.warn("VITE_API_KEY is not set. Maps features may be limited.");
    return "";
  }
  return MAPS_KEY;
}

/**
 * Dynamically loads Google Maps JavaScript API once and returns the google object.
 * Usage:
 *   const google = await loadGoogleMaps();
 *   const map = new google.maps.Map(el, { center, zoom: 14 });
 */
export function loadGoogleMaps(params: {
  libraries?: string[];          // e.g. ['places']
  language?: string;             // e.g. 'ro'
  region?: string;               // e.g. 'RO'
} = {}): Promise<any> {
  const key = mapsApiKey();
  if (!key) return Promise.reject(new Error("Missing VITE_API_KEY for Google Maps"));

  if ((window as any)._gmapsReady) {
    return (window as any)._gmapsReady;
  }

  (window as any)._gmapsReady = new Promise((resolve, reject) => {
    // If script already present, hook onload
    const existing = document.getElementById("google-maps");
    if (existing) {
      (existing as HTMLScriptElement).addEventListener("load", () => resolve((window as any).google));
      (existing as HTMLScriptElement).addEventListener("error", reject);
      if ((window as any).google?.maps) {
        resolve((window as any).google);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps";
    const libs = params.libraries?.length ? `&libraries=${params.libraries.join(",")}` : "";
    const lang = params.language ? `&language=${params.language}` : "";
    const region = params.region ? `&region=${params.region}` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}${libs}${lang}${region}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as any).google);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });

  return (window as any)._gmapsReady;
}

/** Builds a Static Maps image URL (no JS API needed). */
export function staticMapURL(opts: {
  center: { lat: number; lng: number };
  zoom?: number;
  size?: string; // '600x300'
  path?: string; // 'color:0x4285F4FF|weight:4|lat,lng|lat,lng'
  markers?: string; // 'color:red|label:S|lat,lng'
}): string {
  const key = mapsApiKey();
  const zoom = opts.zoom ?? 14;
  const size = opts.size ?? "640x340";
  const path = opts.path ? `&path=${encodeURIComponent(opts.path)}` : "";
  const markers = opts.markers ? `&markers=${encodeURIComponent(opts.markers)}` : "";
  return `https://maps.googleapis.com/maps/api/staticmap?center=${opts.center.lat},${opts.center.lng}&zoom=${zoom}&size=${size}${path}${markers}&key=${key}`;
}
