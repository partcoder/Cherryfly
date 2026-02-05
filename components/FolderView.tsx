import React, { useState } from 'react';
import { Movie } from '../types';
import { Folder, ChevronLeft, Sparkles, Plus, Image as ImageIcon, Film, BookOpen, Upload, MoreVertical } from 'lucide-react';
import CardOptions from './CardOptions';

interface FolderViewProps {
    groupedMovies: { [key: string]: Movie[] };
    onPlay: (movie: Movie) => void;
    onUploadToFolder: (folderName: string) => void;
    onEdit: (movie: Movie) => void;
    onDelete: (id: string) => void;
    onAddPhotos: (movie: Movie) => void;
}

const FolderView: React.FC<FolderViewProps> = ({ groupedMovies, onPlay, onUploadToFolder, onEdit, onDelete, onAddPhotos }) => {
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const folderKeys = Object.keys(groupedMovies);
    const customFolders = folderKeys.filter(key => groupedMovies[key][0].folderName);

    const smartFolders = folderKeys.filter(key => !groupedMovies[key][0].folderName).sort((a, b) => {
        const dateA = new Date(groupedMovies[a][0].createdAt).getTime();
        const dateB = new Date(groupedMovies[b][0].createdAt).getTime();
        return dateB - dateA;
    });

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            onUploadToFolder(newFolderName.trim());
            setNewFolderName('');
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCreateFolder();
        if (e.key === 'Escape') setIsCreating(false);
    };

    // Render contents of a single folder
    if (activeFolder) {
        const movies = groupedMovies[activeFolder];
        const isSmart = !movies[0].folderName;

        return (
            <div className="px-4 md:px-12 py-4 md:py-8 animate-fade-in min-h-[60vh]">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <button
                        onClick={() => setActiveFolder(null)}
                        className="flex items-center text-gray-400 hover:text-white transition group text-sm md:text-base"
                    >
                        <ChevronLeft className="mr-1 group-hover:-translate-x-1 transition" /> Back to Collections
                    </button>

                    {!isSmart && (
                        <button
                            onClick={() => onUploadToFolder(activeFolder)}
                            className="glass bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 border border-white/10 transition hover:scale-105"
                        >
                            <Upload size={14} className="md:w-4 md:h-4" />
                            Add
                        </button>
                    )}
                </div>

                <div className="flex items-end gap-3 md:gap-4 mb-6 md:mb-8">
                    {isSmart ? <Sparkles className="text-blue-400 mb-1 md:w-10 md:h-10 w-7 h-7" size={28} /> : <Folder className="text-red-600 mb-1 md:w-10 md:h-10 w-7 h-7" size={28} />}
                    <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-none">{activeFolder}</h2>
                    <span className="text-gray-500 mb-1 text-sm md:text-lg font-medium whitespace-nowrap">{movies.length} items</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {/* Add Card */}
                    {!isSmart && (
                        <div
                            onClick={() => onUploadToFolder(activeFolder)}
                            className="glass-card flex flex-col items-center justify-center aspect-[2/3] rounded-xl cursor-pointer hover:bg-white/10 transition-all border-dashed border-2 border-white/20 hover:border-white/50 group"
                        >
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition group-hover:bg-white/10">
                                <Plus size={24} className="text-gray-400 group-hover:text-white md:w-8 md:h-8" />
                            </div>
                            <p className="text-gray-400 text-xs md:text-sm font-medium group-hover:text-white">Add Memory</p>
                        </div>
                    )}

                    {movies.map((movie, idx) => (
                        <div
                            key={movie.id}
                            onClick={() => onPlay(movie)}
                            className="group relative cursor-pointer aspect-[2/3] rounded-xl overflow-hidden glass-card hover:scale-[1.03] transition-all duration-300 shadow-2xl animate-scale-in"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <img src={movie.thumbnailUrl} alt={movie.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition"></div>

                            <div className="absolute top-2 left-2 glass p-1 rounded-full z-10">
                                {movie.mediaType === 'COMIC' ? <BookOpen size={10} /> : movie.mediaType === 'PHOTO' ? <ImageIcon size={10} /> : <Film size={10} />}
                            </div>

                            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <CardOptions
                                    onEdit={() => onEdit(movie)}
                                    onDelete={() => onDelete(movie.id)}
                                    onAddPhotos={() => onAddPhotos(movie)}
                                    mediaType={movie.mediaType}
                                />
                            </div>

                            <div className="absolute bottom-0 left-0 w-full p-3 md:p-4 transform translate-y-1 group-hover:translate-y-0 transition">
                                <h3 className="text-white font-bold text-xs md:text-sm leading-tight mb-1 line-clamp-2">{movie.title}</h3>
                                <p className="text-gray-400 text-[10px] md:text-xs">{new Date(movie.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Render Grid of Folders
    return (
        <div className="px-4 md:px-12 py-4 md:py-8 animate-fade-in pb-32">

            {/* Custom Folders Section */}
            <div className="mb-8 md:mb-12">
                <h2 className="text-white text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 tracking-tight">
                    <Folder size={20} className="text-red-500 md:w-6 md:h-6" /> My Folders
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">

                    {/* Create New Folder Card */}
                    <div
                        onClick={() => setIsCreating(true)}
                        className="glass-card p-4 md:p-6 rounded-2xl cursor-pointer hover:bg-white/10 transition group flex flex-col items-center justify-center text-center h-40 md:h-48 border-dashed border-2 border-white/10 hover:border-white/30"
                    >
                        {isCreating ? (
                            <div className="w-full" onClick={(e) => e.stopPropagation()}>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Name..."
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-black/40 border border-white/20 rounded p-1.5 md:p-2 text-center text-white text-xs md:text-sm focus:border-red-500 outline-none mb-2"
                                />
                                <div className="flex gap-2 justify-center">
                                    <button onClick={handleCreateFolder} className="text-[10px] md:text-xs bg-red-600 px-2 py-1 md:px-3 rounded text-white font-bold hover:bg-red-700">Create</button>
                                    <button onClick={() => setIsCreating(false)} className="text-[10px] md:text-xs text-gray-400 hover:text-white">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-white/10 transition">
                                    <Plus className="w-6 h-6 md:w-8 md:h-8 text-gray-500 group-hover:text-white" />
                                </div>
                                <h3 className="text-gray-400 font-bold text-sm md:text-lg group-hover:text-white transition">Create Folder</h3>
                            </>
                        )}
                    </div>

                    {customFolders.map(key => (
                        <div
                            key={key}
                            onClick={() => setActiveFolder(key)}
                            className="glass-card p-4 md:p-6 rounded-2xl cursor-pointer hover:bg-white/10 transition group flex flex-col items-center justify-center text-center h-40 md:h-48 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-50">
                                <Folder className="w-16 h-16 md:w-24 md:h-24 text-white/5 rotate-12 transform translate-x-4 -translate-y-4" />
                            </div>

                            <Folder className="w-10 h-10 md:w-12 md:h-12 text-red-600 mb-3 md:mb-4 z-10 drop-shadow-lg group-hover:scale-110 transition" />
                            <h3 className="text-white font-bold text-sm md:text-lg z-10 truncate w-full px-2">{key}</h3>
                            <p className="text-gray-500 text-xs md:text-sm mt-1 z-10 font-medium">{groupedMovies[key].length} Items</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Smart Collections Section */}
            <div>
                <h2 className="text-white text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 tracking-tight">
                    <Sparkles size={20} className="text-blue-500 md:w-6 md:h-6" /> Smart Collections
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {smartFolders.map(key => (
                        <div
                            key={key}
                            onClick={() => setActiveFolder(key)}
                            className="glass-card p-4 md:p-6 rounded-2xl cursor-pointer hover:bg-white/10 transition group flex flex-col items-center justify-center text-center h-40 md:h-48 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-50">
                                <Sparkles className="w-16 h-16 md:w-24 md:h-24 text-white/5 rotate-12 transform translate-x-4 -translate-y-4" />
                            </div>

                            <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-blue-400 mb-3 md:mb-4 z-10 drop-shadow-lg group-hover:scale-110 transition" />
                            <h3 className="text-white font-bold text-sm md:text-lg z-10 leading-tight">{key}</h3>
                            <p className="text-gray-500 text-xs md:text-sm mt-1 z-10 font-medium">{groupedMovies[key].length} Memories</p>
                            <p className="text-[10px] md:text-xs text-gray-600 mt-1 z-10">{groupedMovies[key][0] ? new Date(groupedMovies[key][0].createdAt).getFullYear() : ''}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FolderView;