import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create()(
    persist(
        (set, get) => ({
            passcode: null,
            pcloudToken: null,
            gdriveToken: null,
            gdriveRefreshToken: null,
            gdriveTokenExpiry: null,

            setPasscode: (passcode) => set({ passcode }),
            setPcloudToken: (token) => set({ pcloudToken: token }),

            setGDriveTokens: (data) => set({
                gdriveToken: data.access_token,
                gdriveRefreshToken: data.refresh_token || get().gdriveRefreshToken,
                gdriveTokenExpiry: Date.now() + (data.expires_in * 1000)
            }),

            clearAll: () => set({
                pcloudToken: null,
                gdriveToken: null,
                gdriveRefreshToken: null,
                gdriveTokenExpiry: null
            }),

            isGDriveTokenExpired: () => {
                const { gdriveTokenExpiry } = get();
                if (!gdriveTokenExpiry) return true;
                return Date.now() > (gdriveTokenExpiry - 5 * 60 * 1000);
            }
        }),
        {
            name: 'everydrive-auth',
        }
    )
);

export const useCloudStore = create()(
    persist(
        (set) => ({
            gdriveIndex: null, // Map entries serialized as [name, id][]
            setGDriveIndex: (indexMap) => set({ gdriveIndex: Array.from(indexMap.entries()) }),
            clearIndex: () => set({ gdriveIndex: null })
        }),
        {
            name: 'everydrive-cloud',
        }
    )
);
