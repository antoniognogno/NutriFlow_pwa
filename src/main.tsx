import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './app/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento root non trovato nel documento HTML.')
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
