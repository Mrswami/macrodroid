import React from 'react';
import { useUIStore } from '../uiStore';
import { useAuthStore } from '../store';
import { ChevronRight, RefreshCw, Disc } from 'lucide-react';

const Header = () => {
    const { history, currentFolderId, folderName, setFolder, setView } = useUIStore();
    const { gdriveToken } = useAuthStore();

    return (
        <header className="h-16 border-b border-white/5 bg-bg/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <button
                    onClick={() => setView('folders')}
                    className="hover:text-white transition-colors"
                >
                    My Drive
                </button>
                {history.slice(-2).map((h, i) => (
                    <React.Fragment key={h.id}>
                        <ChevronRight size={14} className="opacity-40" />
                        <button
                            onClick={() => setFolder(h.id, h.name)}
                            className="hover:text-white transition-colors max-w-[100px] truncate"
                        >
                            {h.name}
                        </button>
                    </React.Fragment>
                ))}
                {currentFolderId !== 0 && (
                    <>
                        <ChevronRight size={14} className="opacity-40" />
                        <span className="text-white font-medium max-w-[150px] truncate">
                            {folderName}
                        </span>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${gdriveToken ? 'border-accent/30 bg-accent/10 text-accent' : 'border-white/10 text-slate-500'
                    }`}>
                    <Disc size={12} className={gdriveToken ? 'animate-pulse' : ''} />
                    {gdriveToken ? 'Lifetime GDrive' : 'GDrive Offline'}
                </div>

                <button className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">
                    <RefreshCw size={18} />
                </button>
            </div>
        </header>
    );
};

export default Header;
