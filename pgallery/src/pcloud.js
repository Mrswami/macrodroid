/**
 * pcloud.js — pCloud API Integration Layer (Region-Aware)
 */

// Direct URLs used ONLY for login (before we know the region)
const PCLOUD_API_US = 'https://api.pcloud.com'
const PCLOUD_API_EU = 'https://eapi.pcloud.com'

// Proxy paths used for ALL other API calls (routes via Vite server, strips Origin header)
const PROXY_US = '/pcloud-us'
const PROXY_EU = '/pcloud-eu'

// ── Auth ─────────────────────────────────────────────────────────────────────
export function getToken() { return localStorage.getItem('pcloud_token') }
export function getApiBase() { return localStorage.getItem('pcloud_api_base') || PCLOUD_API_US }
export function getProxyBase() {
    const base = localStorage.getItem('pcloud_api_base') || PCLOUD_API_US
    return base.includes('eapi') ? PROXY_EU : PROXY_US
}

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
    const proxyBase = getProxyBase()
    if (!token) throw new Error('Not authenticated')

    // Use POST through Vite proxy — no browser Origin header reaches pCloud
    const formData = new FormData()
    formData.append('auth', token)
    for (const [k, v] of Object.entries(params)) {
        formData.append(k, v)
    }

    const res = await fetch(`${proxyBase}/${endpoint}`, {
        method: 'POST',
        body: formData
    })
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
        // Try with basic call
        const data = await apiCall('getfilelink', { fileid: fileId })
        return `https://${data.hosts[0]}${data.path}`
    } catch (e) {
        console.error('[getFileLink] primary failed:', e)
        // Fallback: Try with forcedownload to see if it bypasses referer checks
        const data = await apiCall('getfilelink', { fileid: fileId, forcedownload: 1 })
        return `https://${data.hosts[0]}${data.path}`
    }
}

export async function getVideoLink(fileId) {
    try {
        const data = await apiCall('getvideolink', { fileid: fileId, streaming: 1 })
        return `https://${data.hosts[0]}${data.path}`
    } catch (e) {
        console.error('[getVideoLink] primary failed:', e)
        const data = await apiCall('getvideolink', { fileid: fileId, streaming: 1, forcedownload: 1 })
        return `https://${data.hosts[0]}${data.path}`
    }
}

export function getThumbUrl(fileId, size = '400x400') {
    return `${getApiBase()}/getthumb?fileid=${fileId}&size=${size}&auth=${getToken()}`
}

// no-ops kept for compatibility
export function redirectToOAuth() { }
export function handleOAuthRedirect() { return null }
