import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './loadFonts'
import './index.css'
import App from './App'
import { ensureSettings } from './db'
import { initSync } from './lib/sync'

ensureSettings().then(() => {
  initSync()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
