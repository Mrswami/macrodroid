/**
 * Vercel Serverless Function: /api/auth-google
 * 
 * Handles Google OAuth 2.0 Authorization Code exchange and Refresh Token flow.
 * Keeps the Client Secret safe on the server.
 */

module.exports = async function handler(req, res) {
    const { code, refresh_token, passcode } = req.query;

    // ── Security Check ────────────────────────────────────────────────────────
    const expectedPasscode = process.env.VITE_APP_PASSCODE || '';
    if (expectedPasscode && passcode !== expectedPasscode) {
        console.error(`[auth-google] Unauthorized access attempt: ${passcode}`);
        return res.status(401).json({ error: 'unauthorized', message: 'Invalid Passcode' });
    }

    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        const missing = [];
        if (!clientId) missing.push('VITE_GOOGLE_CLIENT_ID');
        if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
        return res.status(500).json({
            error: 'server_config_error',
            error_description: `Missing environment variables on Vercel: ${missing.join(', ')}`
        });
    }

    const body = new URLSearchParams();
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);

    if (code) {
        body.append('code', code);
        body.append('grant_type', 'authorization_code');
        body.append('redirect_uri', 'postmessage');
    } else if (refresh_token) {
        body.append('refresh_token', refresh_token);
        body.append('grant_type', 'refresh_token');
    } else {
        return res.status(400).json({ error: 'invalid_request', message: 'Missing "code" or "refresh_token"' });
    }

    try {
        console.log(`[auth-google] exchanging ${body.get('grant_type')}...`);

        // Using native fetch (Node 18+) for better reliability on Vercel
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[auth-google] Google error response:', data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('[auth-google] critical server error:', err);
        return res.status(500).json({
            error: 'internal_server_error',
            message: err.message
        });
    }
};
