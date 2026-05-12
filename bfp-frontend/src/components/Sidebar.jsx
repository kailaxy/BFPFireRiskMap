import React, { useContext } from "react";
import { MapContext } from "../logic.jsx";
import NewIncidentForm from "./NewIncidentForm";

export default function Sidebar() {
  const {
    newIncident,
    setNewIncident,
    selectedHydrant,
    selectedStation,
    selectedBarangay,
    showSidebar,
    setShowSidebar,
    setSelectedBarangay,
    setHoveredBarangay,
    showFireRisk,
    fireRiskData,
  } = useContext(MapContext);

  if (!showSidebar) return null;

  return newIncident ? (
    <NewIncidentForm />
  ) : (
    <div className="sidebar">
      
      <div className="sidebar-header">
        <h3>
          {selectedHydrant
            ? "Hydrant Info"
            : selectedStation
            ? "Fire Station Info"
            : "Barangay Info"}
        </h3>
        <button onClick={() => {
          try { setSelectedBarangay(null); } catch (err) {}
          try { setHoveredBarangay(null); } catch (err) {}
          setShowSidebar(false);
        }}>Close</button>
      </div>

      {selectedHydrant && (
        <div>
          <p>
            <strong>ID:</strong> {selectedHydrant.properties.id || "N/A"}
          </p>
          <p>
            <strong>Address:</strong> {selectedHydrant.properties.address || "Unknown"}
          </p>
          <p>
            <strong>Type & Color:</strong> {selectedHydrant.properties.type_color || "Unknown"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {selectedHydrant.properties.is_operational === true
              ? "Operational"
              : selectedHydrant.properties.is_operational === false
              ? "Non-Operational"
              : "Unknown"}
          </p>
          <p>
            <strong>Remarks:</strong> {selectedHydrant.properties.remarks || "Unknown"}
          </p>
          <p>
            <strong>Location:</strong>{" "}
            {`${selectedHydrant.geometry.coordinates[1].toFixed(6)}, ${selectedHydrant.geometry.coordinates[0].toFixed(6)}`}
          </p>
        </div>
      )}

      {selectedStation && (
        <div>
          {(() => {
            const coords = selectedStation?.geometry?.coordinates;
            const fromGeometry = Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number'
              ? { lat: coords[1], lng: coords[0] }
              : null;
            const fromProps = {
              lat: Number(selectedStation?.properties?.latitude ?? selectedStation?.properties?.lat),
              lng: Number(selectedStation?.properties?.longitude ?? selectedStation?.properties?.lng),
            };
            const point = fromGeometry || (Number.isFinite(fromProps.lat) && Number.isFinite(fromProps.lng) ? fromProps : null);

            return (
              <>
          <p>
            <strong>ID:</strong> {selectedStation.properties.id || "N/A"}
          </p>
          <p>
            <strong>Name:</strong> {selectedStation.properties.name || "N/A"}
          </p>
          <p>
            <strong>Operator:</strong> {selectedStation.properties.operator || "N/A"}
          </p>
          <p>
            <strong>Address:</strong> {selectedStation.properties.address || "N/A"}
          </p>
          <p>
            <strong>Contact Phone:</strong> {selectedStation.properties.contact_phone || "N/A"}
          </p>
          <p>
            <strong>Location:</strong>{" "}
            {point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : 'N/A'}
          </p>
              </>
            );
          })()}
        </div>
      )}

      {selectedBarangay && (
        <div>
          <p>
            <strong>Name:</strong> {selectedBarangay.feature.properties.name || "N/A"}
          </p>
          <p>
            <strong>Population:</strong> {selectedBarangay.feature.properties.population || "N/A"}
          </p>
          <p>
            <strong>Brief History:</strong> {selectedBarangay.feature.properties.brief_history || "N/A"}
          </p>
          <p>
            <strong>Economic Profile:</strong> {selectedBarangay.feature.properties.economic_profile || "N/A"}
          </p>

          {/* Fire Risk Forecast Information */}
          {showFireRisk && fireRiskData && (() => {
            const barangayName = selectedBarangay.feature.properties.name;
            const forecast = fireRiskData[barangayName];

            if (forecast) {
              return (
                <div className="fire-risk-forecast">
                  <h4>🔥 Fire Risk Forecast</h4>
                  <p>
                    <strong>Forecast:</strong> {parseFloat(forecast.predictedCases).toFixed(2)} fires
                  </p>
                  <p>
                    <strong>Risk Level:</strong> {forecast.risk?.replace('-', ' ')?.replace(/\b\w/g, (l) => l.toUpperCase()) || 'Unknown'}
                  </p>
                  <p>
                    <strong>Range:</strong> {parseFloat(forecast.lowerBound).toFixed(2)}–{parseFloat(forecast.upperBound).toFixed(2)}
                  </p>
                  {forecast.riskFlag && (
                    <p className="risk-flag">
                      ⚠️ {forecast.riskFlag}
                    </p>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
}