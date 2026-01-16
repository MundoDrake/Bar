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
const APP_VERSION = 'v2-cache-fix-sw' // Bump this when significant auth/storage changes occur
const savedVersion = localStorage.getItem('app_version')

if (savedVersion !== APP_VERSION) {
    console.warn(`[App] New version detected (${APP_VERSION}). Clearing potentially stale storage...`)

    // Clear everything to remove corrupt Auth state or bad cached queries
    localStorage.clear()

    // Also clear Service Worker caches to remove stale API/auth responses
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                console.log(`[App] Clearing SW cache: ${name}`)
                caches.delete(name)
            })
        })
    }

    // Unregister old service workers to force fresh registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                console.log('[App] Unregistering old service worker')
                registration.unregister()
            })
        })
    }

    // Set new version
    localStorage.setItem('app_version', APP_VERSION)

    console.log('[App] Storage and caches cleared. Starting fresh.')
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
