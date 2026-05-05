import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';

// In production the frontend is on Vercel, backend is on Render.
// VITE_API_URL is set in Vercel's environment variables.
// In dev, leave it empty so Vite's proxy handles /api/* → localhost:3001.
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
