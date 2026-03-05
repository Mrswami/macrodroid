/**
 * pcloud.js — pCloud API Integration Layer
 *
 * Uses the pCloud OAuth 2.0 "implicit grant" flow (no backend needed).
 * The user logs in via the pCloud authorization page, which redirects back
 * to this app with an access_token in the URL hash.
 *
 * To get a CLIENT_ID:
 *   1. Go to https://docs.pcloud.com/my_apps/
 *   2. Create a new app.
 *   3. Set the redirect URI to your app's URL (e.g. http://localhost:5173).
 *   4. Paste the client_id below.
 */

const PCLOUD_CLIENT_ID = import.meta.env.VITE_PCLOUD_CLIENT_ID || ''
const PCLOUD_API = 'https://api.pcloud.com'

// ── Auth ──────────────────────────────────────────────────────────────────────

export function getToken() {
    return localStorage.getItem('pcloud_token')
}

export function saveToken(token) {
    localStorage.setItem('pcloud_token', token)
}

export function clearToken() {
    localStorage.removeItem('pcloud_token')
}

/**
 * Redirects the user to pCloud's OAuth 2.0 authorization page.
 * On success, pCloud redirects back to `redirect_uri` with `#access_token=...`
 */
export function redirectToOAuth() {
    if (!PCLOUD_CLIENT_ID) {
        alert('Missing pCloud Client ID. Please set VITE_PCLOUD_CLIENT_ID in your .env file.')
        return
    }
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname)
    const url = `https://my.pcloud.com/oauth2/authorize?client_id=${PCLOUD_CLIENT_ID}&response_type=token&redirect_uri=${redirectUri}`
    window.location.href = url
}

/**
 * Checks if the URL hash contains an OAuth access_token from a redirect.
 * Saves the token and cleans the hash from the URL.
 * @returns {string|null} The token, if found.
 */
export function handleOAuthRedirect() {
    const hash = window.location.hash
    if (!hash) return null

    const params = new URLSearchParams(hash.substring(1))
    const token = params.get('access_token') || params.get('token')

    if (token) {
        saveToken(token)
        // Clean the URL
        history.replaceState(null, '', window.location.pathname)
        return token
    }
    return null
}

// ── API Calls ──────────────────────────────────────────────────────────────────

async function apiCall(endpoint, params = {}) {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')

    const query = new URLSearchParams({ ...params, access_token: token }).toString()
    const res = await fetch(`${PCLOUD_API}/${endpoint}?${query}`)
    const data = await res.json()

    if (data.result !== 0) {
        throw new Error(data.error || `API error: ${data.result}`)
    }
    return data
}

/**
 * Lists the contents of a folder.
 * @param {number} folderId - 0 for root.
 */
export async function listFolder(folderId = 0) {
    const data = await apiCall('listfolder', { folderid: folderId })
    return data.metadata.contents
}

/**
 * Gets a direct download link for an image.
 */
export async function getFileLink(fileId) {
    const data = await apiCall('getfilelink', { fileid: fileId })
    return `https://${data.hosts[0]}${data.path}`
}

/**
 * Gets a direct streaming link for a video.
 */
export async function getVideoLink(fileId) {
    const data = await apiCall('getvideolink', { fileid: fileId })
    return `https://${data.hosts[0]}${data.path}`
}

/**
 * Gets a thumbnail URL for a file.
 */
export function getThumbUrl(fileId, size = '400x400') {
    const token = getToken()
    return `${PCLOUD_API}/getthumb?fileid=${fileId}&size=${size}&access_token=${token}`
}
