import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { colorForContact } from '../utils/contactColor';
import { formatExactDateTime } from '../appPage';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface BackendLog {
  device_id?: string;
  type?: string;
  timestamp?: string;
  content?: string;
}

interface Props {
  logs: BackendLog[];
}

interface LocationData {
  id: string;
  lat: number;
  lng: number;
  device: string;
  time: string;
  timestamp: string;
}

// Componente para ajustar el zoom a todos los marcadores
function ChangeView({ markers }: { markers: LocationData[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [markers, map]);
  return null;
}

// Centra el mapa en la tarjeta de ubicacion seleccionada (por dispositivo/momento).
function FlyToSelected({ location }: { location: LocationData | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 15, { duration: 0.6 });
    }
  }, [location, map]);
  return null;
}

function DeviceMap({ logs }: Props) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Buscar coordenadas en logs tipo LOCATION o extraer de content si es posible
    const locs: LocationData[] = [];

    logs.forEach((log, index) => {
      // Si el log es explícitamente de ubicación, o si log.content tiene un formato de lat,lng
      if (log.type === 'LOCATION' || log.content?.includes('lat:') || log.content?.match(/[-]?[0-9]*\.[0-9]+,\s*[-]?[0-9]*\.[0-9]+/)) {

        let lat = 0, lng = 0;
        let found = false;

        // Intentar parsear "lat: 19.43, lng: -99.13" o similar
        const contentStr = log.content || '';

        // Match regex for simple decimal coordinates (e.g., "19.4326, -99.1332")
        const coordMatch = contentStr.match(/([-]?[0-9]{1,2}\.[0-9]+)[^\d-]+([-]?[0-9]{1,3}\.[0-9]+)/);

        if (coordMatch) {
          lat = parseFloat(coordMatch[1]);
          lng = parseFloat(coordMatch[2]);
          found = true;
        }

        if (found && !isNaN(lat) && !isNaN(lng)) {
          locs.push({
            id: `loc-${index}`,
            lat,
            lng,
            device: log.device_id || 'Dispositivo desconocido',
            time: log.timestamp ? formatExactDateTime(log.timestamp) : 'Reciente',
            timestamp: log.timestamp || '',
          });
        } else if (log.type === 'LOCATION') {
          // El backend marco explicitamente este log como ubicacion, pero
          // no se pudieron extraer coordenadas del formato de "content"
          // (ej. numeros enteros sin decimales, JSON con otras claves,
          // etc.) -- sin este aviso, el punto se pierde del mapa en
          // silencio, sin ningun indicio de que algo no se pudo parsear.
          console.warn('[DeviceMap] Log tipo LOCATION sin coordenadas parseables:', log);
        }
      }
    });

    // Mas recientes primero, igual que las conversaciones de chat.
    locs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLocations(locs);
    setSelectedId(null);
  }, [logs]);

  const selectedLocation = locations.find(l => l.id === selectedId) || null;

  return (
    <div style={{ background: 'rgba(10, 0, 20, 0.4)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
      <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.8rem', color: '#00f0ff', marginBottom: '16px' }}>
        Mapa de Nodos (Últimas ubicaciones)
      </h3>

      {locations.length > 0 && (
        <div className="conversation-list location-card-list">
          {locations.map(loc => {
            const avatarColor = colorForContact(loc.device);
            const initial = (loc.device || '?').trim().charAt(0).toUpperCase() || '?';
            const isActive = loc.id === selectedId;
            return (
              <button
                key={loc.id}
                type="button"
                className={`conversation-row location-row${isActive ? ' active' : ''}`}
                data-testid={`open-location-${loc.id}`}
                onClick={() => setSelectedId(loc.id)}
                style={{ borderLeft: `3px solid ${avatarColor}` }}
              >
                <div className="conversation-avatar" style={{ background: avatarColor }}>{initial}</div>
                <div className="conversation-info">
                  <div className="conversation-top-row">
                    <strong>{loc.device}</strong>
                    <small>{loc.time}</small>
                  </div>
                  <div className="conversation-preview">📍 {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* El mapa (tiles oscuros de CartoDB) se muestra siempre, con
          marcadores o sin ellos -- un placeholder de texto plano en vez del
          mapa real se veia muy pobre visualmente para lo que deberia ser
          la pieza mas vistosa del dashboard. Sin ubicaciones, se ve un
          globo vacio con un aviso flotante en vez de nada. */}
      <div style={{ position: 'relative', height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginTop: locations.length > 0 ? 16 : 0 }}>
        <MapContainer
          center={[19.4326, -99.1332]}
          zoom={locations.length > 0 ? 3 : 2}
          style={{ height: '100%', width: '100%', background: '#0a0014' }}
          zoomControl={false}
        >
          {/* Dark mode tiles */}
          <TileLayer
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          />
          {locations.map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={customIcon}>
              <Popup>
                <div style={{ fontFamily: "'Inter', sans-serif" }}>
                  <strong style={{ color: '#ff0033' }}>Dispositivo:</strong> {loc.device}<br/>
                  <strong style={{ color: '#00f0ff' }}>Última vez:</strong> {loc.time}<br/>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})</span>
                </div>
              </Popup>
            </Marker>
          ))}
          <ChangeView markers={locations} />
          <FlyToSelected location={selectedLocation} />
        </MapContainer>

        {locations.length === 0 && (
          <div style={{
            position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 999,
            background: 'rgba(10, 0, 20, 0.85)', border: '1px solid rgba(0, 240, 255, 0.25)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)',
            pointerEvents: 'none', zIndex: 500, whiteSpace: 'nowrap',
          }}>
            📍 Aún no hay ubicaciones registradas
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DeviceMap);
