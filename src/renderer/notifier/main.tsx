import React from 'react'
import ReactDOM from 'react-dom/client'
import NotifierApp from './App'
import '../src/styles/global.css'

declare global {
  interface Window {
    api: import('../../../preload/index').API
  }
}

ReactDOM.createRoot(document.getElementById('notifier-root') as HTMLElement).render(
  <React.StrictMode>
    <NotifierApp />
  </React.StrictMode>
)
