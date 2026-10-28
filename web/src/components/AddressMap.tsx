import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'

/** Small locator map. Loaded lazily so Leaflet is not in the first bundle. */
export default function AddressMap({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  return (
    <div className="h-48 overflow-hidden rounded-lg border border-line" role="img" aria-label={label}>
      <MapContainer
        key={`${lat},${lon}`}
        center={[lat, lon]}
        zoom={16}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[lat, lon]}
          radius={9}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#c8452f', fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  )
}
