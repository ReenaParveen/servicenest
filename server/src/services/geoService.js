const cache = new Map();
let lastNominatimAt = 0;

export async function searchPlaces(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const value = process.env.GOOGLE_MAPS_API_KEY ? await googleSearch(q) : await nominatimSearch(q);
    cache.set(key, { value, expires: Date.now() + 10 * 60 * 1000 });
    return value;
  } catch (error) {
    console.log(JSON.stringify({ level: 'error', message: 'geocode_failed', reason: error.message }));
    return [];
  }
}

async function nominatimSearch(q) {
  const wait = Math.max(0, 1000 - (Date.now() - lastNominatimAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimAt = Date.now();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ServiceNest/1.0 (local services marketplace)',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    label: row.display_name,
    city: row.address?.city || row.address?.town || row.address?.village || row.address?.state_district || '',
    state: row.address?.state || '',
    lat: Number(row.lat),
    lng: Number(row.lon),
  }));
}

async function googleSearch(q) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', q);
  url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY);
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return [];
  const payload = await response.json();
  return (payload.results || []).slice(0, 5).map((row) => {
    const city = row.address_components?.find((part) => part.types.includes('locality'))?.long_name || '';
    const state = row.address_components?.find((part) => part.types.includes('administrative_area_level_1'))?.long_name || '';
    return {
      label: row.formatted_address,
      city,
      state,
      lat: row.geometry.location.lat,
      lng: row.geometry.location.lng,
    };
  });
}
