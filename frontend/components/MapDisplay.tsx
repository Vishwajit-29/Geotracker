import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Location, Geofence } from '../types';
import L from 'leaflet';

// Fix for default icon issue in build-free environments like this one.
// We are manually setting the paths for the default icon images to point to a CDN.
// This prevents errors from trying to import image files directly in JavaScript.
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


interface MapDisplayProps {
  center: Location;
  zoom?: number;
  markerPosition?: Location | null;
  circle?: Geofence | null;
  isEditable?: boolean;
  onMapClick?: (location: Location) => void;
}

const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Component to handle map click events using the official react-leaflet hook
const MapEvents: React.FC<{ onMapClick: (location: Location) => void }> = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        },
    });
    return null;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  center,
  zoom = 14,
  markerPosition,
  circle,
  isEditable = false,
  onMapClick,
}) => {
  const mapCenter: [number, number] = [center.latitude, center.longitude];

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200" aria-label="Location Map">
       <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <ChangeView center={mapCenter} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markerPosition && (
            <Marker position={[markerPosition.latitude, markerPosition.longitude]} />
          )}
          {circle && (
            <Circle 
              center={[circle.center.latitude, circle.center.longitude]}
              radius={circle.radius}
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
            />
          )}
          {isEditable && onMapClick && <MapEvents onMapClick={onMapClick} />}
        </MapContainer>
    </div>
  );
};

export default MapDisplay;