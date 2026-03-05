import './style.css'
import {
    getToken, saveToken, clearToken,
    handleOAuthRedirect, redirectToOAuth,
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
    // Handle OAuth redirect first (URL has #access_token=…)
    const tokenFromOAuth = handleOAuthRedirect()
    if (tokenFromOAuth) saveToken(tokenFromOAuth)

    if (!getToken()) {
        renderLoginPage()
    } else {
        renderHeader()
        await loadFolder(0, 'My Drive')
    }
}

// ── Auth UI ────────────────────────────────────────────────────────────────────
function renderLoginPage() {
    gallery.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">p<span>Gallery</span></div>
        <p class="login-subtitle">Your premium pCloud media browser</p>
        <button id="login-btn" class="btn-primary">
          <span>🔐</span> Connect with pCloud
        </button>
        <p class="login-hint">
          Need a Client ID? <a href="https://docs.pcloud.com/my_apps/" target="_blank">Create one here →</a>
        </p>
      </div>
    </div>
  `
    document.getElementById('login-btn').addEventListener('click', redirectToOAuth)
}

function renderHeader() {
    authStatus.innerHTML = `
    <div class="user-badge">
      <span>🔒 Connected</span>
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
    try {
        state.files = await listFolder(folderId)
        state.currentFolderId = folderId
        state.folderName = name
        renderBreadcrumb()
        renderGallery()
    } catch (err) {
        showError(err.message)
    } finally {
        toggleLoader(false)
    }
}

function renderBreadcrumb() {
    if (!breadcrumb) return
    const trail = [{ id: 0, name: 'My Drive' }, ...state.history]
    breadcrumb.innerHTML = trail
        .map((item, i) => `
      <span class="breadcrumb-item ${i === trail.length - 1 ? 'active' : ''}"
            data-id="${item.id}" data-name="${item.name}">
        ${item.name}
      </span>
      ${i < trail.length - 1 ? '<span class="breadcrumb-sep">/</span>' : ''}
    `).join('')

    breadcrumb.querySelectorAll('.breadcrumb-item:not(.active)').forEach(el => {
        el.addEventListener('click', () => {
            const targetId = Number(el.dataset.id)
            const targetName = el.dataset.name
            // Trim history back to this point
            const idx = state.history.findIndex(h => h.id === targetId)
            state.history = idx >= 0 ? state.history.slice(0, idx) : []
            loadFolder(targetId, targetName)
        })
    })
}

// ── Gallery Rendering ──────────────────────────────────────────────────────────
function renderGallery() {
    gallery.innerHTML = ''

    if (state.files.length === 0) {
        gallery.innerHTML = '<p class="empty-msg">This folder is empty.</p>'
        return
    }

    // Sort: folders first, then files alphabetically
    const sorted = [...state.files].sort((a, b) => {
        if (a.isfolder !== b.isfolder) return a.isfolder ? -1 : 1
        return a.name.localeCompare(b.name)
    })

    sorted.forEach(item => {
        const card = createCard(item)
        gallery.appendChild(card)
    })
}

function createCard(item) {
    const card = document.createElement('div')
    card.className = `media-card ${item.isfolder ? 'folder-card' : 'file-card'}`

    if (item.isfolder) {
        card.innerHTML = `
      <div class="card-icon">📁</div>
      <div class="card-label">${item.name}</div>
    `
        card.onclick = () => {
            state.history.push({ id: state.currentFolderId, name: state.folderName })
            loadFolder(item.folderid, item.name)
        }
    } else if (isImage(item.name)) {
        card.innerHTML = `
      <img src="${getThumbUrl(item.fileid, '400x400')}" alt="${item.name}" loading="lazy" />
      <div class="card-overlay"><span class="card-filename">${item.name}</span></div>
    `
        card.onclick = () => openLightbox(item, 'image')
    } else if (isVideo(item.name)) {
        card.innerHTML = `
      <div class="card-icon vid">🎬</div>
      <div class="card-label">${item.name}</div>
    `
        card.onclick = () => openLightbox(item, 'video')
    } else {
        card.innerHTML = `
      <div class="card-icon">📄</div>
      <div class="card-label">${item.name}</div>
    `
    }

    return card
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
async function openLightbox(item, type) {
    toggleLoader(true)
    try {
        let url
        if (type === 'video') {
            url = await getVideoLink(item.fileid)
        } else {
            url = await getFileLink(item.fileid)
        }

        const lb = document.createElement('div')
        lb.className = 'lightbox'
        lb.innerHTML = type === 'video'
            ? `<video src="${url}" controls autoplay class="lightbox-media"></video>`
            : `<img src="${url}" alt="${item.name}" class="lightbox-media" />`

        lb.innerHTML += `
      <button class="lightbox-close" aria-label="Close">✕</button>
      <div class="lightbox-caption">${item.name}</div>
    `

        document.body.appendChild(lb)
        lb.querySelector('.lightbox-close').onclick = () => lb.remove()
        lb.onclick = (e) => { if (e.target === lb) lb.remove() }
    } catch (err) {
        showError(`Could not open file: ${err.message}`)
    } finally {
        toggleLoader(false)
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isImage(name) { return /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(name) }
function isVideo(name) { return /\.(mp4|mov|webm|mkv|m4v)$/i.test(name) }

function toggleLoader(show) {
    loader.classList.toggle('hidden', !show)
}

function showError(msg) {
    gallery.innerHTML = `<div class="error-msg">⚠️ ${msg}</div>`
}

// ── Start ──────────────────────────────────────────────────────────────────────
init()
