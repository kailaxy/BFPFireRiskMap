import React, { useContext } from "react";
import "./App.css";

import Header from "./components/Header";
import HeaderLogin from "./components/HeaderLogin";
import LoginForm from "./components/LoginForm";
import { UserContext } from "./logic.jsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingHeader from "./components/landing/LandingHeader";
import LandingFooter from "./components/landing/LandingFooter";
import LandingHero from "./components/landing/LandingHero";
import MapPage from "./components/MapPage";
import AdminUserManager from "./components/AdminUserManager";
import AdminHydrantsManager from "./components/AdminHydrantsManager";
// Redirect reports route to barangays manager - old reports component removed
// import AdminReportsManager from "./components/AdminReportsManager";
import AdminBarangaysManager from "./components/AdminBarangaysManager";
import AdminUsersList from "./components/AdminUsersList";
import AdminFireStationsManager from "./components/AdminFireStationsManager";
import AdminHistoricalFires from "./components/AdminHistoricalFires";
import AdminActiveFires from "./components/AdminActiveFires";
import AdminForecasts from "./components/AdminForecasts";
import AdminLayout from "./components/AdminLayout";
import Unauthorized from "./components/Unauthorized";
import { RequireAuth, RequireRole, PublicOnly } from "./components/auth/RouteGuards";

export default function App() {
  const { user } = useContext(UserContext);

  return (
      <BrowserRouter>
        <div className="app-container">
          <div className="content-wrapper">
            {/* Show app header when logged in, otherwise show landing header. Use HeaderLogin for admin/responder */}
            {user ? (user.role === 'admin' || user.role === 'responder' ? <HeaderLogin /> : <Header />) : <LandingHeader />}
            <Routes>
              {/* Root shows the marketing landing page; map lives at /map */}
                <Route path="/" element={<LandingHero />} />
              <Route path="/landing" element={<LandingHero />} />
              <Route path="/map" element={<MapPage />} />
                <Route path="/login" element={<PublicOnly><LoginForm /></PublicOnly>} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="/admin" element={<RequireAuth><RequireRole roles={["admin"]}><AdminLayout /></RequireRole></RequireAuth>}>
                <Route index element={<AdminUserManager />} />
                <Route path="hydrants" element={<AdminHydrantsManager />} />
                <Route path="fire-stations" element={<AdminFireStationsManager />} />
                <Route path="reports" element={<AdminBarangaysManager />} />
                <Route path="active-fires" element={<AdminActiveFires />} />
                 <Route path="historical-fires" element={<AdminHistoricalFires />} />
                <Route path="barangays" element={<AdminBarangaysManager />} />
                <Route path="users" element={<AdminUsersList />} />
                <Route path="stations" element={<Navigate to="/admin/fire-stations" replace />} />
                <Route path="forecasts" element={<AdminForecasts />} />
              </Route>
                <Route path="*" element={<LandingHero />} />
            </Routes>
          </div>
          {/* Global landing footer shown on every page */}
          <LandingFooter />
        </div>
      </BrowserRouter>
  );
}
