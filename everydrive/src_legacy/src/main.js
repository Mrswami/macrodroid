import './style.css'
import {
    getToken, clearToken,
    loginWithCredentials,
    listFolder, searchFiles, getFileLink, getVideoLink, getThumbUrl
} from './pcloud.js'
import {
    getGDriveToken, clearGDriveToken, isTokenExpired,
    connectGDrive, refreshGDriveToken, buildGDriveIndex, loadCachedIndex,
    isInGDrive, getGDriveFileId, getGDriveStreamUrl
} from './gdrive.js'

// ── Passcode ──────────────────────────────────────────────────────────────────
const APP_PASSCODE = import.meta.env.VITE_APP_PASSCODE || ''
const lockerKey = 'everydrive_passcode'
function isLocked() { return !APP_PASSCODE ? false : localStorage.getItem(lockerKey) !== APP_PASSCODE }
function savePasscode(p) { localStorage.setItem(lockerKey, p) }
function getSavedPasscode() { return localStorage.getItem(lockerKey) || '' }

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
    currentFolderId: 0,
    folderName: 'My Drive',
    history: [],
    gdriveIndex: null,
    currentView: 'folders', // 'folders', 'recent', 'photos', 'videos', 'duplicates'
    sourceFilter: 'all'     // 'all', 'pcloud', 'gdrive'
}

// ── DOM Refs ───────────────────────────────────────────────────────────────────
const gallery = document.getElementById('gallery')
const loader = document.getElementById('loader')
const authArea = document.getElementById('auth-status')
const breadcrumb = document.getElementById('breadcrumb')
const sidebar = document.getElementById('sidebar')

// ── Bootstrap ──────────────────────────────────────────────────────────────────
async function init() {
    if (isLocked()) {
        showLocker(true)
        return
    }

    if (getToken()) {
        sidebar.classList.remove('hidden')
        renderConnectedUI()
        initSidebar()
        state.gdriveIndex = loadCachedIndex()

        // Handle routing via hash
        window.onhashchange = handleRouting
        await handleRouting()

        // Phase 4: Silent GDrive refresh check every minute
        setInterval(async () => {
            if (getGDriveToken() && isTokenExpired()) {
                console.log('[everyDrive] GDrive token expired, refreshing...')
                await refreshGDriveToken()
                renderConnectedUI() // Update badge if needed
            }
        }, 60000)
    } else {
        sidebar.classList.add('hidden')
        renderLoginPage()
    }
}

async function handleRouting() {
    const hash = window.location.hash.slice(1) // remove #
    if (!hash || hash === 'folders') {
        state.currentView = 'folders'
        state.history = []
        await loadFolder(0, 'My Drive')
    } else if (hash.startsWith('folder/')) {
        const parts = hash.split('/')
        const id = parts[1]
        const name = decodeURIComponent(parts[2] || 'Folder')
        state.currentView = 'folders'
        await loadFolder(id, name)
    } else {
        state.currentView = hash
        await loadVirtualView(hash)
    }

    // Sync sidebar active state
    document.querySelectorAll('.nav-item').forEach(i => {
        i.classList.toggle('active', i.dataset.view === state.currentView)
    })
}

// ── Sidebar Logic ──────────────────────────────────────────────────────────────
function initSidebar() {
    // View navigation items
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.onclick = () => {
            window.location.hash = item.dataset.view
        }
    })

    // Source filter items
    document.querySelectorAll('.source-filter').forEach(item => {
        item.onclick = () => {
            state.sourceFilter = item.dataset.source
            // Update active highlight on filter buttons only
            document.querySelectorAll('.source-filter').forEach(f => {
                f.classList.toggle('active', f === item)
            })
            // Re-render the current view with the new filter applied
            if (state.currentView === 'folders') {
                loadFolder(state.currentFolderId, state.folderName)
            } else {
                loadVirtualView(state.currentView)
            }
        }
    })

    // Activate the default 'all' filter button
    document.getElementById('filter-all')?.classList.add('active')
}

async function loadVirtualView(view) {
    showLoader(true)
    state.history = [] // Clear history for virtual views
    breadcrumb.innerHTML = `<span class="breadcrumb-item active">${view.charAt(0).toUpperCase() + view.slice(1)}</span>`

    try {
        let items = []
        if (view === 'recent') {
            // pCloud doesn't have a perfect "recent" globally without a deep crawl,
            // so we'll use a search for common media types as a proxy for now.
            items = await searchFiles('', { sort: 'mtime_desc', limit: 50 })
        } else if (view === 'photos') {
            items = await searchFiles('.jpg', { limit: 100 })
            const more = await searchFiles('.png', { limit: 100 })
            items = [...items, ...more]
        } else if (view === 'videos') {
            items = await searchFiles('.mp4', { limit: 100 })
        } else if (view === 'duplicates') {
            // This is tricky: we'd need to search EVERYTHING to find duplicates.
            // For now, we'll search for common images and filter by our GDrive index.
            const allItems = await searchFiles('.jpg', { limit: 200 })
            items = allItems.filter(i => isInGDrive(i.name, state.gdriveIndex))
        }

        renderGrid(items)
    } catch (e) {
        console.error('[everyDrive] search error:', e)
        showFolderError(`Could not load ${view}: ` + e.message)
    } finally {
        showLoader(false)
    }
}

// ── Login ──────────────────────────────────────────────────────────────────────
function renderLoginPage() {
    gallery.className = 'login-wrapper'
    gallery.innerHTML = `
      <div class="login-card">
        <div class="login-logo">every<span>Drive</span></div>
        <p class="login-subtitle">Sign in with your pCloud account</p>
        <div class="login-form">
          <input id="lg-email" type="email"     placeholder="pCloud email"  autocomplete="email" />
          <input id="lg-pass"  type="password"  placeholder="Password"      autocomplete="current-password" />
          <div id="lg-err" class="login-error" style="display:none"></div>
          <button id="lg-btn" class="btn-primary">Sign In</button>
        </div>
        <p class="login-hint">Credentials go directly to pCloud — never stored here.</p>
      </div>
    `

    const btn = document.getElementById('lg-btn')
    const email = document.getElementById('lg-email')
    const pass = document.getElementById('lg-pass')
    const err = document.getElementById('lg-err')

    async function doLogin() {
        if (!email.value || !pass.value) return
        btn.disabled = true; btn.textContent = 'Signing in…'; err.style.display = 'none'
        try {
            await loginWithCredentials(email.value.trim(), pass.value)
            window.location.reload()
        } catch (e) {
            err.textContent = '❌ ' + e.message; err.style.display = 'block'
            btn.disabled = false; btn.textContent = 'Sign In'
        }
    }
    btn.onclick = doLogin
    pass.onkeydown = e => { if (e.key === 'Enter') doLogin() }
}

// ── Header ─────────────────────────────────────────────────────────────────────
function renderConnectedUI() {
    const gConnected = !!getGDriveToken()
    authArea.innerHTML = `
      <div class="user-badge">
        <span>🔒 pCloud</span>
        ${gConnected
            ? `<span class="gdrive-connected-pill" title="Persistent Lifetime Login Active">✅ GDrive (Lifetime)</span>
               <button id="sync-gdrive-btn" class="btn-ghost btn-sm" title="Refresh GDrive file index">↻ Sync</button>`
            : `<button id="connect-gdrive-btn" class="btn-ghost btn-sm">🔗 Connect GDrive</button>`
        }
        <button id="logout-btn" class="btn-ghost btn-sm">Logout</button>
      </div>
    `
    document.getElementById('logout-btn').onclick = () => { clearToken(); window.location.reload() }
    if (gConnected) {
        document.getElementById('sync-gdrive-btn').onclick = () => refreshGDriveIndex()
    } else {
        const cBtn = document.getElementById('connect-gdrive-btn')
        if (cBtn) cBtn.onclick = () => handleConnectGDrive()
    }
}

// ── GDrive Connect / Index ────────────────────────────────────────────────────
async function handleConnectGDrive() {
    const btn = document.getElementById('connect-gdrive-btn')
    if (!btn) return
    btn.disabled = true; btn.textContent = 'Connecting…'
    try {
        await connectGDrive()
        await refreshGDriveIndex()
    } catch (e) {
        btn.disabled = false; btn.textContent = '🔗 Connect GDrive'
        showBanner(`GDrive error: ${e.message}`, true)
    }
}

async function refreshGDriveIndex() {
    showBanner('Building GDrive index… 0 files', false)
    try {
        state.gdriveIndex = await buildGDriveIndex(count => {
            showBanner(`Building GDrive index… ${count} files`, false)
        })
        showBanner(`✅ GDrive index ready — ${state.gdriveIndex.size} files`, false)
        setTimeout(() => hideBanner(), 3000)
        renderConnectedUI()
        // If we're in duplicate view, refresh it
        if (state.currentView === 'duplicates') {
            await loadVirtualView('duplicates')
        } else {
            renderGrid(await listFolder(state.currentFolderId))
        }
    } catch (e) {
        showBanner(`GDrive error: ${e.message}`, true)
        clearGDriveToken()
    }
}

// ── Folder Loading ─────────────────────────────────────────────────────────────
async function loadFolder(folderId, name) {
    showLoader(true)
    try {
        const items = await listFolder(folderId)
        state.currentFolderId = folderId
        state.folderName = name
        renderBreadcrumb()
        renderGrid(items)
    } catch (e) {
        console.error('[everyDrive]', e)
        showFolderError(e.message)
    } finally {
        showLoader(false)
    }
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function renderBreadcrumb() {
    if (!breadcrumb) return
    const trail = [{ id: 0, name: 'My Drive' }, ...state.history]
    const back = state.history.length > 0 ? `<button class="btn-back" id="back-btn">← Back</button>` : ''

    breadcrumb.innerHTML = back + trail.map((item, i) => `
      <span class="breadcrumb-item ${i === trail.length - 1 ? 'active' : ''}"
            data-id="${item.id}" data-name="${item.name}">${item.name}</span>
      ${i < trail.length - 1 ? '<span class="breadcrumb-sep">/</span>' : ''}
    `).join('')

    if (state.history.length > 0) {
        const bBtn = document.getElementById('back-btn')
        if (bBtn) bBtn.onclick = () => {
            state.history.pop()
            const prev = state.history.pop() || { id: 0, name: 'My Drive' }
            window.location.hash = prev.id === 0 ? 'folders' : `folder/${prev.id}/${encodeURIComponent(prev.name)}`
        }
    }

    breadcrumb.querySelectorAll('.breadcrumb-item:not(.active)').forEach(el => {
        el.onclick = () => {
            const targetId = Number(el.dataset.id)
            if (targetId === 0) {
                window.location.hash = 'folders'
            } else {
                window.location.hash = `folder/${targetId}/${encodeURIComponent(el.dataset.name)}`
            }
        }
    })
}

// ── Grid / Cards ───────────────────────────────────────────────────────────────
function renderGrid(items) {
    gallery.className = 'grid-container'
    gallery.innerHTML = ''
    if (!items || items.length === 0) {
        gallery.innerHTML = '<p class="empty-msg">No files found.</p>'
        return
    }

    // Apply source filter (folders always pass through so navigation isn't broken)
    let filtered = items
    if (state.sourceFilter !== 'all') {
        filtered = items.filter(item => {
            if (item.isfolder) return true // always show folders
            const inGDrive = isInGDrive(item.name, state.gdriveIndex)
            if (state.sourceFilter === 'gdrive') return inGDrive
            if (state.sourceFilter === 'pcloud') return !inGDrive
            return true
        })
    }

    if (filtered.length === 0) {
        const filterLabel = state.sourceFilter === 'gdrive' ? 'Google Drive' : 'pCloud'
        gallery.innerHTML = `<p class="empty-msg">No files found exclusively in ${filterLabel}.<br><small>Connect GDrive or check your index.</small></p>`
        return
    }

    const sorted = [...filtered].sort((a, b) => {
        if (a.isfolder !== b.isfolder) return a.isfolder ? -1 : 1
        return a.name.localeCompare(b.name)
    })
    sorted.forEach(item => gallery.appendChild(makeCard(item)))
}

function makeCard(item) {
    const card = document.createElement('div')
    const inner = document.createElement('div')
    card.className = `media-card ${item.isfolder ? 'folder-card' : 'file-card'}`
    inner.className = 'card-inner'
    card.appendChild(inner)

    const inGDrive = !item.isfolder && isInGDrive(item.name, state.gdriveIndex)

    if (item.isfolder) {
        inner.innerHTML = `<div class="card-icon">📁</div><div class="card-label">${item.name}</div>`
        card.onclick = () => {
            state.history.push({ id: state.currentFolderId, name: state.folderName })
            window.location.hash = `folder/${item.folderid || item.id}/${encodeURIComponent(item.name)}`
        }
    } else if (isImage(item.name)) {
        inner.innerHTML = `
          <img src="${getThumbUrl(item.fileid || item.id, '400x400')}" alt="${item.name}" loading="lazy" />
          <div class="card-overlay"><span class="card-filename">${item.name}</span></div>
          ${inGDrive ? '<span class="gdrive-badge" title="Also in Google Drive">GDrive ✅</span>' : ''}
        `
        card.onclick = () => openInTab(item)
    } else if (isVideo(item.name)) {
        inner.innerHTML = `
          <div class="card-icon vid">🎬</div>
          <div class="card-label">${item.name}</div>
          <div style="position:absolute;top:10px;right:10px;font-size:1rem">▶️</div>
          ${inGDrive ? '<span class="gdrive-badge" title="Also in Google Drive">GDrive ✅</span>' : ''}
        `
        card.onclick = () => openInTab(item)
    } else if (isAudio(item.name)) {
        inner.innerHTML = `
          <div class="card-icon aud">🎵</div>
          <div class="card-label">${item.name}</div>
          <div style="position:absolute;top:10px;right:10px;font-size:1rem">▶️</div>
          ${inGDrive ? '<span class="gdrive-badge" title="Also in Google Drive">GDrive ✅</span>' : ''}
        `
        card.onclick = () => openInTab(item)
    } else {
        inner.innerHTML = `
          <div class="card-icon">📄</div>
          <div class="card-label">${item.name}</div>
          ${inGDrive ? '<span class="gdrive-badge" title="Also in Google Drive">GDrive ✅</span>' : ''}
        `
        card.onclick = () => openInTab(item)
    }
    return card
}

// ── Open file via smart routing ───────────────────────────────────────────────
// Priority: GDrive stream (if available) → pCloud /api/filelink redirect
function openInTab(item) {
    const id = item.fileid || item.id
    const gdriveId = getGDriveFileId(item.name, state.gdriveIndex)
    const streamUrl = gdriveId ? getGDriveStreamUrl(gdriveId) : null
    const url = streamUrl ? streamUrl : isVideo(item.name) ? getVideoLink(id) : getFileLink(id)

    // Use a hidden anchor tag instead of window.open for better popup blocker bypass
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    if (streamUrl) {
        console.log(`[everyDrive] Streaming "${item.name}" from GDrive ✅`)
    } else {
        console.log(`[everyDrive] Opening "${item.name}" via pCloud redirect`)
    }
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
async function openLightbox(item, type) {
    showLoader(true)
    try {
        const id = item.fileid || item.id
        const url = type === 'video' ? await getVideoLink(id) : await getFileLink(id)
        const lb = document.createElement('div')
        lb.className = 'lightbox'
        const closeBtn = document.createElement('button'); closeBtn.className = 'lightbox-close'; closeBtn.innerHTML = '&#x2715;'; closeBtn.onclick = () => lb.remove()
        const caption = document.createElement('div'); caption.className = 'lightbox-caption'; caption.textContent = item.name
        let media
        if (type === 'video') {
            media = document.createElement('video');
            media.src = url;
            media.controls = true;
            media.autoplay = true;
            media.playsInline = true;
            media.referrerPolicy = 'no-referrer';
        } else if (type === 'audio') {
            media = document.createElement('div');
            media.className = 'audio-player-container';
            media.innerHTML = `
                <div class="audio-icon-large">🎵</div>
                <audio src="${url}" controls autoplay referrerpolicy="no-referrer"></audio>
            `;
        } else {
            media = document.createElement('img');
            media.src = url;
            media.alt = item.name;
            media.referrerPolicy = 'no-referrer';
        }
        media.className = media.className || 'lightbox-media'
        lb.append(closeBtn, media, caption); document.body.appendChild(lb)
        lb.onclick = e => { if (e.target === lb) lb.remove() }
        window.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { lb.remove(); window.removeEventListener('keydown', esc) } })
    } catch (e) {
        showFolderError('Could not open media: ' + e.message)
    } finally {
        showLoader(false)
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isImage(n) { return /\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff|svg)$/i.test(n) }
function isVideo(n) { return /\.(mp4|mov|webm|mkv|m4v|avi|flv|wmv|mpg|mpeg)$/i.test(n) }
function isAudio(n) { return /\.(mp3|wav|aac|ogg|m4a|flac)$/i.test(n) }
function showLoader(v) { loader.classList.toggle('hidden', !v) }
let bannerEl = null
function showBanner(msg, isError = false) {
    if (!bannerEl) { bannerEl = document.createElement('div'); bannerEl.id = 'info-banner'; document.body.appendChild(bannerEl) }
    bannerEl.textContent = msg; bannerEl.className = isError ? 'banner banner-error' : 'banner banner-info'; bannerEl.style.display = 'block'
}
function hideBanner() { if (bannerEl) bannerEl.style.display = 'none' }
function showFolderError(msg) {
    gallery.className = ''; gallery.innerHTML = `
      <div class="error-msg">
        <p>⚠️ ${msg}</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:20px">
          <button id="err-retry" class="btn-primary">Try Again</button>
          <button id="err-relogin" class="btn-ghost">Re-login</button>
        </div>
      </div>
    `
    document.getElementById('err-retry').onclick = () => {
        if (state.currentView === 'folders') loadFolder(state.currentFolderId, state.folderName)
        else loadVirtualView(state.currentView)
    }
    document.getElementById('err-relogin').onclick = () => { clearToken(); window.location.reload() }
}

// ── Locker Logic ──────────────────────────────────────────────────────────────
function showLocker(v) {
    const el = document.getElementById('locker')
    if (!el) return
    el.classList.toggle('hidden', !v)
    if (v) {
        const input = document.getElementById('passcode-input')
        const btn = document.getElementById('unlock-btn')
        const err = document.getElementById('locker-error')

        const attempt = () => {
            if (input.value === APP_PASSCODE) {
                savePasscode(input.value)
                window.location.reload()
            } else {
                err.classList.remove('hidden')
                input.value = ''
                input.focus()
            }
        }

        btn.onclick = attempt
        input.onkeydown = e => { if (e.key === 'Enter') attempt() }
        input.focus()
    }
}

// ── Start ──────────────────────────────────────────────────────────────────────
init()
