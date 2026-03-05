/**
 * Vercel Serverless Function: /api/filelink
 * 
 * Pure server-side proxy to pCloud's getfilelink + getvideolink.
 * Called with ?fileid=XXX&auth=TOKEN&region=us|eu&type=file|video
 * 
 * Because this runs in Node.js on Vercel's servers, pCloud sees
 * a clean server-to-server request with no browser Origin header.
 */

const https = require('https')

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try { resolve(JSON.parse(data)) }
                catch (e) { reject(new Error('Failed to parse pCloud response')) }
            })
        }).on('error', reject)
    })
}

module.exports = async function handler(req, res) {
    // Allow CORS from our own domain
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    const { fileid, auth, region, type } = req.method === 'POST'
        ? await parseBody(req)
        : req.query

    if (!fileid || !auth) {
        return res.status(400).json({ error: 'Missing fileid or auth' })
    }

    const apiBase = region === 'eu'
        ? 'https://eapi.pcloud.com'
        : 'https://api.pcloud.com'

    const endpoint = type === 'video' ? 'getvideolink' : 'getfilelink'
    const extra = type === 'video' ? '&streaming=1' : ''
    const url = `${apiBase}/${endpoint}?fileid=${fileid}&auth=${auth}${extra}`

    try {
        const data = await httpsGet(url)

        if (data.result !== 0) {
            return res.status(200).json({ error: data.error, result: data.result })
        }

        const fileUrl = `https://${data.hosts[0]}${data.path}`
        return res.status(200).json({ url: fileUrl })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', () => {
            try {
                resolve(Object.fromEntries(new URLSearchParams(body)))
            } catch {
                resolve({})
            }
        })
    })
}
