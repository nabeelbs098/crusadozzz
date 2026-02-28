import { MapContainer, TileLayer, Marker } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
}

export default function EmergencyMap({ lat, lng }: Props) {
  if (!lat || !lng) return null;

  const position: LatLngExpression = [lat, lng];

  return (
    <MapContainer
      center={position}
      zoom={15}
      className="h-64 w-full rounded-xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} />
    </MapContainer>
  );
}
