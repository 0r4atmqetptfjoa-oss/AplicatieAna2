// src/lib/maps.ts
// Smart loader: Google Maps (env/localStorage) → fallback Leaflet (CDN) → none.

type LoaderResult =
  | { kind: "google"; api: any }
  | { kind: "leaflet"; api: any }
  | { kind: "none" };

const GMAPS_CALLBACK = "__gmaps_cb__";

function getGmapsKey(): string | undefined {
  const envKey = (import.meta as any)?.env?.VITE_GOOGLE_API_KEY as string | undefined;
  if (envKey && envKey.trim()) return envKey.trim();
  const lsKey = typeof localStorage !== "undefined" ? localStorage.getItem("gmaps_key") || "" : "";
  return lsKey.trim() || undefined;
}

export async function loadMaps(prefer: "google" | "auto" = "auto"): Promise<LoaderResult> {
  // if already present
  if ((window as any).google?.maps) return { kind: "google", api: (window as any).google };
  if ((window as any).L) return { kind: "leaflet", api: (window as any).L };

  const key = getGmapsKey();
  if ((prefer === "google" || prefer === "auto") && key) {
    try {
      await new Promise<void>((resolve, reject) => {
        (window as any)[GMAPS_CALLBACK] = () => resolve();
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${GMAPS_CALLBACK}&v=quarterly`;
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      if ((window as any).google?.maps) return { kind: "google", api: (window as any).google };
    } catch (e) {
      console.warn("Google Maps failed to load, falling back to Leaflet.", e);
    }
  }

  // Leaflet fallback via CDN (no build deps)
  await loadLeafletFromCdn();
  if ((window as any).L) return { kind: "leaflet", api: (window as any).L };

  return { kind: "none", api: null };
}

async function loadLeafletFromCdn() {
  // avoid dup loads
  if ((window as any).__leaflet_loading) return;
  if ((window as any).L) return;
  (window as any).__leaflet_loading = true;

  await new Promise<void>((resolve) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.onload = () => resolve();
    document.head.appendChild(css);
  });

  await new Promise<void>((resolve) => {
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => resolve();
    document.head.appendChild(js);
  });
}
