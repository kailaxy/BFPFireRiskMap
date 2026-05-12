import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Ensure runtime API base is set from build-time envs (Vite) or CRA envs
import './runtime-api'
import App from './App.jsx'
import { UserProvider, MapProvider } from './logic.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <MapProvider>
        <App />
      </MapProvider>
    </UserProvider>
  </StrictMode>,
)
