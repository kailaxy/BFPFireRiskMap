// runtime-api.js
// Purpose: allow the static build to be configured at runtime by the host.
// Priority: Vite build-time var -> CRA-style env -> meta tag -> existing window value
try{
  var built = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : undefined;
  var cra = typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL : undefined;
  var meta = (function(){ try{ if(typeof document !== 'undefined'){ var m = document.querySelector('meta[name="api-base-url"]'); return m && m.content ? m.content : undefined } }catch(e){} return undefined })();
  if(typeof window !== 'undefined'){
    window.__BFP_API_BASE_URL = window.__BFP_API_BASE_URL || built || cra || meta || window.__BFP_API_BASE_URL;
  }
}catch(e){/* noop */}
