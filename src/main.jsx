import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Apply persisted theme before first paint (prevents flash)
try {
  const theme = localStorage.getItem('ll_theme');
  if (theme && theme !== 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
} catch {}

// Apply persisted cockpit before first paint (mirrors theme pattern)
try {
  const cockpit = localStorage.getItem('ll_cockpit');
  if (cockpit && cockpit !== 'spinner') {
    document.documentElement.setAttribute('data-cockpit', cockpit);
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}



