/**
 * gdrive.js — Google Drive integration for everyDrive
 *
 * Uses Google Identity Services (GIS) implicit OAuth flow — no backend needed.
 * Requires VITE_GOOGLE_CLIENT_ID in your .env file.
 *
 * Setup (2 min):
 *   1. https://console.cloud.google.com → APIs & Services → Credentials
 *   2. Create OAuth Client ID → Web Application
 *   3. Add http://localhost:5173 and your Vercel domain to Authorized JavaScript Origins
 *   4. Copy Client ID → paste into .env as VITE_GOOGLE_CLIENT_ID=...
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
// Upgrade scope: need drive.readonly to get download URLs, not just metadata
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const INDEX_KEY = 'gdrive_index_v2'    // v2: stores {name, id} map
const TOKEN_KEY = 'gdrive_token'
const REFRESH_TOKEN_KEY = 'gdrive_refresh_token'
const TOKEN_EXPIRY_KEY = 'gdrive_token_expiry'

// ── Token management ──────────────────────────────────────────────────────────
export function getGDriveToken() { return localStorage.getItem(TOKEN_KEY) }
export function clearGDriveToken() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    localStorage.removeItem(INDEX_KEY)
}

/**
 * Check if the current token is expired or about to expire (within 5 mins)
 */
export function isTokenExpired() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
    if (!expiry) return true
    return Date.now() > (Number(expiry) - 5 * 60 * 1000)
}

// ── OAuth ─────────────────────────────────────────────────────────────────────
export function connectGDrive() {
    return new Promise((resolve, reject) => {
        if (!CLIENT_ID) {
            reject(new Error('VITE_GOOGLE_CLIENT_ID is not set in your .env file.'))
            return
        }

        async function handleCodeResponse(resp) {
            if (resp.code) {
                try {
                    // Exchange code for Refresh Token via our secure serverless function
                    const passcode = localStorage.getItem('everydrive_passcode') || ''
                    const res = await fetch(`/api/auth-google?code=${resp.code}&passcode=${encodeURIComponent(passcode)}`)
                    const data = await res.json()

                    if (data.error) throw new Error(data.error_description || data.error)

                    localStorage.setItem(TOKEN_KEY, data.access_token)
                    if (data.refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
                    localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + (data.expires_in * 1000))

                    resolve(data.access_token)
                } catch (e) {
                    reject(e)
                }
            } else {
                reject(new Error('No authorization code returned from Google.'))
            }
        }

        function initClient() {
            /* global google */
            const client = google.accounts.oauth2.initCodeClient({
                client_id: CLIENT_ID,
                scope: SCOPE,
                ux_mode: 'popup',
                callback: handleCodeResponse
            })
            client.requestCode()
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

/**
 * Silently refresh the access token using the stored refresh token.
 */
export async function refreshGDriveToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) return null

    try {
        const passcode = localStorage.getItem('everydrive_passcode') || ''
        const res = await fetch(`/api/auth-google?refresh_token=${refreshToken}&passcode=${encodeURIComponent(passcode)}`)
        const data = await res.json()

        if (data.error) {
            if (data.error === 'invalid_grant') clearGDriveToken()
            throw new Error(data.error_description || data.error)
        }

        localStorage.setItem(TOKEN_KEY, data.access_token)
        localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + (data.expires_in * 1000))
        return data.access_token
    } catch (e) {
        console.error('[everyDrive] Failed to refresh GDrive token:', e)
        return null
    }
}

// ── File Index (v2: Map of lowercase filename → fileId) ───────────────────────
/**
 * Fetches ALL files from Google Drive and builds a Map: lowercaseName → fileId.
 * Also stores a Set for backward-compat isInGDrive checks.
 * Returns { nameToId: Map, names: Set }
 */
export async function buildGDriveIndex(onProgress) {
    const token = getGDriveToken()
    if (!token) throw new Error('Not connected to Google Drive.')

    const nameToId = new Map()
    let pageToken = null

    do {
        const params = new URLSearchParams({
            pageSize: 1000,
            fields: 'nextPageToken,files(id,name)',
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
        data.files.forEach(f => nameToId.set(f.name.toLowerCase(), f.id))
        pageToken = data.nextPageToken
        onProgress?.(nameToId.size)
    } while (pageToken)

    // Persist as JSON array of [name, id] pairs
    localStorage.setItem(INDEX_KEY, JSON.stringify([...nameToId]))
    return nameToId
}

/**
 * Load the cached GDrive index from localStorage.
 * Returns a Map (lowercaseName → fileId), or null.
 */
export function loadCachedIndex() {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        // Handle both v1 (string array) and v2 ([name, id] array)
        if (parsed.length > 0 && Array.isArray(parsed[0])) {
            return new Map(parsed)
        }
        // v1 fallback: convert string[] to Map with null IDs
        return new Map(parsed.map(name => [name, null]))
    } catch { return null }
}

/**
 * Check if a filename exists in the GDrive index.
 * Works with both Map (v2) and Set (legacy).
 */
export function isInGDrive(filename, index) {
    if (!index) return false
    if (index instanceof Map) return index.has(filename.toLowerCase())
    return index.has(filename.toLowerCase()) // legacy Set
}

/**
 * Get the Google Drive file ID for a filename, if it exists.
 * Returns null if not found or no ID stored.
 */
export function getGDriveFileId(filename, index) {
    if (!index || !(index instanceof Map)) return null
    return index.get(filename.toLowerCase()) || null
}

/**
 * Build a direct Google Drive stream/download URL for a file ID.
 * Uses the Drive API media endpoint with the stored OAuth token.
 * The browser navigates to this URL — Google streams the file.
 */
export function getGDriveStreamUrl(fileId) {
    const token = getGDriveToken()
    if (!fileId || !token) return null
    // This URL streams the file directly from Google's CDN with auth
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(token)}`
}
