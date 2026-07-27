import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Declare global window.api type
declare global {
  interface Window {
    api: import('../../preload/index').API
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Tell main the first paint is ready (avoids white flash on win.show) — CyberViewer pattern
function notifyUiReady(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        window.api.uiReady()
      } catch {
        /* ignore */
      }
    })
  })
}

if (document.readyState === 'complete') {
  notifyUiReady()
} else {
  window.addEventListener('load', notifyUiReady, { once: true })
}
