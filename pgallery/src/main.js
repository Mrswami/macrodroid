import './style.css'
import {
    getToken, clearToken,
    loginWithCredentials,
    listFolder, getFileLink, getVideoLink, getThumbUrl
} from './pcloud.js'

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
    currentFolderId: 0,
    folderName: 'My Drive',
    history: []
}

// ── DOM Refs ───────────────────────────────────────────────────────────────────
const gallery = document.getElementById('gallery')
const loader = document.getElementById('loader')
const authArea = document.getElementById('auth-status')
const breadcrumb = document.getElementById('breadcrumb')

// ── Bootstrap ──────────────────────────────────────────────────────────────────
async function init() {
    if (getToken()) {
        renderConnectedUI()
        await loadFolder(0, 'My Drive')
    } else {
        renderLoginPage()
    }
}

// ── Login ──────────────────────────────────────────────────────────────────────
function renderLoginPage() {
    gallery.className = 'login-wrapper'
    gallery.innerHTML = `
      <div class="login-card">
        <div class="login-logo">p<span>Gallery</span></div>
        <p class="login-subtitle">Sign in with your pCloud account</p>
        <div class="login-form">
          <input id="lg-email" type="email" placeholder="pCloud email" autocomplete="email" />
          <input id="lg-pass"  type="password" placeholder="Password"  autocomplete="current-password" />
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
        btn.disabled = true
        btn.textContent = 'Signing in…'
        err.style.display = 'none'

        try {
            await loginWithCredentials(email.value.trim(), pass.value)
            window.location.reload()
        } catch (e) {
            err.textContent = '❌ ' + e.message
            err.style.display = 'block'
            btn.disabled = false
            btn.textContent = 'Sign In'
        }
    }

    btn.onclick = doLogin
    pass.onkeydown = e => { if (e.key === 'Enter') doLogin() }
}

// ── Header (authenticated) ─────────────────────────────────────────────────────
function renderConnectedUI() {
    authArea.innerHTML = `
      <div class="user-badge">
        <span>🔒 Connected</span>
        <button id="logout-btn" class="btn-ghost">Logout</button>
      </div>
    `
    document.getElementById('logout-btn').onclick = () => {
        clearToken()
        window.location.reload()
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
        console.error('[pGallery] folder load error:', e)
        showFolderError(e.message)
    } finally {
        showLoader(false)
    }
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function renderBreadcrumb() {
    if (!breadcrumb) return
    const trail = [{ id: 0, name: 'My Drive' }, ...state.history]

    const back = state.history.length > 0
        ? `<button class="btn-back" id="back-btn">← Back</button>`
        : ''

    breadcrumb.innerHTML = back + trail.map((item, i) => `
      <span class="breadcrumb-item ${i === trail.length - 1 ? 'active' : ''}"
            data-id="${item.id}" data-name="${item.name}">${item.name}</span>
      ${i < trail.length - 1 ? '<span class="breadcrumb-sep">/</span>' : ''}
    `).join('')

    if (state.history.length > 0) {
        document.getElementById('back-btn').onclick = () => {
            const prev = state.history.pop()
            loadFolder(prev.id, prev.name)
        }
    }

    breadcrumb.querySelectorAll('.breadcrumb-item:not(.active)').forEach(el => {
        el.onclick = () => {
            const targetId = Number(el.dataset.id)
            const idx = state.history.findIndex(h => h.id === targetId)
            state.history = state.history.slice(0, idx >= 0 ? idx : 0)
            loadFolder(targetId, el.dataset.name)
        }
    })
}

// ── Grid / Cards ──────────────────────────────────────────────────────────────
function renderGrid(items) {
    gallery.className = 'grid-container'
    gallery.innerHTML = ''

    if (!items || items.length === 0) {
        gallery.innerHTML = '<p class="empty-msg">This folder is empty.</p>'
        return
    }

    const sorted = [...items].sort((a, b) => {
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

    if (item.isfolder) {
        inner.innerHTML = `<div class="card-icon">📁</div><div class="card-label">${item.name}</div>`
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
          <div class="card-icon vid">🎬</div>
          <div class="card-label">${item.name}</div>
          <div style="position:absolute;top:10px;right:10px;font-size:1rem">▶️</div>
        `
        card.onclick = () => openLightbox(item, 'video')
    } else {
        inner.innerHTML = `<div class="card-icon">📄</div><div class="card-label">${item.name}</div>`
    }

    return card
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
async function openLightbox(item, type) {
    showLoader(true)
    try {
        const url = type === 'video'
            ? await getVideoLink(item.fileid)
            : await getFileLink(item.fileid)

        const lb = document.createElement('div')
        lb.className = 'lightbox'

        const closeBtn = document.createElement('button')
        closeBtn.className = 'lightbox-close'
        closeBtn.innerHTML = '&#x2715;'
        closeBtn.onclick = () => lb.remove()

        const caption = document.createElement('div')
        caption.className = 'lightbox-caption'
        caption.textContent = item.name

        let media
        if (type === 'video') {
            media = document.createElement('video')
            media.src = url
            media.controls = true
            media.autoplay = true
            media.playsInline = true
        } else {
            media = document.createElement('img')
            media.src = url
            media.alt = item.name
        }
        media.className = 'lightbox-media'

        lb.appendChild(closeBtn)
        lb.appendChild(media)
        lb.appendChild(caption)
        document.body.appendChild(lb)

        lb.onclick = e => { if (e.target === lb) lb.remove() }
        window.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { lb.remove(); window.removeEventListener('keydown', esc) }
        })
    } catch (e) {
        showFolderError('Could not open file: ' + e.message)
    } finally {
        showLoader(false)
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isImage(n) { return /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(n) }
function isVideo(n) { return /\.(mp4|mov|webm|mkv|m4v)$/i.test(n) }
function showLoader(v) { loader.classList.toggle('hidden', !v) }

function showFolderError(msg) {
    gallery.className = ''
    gallery.innerHTML = `
      <div class="error-msg">
        <p>⚠️ ${msg}</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:20px">
          <button id="err-retry"   class="btn-primary">Try Again</button>
          <button id="err-relogin" class="btn-ghost">Re-login</button>
        </div>
      </div>
    `
    document.getElementById('err-retry').onclick = () => loadFolder(state.currentFolderId, state.folderName)
    document.getElementById('err-relogin').onclick = () => { clearToken(); window.location.reload() }
}

// ── Start ──────────────────────────────────────────────────────────────────────
init()
