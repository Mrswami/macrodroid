import './style.css'

// Configuration
const PCLOUD_API = 'https://api.pcloud.com'
const REDIRECT_URI = window.location.origin
const CLIENT_ID = 'YOUR_CLIENT_ID' // User will need to provide this or we use a generic flow

// State
let state = {
    token: localStorage.getItem('pcloud_token') || null,
    currentFolderId: 0,
    history: [0],
    files: []
}

// UI Elements
const gallery = document.getElementById('gallery')
const loader = document.getElementById('loader')
const authStatus = document.getElementById('auth-status')

// Initialize
async function init() {
    if (!state.token) {
        showLogin()
    } else {
        showAuthStatus(true)
        loadFolder(state.currentFolderId)
    }
}

function showLogin() {
    gallery.innerHTML = `
    <div class="login-prompt">
      <h2>Welcome to pGallery</h2>
      <p>Please connect your pCloud account to browse your media.</p>
      <button id="login-btn" class="btn-primary">Connect pCloud</button>
    </div>
  `
    document.getElementById('login-btn').addEventListener('click', login)
}

function login() {
    // Simple check for now - in a real app, we'd redirect to pCloud OAuth
    const token = prompt('Please enter your pCloud Access Token (Temporary manual step):')
    if (token) {
        localStorage.setItem('pcloud_token', token)
        state.token = token
        init()
    }
}

function showAuthStatus(loggedIn) {
    authStatus.innerHTML = loggedIn
        ? `<button id="logout-btn">Logout</button>`
        : ''
    if (loggedIn) {
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('pcloud_token')
            window.location.reload()
        })
    }
}

async function loadFolder(folderId) {
    toggleLoader(true)
    try {
        const response = await fetch(`${PCLOUD_API}/listfolder?folderid=${folderId}&access_token=${state.token}`)
        const data = await response.json()

        if (data.result === 0) {
            state.files = data.metadata.contents
            renderGallery()
        } else {
            console.error('Error loading folder:', data.error)
            alert('Error loading folder. Please check your token.')
        }
    } catch (err) {
        console.error('Fetch error:', err)
    } finally {
        toggleLoader(false)
    }
}

function renderGallery() {
    gallery.innerHTML = ''

    // Add Back button if not at root
    if (state.currentFolderId !== 0) {
        const backBtn = document.createElement('div')
        backBtn.className = 'media-card folder-card'
        backBtn.innerHTML = '<span>.. Back</span>'
        backBtn.onclick = goBack
        gallery.appendChild(backBtn)
    }

    state.files.forEach(item => {
        const card = document.createElement('div')
        card.className = `media-card ${item.isfolder ? 'folder-card' : 'file-card'}`

        if (item.isfolder) {
            card.innerHTML = `
        <div class="folder-icon" style="font-size: 2rem;">📁</div>
        <span>${item.name}</span>
      `
            card.onclick = () => {
                state.history.push(state.currentFolderId)
                state.currentFolderId = item.folderid
                loadFolder(item.folderid)
            }
        } else if (isImage(item.name)) {
            card.innerHTML = `
        <img src="${PCLOUD_API}/getthumb?fileid=${item.fileid}&size=400x400&access_token=${state.token}" alt="${item.name}" loading="lazy">
        <div class="type-icon">🖼️</div>
      `
            card.onclick = () => openMedia(item)
        } else if (isVideo(item.name)) {
            card.innerHTML = `
        <div class="vid-placeholder">
          <div style="font-size: 2rem;">🎬</div>
          <span style="font-size: 0.7rem; padding: 4px; text-align: center;">${item.name}</span>
        </div>
        <div class="type-icon">▶️</div>
      `
            card.onclick = () => openMedia(item)
        }

        gallery.appendChild(card)
    })
}

function goBack() {
    if (state.history.length > 0) {
        state.currentFolderId = state.history.pop()
        loadFolder(state.currentFolderId)
    }
}

function isImage(name) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(name)
}

function isVideo(name) {
    return /\.(mp4|mov|webm)$/i.test(name)
}

async function openMedia(item) {
    toggleLoader(true)
    try {
        const type = isVideo(item.name) ? 'getvideolink' : 'getfilelink'
        const res = await fetch(`${PCLOUD_API}/${type}?fileid=${item.fileid}&access_token=${state.token}`)
        const data = await res.json()

        if (data.result === 0) {
            const url = `https://${data.hosts[0]}${data.path}`
            window.open(url, '_blank') // Simple for now
        }
    } catch (err) {
        console.error('Error opening media:', err)
    } finally {
        toggleLoader(false)
    }
}

function toggleLoader(show) {
    loader.classList.toggle('hidden', !show)
}

init()

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
    })
}
