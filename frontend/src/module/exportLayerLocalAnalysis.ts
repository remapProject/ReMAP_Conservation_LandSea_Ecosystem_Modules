type GeoJsonProperties = { [key: string]: any };
interface Geometry { type: string; coordinates: any; }
interface Feature { type: 'Feature'; geometry: Geometry | null; properties?: GeoJsonProperties; id?: string | number; }
interface FeatureCollection { type: 'FeatureCollection'; features: Feature[]; }

export function normalizeToFeatureCollection(input: any): FeatureCollection {
  if (!input) return { type: 'FeatureCollection', features: [] };

  let obj = input;
  if (typeof input === 'string') {
    try { obj = JSON.parse(input); } catch { /* no JSON */ }
  }

  if (obj && obj.type === 'FeatureCollection' && Array.isArray(obj.features)) return obj as FeatureCollection;
  if (obj && obj.type === 'Feature') return { type: 'FeatureCollection', features: [obj as Feature] };
  if (obj && obj.coordinates) return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: obj as Geometry, properties: {} }] };
  if (Array.isArray(obj)) {
    // Asumimos que es un array de Features
    return { type: 'FeatureCollection', features: obj as Feature[] };
  }

  return { type: 'FeatureCollection', features: [] };
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_') || 'export';
}

export function featuresToFeatureCollection(features: Feature[]) : FeatureCollection {
  if (!Array.isArray(features)) {
    throw new TypeError('features debe ser un array de GeoJSON Feature');
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Descarga en cliente un array de Features o un FeatureCollection como .geojson
 * data: Feature[] | FeatureCollection | cualquier (se normaliza internamente)
 */
export function downloadGeoJSONLocalAnalysis(
  data: any,
  filename = 'export.geojson',
  pretty = true
) {
  const fc: FeatureCollection = Array.isArray(data) ? featuresToFeatureCollection(data) : normalizeToFeatureCollection(data);
  const json = pretty ? JSON.stringify(fc, null, 2) : JSON.stringify(fc);
  const blob = new Blob([json], { type: 'application/geo+json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}