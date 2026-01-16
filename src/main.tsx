import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './styles/components.css'
import './styles/mobile.css'
import './styles/custom_animations.css'

// Cache Buster / Automatic Recovery
// This ensures users with stale/corrupt localStorage (causing infinite loops)
// get a fresh start automatically.
const APP_VERSION = 'v1-fix-concurrency-storage-v2' // Bump this when significant auth/storage changes occur
const savedVersion = localStorage.getItem('app_version')

if (savedVersion !== APP_VERSION) {
    console.warn(`[App] New version detected (${APP_VERSION}). Clearing potentially stale storage...`)

    // Clear everything to remove corrupt Auth state or bad cached queries
    localStorage.clear()

    // Set new version
    localStorage.setItem('app_version', APP_VERSION)

    console.log('[App] Storage cleared. Starting fresh.')
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
