import React, { useState, useCallback } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = {
  lat: 14.5794, // Mandaluyong City
  lng: 121.0359,
};

/**
 * MapPicker Component
 * Interactive map for selecting lat/lng by clicking
 * Auto-fills address via reverse geocoding
 * 
 * Props:
 * - value: { lat, lng } - Initial/current position
 * - onChange: (position, address) => void - Callback when position changes (receives position and address)
 * - center: { lat, lng } - Map center (optional, defaults to Mandaluyong)
 */
export default function MapPicker({ value, onChange, center = defaultCenter }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [markerPosition, setMarkerPosition] = useState(value || center);
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const handleMapClick = useCallback(async (event) => {
    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };
    setMarkerPosition(newPosition);
    
    // Reverse geocode to get address
    setGeocoding(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: newPosition });
      
      if (result.results && result.results[0]) {
        const formattedAddress = result.results[0].formatted_address;
        setAddress(formattedAddress);
        
        if (onChange) {
          onChange(newPosition, formattedAddress);
        }
      } else {
        setAddress('');
        if (onChange) {
          onChange(newPosition, null);
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setAddress('');
      if (onChange) {
        onChange(newPosition, null);
      }
    } finally {
      setGeocoding(false);
    }
  }, [onChange]);

  if (loadError) {
    return <div style={{ color: 'red' }}>Error loading map</div>;
  }

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  return (
    <div style={{ border: '2px solid #ff9800', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ 
        backgroundColor: '#ff9800', 
        color: 'white', 
        padding: '8px 12px', 
        fontWeight: 'bold',
        fontSize: '0.9rem'
      }}>
        📍 Click on the map to set location
        {geocoding && <span style={{ marginLeft: 10 }}>🔄 Getting address...</span>}
      </div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={14}
        center={markerPosition || center}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {markerPosition && (
          <Marker
            position={markerPosition}
            animation={window.google.maps.Animation.DROP}
          />
        )}
      </GoogleMap>
      {markerPosition && (
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: '#f5f5f5', 
          fontSize: '0.85rem',
          borderTop: '1px solid #ddd'
        }}>
          <div><strong>Coordinates:</strong> {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}</div>
          {address && <div style={{ marginTop: 4 }}><strong>Address:</strong> {address}</div>}
        </div>
      )}
    </div>
  );
}
