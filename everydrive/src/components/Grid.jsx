import React from 'react';
import { useUIStore } from '../uiStore';
import { useCloudStore } from '../store';
import { usePCloud } from '../hooks/usePCloud';
import { Folder, File as FileIcon, Play, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Grid = ({ items }) => {
    const { setFolder, sourceFilter } = useUIStore();
    const { gdriveIndex } = useCloudStore();
    const { getFileLink } = usePCloud();

    const handleItemClick = (item) => {
        if (item.isfolder) {
            setFolder(item.folderid, item.name);
        } else {
            const isVideo = item.contenttype?.startsWith('video/');
            const link = getFileLink(item.fileid, isVideo ? 'video' : 'file');
            window.open(link, '_blank');
        }
    };

    const getIcon = (item) => {
        if (item.isfolder) return <Folder size={32} className="text-accent" />;
        if (item.contenttype?.startsWith('video/')) return <Play size={28} className="text-purple-400" />;
        if (item.contenttype?.startsWith('image/')) return <ImageIcon size={28} className="text-blue-400" />;
        return <FileIcon size={28} className="text-slate-400" />;
    };

    const isInGDrive = (name) => {
        if (!gdriveIndex) return false;
        return gdriveIndex.some(([n]) => n === name.toLowerCase());
    };

    const filteredItems = items.filter(item => {
        if (item.isfolder) return true;
        const synced = isInGDrive(item.name);
        if (sourceFilter === 'gdrive') return synced;
        if (sourceFilter === 'pcloud') return !synced;
        return true;
    });

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                    <motion.div
                        key={item.isfolder ? `f-${item.folderid}` : `fi-${item.fileid}`}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => handleItemClick(item)}
                        className="group relative cursor-pointer"
                    >
                        <div className="card-glass rounded-2xl aspect-square flex flex-col items-center justify-center gap-3 p-4 group-hover:bg-white/5">
                            <div className="transform group-hover:scale-110 transition-transform duration-300">
                                {getIcon(item)}
                            </div>
                            <span className="w-full text-center text-xs font-medium truncate px-2 text-slate-300 group-hover:text-white">
                                {item.name}
                            </span>

                            {/* Source Badge */}
                            {!item.isfolder && isInGDrive(item.name) && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Grid;
