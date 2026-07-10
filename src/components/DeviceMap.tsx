import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

function DeviceMap({ logs }: Props) {
  const [locations, setLocations] = useState<LocationData[]>([]);

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
            device: log.device_id || 'Unknown Device',
            time: log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Reciente'
          });
        }
      }
    });

    setLocations(locs);
  }, [logs]);

  return (
    <div style={{ background: 'rgba(10, 0, 20, 0.4)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
      <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.8rem', color: '#00f0ff', marginBottom: '16px' }}>
        Mapa de Nodos (Últimas ubicaciones)
      </h3>
      
      <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
        {locations.length > 0 ? (
          <MapContainer 
            center={[19.4326, -99.1332]} 
            zoom={3} 
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
          </MapContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
            No hay datos de ubicación disponibles.
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(DeviceMap);
