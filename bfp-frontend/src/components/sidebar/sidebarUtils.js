// Haversine formula for distance calculation
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // in metres
}

// Find nearby hydrants and stations
export function findNearby(routeTo, hydrants, fireStations) {
  const destination = routeTo?.to;
  if (!destination) return { hydrants: [], stations: [] };

  const filteredHydrants = hydrants.filter(h =>
    haversine(destination.lat, destination.lng, h.geometry.coordinates[1], h.geometry.coordinates[0]) < 500
  );
  const filteredStations = fireStations.filter(s =>
    haversine(destination.lat, destination.lng, s.geometry.coordinates[1], s.geometry.coordinates[0]) < 1000
  );
  return { hydrants: filteredHydrants, stations: filteredStations };
}

// Handle closing the route sidebar
export function handleCloseRouteSidebar(setShowRouteSidebar, setRouteTo) {
  setShowRouteSidebar(false);
  setRouteTo(null);
}

// Handle starting tracking (open Google Maps directions)
export function handleStartTracking(userLocation, routeTo, setShowRouteSidebar) {
  setShowRouteSidebar(false);
  const origin = userLocation || routeTo?.from;
  const destination = routeTo?.to;
  if (origin && destination) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    window.open(url, "_blank");
  } else {
    alert("Origin or destination missing.");
  }
}