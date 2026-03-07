import { useAuthStore } from '../store';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export const useGDrive = () => {
    const { gdriveToken, setGDriveTokens, isGDriveTokenExpired, passcode } = useAuthStore();

    const connect = () => {
        return new Promise((resolve, reject) => {
            if (!CLIENT_ID) return reject(new Error('VITE_GOOGLE_CLIENT_ID is missing'));

            const handleResponse = async (resp) => {
                if (resp.code) {
                    try {
                        const res = await fetch(`/api/auth-google?code=${resp.code}&passcode=${encodeURIComponent(passcode || '')}`);
                        const data = await res.json();
                        if (data.error) throw new Error(data.error_description || data.error);
                        setGDriveTokens(data);
                        resolve(data.access_token);
                    } catch (e) { reject(e); }
                } else { reject(new Error('No auth code')); }
            };

            const initClient = () => {
                const client = window.google.accounts.oauth2.initCodeClient({
                    client_id: CLIENT_ID,
                    scope: SCOPE,
                    ux_mode: 'popup',
                    callback: handleResponse,
                });
                client.requestCode();
            };

            if (window.google?.accounts?.oauth2) {
                initClient();
            } else {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = initClient;
                document.head.appendChild(script);
            }
        });
    };

    const fetchFiles = async (onProgress) => {
        let pageToken = null;
        const nameToId = new Map();

        do {
            const params = new URLSearchParams({
                pageSize: 1000,
                fields: 'nextPageToken,files(id,name)',
                q: 'trashed=false',
            });
            if (pageToken) params.set('pageToken', pageToken);

            const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
                headers: { Authorization: `Bearer ${gdriveToken}` }
            });

            if (!res.ok) throw new Error(`GDrive API error: ${res.status}`);

            const data = await res.json();
            data.files.forEach(f => nameToId.set(f.name.toLowerCase(), f.id));
            pageToken = data.nextPageToken;
            onProgress?.(nameToId.size);
        } while (pageToken);

        return nameToId;
    };

    return { connect, fetchFiles, isExpired: isGDriveTokenExpired() };
};
