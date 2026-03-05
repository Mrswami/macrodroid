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
 * Logs in with email + password and returns a permanent auth token.
 * Calls pCloud's /userinfo?getauth=1 endpoint.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, email: string}>}
 */
export async function loginWithCredentials(email, password) {
    const params = new URLSearchParams({
        username: email,
        password,
        getauth: 1,
        logout: 1,
        username2: email,
        authexpire: 0  // token never expires
    })
    const res = await fetch(`${PCLOUD_API}/userinfo?${params}`)
    const data = await res.json()

    if (data.result !== 0) {
        throw new Error(data.error || 'Login failed. Please check your credentials.')
    }

    const token = data.token || data.auth
    if (!token) throw new Error('pCloud did not return an auth token.')

    return { token, email: data.email }
}

/**
 * No-op: kept for API compatibility, not needed with direct login.
 */
export function redirectToOAuth() {
    console.warn('redirectToOAuth: not used in direct-login mode')
}

/**
 * No-op: kept for API compatibility.
 */
export function handleOAuthRedirect() { return null }

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
