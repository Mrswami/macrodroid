/**
 * pcloud.js — pCloud API Integration Layer (Region-Aware)
 */

const PCLOUD_API_US = 'https://api.pcloud.com'
const PCLOUD_API_EU = 'https://eapi.pcloud.com'

// ── Auth ─────────────────────────────────────────────────────────────────────
export function getToken() { return localStorage.getItem('pcloud_token') }
export function getApiBase() { return localStorage.getItem('pcloud_api_base') || PCLOUD_API_US }

export function saveToken(token, locationid = 1) {
    localStorage.setItem('pcloud_token', token)
    localStorage.setItem('pcloud_api_base', locationid === 2 ? PCLOUD_API_EU : PCLOUD_API_US)
}

export function clearToken() {
    localStorage.removeItem('pcloud_token')
    localStorage.removeItem('pcloud_api_base')
}

/**
 * Direct email+password login.
 * Returns a token valid for app life; also handles EU/US region automatically.
 */
export async function loginWithCredentials(email, password) {
    const makeParams = (base) => new URLSearchParams({
        username: email,
        password,
        getauth: 1,
        logout: 0,    // keep existing sessions alive
        // no authexpire → uses pCloud default (permanent)
    })

    let data
    try {
        // Try US first
        let res = await fetch(`${PCLOUD_API_US}/userinfo?${makeParams(PCLOUD_API_US)}`)
        data = await res.json()

        // If EU region needed, retry
        if (data.result === 4000 || data.locationid === 2) {
            res = await fetch(`${PCLOUD_API_EU}/userinfo?${makeParams(PCLOUD_API_EU)}`)
            data = await res.json()
        }
    } catch (netErr) {
        throw new Error('Network error — check your connection: ' + netErr.message)
    }

    if (data.result !== 0) {
        throw new Error(data.error || `pCloud error ${data.result}`)
    }

    // pCloud returns the token as `auth` in the userinfo response
    const token = data.auth || data.token
    if (!token) throw new Error('pCloud did not return a token. Please try again.')

    saveToken(token, data.locationid)
    return { token, email: data.email }
}

// ── Core API caller ───────────────────────────────────────────────────────────
async function apiCall(endpoint, params = {}) {
    const token = getToken()
    const apiBase = getApiBase()
    if (!token) throw new Error('Not authenticated')

    // pCloud session tokens use the 'auth' parameter
    const qs = new URLSearchParams({ ...params, auth: token }).toString()
    const res = await fetch(`${apiBase}/${endpoint}?${qs}`)
    const data = await res.json()

    if (data.result !== 0) {
        console.error(`[pCloud API] Error in ${endpoint}:`, data)
        throw new Error(data.error || `API error ${data.result}`)
    }
    return data
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function listFolder(folderId = 0) {
    const data = await apiCall('listfolder', { folderid: folderId })
    return data.metadata.contents
}

export async function searchFiles(query, params = {}) {
    const data = await apiCall('search', { query, ...params })
    return data.items
}

export async function getFileLink(fileId) {
    try {
        const data = await apiCall('getfilelink', { fileid: fileId })
        return `https://${data.hosts[0]}${data.path}`
    } catch (e) {
        console.error('[getFileLink] failed for fileid:', fileId, e)
        throw e
    }
}

export async function getVideoLink(fileId) {
    const data = await apiCall('getvideolink', { fileid: fileId, streaming: 1 })
    return `https://${data.hosts[0]}${data.path}`
}

export function getThumbUrl(fileId, size = '400x400') {
    return `${getApiBase()}/getthumb?fileid=${fileId}&size=${size}&auth=${getToken()}`
}

// no-ops kept for compatibility
export function redirectToOAuth() { }
export function handleOAuthRedirect() { return null }
