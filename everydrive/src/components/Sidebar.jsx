import React from 'react';
import { useUIStore } from '../uiStore';
import { useAuthStore } from '../store';
import { Folder, Clock, Image, Video, Copy, Monitor, HardDrive } from 'lucide-react';

const Sidebar = () => {
    const { view, setView, sourceFilter, setSourceFilter } = useUIStore();
    const { clearAll } = useAuthStore();

    const navItems = [
        { id: 'folders', label: 'My Drive', icon: Folder },
        { id: 'recent', label: 'Recent', icon: Clock },
        { id: 'photos', label: 'Photos', icon: Image },
        { id: 'videos', label: 'Videos', icon: Video },
        { id: 'duplicates', label: 'Duplicates', icon: Copy },
    ];

    const sourceFilters = [
        { id: 'all', label: 'All Files', icon: Monitor, color: 'text-accent' },
        { id: 'pcloud', label: 'pCloud Only', icon: HardDrive, color: 'text-purple-400' },
        { id: 'gdrive', label: 'GDrive Only', icon: HardDrive, color: 'text-blue-400' },
    ];

    return (
        <aside className="w-64 glass flex flex-col h-full z-10">
            <div className="p-6 border-b border-white/5">
                <div className="text-2xl font-bold tracking-tight">
                    every<span className="text-accent">Drive</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`w-100 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${view === item.id
                                    ? 'bg-accent/10 text-accent'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="pt-6">
                    <div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-60">
                        Cloud Sources
                    </div>
                    <div className="space-y-1">
                        {sourceFilters.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setSourceFilter(filter.id)}
                                className={`w-100 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${sourceFilter === filter.id
                                        ? 'bg-white/5 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <filter.icon size={18} className={filter.color} />
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <div className="p-4 border-t border-white/5">
                <button
                    onClick={clearAll}
                    className="w-100 px-4 py-3 text-xs text-slate-500 hover:text-white transition-colors"
                >
                    Logout Cloud Services
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
