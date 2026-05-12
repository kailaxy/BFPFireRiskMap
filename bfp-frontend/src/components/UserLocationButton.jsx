import React, { useState, useContext } from "react";
import { MapContext } from "../logic.jsx";

// SVG from svgrepo.com, set to fill parent
const myLocationIcon = (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 32 32"
    fill="none"
    style={{ display: "block" }}
  >
    <circle cx="16" cy="16" r="6" stroke="#606060ff" strokeWidth="2" fill="#fff" />
    <circle cx="16" cy="16" r="2" fill="#606060ff" />
    <path d="M16 4V8" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 24V28" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 16H8" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 16H28" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M7.75736 7.75736L10.5858 10.5858" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M21.4142 21.4142L24.2426 24.2426" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M7.75736 24.2426L10.5858 21.4142" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
    <path d="M21.4142 10.5858L24.2426 7.75736" stroke="#606060ff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function UserLocationButton() {
  const { setUserLocation } = useContext(MapContext); // Use context
  const [loading, setLoading] = useState(false);

  function handleLocate() {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }); // Update context
        },
        () => {
          setLoading(false);
          alert("Unable to get your location.");
        }
      );
    } else {
      setLoading(false);
      alert("Geolocation is not supported by your browser.");
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 75,
        right: 10,
        zIndex: 1500,
      }}
    >
      <button
        onClick={handleLocate}
        style={{
          background: "#fff",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          cursor: "pointer",
          position: "relative",
          padding: 0,
        }}
        aria-label="Show my location"
      >
        {myLocationIcon}
        {loading && (
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: 12,
              color: "#888",
              background: "#fff",
              borderRadius: 4,
              padding: "2px 6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            Locating…
          </span>
        )}
      </button>
    </div>
  );
}