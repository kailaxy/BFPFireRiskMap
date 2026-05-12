// src/components/ReportButton.jsx
import React, { useContext } from "react";
import { MapContext } from "../logic.jsx";
import { UserContext } from "../logic.jsx";

export default function ReportButton() {
  const {
    reportMode,
    setReportMode,
    setNewIncident,
    clearUI
  } = useContext(MapContext);
  const { role } = useContext(UserContext);

  // Only show for responder or admin
  if (role === "visitor") return null;

  function handleClick() {
    console.log("▶️ ReportButton clicked – reportMode was:", reportMode);

    clearUI();
    setNewIncident(null);

    if (reportMode) {
      setReportMode(false); // Cancel report
    } else {
      setReportMode(true);  // Start report
    }
  }

  return (
    <button
      className={`report-button ${reportMode ? "active" : ""}`}
      onClick={handleClick}
    >
      {reportMode ? "Cancel Report" : "Report Fire"}
    </button>
  );
}
