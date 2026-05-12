import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from "react";
import Toast from "./components/ui/Toast";
import { API_BASE_URL } from "./config";
import firesIconUrl from "./assets/fireIcon.png";
import { getCSSFireIcon } from "./utils/cssFireMarkers";
import smoothPanAndZoom from './utils/mapHelpers';

export const UserContext = createContext();

export function UserProvider({ children }) {
  // Default role is visitor
  const [role, setRole] = useState("visitor");
  // Optionally store user info
  const [user, setUserState] = useState(null);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem('user');
      if (s) {
        const u = JSON.parse(s);
        setUserState(u);
        // If a stored user exists but doesn't include station_name, try to enrich it
        // by fetching the public stations list (no auth required) and matching by id.
        (async function enrichStation() {
          try {
            if (u && u.station_id && !u.station_name) {
              const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/firestation`);
              if (!res.ok) return;
              const data = await res.json();
              const features = Array.isArray(data.features) ? data.features : [];
              const match = features.find(f => f && f.properties && Number(f.properties.id) === Number(u.station_id));
              if (match && match.properties && match.properties.name) {
                const updated = Object.assign({}, u, { station_name: match.properties.name });
                try { localStorage.setItem('user', JSON.stringify(updated)); } catch { void 0; }
                setUserState(updated);
              }
            }
          } catch { 
            // ignore enrichment failures
            void 0;
          }
        })();
        if (u && u.role) setRole(u.role);
        // DEBUG: log rehydrated user on mount
        try { console.debug('[UserProvider] rehydrated user:', u); } catch { void 0; }
      }
    } catch (err) {
      // ignore
      void 0;
    }
  }, []);

  // toast state
  const [toast, setToast] = useState(null);

  // wrapper to keep localStorage in sync
  function setUser(u) {
    try {
      if (u) localStorage.setItem('user', JSON.stringify(u));
      else localStorage.removeItem('user');
    } catch (err) {}
    // DEBUG: log whenever setUser is called
    try { console.debug('[UserProvider] setUser called with:', u); } catch (e) {}
    setUserState(u);
  }

  // expose a global helper so isolated components can show toasts without prop drilling
  try { window.__BFP_toast = (msg) => setToast(msg); } catch (err) {}
  
  // expose a global helper to clear auth when token is invalid
  try { 
    window.__BFP_clearAuth = () => {
      setUser(null);
      setRole('visitor');
    };
  } catch (err) {}

  // Token refresh utility
  async function refreshAccessToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      // Update stored tokens
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update user context
      setUser(data.user);
      if (data.user.role) setRole(data.user.role);

      console.debug('[auth] Token refreshed successfully');
      return data.accessToken;

    } catch (error) {
      console.debug('[auth] Token refresh failed:', error.message);
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setRole('visitor');
      throw error;
    }
  }

  // Expose refresh function globally
  try {
    window.__BFP_refreshToken = refreshAccessToken;
  } catch (err) {}

  // Poll for unread notifications for responders/admins and show toasts
  useEffect(() => {
    // track shown notification ids locally so we don't re-show until user dismisses
    const shown = new Set();
    let timer = null;
    let stopped = false;

    async function poll() {
      if (stopped) return;
      
      // Only proceed if user is properly authenticated
      const token = localStorage.getItem('token');
      const s = localStorage.getItem('user');
      let u = null;
      
      try {
        u = s ? JSON.parse(s) : null;
      } catch (err) {
        // Invalid JSON in localStorage
        return;
      }
      
      // Only poll notifications if user is logged in and has proper role
      if (!token || !u || (u.role !== 'responder' && u.role !== 'admin')) {
        console.debug('[notifications] Skipping poll - no valid auth:', { 
          hasToken: !!token, 
          hasUser: !!u, 
          role: u?.role,
          tokenLength: token?.length || 0
        });
        return;
      }
      
      console.debug('[notifications] Polling with valid auth:', { role: u.role, hasToken: !!token });

      try {
        const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
        
        // If we get 403, try to refresh the token
        if (res.status === 403) {
          console.debug('[notifications] Token invalid (403), attempting refresh');
          try {
            // Attempt to refresh the token
            const newToken = await window.__BFP_refreshToken();
            
            // Retry the request with the new token
            const retryRes = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/notifications`, { 
              headers: { Authorization: `Bearer ${newToken}` } 
            });
            
            if (!retryRes.ok) return;
            
            const retryData = await retryRes.json();
            const retryRows = Array.isArray(retryData.rows) ? retryData.rows : (retryData || []).rows || [];
            const retryUnread = retryRows.filter(r => !r.read);
            
            for (const n of retryUnread) {
              try {
                if (!n || !n.id) continue;
                if (n.read) continue;
                if (shown.has(n.id)) continue;
                window.__BFP_toast && window.__BFP_toast(n);
                shown.add(n.id);
              } catch (err) {}
            }
            return;
            
          } catch (refreshError) {
            console.debug('[notifications] Token refresh failed, user needs to log in again');
            return;
          }
        }
        
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data.rows) ? data.rows : (data || []).rows || [];
        // only consider unread notifications
        const unread = rows.filter(r => !r.read);
        for (const n of unread) {
          try {
            if (!n || !n.id) continue;
            if (n.read) continue; // skip already read
            if (shown.has(n.id)) continue; // already shown and awaiting dismissal
            // show full notification object so Toast can provide actions (view/close)
            window.__BFP_toast && window.__BFP_toast(n);
            shown.add(n.id);
          } catch (err) {}
        }
      } catch (err) {
        // ignore polling errors - will retry
      }
    }

    // start immediate poll and then interval
    poll();
    timer = setInterval(poll, 5000);

    // expose a helper to remove from the shown set when the user dismisses a notification
    try {
      window.__BFP_markShownRead = (id) => { try { shown.delete(id); } catch{ void 0 } };
    } catch { void 0 }

    return () => { stopped = true; if (timer) clearInterval(timer); };
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setRole('visitor');
  }

  return (
    <UserContext.Provider value={{ role, setRole, user: user, setUser, logout }}>
      {children}
      <Toast message={toast} onClose={() => setToast(null)} />
    </UserContext.Provider>
  );
}

export const MapContext = createContext();

export function MapProvider({ children }) {
  // ─── Refs ──────────────────────────────────────────────────────────
  const mapRef = useRef(null);

  // ─── Data ──────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [fires, setFires] = useState([]); // Add this line to define the fires state
  const [hydrants, setHydrants] = useState([]); // Add this
  const [fireStations, setFireStations] = useState([]); // Add this
  const [barangays, setBarangays] = useState([]); // Add this

  // Add these lines:
  const [nearbyHydrants, setNearbyHydrants] = useState([]);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [showOnlyNearby, setShowOnlyNearby] = useState(false);
  
  // Fire risk forecast data
  const [fireRiskData, setFireRiskData] = useState({});
  const [forecastMonth, setForecastMonth] = useState(() => {
    // Default to October 2025 (current month with available forecast data)
    return new Date(2025, 9, 1); // October 2025 (month is 0-indexed)
  });

  // ─── UI Toggles & Selections ──────────────────────────────────────
  const [showHydrants, setShowHydrants]       = useState(true);
  const [showFireStations, setShowFireStations] = useState(true);
  const [showBoundaries, setShowBoundaries]     = useState(false);
  const [showFireRisk, setShowFireRisk]         = useState(true);
  const [showHistoricalFires, setShowHistoricalFires] = useState(false);
  const [showLayersPanel, setShowLayersPanel]   = useState(false);
  const [showSidebar, setShowSidebar]           = useState(false);
  const [activeFiresMenuOpen, setActiveFiresMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [selectedHydrant, setSelectedHydrant]   = useState(null);
  const [selectedStation, setSelectedStation]   = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [hoveredBarangay, setHoveredBarangay]   = useState(null);
  const [selectedActiveFireId, setSelectedActiveFireId] = useState(null);

  // ─── Historical Fires Filters ─────────────────────────────────────
  const [historicalFires, setHistoricalFires] = useState([]);
  const [historicalFiltersOpen, setHistoricalFiltersOpen] = useState(false);
  const [historicalFilters, setHistoricalFilters] = useState({
    month: '',
    year: '',
    barangay: '',
    occupancy: '',
    cause: '',
    alarm: ''
  });
  const [selectedHistoricalBarangay, setSelectedHistoricalBarangay] = useState(null);
  const [historicalFiresSidebarOpen, setHistoricalFiresSidebarOpen] = useState(false);

  // expose helper to open active fires menu and select a fire by id
  try {
    window.__BFP_openActiveFire = (id) => {
      try { console.debug && console.debug('[MapProvider] __BFP_openActiveFire called with', id); } catch { void 0 }
      try { setSelectedActiveFireId(id); setActiveFiresMenuOpen(true); } catch { void 0 }
      try {
        // try pan/zoom to the fire on the map if available
        const f = fires && Array.isArray(fires) ? fires.find(x => x.properties && x.properties.id === id) : null;
        if (f && mapRef && mapRef.current) {
          const [lng, lat] = f.geometry.coordinates;
          try { mapRef.current.panTo({ lat, lng }); smoothPanAndZoom(mapRef.current, 15); } catch(err) { try { console.debug && console.debug('[MapProvider] pan/zoom error', err); } catch { void 0 } }
        }
      } catch { void 0 }
    };
  } catch { void 0 }

  // ─── Search / Autocomplete ────────────────────────────────────────
  const [searchText, setSearchText]     = useState("");
  const [autocomplete, setAutocomplete] = useState(null);

  // ─── Report-Mode / New Incident ───────────────────────────────────
  const [reportMode, setReportMode] = useState(false);
  const [newIncident, setNewIncident] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Normalized base URL for API calls. Use the centralized API_BASE_URL so the app
  // respects either Vite's `VITE_API_BASE_URL` or `REACT_APP_API_URL` at runtime.
  const BASE = (API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

  // ─── FIRE RISK FORECASTING HELPERS ─────────────────────────────────
  
  // Helper function to get risk color based on predicted cases
  const getRiskColor = (predictedCases) => {
    const cases = parseFloat(predictedCases);
    
    // High risk (red) - ≥1 predicted cases
    if (cases >= 1) return '#e74c3c';
    
    // Medium risk (orange) - 0.5-0.99 cases
    if (cases >= 0.5) return '#e67e22';
    
    // Low-Moderate risk (yellow) - 0.2-0.49 cases
    if (cases >= 0.2) return '#f1c40f';
    
    // Very Low risk (green) - <0.2 cases
    if (cases >= 0) return '#2ecc71';
    
    return '#95a5a6';  // Gray for unknown/invalid
  };
  
  // Helper function to normalize barangay names for matching
  const normalizeBarangayName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (ñ -> n)
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Create reverse mapping from normalized names to actual boundary names
  const createNameMapping = () => {
    const mapping = {};
    barangays.forEach(barangay => {
      const actualName = barangay.properties?.name;
      const normalizedName = normalizeBarangayName(actualName);
      if (actualName && normalizedName) {
        mapping[normalizedName] = actualName;
      }
    });
    return mapping;
  };

  // Fetch fire risk forecasts from API
  const fetchFireRiskForecasts = useCallback(async () => {
    try {
      if (barangays.length === 0) {
        return;
      }
      
      const year = forecastMonth.getFullYear();
      const month = forecastMonth.getMonth() + 1;
      const res = await fetch(`${BASE}/api/forecasts/${year}/${month}`);
      
      if (!res.ok) {
        setFireRiskData({});
        return;
      }
      
      const forecasts = await res.json();
      
      // Create mapping from normalized names to actual boundary names
      const nameMapping = createNameMapping();
      
      // Convert to the format expected by the map
      const riskData = {};
      let matchedCount = 0;
      
      forecasts.forEach(forecast => {
        const forecastName = forecast.barangay_name;
        const normalizedForecastName = normalizeBarangayName(forecastName);
        
        // Try exact match first
        let matchedBoundaryName = forecastName;
        
        // If no exact match, try normalized matching
        if (!barangays.some(b => b.properties?.name === forecastName)) {
          matchedBoundaryName = nameMapping[normalizedForecastName];
        }
        
        if (matchedBoundaryName && barangays.some(b => b.properties?.name === matchedBoundaryName)) {
          const color = getRiskColor(forecast.predicted_cases);
          console.log(`🎨 Risk color for ${matchedBoundaryName}: ${forecast.predicted_cases} cases -> ${color}`);
          
          riskData[matchedBoundaryName] = {
            risk: forecast.risk_level?.toLowerCase()?.replace(' ', '-') || 'unknown',
            color: color,
            predictedCases: forecast.predicted_cases,
            lowerBound: forecast.lower_bound,
            upperBound: forecast.upper_bound,
            riskFlag: forecast.risk_flag,
            month: forecast.month,
            originalForecastName: forecastName // Keep track of original name for debugging
          };
          matchedCount++;
        }
      });
      
      console.log(`✅ Matched ${matchedCount} barangays with forecasts`);
      console.log('📊 Final riskData:', riskData);
      
      setFireRiskData(riskData);
    } catch (error) {
      console.error('Failed to fetch fire risk forecasts:', error);
      setFireRiskData({});
    }
  }, [barangays, forecastMonth, setFireRiskData]);

  // ─── FETCH HISTORICAL FIRES WITH FILTERS ──────────────────────────
  const fetchHistoricalFires = useCallback(async (customFilters = null) => {
    try {
      const filters = customFilters || historicalFilters;
      const params = new URLSearchParams();
      if (filters.month) params.set('month', filters.month);
      if (filters.year) params.set('year', filters.year);
      if (filters.barangay) params.set('barangay', filters.barangay);
      if (filters.occupancy) params.set('occupancy', filters.occupancy);
      if (filters.cause) params.set('cause', filters.cause);
      if (filters.alarm) params.set('alarm', filters.alarm);

      const url = `${BASE}/api/historical-fires?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error('Failed to fetch historical fires');
        setHistoricalFires([]);
        return;
      }

      const data = await res.json();
      setHistoricalFires(data.fires || []);
    } catch (error) {
      console.error('Error fetching historical fires:', error);
      setHistoricalFires([]);
    }
  }, [historicalFilters]);

  // Fetch historical fires only when layer is first toggled on
  useEffect(() => {
    if (showHistoricalFires) {
      fetchHistoricalFires();
    }
  }, [showHistoricalFires]);

   // ─── Archives an active fire into historical_fires and removes it ─────────────────────────────────
  
  async function resolveFire(id, details) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${BASE}/api/active_fires/${id}/resolve`,
      {
        method:  'POST',
        headers,
        body:    JSON.stringify(details)
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(()=>'Unknown error');
      throw new Error(err.error || 'Failed to resolve fire');
    }
    // remove from local fires state so map & menu auto-update
    setFires(prev => prev.filter(f => f.properties.id !== id));
    return res.json();
  }


  // ─── SUBMIT & PERSIST NEW INCIDENT ─────────────────────────────────
  async function submitIncident(feature) {
    const {
      properties: { address, barangay, status },
      geometry: { coordinates: [lng, lat] }
    } = feature;

    // Prefer the logged-in user's username for 'reported_by'. Fall back to OperatorA
    let reportedBy = "OperatorA";
    try {
      const s = localStorage.getItem('user');
      if (s) {
        const u = JSON.parse(s);
        if (u && (u.username || u.name)) reportedBy = u.username || u.name;
      }
    } catch (err) {
      // ignore and use fallback
    }

    const payload = {
      lat,
      lng,
      address,
      barangay,
      alarm_level: status,
      reported_by: reportedBy
    };

    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${BASE}/api/active_fires`,
      {
        method:  "POST",
        headers,
        body:    JSON.stringify(payload)
      }
    );
  // expose helper to open active fires menu and select a fire by id
  try { window.__BFP_openActiveFire = (id) => { try { setSelectedActiveFireId(id); setActiveFiresMenuOpen(true); } catch(e){} }; } catch (e) {}
  try { window.__BFP_openActiveFire && console.debug && console.debug('[MapProvider] __BFP_openActiveFire helper registered'); } catch(e){}
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to report fire");
    }

    const newFeature = await res.json();
    // add into fires[] → Data-Layer effect will re-render automatically
    setFires((prev) => [...prev, newFeature]);

    setNewIncident(null);
    setShowSidebar(false);
    return newFeature;
  }

  // ─── HANDLE MAP CLICK (REPORT MODE) ─────────────────────────────────
  async function handleMapClick(e) {
    console.log("Map clicked. reportMode:", reportMode, e);
    if (!reportMode) {
      setSelectedHydrant(null);
      setSelectedStation(null);
      setSelectedBarangay(null);
      setShowSidebar(false);
      return;
    }
  
    // Clear all selections so only the incident form appears
    setSelectedHydrant(null);
    setSelectedStation(null);
    setSelectedBarangay(null);
  
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
  
    setNewIncident({
      id: Date.now(),
      geometry: { coordinates: [lng, lat] },
      properties: {
        address:  "Loading…",
        barangay: "Loading…",
        date:     localDateTimeNow(), // ← use datetime-local format
        nature:   "",
        status:   "",
      },
    });
    setShowSidebar(true);

    try {
      // Use Google Maps Geocoder API in the browser (has proper API key)
      let address = "Address not available";
      
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        try {
          const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                resolve(results[0].formatted_address);
              } else {
                reject(new Error('Geocoding failed'));
              }
            });
          });
          address = result;
        } catch (geocodeErr) {
          console.warn('Google geocoding failed:', geocodeErr);
        }
      }

      // Get barangay from backend (spatial query)
      const geo = await fetch(
        `${BASE}/api/reverse_geocode?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}`
      );
      if (!geo.ok) throw new Error("Barangay lookup failed");
      const { barangay } = await geo.json();
      
      setNewIncident((p) => ({
        ...p,
        properties: { ...p.properties, address, barangay }
      }));
    } catch (err) {
      console.error('Geocoding error:', err);
      setNewIncident((p) => ({
        ...p,
        properties: {
          ...p.properties,
          address:  "Geocode failed",
          barangay: "Unknown"
        }
      }));
    }

    setReportMode(false);
  }

  // ─── FETCH HYDRANTS / STATIONS / BARANGAYS / FORECASTS ──────────────────────────
  useEffect(() => {
    fetch(`${BASE}/api/hydrants`)
      .then((r) => r.json())
      .then((d) => d.features ? setHydrants(d.features) : console.error(d))
      .catch(console.error);
  }, [BASE]);
  
  // Fetch fire risk forecasts when forecast month changes or barangays are loaded
  useEffect(() => {
    // Only fetch forecasts if barangays data is available
    if (barangays.length > 0) {
      fetchFireRiskForecasts();
    }
  }, [forecastMonth, BASE, barangays]);

  useEffect(() => {
    fetch(`${BASE}/api/firestation`)
      .then((r) => r.json())
      .then((d) => d.features ? setFireStations(d.features) : console.error(d))
      .catch(console.error);
  }, [BASE]);

  // Function to manually refetch fire stations (e.g., after creating a new one)
  const refetchFireStations = () => {
    fetch(`${BASE}/api/firestation`)
      .then((r) => r.json())
      .then((d) => d.features ? setFireStations(d.features) : console.error(d))
      .catch(console.error);
  };

  useEffect(() => {
    fetch(`${BASE}/api/barangays`)
      .then((r) => r.json())
      .then((d) => d.features ? setBarangays(d.features) : console.error(d))
      .catch(console.error);
  }, [BASE]);

  // ─── FETCH ACTIVE FIRES INTO STATE ─────────────────────────────────
  useEffect(() => {
    if (!mapLoaded) return;
    fetch(`${BASE}/api/active_fires`)
      .then((r) => r.json())
      .then((fc) => setFires(fc.features || [])) // fires is always an array
      .catch(console.error);
  }, [mapLoaded]);

  // Poll active_fires periodically while map is loaded so updates from other users appear
  useEffect(() => {
    if (!mapLoaded) return;
    let stopped = false;
    const interval = 5000;

    async function pollFires() {
      if (stopped) return;
      try {
    const res = await fetch(`${BASE}/api/active_fires`);
        if (!res.ok) return;
        const fc = await res.json().catch(()=>null);
        if (fc && Array.isArray(fc.features)) {
          setFires(fc.features || []);
        }
      } catch (err) {
        // ignore
      }
    }

    pollFires();
    const t = setInterval(pollFires, interval);
    return () => { stopped = true; clearInterval(t); };
  }, [mapLoaded]);

    // ─── SYNC FIRES[] → GOOGLE MAPS DATA LAYER (after mapLoaded) ────────
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    // clear old features
    map.data.forEach((feat) => map.data.remove(feat));

    // add new batch
    map.data.addGeoJson({
      type: "FeatureCollection",
      features: fires,
    });

    // Pre-load fire icons for different alarm levels
    const iconCache = {};
    const preloadIcons = async () => {
      const alarmLevels = [
        'First Alarm (4 Trucks)',
        'Second Alarm (8 Trucks)', 
        'Third Alarm (12 Trucks)',
        'General Alarm (All Available)'
      ];
      
      for (const level of alarmLevels) {
        iconCache[level] = await getCSSFireIcon(level, 40);
      }
    };
    
    preloadIcons().then(() => {
      // style with CSS animated fire icon based on alarm level
      map.data.setStyle((feature) => {
        const alarmLevel = feature.getProperty('alarm_level');
        const icon = iconCache[alarmLevel] || iconCache['First Alarm (4 Trucks)'] || {
          url: firesIconUrl,
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        };
        return { icon };
      });
    }).catch((error) => {
      console.warn('Failed to preload fire icons, using static icon:', error);
      // Fallback to static icon
      map.data.setStyle(() => ({
        icon: {
          url: firesIconUrl,
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        }
      }));
    });

    // optional click handler
    const listener = map.data.addListener("click", (e) => {
      const id = e.feature.getProperty('id');
      // Open menu and select fire
      setSelectedActiveFireId(id);
      setActiveFiresMenuOpen(true);

      // Optionally log for debug
      const address = e.feature.getProperty('address');
      const barangay = e.feature.getProperty('barangay');
      const alarm_level = e.feature.getProperty('alarm_level');
      console.log("Fire clicked:", { id, address, barangay, alarm_level });
    });

    // cleanup on unmount or before next run
    return () => {
      try { window.google && window.google.maps && window.google.maps.event.removeListener(listener); } catch { void 0 }
      map.data.forEach((feat) => map.data.remove(feat));
    };
  }, [mapLoaded, fires]);


  // ─── HYDRANT PULSE, AUTOCOMPLETE, SEARCH, CLEAR UI ──────────────────
  useEffect(() => {
    // your existing circle-pulse animation for selectedHydrant
    // …no changes here…
  }, [selectedHydrant, showSidebar]);

  const onLoadAutocomplete = (autoInstance) => {
    setAutocomplete(autoInstance);
  };
  const onPlaceChanged = () => {
    // helper: normalize strings for more forgiving matching
    const normalizeName = (s) => (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9 ]/g, '').trim();

    // Try to get place from autocomplete (if present)
    const place = autocomplete && typeof autocomplete.getPlace === 'function' ? autocomplete.getPlace() : null;

    // If place has geometry, use it; otherwise we'll fallback to searchText-based matching
    let lat = null, lng = null;
    if (place && place.geometry) {
      lat = place.geometry.location.lat();
      lng = place.geometry.location.lng();
      setSearchText(place.formatted_address || place.name || "");
    }

    const searchKey = (searchText || '').trim();
    let match = null;

    // If we don't have lat/lng from place, try to match a barangay by searchText
    if ((!lat || !lng) && searchKey) {
      const ns = normalizeName(searchKey);
      match = barangays.find((b) => {
        const bn = normalizeName(b.properties.name || '');
        return bn === ns || bn.includes(ns) || ns.includes(bn);
      });
    }

    // If still no match and we have a place object, try matching by place text
    if (!match && place) {
      const nName = normalizeName(place.formatted_address || place.name || '');
      match = barangays.find((b) => {
        const bn = normalizeName(b.properties.name || '');
        return bn === nName || bn.includes(nName) || nName.includes(bn);
      });
    }

    try {
      if (match && mapRef.current) {
        const polyKey = `${match.properties.id}-0`;
        setSelectedBarangay({ feature: match, polyKey });
        try { setHoveredBarangay(polyKey); } catch (err) {}
        try { setShowBoundaries(true); } catch (err) {}
        try { setShowSidebar(true); } catch (err) {}

        // compute flattened coordinates for bounding box
        try {
          const flat = [];
          const geom = match.geometry || {};
          if (geom.type === 'Polygon') {
            geom.coordinates.forEach((ring) => ring.forEach(([lng2, lat2]) => flat.push([lng2, lat2])));
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lng2, lat2]) => flat.push([lng2, lat2]))));
          }
          if (flat.length) {
            const bounds = new window.google.maps.LatLngBounds();
            flat.forEach(([lng2, lat2]) => bounds.extend({ lat: lat2, lng: lng2 }));
            mapRef.current.fitBounds(bounds);
          } else if (lat && lng) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(15);
          }
        } catch (err) {
          if (lat && lng) { mapRef.current.panTo({ lat, lng }); mapRef.current.setZoom(15); }
        }
      } else if (lat && lng && mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(16);
      } else {
        console.debug('[onPlaceChanged] no match found for', searchText || (place && (place.formatted_address || place.name)) );
      }
    } catch (err) {
      // ignore
    }
  };

  // (station selection helper removed — reverted to avoid station-specific search UI)

    const handleSearch = (e) => {
      e.preventDefault();
      onPlaceChanged();
      };


  function clearUI() {
    setShowHydrants(false);
    setShowFireStations(false);
    setShowBoundaries(false);
    setShowFireRisk(false);
    setShowLayersPanel(false);
    setShowSidebar(false);
    setNewIncident(null);
    setSelectedHydrant(null);
    setSelectedStation(null);
    setSelectedBarangay(null);
  }

  async function updateAlarmLevel(fireId, newLevel) {
    // Update backend
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${BASE}/api/active_fires/${fireId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ alarm_level: newLevel })
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => "Unknown error");
      throw new Error(err.error || "Failed to update alarm level");
    }
    // Update local state
    setFires(prev =>
      prev.map(f =>
        f.properties.id === fireId
          ? {
              ...f,
              properties: {
                ...f.properties,
                alarm_level: newLevel
              }
            }
          : f
      )
    );
    return await res.json();
  }

  // helper: local ISO suitable for <input type="datetime-local">
  function localDateTimeNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ─── Return Context ────────────────────────────────────────────────
  return (
    <MapContext.Provider
      value={{
        mapRef,
        userLocation,
        setUserLocation,
        routeTo,
        setRouteTo,
        fires,
        setFires,
        hydrants,
        setHydrants,
        fireStations,
        setFireStations,
        barangays,
        setBarangays,
        showHydrants,
        showFireStations,
        showBoundaries,
        showFireRisk,
        showHistoricalFires,
        showLayersPanel,
        showSidebar,
        activeFiresMenuOpen,
        setActiveFiresMenuOpen,
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        selectedHydrant,
        selectedStation,
        selectedBarangay,
        hoveredBarangay,
        selectedActiveFireId,
        setSelectedActiveFireId,
  searchText,
  setSearchText,
  onLoadAutocomplete,
  onPlaceChanged,
        setShowHydrants,
        setShowFireStations,
        setShowBoundaries,
        setShowFireRisk,
        setShowHistoricalFires,
        setShowLayersPanel,
        setSelectedHydrant,
        setSelectedStation,
        setSelectedBarangay,
        setHoveredBarangay,
        setShowSidebar,
        setMapLoaded,
        newIncident,        // ← ADD THIS LINE
        setNewIncident,
        clearUI,
        reportMode,
        setReportMode,
        updateAlarmLevel,
        handleMapClick,
        submitIncident,
        resolveFire,
        nearbyHydrants,
        setNearbyHydrants,
        nearbyStations,
        setNearbyStations,
        showOnlyNearby,
        setShowOnlyNearby,
        fireRiskData,
        setFireRiskData,
        forecastMonth,
        setForecastMonth,
        fetchFireRiskForecasts,
        refetchFireStations, // Function to refetch fire stations after creating/updating
        getRiskColor,
        historicalFires,
        setHistoricalFires,
        historicalFilters,
        setHistoricalFilters,
        historicalFiltersOpen,
        setHistoricalFiltersOpen,
        fetchHistoricalFires,
        selectedHistoricalBarangay,
        setSelectedHistoricalBarangay,
        historicalFiresSidebarOpen,
        setHistoricalFiresSidebarOpen,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}
