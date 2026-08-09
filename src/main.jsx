import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { envVar } from './lib/env'

// Runtime Google Analytics gate — only loads gtag.js when VITE_GA_ID is set.
// This avoids sending telemetry to placeholder IDs and prevents unnecessary
// network requests on every page load.
const GA_ID = envVar('VITE_GA_ID')
if (GA_ID) {
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID)
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

console.log('Main.jsx: System Initializing...')

try {
  const root = document.getElementById('root')
  if (!root) {
    console.error('Main.jsx: root element not found')
  } else {
    ReactDOM.createRoot(root).render(<App />)
    console.log('Main.jsx: React root rendered')
  }
} catch (err) {
  console.error('Main.jsx: Fatal render error', err)
  // 🔒 SECURITY: use textContent instead of innerHTML to prevent XSS
  // from error stack traces / messages that could contain injected markup.
  document.body.textContent = ''
  const container = document.createElement('div')
  Object.assign(container.style, {
    padding: '20px',
    color: '#fff',
    fontFamily: 'monospace',
    background: '#060d14',
    minHeight: '100vh',
  })
  const heading = document.createElement('h1')
  heading.textContent = 'Admin App Error'
  const pre = document.createElement('pre')
  pre.textContent = err.stack || err.message
  container.appendChild(heading)
  container.appendChild(pre)
  document.body.appendChild(container)
}
