// src/config.js
// Expose a single API base URL used across the app. Support multiple env var patterns:
//  - Vite build-time: import.meta.env.VITE_API_BASE_URL
//  - Create-React-App style: process.env.REACT_APP_API_URL (for compatibility)
//  - Runtime global override: window.__BFP_API_BASE_URL (useful if build-time envs aren't available)
//  - Runtime meta tag: <meta name="api-base-url" content="https://..."> (useful for host-level injection)
//  - Fallback: http://localhost:5000
const viteUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : undefined;
const craUrl = typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL : undefined;
const runtimeWindow = typeof window !== 'undefined' && window.__BFP_API_BASE_URL ? window.__BFP_API_BASE_URL : undefined;
const runtimeMeta = (function(){
	try{
		if(typeof document !== 'undefined'){
			var m = document.querySelector('meta[name="api-base-url"]');
			return m && m.content ? m.content : undefined;
		}
	}catch(e){}
	return undefined;
})();

export const API_BASE_URL = viteUrl || craUrl || runtimeWindow || runtimeMeta || 'http://localhost:5000';
