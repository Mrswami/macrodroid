/**
 * Vercel Serverless Function: /api/auth-google
 *
 * Handles Google OAuth 2.0 Authorization Code exchange and Refresh Token flow.
 * Keeps the Client Secret safe on the server.
 */

const https = require('https');
const { URLSearchParams } = require('url');

function post(url, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Failed to parse Google response: ' + data));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

module.exports = async function handler(req, res) {
    const { code, refresh_token, passcode } = req.query;

    // ── Security Check ────────────────────────────────────────────────────────
    const expectedPasscode = process.env.VITE_APP_PASSCODE || '';
    if (expectedPasscode && passcode !== expectedPasscode) {
        console.error(`[auth-google] Unauthorized access attempt with passcode: ${passcode}`);
        return res.status(401).send('Unauthorized: Invalid Passcode');
    }

    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        let missing = [];
        if (!clientId) missing.push('VITE_GOOGLE_CLIENT_ID');
        if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
        console.error(`[auth-google] Missing credentials: ${missing.join(', ')}`);
        return res.status(500).json({
            error: 'server_config_error',
            error_description: `Missing environment variables on Vercel: ${missing.join(', ')}`
        });
    }

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    if (code) {
        // Exchange code for Refresh + Access Token
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        // 'postmessage' is the standard for Google Identity Services when handling the code in the client
        params.append('redirect_uri', 'postmessage');
    } else if (refresh_token) {
        // Refresh an existing Access Token
        params.append('refresh_token', refresh_token);
        params.append('grant_type', 'refresh_token');
    } else {
        return res.status(400).send('Missing "code" or "refresh_token" parameter');
    }

    try {
        console.log(`[auth-google] Requesting token from Google (grant_type: ${params.get('grant_type')})...`);
        const data = await post('https://oauth2.googleapis.com/token', params.toString());

        if (data.error) {
            console.error('[auth-google] Google error:', data.error, data.error_description);
            return res.status(400).json(data);
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('[auth-google] server error:', err);
        return res.status(500).send(err.message);
    }
};
