import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initCrossTabSync } from './lib/crossTabSync'

initCrossTabSync(['tradesense_calendar_account', 'auth', 'tradesense_theme'])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
