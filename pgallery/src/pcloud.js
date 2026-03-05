/**
 * pcloud.js — pCloud API Integration Layer (Region-Aware)
 */

const PCLOUD_API_DEFAULT = 'https://api.pcloud.com'
const PCLOUD_API_EU = 'https://eapi.pcloud.com'

// ── Auth & Persistence ───────────────────────────────────────────────────────

export function getToken() {
    return localStorage.getItem('pcloud_token')
}

export function getApiBase() {
    return localStorage.getItem('pcloud_api_base') || PCLOUD_API_DEFAULT
}

export function saveToken(token, locationid = 1) {
    const apiBase = (locationid === 2) ? PCLOUD_API_EU : PCLOUD_API_DEFAULT
    localStorage.setItem('pcloud_token', token)
    localStorage.setItem('pcloud_api_base', apiBase)
}

export function clearToken() {
    localStorage.removeItem('pcloud_token')
    localStorage.removeItem('pcloud_api_base')
}

/**
 * Logs in with email + password and returns a session token.
 * Automatically detects US vs EU region.
 */
export async function loginWithCredentials(email, password) {
    const params = new URLSearchParams({
        username: email,
        password,
        getauth: 1,
        authexpire: 0
    })

    let data
    try {
        let res = await fetch(`${PCLOUD_API_DEFAULT}/userinfo?${params}`)
        data = await res.json()

        // If account is in EU region, retry against EU server
        if (data.result === 4000 || data.locationid === 2) {
            res = await fetch(`${PCLOUD_API_EU}/userinfo?${params}`)
            data = await res.json()
        }
    } catch (networkErr) {
        throw new Error(`Network error: ${networkErr.message}`)
    }

    if (data.result !== 0) {
        throw new Error(data.error || `pCloud error ${data.result}. Check your credentials.`)
    }

    const token = data.auth || data.token
    if (!token) throw new Error('pCloud did not return an auth token. Try again.')

    saveToken(token, data.locationid)
    return { token, email: data.email }
}

// ── API Calls ──────────────────────────────────────────────────────────────────

async function apiCall(endpoint, params = {}) {
    const token = getToken()
    const apiBase = getApiBase()
    if (!token) throw new Error('Not authenticated')

    const query = new URLSearchParams({ ...params, auth: token }).toString()
    const res = await fetch(`${apiBase}/${endpoint}?${query}`)
    const data = await res.json()

    // Explicit session expiry
    if (data.result === 1000) {
        clearToken()
        throw new Error('Logged out due to session expiry.')
    }

    if (data.result !== 0) {
        throw new Error(data.error || `API error: ${data.result}`)
    }
    return data
}

/**
 * Lists the contents of a folder.
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
    const data = await apiCall('getvideolink', { fileid: fileId, streaming: 1 })
    return `https://${data.hosts[0]}${data.path}`
}

/**
 * Gets a thumbnail URL for a file.
 */
export function getThumbUrl(fileId, size = '400x400') {
    const token = getToken()
    const apiBase = getApiBase()
    return `${apiBase}/getthumb?fileid=${fileId}&size=${size}&auth=${token}`
}

export function redirectToOAuth() { }
export function handleOAuthRedirect() { return null }
