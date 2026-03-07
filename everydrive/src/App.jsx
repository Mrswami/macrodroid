import React, { useState, useEffect } from 'react';
import { useAuthStore, useCloudStore } from './store';
import { useUIStore } from './uiStore';
import { usePCloud } from './hooks/usePCloud';
import { useGDrive } from './hooks/useGDrive';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Grid from './components/Grid';
import Locker from './components/Locker';
import Login from './components/Login';

function App() {
    const { passcode, pcloudToken } = useAuthStore();
    const { view, currentFolderId, setFolder } = useUIStore();
    const { listFolder } = usePCloud();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load items when folder changes
    useEffect(() => {
        if (pcloudToken && view === 'folders') {
            const load = async () => {
                setLoading(true);
                try {
                    const contents = await listFolder(currentFolderId);
                    setItems(contents);
                } catch (e) {
                    console.error('Failed to load folder:', e);
                } finally {
                    setLoading(false);
                }
            };
            load();
        }
    }, [pcloudToken, currentFolderId, view]);

    if (!passcode) return <Locker />;
    if (!pcloudToken) return <Login />;

    return (
        <div className="flex h-screen bg-bg text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    <Grid items={items} />
                </main>
            </div>
        </div>
    );
}

export default App;
