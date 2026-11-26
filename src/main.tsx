import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { installGlobalErrorRecovery } from './lib/chunkRecovery'
import './app/globals.css'

installGlobalErrorRecovery()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento root non trovato nel documento HTML.')
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
