import React, { useContext, useState, useMemo, useEffect } from 'react';
import {
  GoogleMap,
  Marker,
  MarkerClusterer,
  Polygon,
  OverlayView,
  useJsApiLoader,
  DirectionsRenderer,
} from '@react-google-maps/api';

import hydrantOperationalUrl from '../assets/operational.png';
import hydrantNonOperationalUrl from '../assets/nonoperational.png';
import firestationIconUrl from '../assets/firestation.png';
import firesIconUrl from '../assets/fireIcon.png';
import AnimatedFireMarker from './AnimatedFireMarker';
import clusterPngUrl from '../assets/cluster.png';
// Import inline (base64) so we can embed the PNG inside an SVG data-URI without
// relying on an external fetch which can be blocked or cause CORS issues.
import clusterPngInline from '../assets/cluster.png?inline';

import { MapContext } from '../logic.jsx';

const GOOGLE_MAP_LIBRARIES = ['places', 'geometry', 'drawing', 'visualization'];
const loggedInvalidStationKeys = new Set();

function toFiniteNumber(value) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isValidPoint(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && Math.abs(lat) <= 90
    && Math.abs(lng) <= 180;
}

function extractStationPoint(feature) {
  const fromCoordinates = Array.isArray(feature?.geometry?.coordinates)
    ? {
      lng: toFiniteNumber(feature.geometry.coordinates[0]),
      lat: toFiniteNumber(feature.geometry.coordinates[1]),
    }
    : null;

  const fromGeometryObject = feature?.geometry
    ? {
      lng: toFiniteNumber(feature.geometry.longitude ?? feature.geometry.lng),
      lat: toFiniteNumber(feature.geometry.latitude ?? feature.geometry.lat),
    }
    : null;

  const fromProperties = feature?.properties
    ? {
      lng: toFiniteNumber(feature.properties.longitude ?? feature.properties.lng),
      lat: toFiniteNumber(feature.properties.latitude ?? feature.properties.lat),
    }
    : null;

  const candidates = [fromCoordinates, fromGeometryObject, fromProperties];
  const point = candidates.find((candidate) => candidate && isValidPoint(candidate.lat, candidate.lng));
  return point || null;
}

function warnInvalidStationCoordinates(feature) {
  if (!import.meta.env.DEV) return;
  const key = String(feature?.properties?.id ?? feature?.properties?.name ?? 'unknown-station');
  if (loggedInvalidStationKeys.has(key)) return;
  loggedInvalidStationKeys.add(key);
  console.warn('Skipping fire station with invalid coordinates', {
    stationId: feature?.properties?.id ?? null,
    stationName: feature?.properties?.name ?? null,
    geometry: feature?.geometry ?? null,
    latitude: feature?.properties?.latitude ?? feature?.properties?.lat ?? null,
    longitude: feature?.properties?.longitude ?? feature?.properties?.lng ?? null,
  });
}

export default function MapContainer({ showOnlyNearby, nearbyHydrants, nearbyStations }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  const center = { lat: 14.58, lng: 121.03 };

  const {
  mapRef,
  setMapLoaded,
  hydrants,
  fireStations,
  barangays,
  showHydrants,
  showFireStations,
  showBoundaries,
  showFireRisk,
  showHistoricalFires,
  showSidebar,
  setSelectedHydrant,
  selectedHydrant,
  setSelectedStation,
  selectedBarangay,
  setSelectedBarangay,
  hoveredBarangay,
  setHoveredBarangay,
  setShowSidebar,
    reportMode,
    handleMapClick,
    newIncident,
    fires,
    routeTo,
    setRouteTo,
    userLocation,
    setUserLocation,
    fireRiskData,
    historicalFires,
    setSelectedHistoricalBarangay,
    setHistoricalFiresSidebarOpen,
  } = useContext(MapContext);

  // Debug: Log when context values change
  React.useEffect(() => {
    console.log('MapContainer context functions available:', {
      hasSetSelectedHistoricalBarangay: !!setSelectedHistoricalBarangay,
      hasSetHistoricalFiresSidebarOpen: !!setHistoricalFiresSidebarOpen,
      historicalFiresCount: historicalFires?.length || 0
    });
  }, [setSelectedHistoricalBarangay, setHistoricalFiresSidebarOpen, historicalFires]);

  const [directions, setDirections] = useState(null);
  const [lastRoute, setLastRoute] = useState(null);
  const [animatedRadius, setAnimatedRadius] = useState(null);
  const rafRef = React.useRef(null);
  const nativeCircleRef = React.useRef(null);

  // Start/stop the pulsing animation when selectedHydrant changes.
  useEffect(() => {
    // Cancel any previous RAF
    if (!selectedHydrant) {
      if (rafRef.current) {
        try { window.cancelAnimationFrame(rafRef.current); } catch {};
        rafRef.current = null;
      }
      setAnimatedRadius(null);
      return;
    }

  // determine base radius from properties
  const radiusProp = selectedHydrant.properties && (selectedHydrant.properties.effective_radius || selectedHydrant.properties.radius || selectedHydrant.properties.range);
  const base = Number(radiusProp) || 75;

    let start = null;
    const period = 1200;
    const loop = (timestamp) => {
      if (!start) start = timestamp;
      const t = timestamp - start;
      const scale = 1 + 0.08 * Math.sin((t / period) * Math.PI * 2);
      const next = Math.max(6, Math.round(base * scale));
      setAnimatedRadius(next);
      rafRef.current = window.requestAnimationFrame(loop);
    };

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        try { window.cancelAnimationFrame(rafRef.current); } catch {};
        rafRef.current = null;
      }
      setAnimatedRadius(null);
    };
  }, [selectedHydrant]);

  // Group historical fires by barangay with center coordinates
  const historicalFiresClusters = useMemo(() => {
    if (!historicalFires || !barangays) return [];
    
    const groups = {};
    
    // Group fires by barangay
    historicalFires.forEach(fire => {
      const barangayName = fire.barangay;
      if (!barangayName) return;
      
      if (!groups[barangayName]) {
        groups[barangayName] = {
          barangay: barangayName,
          count: 0,
          fires: []
        };
      }
      
      groups[barangayName].count++;
      groups[barangayName].fires.push(fire);
    });
    
    // Add center coordinates from barangay polygons
    const clusters = Object.values(groups).map(group => {
      const barangay = barangays.find(b => b.properties?.name === group.barangay);
      
      if (barangay && barangay.geometry && barangay.geometry.coordinates) {
        // Get centroid of polygon
        const coords = barangay.geometry.coordinates[0];
        let latSum = 0;
        let lngSum = 0;
        let count = 0;
        
        coords.forEach(coord => {
          lngSum += coord[0];
          latSum += coord[1];
          count++;
        });
        
        group.center = {
          lat: latSum / count,
          lng: lngSum / count
        };
      }
      
      return group;
    });
    
    return clusters.filter(c => c.center);
  }, [historicalFires, barangays]);

  // Manage a single native google.maps.Circle instance so we don't leak layers
  useEffect(() => {
    // clear previous circle
    try {
      if (nativeCircleRef.current) {
        nativeCircleRef.current.setMap(null);
        nativeCircleRef.current = null;
      }
    } catch (err) {}

    if (!selectedHydrant || !mapRef.current || !window.google || !window.google.maps) return;

    try {
      const coords = selectedHydrant.geometry && selectedHydrant.geometry.coordinates;
      if (!coords || !Array.isArray(coords)) return;
  const [lng, lat] = coords;
  const radiusProp = selectedHydrant.properties && (selectedHydrant.properties.effective_radius || selectedHydrant.properties.radius || selectedHydrant.properties.range);
  const base = Number(radiusProp) || 75;

      const circle = new window.google.maps.Circle({
        strokeColor: '#b45309',
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.18,
        clickable: false,
        zIndex: 800,
        map: mapRef.current,
        center: { lat, lng },
        radius: animatedRadius || base,
      });

      nativeCircleRef.current = circle;
    } catch (err) {
      // ignore
    }

    return () => {
      try { if (nativeCircleRef.current) { nativeCircleRef.current.setMap(null); nativeCircleRef.current = null; } } catch (err) {}
    };
  }, [selectedHydrant, animatedRadius]);

  useEffect(() => {
    if (!routeTo || !window.google?.maps) {
      setDirections(null);
      setLastRoute(null);
      return;
    }
    if (
      lastRoute &&
      lastRoute.from.lat === routeTo.from.lat &&
      lastRoute.from.lng === routeTo.from.lng &&
      lastRoute.to.lat === routeTo.to.lat &&
      lastRoute.to.lng === routeTo.to.lng
    ) {
      return;
    }
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: routeTo.from,
        destination: routeTo.to,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          setLastRoute(routeTo);
        } else {
          setDirections(null);
        }
      }
    );
  }, [routeTo]);

  useEffect(() => {
    let watchId;
    if (routeTo && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(newLoc);
          if (routeTo.to) setRouteTo({ from: newLoc, to: routeTo.to });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
      );
    }
    return () => { if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId); };
  }, [routeTo, setUserLocation, setRouteTo]);

  // ensure RAF and native circle are cleaned up when component unmounts
  useEffect(() => {
    return () => {
      try { if (rafRef.current) { window.cancelAnimationFrame(rafRef.current); rafRef.current = null; } } catch (err) {}
      try { if (nativeCircleRef.current) { nativeCircleRef.current.setMap(null); nativeCircleRef.current = null; } } catch (err) {}
    };
  }, []);

  const onMapClick = (e) => {
    setSelectedHydrant(null);
    setSelectedStation(null);
    setSelectedBarangay(null);
    setShowSidebar(false);
    handleMapClick(e);
  };

  const hydrantIcons = useMemo(() => {
    if (!isLoaded) return {};
    const size = new window.google.maps.Size(45, 45);
    const anchor = new window.google.maps.Point(16, 32);
    return {
      operational: { url: hydrantOperationalUrl, scaledSize: size, anchor },
      nonOperational: { url: hydrantNonOperationalUrl, scaledSize: size, anchor },
    };
  }, [isLoaded]);

  // Cluster styles: wrap the uploaded PNG inside an SVG so we can add a
  // subtle gradient + glow behind it. This keeps the PNG artwork while
  // enhancing the icon visually.
  const clusterStyles = useMemo(() => {
    if (!isLoaded) return [];

    const makeDataUrl = (size) => {
      const w = size;
      const h = size;
      const cx = Math.round(w / 2);
      const cy = Math.round(h / 2);
      const r = Math.max(10, Math.floor(w / 2 - 4));

      // Image sizing inside the SVG (leave some padding for glow)
      const imgSize = Math.round(w * 0.6);
      const imgX = Math.round((w - imgSize) / 2);
      const imgY = Math.round((h - imgSize) / 2);

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' aria-hidden='true'>
  <defs>
    <radialGradient id='bgG' cx='50%' cy='45%' r='60%'>
      <!-- cool blue gradient: pale blue -> soft sky blue -> deeper blue -->
      <stop offset='0%' stop-color='#f0f9ff' stop-opacity='0.95' />
      <stop offset='55%' stop-color='#bae6fd' stop-opacity='0.55' />
      <stop offset='100%' stop-color='#0284c7' stop-opacity='0.16' />
    </radialGradient>
    <filter id='glo' x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur stdDeviation='4' result='b' />
      <feMerge><feMergeNode in='b' /><feMergeNode in='SourceGraphic' /></feMerge>
    </filter>
  </defs>

  <!-- soft gradient disk -->
  <circle cx='${cx}' cy='${cy}' r='${r}' fill='url(#bgG)' opacity='0.95' />

  <!-- glow layer (cool blue) -->
  <circle cx='${cx}' cy='${cy}' r='${Math.round(r * 0.9)}' fill='#7dd3fc' opacity='0.17' filter='url(#glo)' />

  <!-- outer stroke ring (dark blue for visibility) -->
  <circle cx='${cx}' cy='${cy}' r='${r}' fill='none' stroke='#0c4a6e' stroke-width='${Math.max(2, Math.round(size*0.04))}' opacity='0.32' />

  <!-- embedded PNG (served by Vite) -->
  <image href='${clusterPngInline}' x='${imgX}' y='${imgY}' width='${imgSize}' height='${imgSize}' preserveAspectRatio='xMidYMid meet' opacity='0.98' />
</svg>`;

      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    };

    return [
      { url: makeDataUrl(56), height: 56, width: 56, textColor: '#ffffff', textSize: 14 },
      { url: makeDataUrl(72), height: 72, width: 72, textColor: '#ffffff', textSize: 16 },
      { url: makeDataUrl(88), height: 88, width: 88, textColor: '#ffffff', textSize: 18 },
    ];
  }, [isLoaded]);

  const mapOptions = useMemo(() => isLoaded ? {
    mapTypeControl: true,
    mapTypeControlOptions: { position: window.google.maps.ControlPosition.TOP_RIGHT },
    streetViewControl: true,
    streetViewControlOptions: { position: window.google.maps.ControlPosition.RIGHT_TOP },
    fullscreenControl: true,
    fullscreenControlOptions: { position: window.google.maps.ControlPosition.RIGHT_TOP },
  } : {}, [isLoaded]);

  if (!isLoaded && !loadError) return <div>Loading...</div>;
  if (loadError) return <div style={{ padding: 16, color: '#000' }}>Error loading Google Maps: {String(loadError)}</div>;

  const hydrantsToShow = showOnlyNearby ? nearbyHydrants : hydrants;
  const stationsToShow = showOnlyNearby ? nearbyStations : fireStations;

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* SearchBar is used at page level */}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        defaultCenter={center}
        defaultZoom={13}
        options={mapOptions}
        onLoad={(map) => { mapRef.current = map; setMapLoaded(true); if (!mapRef.current.__initialized) { try { map.panTo(center); map.setZoom(13); } catch {} mapRef.current.__initialized = true; } }}
        onClick={onMapClick}
      >
  {showHydrants && (
          showOnlyNearby ? (
            <>
              {hydrantsToShow.map((f, i) => {
                const [lng, lat] = f.geometry.coordinates;
                if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;
                const icon = f.properties.is_operational ? hydrantIcons.operational : hydrantIcons.nonOperational;
                return (
                  <Marker key={`hydrant-${i}`} position={{ lat, lng }} icon={icon} onClick={(e) => { e.domEvent.stopPropagation(); setSelectedHydrant(f); setShowSidebar(false); }} onDblClick={(e) => { e.domEvent.stopPropagation(); setSelectedHydrant(f); setShowSidebar(true); }} />
                );
              })}
            </>
          ) : (
            <MarkerClusterer options={{ styles: clusterStyles, maxZoom: 17 }}>
              {(clusterer) => hydrantsToShow.map((f, i) => {
                const [lng, lat] = f.geometry.coordinates;
                if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;
                const icon = f.properties.is_operational ? hydrantIcons.operational : hydrantIcons.nonOperational;
                return (
                  <Marker key={`hydrant-${i}`} position={{ lat, lng }} icon={icon} clusterer={clusterer} onClick={(e) => { e.domEvent.stopPropagation(); setSelectedHydrant(f); setShowSidebar(false); }} onDblClick={(e) => { e.domEvent.stopPropagation(); setSelectedHydrant(f); setShowSidebar(true); }} />
                );
              })}
            </MarkerClusterer>
          )
        )}

        {/* Show selected hydrant effective range as a circle overlay */}
        {selectedHydrant && (() => {
          try {
            const coords = selectedHydrant.geometry && selectedHydrant.geometry.coordinates;
            if (!coords || !Array.isArray(coords)) return null;
            const [lng, lat] = coords;
            // Try common property names for radius (meters), fallback to 75m
            const radius = (selectedHydrant.properties && (selectedHydrant.properties.effective_radius || selectedHydrant.properties.radius || selectedHydrant.properties.range)) || 75;
            const base = Number(radius) || 75;

            // label only (circle is managed as a single native google.maps.Circle)
            return (
              isLoaded && typeof window !== 'undefined' && (
                <OverlayView
                  position={{ lat, lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  getPixelPositionOffset={(width, height) => ({ x: Math.round(width * 0.5), y: Math.round(-height - 8) })}
                >
                  <div style={{
                    background: '#f59e0b',
                    color: '#0b1220',
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                    transform: 'translateX(-50%)'
                  }}>
                    {String(base)} m
                  </div>
                </OverlayView>
              )
            );
          } catch (err) {
            return null;
          }
        })()}

  

        {showBoundaries && barangays.flatMap((feature) => {
          const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates[0]] : feature.geometry.coordinates.map((poly) => poly[0]);
          return rings.map((coords, idx) => {
            const key = `${feature.properties.id}-${idx}`;
            const isHovered = hoveredBarangay === key;
            const isSelected = selectedBarangay && selectedBarangay.polyKey === key;

            const baseOptions = {
              fillColor: '#3388ff',
              fillOpacity: isSelected ? 0.35 : isHovered ? 0.22 : 0.08,
              // Use site yellow for hover/selected highlight to match palette
              strokeColor: isSelected ? '#ffd600' : isHovered ? '#ffd600' : '#2a6edb',
              strokeOpacity: isSelected || isHovered ? 1 : 0.95,
              // Thicker strokes for better visibility on varied zoom levels
              strokeWeight: isSelected || isHovered ? 4 : 3,
              clickable: true,
              zIndex: isSelected ? 100 : isHovered ? 50 : 1,
            };

            return (
              <Polygon
                key={key}
                paths={coords.map(([lng, lat]) => ({ lat, lng }))}
                options={baseOptions}
                onMouseOver={() => setHoveredBarangay(key)}
                onMouseOut={() => setHoveredBarangay(null)}
                onClick={(e) => {
                  if (reportMode) return;
                  e.domEvent?.stopPropagation?.();
                  setSelectedBarangay({ feature, polyKey: key });
                  setSelectedHydrant(null);
                  setSelectedStation(null);
                  setShowSidebar(true);
                }}
              />
            );
          });
        })}

        {showFireRisk && barangays.flatMap((feature) => {
          const barangayName = feature.properties.name;
          const riskInfo = fireRiskData[barangayName];
          
          if (!riskInfo) return []; // Skip if no risk data for this barangay
          
          const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates[0]] : feature.geometry.coordinates.map((poly) => poly[0]);
          return rings.map((coords, idx) => {
            const key = `fire-risk-${feature.properties.id}-${idx}`;
            const isHovered = hoveredBarangay === key;
            const isSelected = selectedBarangay && selectedBarangay.polyKey === key;

            const riskOptions = {
              fillColor: riskInfo.color,
              fillOpacity: isSelected ? 0.7 : isHovered ? 0.6 : 0.4,
              strokeColor: riskInfo.color,
              strokeOpacity: isSelected || isHovered ? 1 : 0.8,
              strokeWeight: isSelected || isHovered ? 3 : 2,
              clickable: true,
              zIndex: isSelected ? 100 : isHovered ? 50 : 10,
            };

            return (
              <Polygon
                key={key}
                paths={coords.map(([lng, lat]) => ({ lat, lng }))}
                options={riskOptions}
                onMouseOver={() => setHoveredBarangay(key)}
                onMouseOut={() => setHoveredBarangay(null)}
                onClick={(e) => {
                  if (reportMode) return;
                  e.domEvent?.stopPropagation?.();
                  setSelectedBarangay({ feature, polyKey: key });
                  setSelectedHydrant(null);
                  setSelectedStation(null);
                  setShowSidebar(true);
                }}
              />
            );
          });
        })}

        {showFireStations && stationsToShow.map((f, i) => {
          const point = extractStationPoint(f);
          if (!point) {
            warnInvalidStationCoordinates(f);
            return null;
          }

          const { lat, lng } = point;
          return (
            <Marker
              key={`fire-${i}`}
              position={{ lat, lng }}
              icon={{ url: firestationIconUrl, scaledSize: new window.google.maps.Size(32, 32), anchor: new window.google.maps.Point(16, 32) }}
              onClick={(e) => { e.domEvent.stopPropagation(); setSelectedStation(f); setShowSidebar(true); }}
            />
          );
        })}

        {showHistoricalFires && historicalFiresClusters.map((cluster, i) => {
          const handleClusterClick = () => {
            console.log('Cluster clicked - barangay:', cluster.barangay);
            console.log('Functions available:', {
              setSelectedHistoricalBarangay: typeof setSelectedHistoricalBarangay,
              setHistoricalFiresSidebarOpen: typeof setHistoricalFiresSidebarOpen
            });
            setSelectedHistoricalBarangay(cluster.barangay);
            setHistoricalFiresSidebarOpen(true);
          };

          return (
            <OverlayView
              key={`historical-cluster-${i}`}
              position={cluster.center}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div
                style={{
                  background: 'rgba(255, 152, 0, 0.6)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  border: '2px solid rgba(255, 111, 0, 0.8)',
                  transform: 'translate(-50%, -50%)',
                  transition: 'all 0.2s',
                  pointerEvents: 'auto',
                }}
                onClick={handleClusterClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.15)';
                  e.currentTarget.style.zIndex = '1000';
                  e.currentTarget.style.background = 'rgba(255, 152, 0, 0.85)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  e.currentTarget.style.zIndex = 'auto';
                  e.currentTarget.style.background = 'rgba(255, 152, 0, 0.6)';
                }}
              >
              <img 
                src={firesIconUrl} 
                alt="fire" 
                style={{ 
                  width: '14px', 
                  height: '14px',
                  filter: 'brightness(0) invert(1)',
                  marginBottom: '1px',
                  pointerEvents: 'none'
                }} 
              />
              <div style={{ 
                fontSize: '9px', 
                fontWeight: 'bold',
                lineHeight: '1',
                pointerEvents: 'none'
              }}>
                {cluster.count}
              </div>
            </div>
          </OverlayView>
          );
        })}

        {newIncident && (
          <AnimatedFireMarker
            key="emergency-preview" 
            position={{ 
              lat: typeof newIncident.geometry.coordinates[1] === 'number' ? newIncident.geometry.coordinates[1] : center.lat, 
              lng: typeof newIncident.geometry.coordinates[0] === 'number' ? newIncident.geometry.coordinates[0] : center.lng 
            }} 
            alarmLevel={newIncident.properties?.status || 'First Alarm (4 Trucks)'}
            size={40}
          />
        )}

        {directions && (
          <DirectionsRenderer directions={directions} options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#4285F4', strokeWeight: 5 } }} />
        )}
      </GoogleMap>
    </div>
  );
}
