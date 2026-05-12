import React, { useState, useContext, useEffect } from 'react';
// Header/Footer removed to allow global landing header/footer to be used
import MapContainer from './MapContainer';
import SearchBar from './SearchBar';
import Sidebar from './Sidebar';
import LayersControl from './LayersControl';
import HistoricalFiresFilter from './HistoricalFiresFilter';
import HistoricalFiresSidebar from './HistoricalFiresSidebar';
import ReportButton from './ReportButton';
import ActiveFiresMenu from './ActiveFiresMenu';
import UserLocationButton from './UserLocationButton';
import RouteSidebar from './RouteSidebar';
import { MapContext } from '../logic.jsx';
import { handleStartTracking, handleCloseRouteSidebar, findNearby } from './sidebar/sidebarUtils';

export default function MapPage() {
  const [showRouteSidebar, setShowRouteSidebar] = useState(false);
  const {
    routeTo, setRouteTo, userLocation, hydrants, fireStations,
    setShowHydrants, setShowFireStations, setSelectedHydrant,
    setSelectedStation, setShowSidebar,
    nearbyHydrants, setNearbyHydrants,
    nearbyStations, setNearbyStations,
    showOnlyNearby, setShowOnlyNearby,
    setSidebarOpen
  } = useContext(MapContext);

  useEffect(() => {
    if (routeTo) setShowRouteSidebar(true);
    else setShowRouteSidebar(false);
  }, [routeTo]);

  function onStartTracking() {
    handleStartTracking(userLocation, routeTo, setShowRouteSidebar);
  }

  function onCloseRouteSidebar() {
    handleCloseRouteSidebar(setShowRouteSidebar, setRouteTo);
  }

  function onBackToActiveFireSidebar() {
    setShowRouteSidebar(false);
    setRouteTo(null);
    setSidebarOpen(true); // Reopen the active fire sidebar
  }

  function onShowNearby() {
    const { hydrants: filteredHydrants, stations: filteredStations } = findNearby(routeTo, hydrants, fireStations);
    setNearbyHydrants(filteredHydrants);
    setNearbyStations(filteredStations);
    setShowOnlyNearby(true);

    if (filteredHydrants.length) {
      setSelectedHydrant(filteredHydrants[0]);
      setShowSidebar(true);
    } else if (filteredStations.length) {
      setSelectedStation(filteredStations[0]);
      setShowSidebar(true);
    } else {
      alert("No nearby hydrants or fire stations found within 500m.");
    }
  }

  return (
    <div className="main-content">
      <SearchBar />
      <MapContainer showOnlyNearby={showOnlyNearby} nearbyHydrants={nearbyHydrants} nearbyStations={nearbyStations} />
      {!showRouteSidebar && <Sidebar />}
      <LayersControl />
      <HistoricalFiresFilter />
      <HistoricalFiresSidebar />
      <ReportButton />
      <ActiveFiresMenu />
      <UserLocationButton />
      {showRouteSidebar && routeTo && (
        <RouteSidebar
          destination={routeTo.to}
          onStart={onStartTracking}
          onClose={onCloseRouteSidebar}
          onShowNearby={onShowNearby}
          onBack={onBackToActiveFireSidebar}
        />
      )}
    </div>
  );
}
