/**
 * Vercel Serverless Function: /api/filelink
 *
 * Calls pCloud getfilelink/getvideolink from Node.js (server-to-server).
 * Then issues a 302 redirect to the CDN URL so the browser navigates
 * directly to the file — zero browser Origin/Referer headers touch pCloud.
 */

const https = require('https')

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try { resolve(JSON.parse(data)) }
                catch (e) { reject(new Error('Failed to parse pCloud response: ' + data.slice(0, 200))) }
            })
        }).on('error', reject)
    })
}

module.exports = async function handler(req, res) {
    const { fileid, auth, region, type, passcode } = req.query

    // ── Security Check ────────────────────────────────────────────────────────
    const expectedPasscode = process.env.VITE_APP_PASSCODE || ''
    if (expectedPasscode && passcode !== expectedPasscode) {
        console.error(`[filelink] Unauthorized access attempt with passcode: ${passcode}`)
        return res.status(401).send('Unauthorized: Invalid Passcode')
    }

    if (!fileid || !auth) {
        return res.status(400).send('Missing fileid or auth')
    }

    const apiBase = region === 'eu'
        ? 'https://eapi.pcloud.com'
        : 'https://api.pcloud.com'

    const endpoint = type === 'video' ? 'getvideolink' : 'getfilelink'
    const extra = type === 'video' ? '&streaming=1' : ''
    const url = `${apiBase}/${endpoint}?fileid=${fileid}&auth=${encodeURIComponent(auth)}${extra}`

    console.log(`[filelink] calling: ${apiBase}/${endpoint}?fileid=${fileid}&region=${region}`)

    try {
        const data = await httpsGet(url)
        console.log(`[filelink] pCloud response result: ${data.result}`)

        if (data.result !== 0) {
            return res.status(502).send(`pCloud error ${data.result}: ${data.error}`)
        }

        const fileUrl = `https://${data.hosts[0]}${data.path}`
        console.log(`[filelink] redirecting to: ${fileUrl.split('?')[0]}`)

        // 302 redirect — browser follows it as a navigation, no Origin header sent
        res.setHeader('Location', fileUrl)
        res.setHeader('Cache-Control', 'no-store')
        return res.status(302).end()
    } catch (err) {
        console.error(`[filelink] error:`, err)
        return res.status(500).send(err.message)
    }
}
