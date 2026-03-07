import { useAuthStore } from '../store';

const API_US = 'https://api.pcloud.com';
const API_EU = 'https://eapi.pcloud.com';
const PROXY_US = '/pcloud-us';
const PROXY_EU = '/pcloud-eu';

export const usePCloud = () => {
    const { pcloudToken, setPcloudToken, passcode } = useAuthStore();

    const getProxyBase = () => {
        const apiBase = localStorage.getItem('pcloud_api_base') || API_US;
        return apiBase.includes('eapi') ? PROXY_EU : PROXY_US;
    };

    const login = async (email, password) => {
        const makeParams = () => new URLSearchParams({
            username: email,
            password,
            getauth: 1,
            logout: 0,
        });

        try {
            let res = await fetch(`${API_US}/userinfo?${makeParams()}`);
            let data = await res.json();

            if (data.result === 4000 || data.locationid === 2) {
                res = await fetch(`${API_EU}/userinfo?${makeParams()}`);
                data = await res.json();
            }

            if (data.result !== 0) throw new Error(data.error || `Error ${data.result}`);

            const token = data.auth || data.token;
            setPcloudToken(token);
            localStorage.setItem('pcloud_api_base', data.locationid === 2 ? API_EU : API_US);
            return { token, email: data.email };
        } catch (e) {
            throw new Error(`Connection failed: ${e.message}`);
        }
    };

    const apiCall = async (endpoint, params = {}) => {
        if (!pcloudToken) throw new Error('Not authenticated');
        const proxyBase = getProxyBase();

        const formData = new FormData();
        formData.append('auth', pcloudToken);
        Object.entries(params).forEach(([k, v]) => formData.append(k, v));

        const res = await fetch(`${proxyBase}/${endpoint}`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (data.result !== 0) throw new Error(data.error || `API error ${data.result}`);
        return data;
    };

    const listFolder = async (folderId = 0) => {
        const data = await apiCall('listfolder', { folderid: folderId });
        return data.metadata.contents;
    };

    const getFileLink = (fileId, type = 'file') => {
        const region = (localStorage.getItem('pcloud_api_base') || '').includes('eapi') ? 'eu' : 'us';
        return `/api/filelink?fileid=${fileId}&auth=${encodeURIComponent(pcloudToken)}&region=${region}&type=${type}&passcode=${encodeURIComponent(passcode || '')}`;
    };

    return { login, listFolder, getFileLink };
};
