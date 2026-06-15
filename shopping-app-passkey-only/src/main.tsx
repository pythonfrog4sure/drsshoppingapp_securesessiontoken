import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { devConsole } from './dev/devConsole'

// Install console + fetch interceptors before anything else runs so the very
// first SDK init log lines and network calls are captured.
devConsole.install()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
