/**
 * Reverse-geocodes coordinates to human-readable location names
 * using Nominatim (OpenStreetMap) — no API key required.
 * Rate-limited to 1 req/sec per Nominatim usage policy.
 */

const geocodeCache = new Map<string, string>();
let lastRequestTime = 0;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;

  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < 1100) await sleep(1100 - elapsed);
  lastRequestTime = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'GeoTracker/1.0' } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.suburb || a.neighbourhood,
      a.city || a.town || a.village,
      a.state,
    ].filter(Boolean) as string[];
    const result =
      parts.slice(0, 3).join(', ') ||
      (data.display_name || '').split(',').slice(0, 2).join(',').trim() ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    geocodeCache.set(key, result);
    return result;
  } catch {
    const fallback = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
    geocodeCache.set(key, fallback);
    return fallback;
  }
}

export interface GeoPoint { latitude: number; longitude: number; }

/** Batch-geocode an array of locations (nulls return '—'). */
export async function geocodeBatch(
  locations: (GeoPoint | null | undefined)[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    results.push(loc ? await reverseGeocodeLocation(loc.latitude, loc.longitude) : '—');
    onProgress?.(i + 1, locations.length);
  }
  return results;
}

export function clearGeocodeCache() { geocodeCache.clear(); }
