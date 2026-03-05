import './style.css'
import {
    getToken, saveToken, clearToken,
    loginWithCredentials,
    listFolder, getFileLink, getVideoLink, getThumbUrl
} from './pcloud.js'

// ── State ──────────────────────────────────────────────────────────────────────
let state = {
    currentFolderId: 0,
    folderName: 'My Drive',
    history: [],
    files: []
}

// ── DOM Refs ───────────────────────────────────────────────────────────────────
const gallery = document.getElementById('gallery')
const loader = document.getElementById('loader')
const authStatus = document.getElementById('auth-status')
const breadcrumb = document.getElementById('breadcrumb')

// ── Bootstrap ──────────────────────────────────────────────────────────────────
async function init() {
    if (!getToken()) {
        renderLoginPage()
    } else {
        renderHeader()
        await loadFolder(0, 'My Drive')
    }
}

// ── Login Page ─────────────────────────────────────────────────────────────────
function renderLoginPage() {
    gallery.classList.remove('grid-container') // Prevent grid from crushing the login card
    gallery.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">p<span>Gallery</span></div>
        <p class="login-subtitle">Sign in with your pCloud account</p>
        <div class="login-form">
          <input id="login-email" type="email" placeholder="pCloud email" autocomplete="email" />
          <input id="login-pass" type="password" placeholder="pCloud password" autocomplete="current-password" />
          <p id="login-error" class="login-error hidden"></p>
          <button id="login-btn" class="btn-primary">Sign In</button>
        </div>
        <p class="login-hint">Your credentials are sent only to pCloud&rsquo;s servers and are never stored by this app.</p>
      </div>
    </div>
  `

    const btn = document.getElementById('login-btn')
    const emailEl = document.getElementById('login-email')
    const passEl = document.getElementById('login-pass')
    const errorEl = document.getElementById('login-error')

    async function doLogin() {
        const email = emailEl.value.trim()
        const pass = passEl.value
        if (!email || !pass) return

        btn.disabled = true
        btn.textContent = 'Signing in\u2026'
        errorEl.classList.add('hidden')

        try {
            await loginWithCredentials(email, pass) // saves token + region internally
            window.location.reload()
        } catch (err) {
            errorEl.textContent = '\u274c ' + err.message
            errorEl.classList.remove('hidden')
            errorEl.style.cssText = 'color:#f87171;padding:12px;background:rgba(248,113,113,0.1);border-radius:8px;margin-bottom:8px;display:block;'
            btn.disabled = false
            btn.textContent = 'Sign In'
        }
    }

    btn.addEventListener('click', doLogin)
    passEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })
}

// ── Header ─────────────────────────────────────────────────────────────────────
function renderHeader() {
    authStatus.innerHTML = `
    <div class="user-badge">
      <span>&#128274; Connected</span>
      <button id="logout-btn" class="btn-ghost">Logout</button>
    </div>
  `
    document.getElementById('logout-btn').addEventListener('click', () => {
        clearToken()
        window.location.reload()
    })
}

// ── Folder Navigation ──────────────────────────────────────────────────────────
async function loadFolder(folderId, name = 'Folder') {
    toggleLoader(true)
    dbg(`loadFolder called: id=${folderId} token=${getToken()?.slice(0, 12)}... api=${getApiBase()}`)
    try {
        state.files = await listFolder(folderId)
        state.currentFolderId = folderId
        state.folderName = name
        renderBreadcrumb()
        renderGallery()
    } catch (err) {
        dbg(`ERROR: ${err.message}`, true)
        const isExpired = err.message.includes('session expiry') || err.message.includes('Not authenticated')
        if (isExpired) {
            clearToken()
            window.location.reload()
        } else {
            showError(err.message)
        }
    } finally {
        toggleLoader(false)
    }
}

function renderBreadcrumb() {
    if (!breadcrumb) return
    const trail = [{ id: 0, name: 'My Drive' }, ...state.history]

    // BACK BUTTON
    const canGoBack = state.history.length > 0
    const backBtn = document.createElement('button')
    backBtn.className = `btn-back ${!canGoBack ? 'hidden' : ''}`
    backBtn.innerHTML = '&#8592; Back'
    backBtn.onclick = () => {
        const prev = state.history.pop()
        if (prev) loadFolder(prev.id, prev.name)
    }

    breadcrumb.innerHTML = ''
    breadcrumb.appendChild(backBtn)

    const trailList = document.createElement('div')
    trailList.className = 'breadcrumb-trail'
    trailList.innerHTML = trail.map((item, i) => `
    <span class="breadcrumb-item ${i === trail.length - 1 ? 'active' : ''}"
          data-id="${item.id}" data-name="${item.name}">
      ${item.name}
    </span>
    ${i < trail.length - 1 ? '<span class="breadcrumb-sep">/</span>' : ''}
  `).join('')
    breadcrumb.appendChild(trailList)

    trailList.querySelectorAll('.breadcrumb-item:not(.active)').forEach(el => {
        el.addEventListener('click', () => {
            const targetId = Number(el.dataset.id)
            const targetName = el.dataset.name
            const idx = state.history.findIndex(h => h.id === targetId)
            state.history = idx >= 0 ? state.history.slice(0, idx) : []
            loadFolder(targetId, targetName)
        })
    })
}

// ── Gallery Rendering ──────────────────────────────────────────────────────────
function renderGallery() {
    gallery.classList.add('grid-container') // Ensure grid is active for media
    gallery.innerHTML = ''

    if (state.files.length === 0) {
        gallery.innerHTML = '<p class="empty-msg">This folder is empty.</p>'
        return
    }

    const sorted = [...state.files].sort((a, b) => {
        if (a.isfolder !== b.isfolder) return a.isfolder ? -1 : 1
        return a.name.localeCompare(b.name)
    })

    sorted.forEach(item => gallery.appendChild(createCard(item)))
}

function createCard(item) {
    const card = document.createElement('div')
    card.className = `media-card ${item.isfolder ? 'folder-card' : 'file-card'}`

    const inner = document.createElement('div')
    inner.className = 'card-inner'
    card.appendChild(inner)

    if (item.isfolder) {
        inner.innerHTML = `
      <div class="card-icon">&#128193;</div>
      <div class="card-label">${item.name}</div>
    `
        card.onclick = () => {
            state.history.push({ id: state.currentFolderId, name: state.folderName })
            loadFolder(item.folderid, item.name)
        }
    } else if (isImage(item.name)) {
        inner.innerHTML = `
      <img src="${getThumbUrl(item.fileid, '400x400')}" alt="${item.name}" loading="lazy" />
      <div class="card-overlay"><span class="card-filename">${item.name}</span></div>
    `
        card.onclick = () => openLightbox(item, 'image')
    } else if (isVideo(item.name)) {
        inner.innerHTML = `
      <div class="card-icon vid">&#127916;</div>
      <div class="card-label">${item.name}</div>
      <div class="type-icon" style="position: absolute; top: 12px; right: 12px; font-size: 1.2rem;">▶️</div>
    `
        card.onclick = () => openLightbox(item, 'video')
    } else {
        inner.innerHTML = `
      <div class="card-icon">&#128196;</div>
      <div class="card-label">${item.name}</div>
    `
    }

    return card
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
async function openLightbox(item, type) {
    toggleLoader(true)
    try {
        const url = type === 'video' ? await getVideoLink(item.fileid) : await getFileLink(item.fileid)

        const lb = document.createElement('div')
        lb.className = 'lightbox'

        // Add a local loader for the media itself
        const innerLoader = document.createElement('div')
        innerLoader.className = 'loader'
        innerLoader.textContent = 'Streaming...'
        lb.appendChild(innerLoader)

        const closeBtn = document.createElement('button')
        closeBtn.className = 'lightbox-close'
        closeBtn.innerHTML = '&#x2715;'
        closeBtn.onclick = () => lb.remove()
        lb.appendChild(closeBtn)

        const caption = document.createElement('div')
        caption.className = 'lightbox-caption'
        caption.textContent = item.name
        lb.appendChild(caption)

        let mediaEl;
        if (type === 'video') {
            mediaEl = document.createElement('video')
            mediaEl.src = url
            mediaEl.controls = true
            mediaEl.autoplay = true
            mediaEl.playsInline = true
        } else {
            mediaEl = document.createElement('img')
            mediaEl.src = url
        }

        mediaEl.className = 'lightbox-media'
        mediaEl.onload = () => innerLoader.remove()
        mediaEl.onloadeddata = () => innerLoader.remove()

        lb.appendChild(mediaEl)
        document.body.appendChild(lb)

        lb.onclick = e => { if (e.target === lb) lb.remove() }

        // Escape key to close
        const escHandler = e => {
            if (e.key === 'Escape') {
                lb.remove()
                window.removeEventListener('keydown', escHandler)
            }
        }
        window.addEventListener('keydown', escHandler)
    } catch (err) {
        showError(`Could not open file: ${err.message}`)
    } finally {
        toggleLoader(false)
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isImage(name) { return /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(name) }
function isVideo(name) { return /\.(mp4|mov|webm|mkv|m4v)$/i.test(name) }
function toggleLoader(show) { loader.classList.toggle('hidden', !show) }
function showError(msg) {
    gallery.classList.remove('grid-container')
    gallery.innerHTML = `
    <div class="error-msg">
      <p>&#9888;&#65039; ${msg}</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
        <button id="error-retry" class="btn-primary">Try Again</button>
        <button id="error-relogin" class="btn-ghost">Log In Again</button>
      </div>
    </div>
  `
    document.getElementById('error-retry').onclick = () => loadFolder(state.currentFolderId, state.folderName)
    document.getElementById('error-relogin').onclick = () => { clearToken(); window.location.reload() }
}

// ── Debug Bar ─────────────────────────────────────────────────────────────────
function dbg(msg, isError = false) {
    console.log('[pGallery]', msg)
    let bar = document.getElementById('debug-bar')
    if (!bar) {
        bar = document.createElement('div')
        bar.id = 'debug-bar'
        bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#0f1;color:#000;padding:8px 12px;font:12px monospace;z-index:9999;max-height:80px;overflow:auto;'
        document.body.appendChild(bar)
    }
    bar.style.background = isError ? '#f44' : '#0f1'
    bar.style.color = isError ? '#fff' : '#000'
    bar.textContent = msg
}

// ── Start ──────────────────────────────────────────────────────────────────────
init()
