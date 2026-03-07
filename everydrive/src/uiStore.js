import { create } from 'zustand';

export const useUIStore = create((set) => ({
    view: 'folders', // 'folders', 'recent', 'photos', 'videos', 'duplicates'
    currentFolderId: 0,
    folderName: 'My Drive',
    history: [],
    sourceFilter: 'all', // 'all', 'pcloud', 'gdrive'
    isSearching: false,
    searchQuery: '',

    setView: (view) => set({ view, history: [], currentFolderId: 0, folderName: 'My Drive' }),
    setFolder: (id, name) => set((state) => ({
        currentFolderId: id,
        folderName: name,
        history: state.currentFolderId !== id ? [...state.history, { id: state.currentFolderId, name: state.folderName }] : state.history
    })),
    popHistory: () => set((state) => {
        if (state.history.length === 0) return state;
        const newHistory = [...state.history];
        const last = newHistory.pop();
        return { currentFolderId: last.id, folderName: last.name, history: newHistory };
    }),
    setSourceFilter: (filter) => set({ sourceFilter: filter }),
    setSearch: (query) => set({ searchQuery: query, isSearching: !!query })
}));
