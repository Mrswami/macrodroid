/**
 * gdrive.js — Google Drive integration for pGallery
 *
 * Uses Google Identity Services (GIS) implicit OAuth flow — no backend needed.
 * Requires VITE_GOOGLE_CLIENT_ID in your .env file.
 *
 * Setup (2 min):
 *   1. https://console.cloud.google.com → APIs & Services → Credentials
 *   2. Create OAuth Client ID → Web Application
 *   3. Add http://localhost:5173 to Authorized JavaScript Origins
 *   4. Copy Client ID → paste into .env as VITE_GOOGLE_CLIENT_ID=...
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly'
const INDEX_KEY = 'gdrive_index'       // localStorage key for cached file index
const TOKEN_KEY = 'gdrive_token'       // localStorage key for OAuth token

// ── Token management ──────────────────────────────────────────────────────────
export function getGDriveToken() { return localStorage.getItem(TOKEN_KEY) }
export function clearGDriveToken() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(INDEX_KEY)
}

// ── OAuth ─────────────────────────────────────────────────────────────────────
/**
 * Triggers the Google OAuth popup and resolves with the access token.
 * Loads the GIS library dynamically if needed.
 */
export function connectGDrive() {
    return new Promise((resolve, reject) => {
        if (!CLIENT_ID) {
            reject(new Error('VITE_GOOGLE_CLIENT_ID is not set in your .env file.'))
            return
        }

        function initClient() {
            /* global google */
            const client = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPE,
                callback: (resp) => {
                    if (resp.error) { reject(new Error(resp.error)); return }
                    localStorage.setItem(TOKEN_KEY, resp.access_token)
                    resolve(resp.access_token)
                }
            })
            client.requestAccessToken()
        }

        if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
            initClient()
        } else {
            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client'
            script.onload = initClient
            script.onerror = () => reject(new Error('Failed to load Google Sign-In script.'))
            document.head.appendChild(script)
        }
    })
}

// ── File Index ────────────────────────────────────────────────────────────────
/**
 * Fetches ALL filenames from Google Drive (all pages) and stores a
 * case-insensitive Set in memory + localStorage cache.
 * Returns the Set of lowercase filenames.
 */
export async function buildGDriveIndex(onProgress) {
    const token = getGDriveToken()
    if (!token) throw new Error('Not connected to Google Drive.')

    const index = new Set()
    let pageToken = null
    let page = 0

    do {
        const params = new URLSearchParams({
            pageSize: 1000,
            fields: 'nextPageToken,files(name)',
            q: 'trashed=false',
        })
        if (pageToken) params.set('pageToken', pageToken)

        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) {
            if (res.status === 401) { clearGDriveToken(); throw new Error('GDrive session expired. Please reconnect.') }
            throw new Error(`GDrive API error: ${res.status}`)
        }

        const data = await res.json()
        data.files.forEach(f => index.add(f.name.toLowerCase()))
        pageToken = data.nextPageToken
        page++
        onProgress?.(index.size)
    } while (pageToken)

    // Persist as a JSON array so we can restore it across reloads
    localStorage.setItem(INDEX_KEY, JSON.stringify([...index]))
    return index
}

/**
 * Load the cached GDrive file index from localStorage.
 * Returns a Set, or null if not built yet.
 */
export function loadCachedIndex() {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return null
    try { return new Set(JSON.parse(raw)) } catch { return null }
}

/**
 * Check if a filename exists in the GDrive index.
 */
export function isInGDrive(filename, index) {
    if (!index) return false
    return index.has(filename.toLowerCase())
}
