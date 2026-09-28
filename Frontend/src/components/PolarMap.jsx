import { useMemo, useState } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import marker from 'leaflet/dist/images/marker-icon.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: marker2x, iconUrl: marker, shadowUrl: shadow })

export default function PolarMap({ region = 'south', markers = [], routes = [], geofences = [], height = 430 }) {
  const [fullscreen, setFullscreen] = useState(false)
  const center = useMemo(() => {
    const first = markers.find((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
    if (first) return [Number(first.latitude), Number(first.longitude)]
    return region === 'north' ? [72, 0] : [-75, 0]
  }, [markers, region])

  return <div className={fullscreen ? 'polar-map fullscreen' : 'polar-map'} style={{ height: fullscreen ? undefined : height }}>
    <button className="map-fullscreen-button" onClick={() => setFullscreen((value) => !value)}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
    <MapContainer center={center} zoom={region === 'north' ? 3 : 3} scrollWheelZoom className="leaflet-host">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {markers.filter((m) => m.latitude != null && m.longitude != null).map((item, index) => (
        <Marker key={(item.kind || 'marker') + '-' + (item.id ?? index)} position={[Number(item.latitude), Number(item.longitude)]}>
          <Popup><strong>{item.name || item.title || item.code || 'Location'}</strong><br />{item.kind || item.type || item.status || ''}</Popup>
        </Marker>
      ))}
      {routes.map((route, index) => (
        <Polyline key={route.id ?? index} positions={[[Number(route.start_lat),Number(route.start_lon)],[Number(route.end_lat),Number(route.end_lon)]]} />
      ))}
      {geofences.map((zone, index) => (
        <Circle key={zone.id ?? index} center={[Number(zone.center_lat),Number(zone.center_lon)]} radius={Number(zone.radius_m || 1000)}>
          <Popup><strong>{zone.name}</strong><br />{zone.kind || zone.zone_type}</Popup>
        </Circle>
      ))}
    </MapContainer>
  </div>
}
