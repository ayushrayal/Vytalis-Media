import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Global Axios Request Interceptor for Dynamic API Endpoint Routing
axios.interceptors.request.use((config) => {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  if (config.url && config.url.startsWith('http://localhost:5000')) {
    config.url = config.url.replace('http://localhost:5000', apiBaseUrl);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
