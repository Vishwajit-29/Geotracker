import React, { useState } from 'react';
import { User, Geofence, Location } from '../types';
import MapDisplay from './MapDisplay';
import { DEFAULT_GEOFENCE } from '../constants';

interface GeofenceEditorModalProps {
  user: User;
  onSave: (user: User, geofence: Geofence | undefined) => void;
  onClose: () => void;
}

const DEFAULT_NEW_GEOFENCE_RADIUS = 500; // 500 meters

const GeofenceEditorModal: React.FC<GeofenceEditorModalProps> = ({ user, onSave, onClose }) => {
  const [geofence, setGeofence] = useState<Geofence | undefined>(user.geofence);

  const handleMapClick = (location: Location) => {
    setGeofence(prev => ({
        center: location,
        radius: prev?.radius || DEFAULT_NEW_GEOFENCE_RADIUS,
    }));
  };

  const handleSave = () => {
    onSave(user, geofence);
  };
  
  const handleClear = () => {
    setGeofence(undefined);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-brand-dark">Edit Geofence for {user.name}</h3>
          <p className="text-sm text-brand-secondary">Click on the map to set the center. Drag marker to adjust.</p>
        </div>
        <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Center Latitude</label>
                        <input type="number" step="any" value={geofence?.center.latitude || ''} onChange={(e) => setGeofence(g => ({...g!, center: {...g!.center, latitude: parseFloat(e.target.value)}}))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" required={!!geofence} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Center Longitude</label>
                        <input type="number" step="any" value={geofence?.center.longitude || ''} onChange={(e) => setGeofence(g => ({...g!, center: {...g!.center, longitude: parseFloat(e.target.value)}}))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" required={!!geofence} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Radius (meters)</label>
                        <input type="number" step="1" value={geofence?.radius || ''} onChange={(e) => setGeofence(g => ({...g!, radius: parseInt(e.target.value, 10)}))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" required={!!geofence} />
                    </div>
                </form>
                <div className="h-80">
                    <MapDisplay
                        center={geofence?.center || DEFAULT_GEOFENCE.center}
                        zoom={13}
                        markerPosition={geofence?.center}
                        circle={geofence}
                        isEditable={true}
                        onMapClick={handleMapClick}
                    />
                </div>
            </div>
        </div>
        <div className="p-6 bg-gray-50 rounded-b-xl flex justify-between items-center">
            <button onClick={handleClear} disabled={!geofence} className="text-sm text-brand-secondary hover:text-brand-danger disabled:opacity-50">Use Company Default</button>
            <div className="flex gap-3">
              <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={handleSave} className="py-2 px-4 bg-brand-primary text-white rounded-lg shadow hover:bg-blue-600 transition">Save Geofence</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GeofenceEditorModal;