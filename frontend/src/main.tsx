import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lostlink.css'
import App from './App.tsx'
import { AuthProvider } from './auth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
