import React, { useState, useEffect, useContext } from "react";
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { MapContext } from "../logic.jsx";
import "./NewIncidentForm.css";

export default function NewIncidentForm() {
  const {
    newIncident,
    submitIncident,
    setNewIncident,
    setShowSidebar,
  } = useContext(MapContext);

  const [form, setForm] = useState({
    nature: "",
    status: "",
    date: "",
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editedAddress, setEditedAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const ALARM_STATUSES = [
    { value: "first", label: "First Alarm (4 fire trucks)" },
    { value: "second", label: "Second Alarm (8 fire trucks)" },
    { value: "third", label: "Third Alarm (12 fire trucks)" },
    { value: "fourth", label: "Fourth Alarm (16 fire trucks)" },
    { value: "fifth", label: "Fifth Alarm (20 fire trucks)" },
    { value: "alpha", label: "Task Force Alpha (24 fire trucks)" },
    { value: "bravo", label: "Task Force Bravo (28 fire trucks)" },
    { value: "charlie", label: "Task Force Charlie (32 fire trucks)" },
    { value: "delta", label: "Task Force Delta (36 fire trucks)" },
    { value: "general", label: "General Alarm (80+ fire trucks)" },
  ];

  const NATURE_CATEGORIES = [
    {
      label: "Fire",
      options: [
        { value: "structure", label: "Structure Fire" },
        { value: "vehicle", label: "Vehicle Fire" },
        { value: "wildfire", label: "Wildfire" },
        { value: "electrical", label: "Electrical Fire" },
        { value: "chemical", label: "Chemical Fire" },
      ],
    },
    // Temporarily commented out - only showing Fire emergency types
    // {
    //   label: "Rescue",
    //   options: [
    //     { value: "medical", label: "Medical Emergency" },
    //     { value: "vehicular_accident", label: "Vehicular Accident" },
    //     { value: "water_rescue", label: "Water Rescue" },
    //     { value: "high_angle", label: "High Angle Rescue" },
    //   ],
    // },
    // {
    //   label: "Hazmat",
    //   options: [
    //     { value: "gas_leak", label: "Gas Leak" },
    //     { value: "chemical_spill", label: "Chemical Spill" },
    //     { value: "radiological", label: "Radiological Incident" },
    //   ],
    // },
    // {
    //   label: "Other",
    //   options: [
    //     { value: "false_alarm", label: "False Alarm" },
    //     { value: "other", label: "Other" },
    //   ],
    // },
  ];

  const PRIORITY_LEVELS = [
    { value: "low", label: "Low Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "high", label: "High Priority" },
    { value: "urgent", label: "Urgent" },
    { value: "critical", label: "Critical" },
  ];

  // Check if the selected nature is fire-related
  const isFireEmergency = () => {
    const fireOptions = NATURE_CATEGORIES.find(cat => cat.label === "Fire")?.options || [];
    return fireOptions.some(option => option.value === form.nature);
  };

  // Get the appropriate status options and label based on emergency type
  const getStatusConfig = () => {
    if (isFireEmergency()) {
      return {
        label: "Status of Alarm",
        options: ALARM_STATUSES,
        defaultValue: "first"
      };
    } else {
      return {
        label: "Priority Level",
        options: PRIORITY_LEVELS,
        defaultValue: "medium"
      };
    }
  };

  // Populate form whenever a new incident is set
  useEffect(() => {
    if (!newIncident) return;
    const { nature = "", status = "", date = "" } = newIncident.properties;

    // normalize date for <input type="datetime-local">:
    const normalize = (d) => {
      if (!d) return "";
      if (d.includes("T")) return d;
      // if only yyyy-mm-dd provided, append time
      if (d.length === 10) return `${d}T00:00`;
      return d;
    };

    setForm({ nature, status, date: normalize(date) });
  }, [newIncident]);

  // Handle all form field changes
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // Submit updated incident and close sidebar
  function handleSubmit(e) {
    e.preventDefault();
    submitIncident({
      ...newIncident,
      properties: {
        ...newIncident.properties,
        nature: form.nature,
        status: form.status,
        date: form.date,
      },
    });
    setShowSidebar(false);
    setNewIncident(null);
  }

  function handleDropdownToggle() {
    setDropdownOpen((open) => !open);
    if (!dropdownOpen) setExpandedCategory(null); // reset category when opening
  }

  function handleCategoryClick(label) {
    setExpandedCategory(expandedCategory === label ? null : label);
  }

  function handleNatureSelect(value) {
    // Determine if this is a fire emergency
    const fireOptions = NATURE_CATEGORIES.find(cat => cat.label === "Fire")?.options || [];
    const isFireType = fireOptions.some(option => option.value === value);
    
    // Auto-set appropriate default status based on emergency type
    const defaultStatus = isFireType ? "first" : "medium";
    
    setForm(prev => ({ 
      ...prev, 
      nature: value,
      status: defaultStatus
    }));
    setDropdownOpen(false); // close dropdown after selection
    setExpandedCategory(null);
  }

  // Handle editing address
  function handleEditAddress() {
    setEditedAddress(newIncident.properties.address);
    setIsEditingAddress(true);
  }

  // Handle canceling address edit
  function handleCancelAddressEdit() {
    setIsEditingAddress(false);
    setEditedAddress("");
  }

  // Geocode the new address and update marker location
  async function handleUpdateAddress() {
    if (!editedAddress.trim()) {
      alert("Please enter a valid address");
      return;
    }

    setIsGeocoding(true);
    try {
      // Forward geocode the address to get coordinates
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: editedAddress }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              resolve(results[0]);
            } else {
              reject(new Error('Address not found'));
            }
          });
        });

        const newLat = result.geometry.location.lat();
        const newLng = result.geometry.location.lng();
        const formattedAddress = result.formatted_address;

        // Get barangay from backend using new coordinates
        const BASE = import.meta.env.VITE_API_BASE_URL || '';
        const geo = await fetch(
          `${BASE}/api/reverse_geocode?lat=${newLat}&lng=${newLng}&address=${encodeURIComponent(formattedAddress)}`
        );
        
        if (!geo.ok) throw new Error("Barangay lookup failed");
        const { barangay } = await geo.json();

        // Update incident with new location
        setNewIncident({
          ...newIncident,
          geometry: {
            ...newIncident.geometry,
            coordinates: [newLng, newLat]
          },
          properties: {
            ...newIncident.properties,
            address: formattedAddress,
            barangay: barangay
          }
        });

        setIsEditingAddress(false);
        setEditedAddress("");
      } else {
        throw new Error("Google Maps not available");
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert(`Failed to update address: ${error.message}. Please try a different address or check the spelling.`);
    } finally {
      setIsGeocoding(false);
    }
  }


  if (!newIncident) return null;

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h3>Report Fire</h3>
        <button
          type="button"
          className="btn-close"
          aria-label="Close sidebar"
          onClick={() => {
            setShowSidebar(false);
            setNewIncident(null);
          }}
        >
          ×
        </button>
      </header>

      <form className="sidebar-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label>Address</label>
          {!isEditingAddress ? (
            <>
              <p className="field-static">{newIncident.properties.address}</p>
              <button
                type="button"
                className="btn-edit-address"
                onClick={handleEditAddress}
              >
                ✏️ Edit Address
              </button>
            </>
          ) : (
            <div className="address-edit-container">
              <input
                type="text"
                className="input-address-edit"
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                placeholder="Enter new address..."
                disabled={isGeocoding}
              />
              <div className="address-edit-buttons">
                <button
                  type="button"
                  className="btn-update-address"
                  onClick={handleUpdateAddress}
                  disabled={isGeocoding}
                >
                  {isGeocoding ? "Updating..." : "Update Location"}
                </button>
                <button
                  type="button"
                  className="btn-cancel-address"
                  onClick={handleCancelAddressEdit}
                  disabled={isGeocoding}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="field-group">
          <label>Barangay</label>
          <p className="field-static">{newIncident.properties.barangay}</p>
        </div>

        <div className="field-group">
          <label htmlFor="nature">Nature of Emergency</label>
          <div className="collapsible-dropdown">
            <button
              type="button"
              className="dropdown-selected"
              onClick={handleDropdownToggle}
            >
              {form.nature
                ? NATURE_CATEGORIES.flatMap(cat => cat.options).find(opt => opt.value === form.nature)?.label
                : "Select nature"}
              {dropdownOpen ? (
                <FaChevronUp style={{ marginLeft: 8 }} />
              ) : (
                <FaChevronDown style={{ marginLeft: 8 }} />
              )}
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {NATURE_CATEGORIES.map(cat => (
                  <div key={cat.label} className="dropdown-category">
                    <button
                      type="button"
                      className="dropdown-category-btn"
                      onClick={() => handleCategoryClick(cat.label)}
                    >
                      {cat.label}
                      {expandedCategory === cat.label ? (
                        <FaChevronUp style={{ marginLeft: 8 }} />
                      ) : (
                        <FaChevronDown style={{ marginLeft: 8 }} />
                      )}
                    </button>
                    {expandedCategory === cat.label && (
                      <div className="dropdown-options">
                        {cat.options.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            className="dropdown-option-btn"
                            onClick={() => handleNatureSelect(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="status">{getStatusConfig().label}</label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            required
          >
            <option value="">Select {getStatusConfig().label.toLowerCase()}</option>
            {getStatusConfig().options.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="date">Date & Time</label>
          <input
            id="date"
            name="date"
            type="datetime-local"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>

        <footer className="sidebar-footer">
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setShowSidebar(false);
              setNewIncident(null);
            }}
          >
            Close
          </button>
          <button type="submit" className="btn primary">
            Report Fire
          </button>
        </footer>
      </form>
    </aside>
  );
}
