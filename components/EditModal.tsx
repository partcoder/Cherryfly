
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Type, AlignLeft, Trash2, AlertTriangle, Folder, Search, ArrowLeft, ArrowRight, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { Movie } from '../types';

interface EditModalProps {
    movie: Movie;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Movie>) => void;
    onDelete: (id: string) => void;
    existingFolders: string[];
}

const EditModal: React.FC<EditModalProps> = ({ movie, isOpen, onClose, onSave, onDelete, existingFolders }) => {
    const [title, setTitle] = useState(movie.title);
    const [description, setDescription] = useState(movie.description);
    const [folderName, setFolderName] = useState(movie.folderName || '');
    const [searchContext, setSearchContext] = useState(movie.searchContext || '');
    const [date, setDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isRange, setIsRange] = useState(false);
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
    const [albumPhotos, setAlbumPhotos] = useState<string[]>([]);
    const [pendingThumbnailUrl, setPendingThumbnailUrl] = useState(movie.thumbnailUrl);
    const [deletingPhotoIndex, setDeletingPhotoIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [aiStatus, setAiStatus] = useState(movie.aiStatus);
    const [isFeatured, setIsFeatured] = useState(!!movie.isFeatured);

    useEffect(() => {
        if (isOpen) {
            setTitle(movie.title);
            setDescription(movie.description);
            setFolderName(movie.folderName || '');
            setSearchContext(movie.searchContext || '');
            const d = movie.createdAt ? new Date(movie.createdAt) : new Date();
            setDate(d.toISOString().split('T')[0]);

            if (movie.endDate) {
                setEndDate(new Date(movie.endDate).toISOString().split('T')[0]);
                setIsRange(true);
            } else {
                setEndDate('');
                setIsRange(false);
            }

            setIsDeleteConfirming(false);
            setAlbumPhotos(movie.comicPages || []);
            setPendingThumbnailUrl(movie.thumbnailUrl);
            setDeletingPhotoIndex(null);
            setIsSaving(false);
            setAiStatus(movie.aiStatus);
            setIsFeatured(!!movie.isFeatured);
        }
    }, [movie, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onSave(movie.id, {
                title,
                description,
                searchContext,
                folderName: folderName.trim() === '' ? undefined : folderName.trim(),
                createdAt: new Date(date).toISOString(),
                endDate: isRange && endDate ? new Date(endDate).toISOString() : undefined,
                comicPages: movie.mediaType === 'PHOTO' ? albumPhotos : movie.comicPages,
                thumbnailUrl: pendingThumbnailUrl,
                aiStatus,
                isFeatured
            });
            onClose();
        } catch (err: any) {
            console.error("Failed to save changes:", err);
            alert(`Failed to save changes: ${err.message || 'Unknown error'}`);
            setIsSaving(false);
        }
    };

    const handleMovePhoto = (index: number, direction: 'left' | 'right') => {
        setAlbumPhotos(prev => {
            const newPhotos = [...prev];
            const newIndex = direction === 'left' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= newPhotos.length) return prev;
            [newPhotos[index], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[index]];
            return newPhotos;
        });
    };

    const confirmDeletePhoto = (index: number) => {
        if (albumPhotos.length <= 1) {
            alert("An album must have at least one photo.");
            return;
        }
        setDeletingPhotoIndex(index);
    };

    const executeDeletePhoto = () => {
        if (deletingPhotoIndex !== null) {
            const photoToDelete = albumPhotos[deletingPhotoIndex];
            setAlbumPhotos(prev => {
                const filtered = prev.filter((_, i) => i !== deletingPhotoIndex);
                // If we deleted the current cover, fallback to first photo or original thumb
                if (photoToDelete === pendingThumbnailUrl) {
                    setPendingThumbnailUrl(filtered[0] || movie.thumbnailUrl);
                }
                return filtered;
            });
            setDeletingPhotoIndex(null);
        }
    };

    const handleSetCover = (url: string) => {
        setPendingThumbnailUrl(url);
    };

    const handleDeleteClick = () => {
        if (isDeleteConfirming) {
            onDelete(movie.id);
            onClose();
        } else {
            setIsDeleteConfirming(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-card w-full md:max-w-lg rounded-lg shadow-2xl border border-white/10 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar bg-[#181818]">

                <div className="flex justify-between items-center p-4 border-b border-white/10 sticky top-0 bg-[#181818]/95 backdrop-blur z-20">
                    <h2 className="text-white font-bold text-lg">Edit Details</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                    <div>
                        <label className="flex items-center text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
                            <Type size={12} className="mr-1" /> Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-black/30 text-white p-3 rounded border border-white/5 focus:border-red-600 outline-none transition text-sm"
                        />
                    </div>

                    <div>
                        <label className="flex items-center text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
                            <AlignLeft size={12} className="mr-1" /> Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full bg-black/30 text-white p-3 rounded border border-white/5 focus:border-red-600 outline-none transition resize-none text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center text-xs text-gray-400 uppercase font-bold tracking-wider">
                                    <Calendar size={12} className="mr-1" /> Dates
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Range Mode</span>
                                    <button
                                        onClick={() => setIsRange(!isRange)}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${isRange ? 'bg-red-600' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isRange ? 'left-4.5' : 'left-0.5'}`} style={{ left: isRange ? '18px' : '2px' }}></div>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">{isRange ? 'From' : 'Date'}</p>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-black/30 text-white p-3 rounded border border-white/5 focus:border-red-600 outline-none transition text-sm"
                                    />
                                </div>
                                {isRange && (
                                    <div className="animate-slide-in-right">
                                        <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold">To</p>
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={date}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-black/30 text-white p-3 rounded border border-white/5 focus:border-red-600 outline-none transition text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
                                <Folder size={12} className="mr-1" /> Folder
                            </label>
                            <input
                                type="text"
                                value={folderName}
                                list="folder-list"
                                placeholder="Select or Create..."
                                onChange={(e) => setFolderName(e.target.value)}
                                className="w-full bg-black/30 text-white p-3 rounded border border-white/5 focus:border-red-600 outline-none transition text-sm"
                            />
                            <datalist id="folder-list">
                                {existingFolders.map(f => <option key={f} value={f} />)}
                            </datalist>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center text-xs text-blue-400 mb-1 uppercase font-bold tracking-wider">
                            <Search size={12} className="mr-1" /> Search Keywords
                        </label>
                        <input
                            type="text"
                            value={searchContext}
                            onChange={(e) => setSearchContext(e.target.value)}
                            placeholder="AI extracted context..."
                            className="w-full bg-black/30 text-gray-300 p-3 rounded border border-dashed border-white/10 focus:border-blue-500 outline-none transition text-xs"
                        />
                    </div>

                    <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${aiStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                    {aiStatus === 'COMPLETED' ? <Check size={16} /> : <Loader2 size={16} className="animate-spin" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">AI Status</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAiStatus(aiStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${aiStatus === 'COMPLETED' ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white'}`}
                            >
                                {aiStatus === 'COMPLETED' ? 'Reset' : 'Complete'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isFeatured ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                    <ImageIcon size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Featured</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFeatured(!isFeatured)}
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${isFeatured ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            >
                                {isFeatured ? 'Featured' : 'Mark Featured'}
                            </button>
                        </div>
                    </div>

                    {movie.mediaType === 'PHOTO' && albumPhotos.length > 0 && (
                        <div className="pt-4 border-t border-white/10">
                            <label className="flex items-center text-xs text-green-400 mb-3 uppercase font-bold tracking-wider">
                                <ImageIcon size={12} className="mr-1" /> Album Content ({albumPhotos.length})
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {albumPhotos.map((photo, index) => {
                                    const isCover = photo === pendingThumbnailUrl;
                                    const isDeleting = deletingPhotoIndex === index;

                                    return (
                                        <div key={index} className={`relative group aspect-square rounded overflow-hidden border transition-all ${isCover ? 'border-red-600 ring-2 ring-red-600/20' : 'border-white/5'} bg-black/30`}>
                                            <img src={photo} alt="" className="w-full h-full object-cover" />

                                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                                                {isDeleting ? (
                                                    <div className="flex flex-col items-center gap-1.5 animate-bounce-in">
                                                        <span className="text-[10px] text-white font-bold">Delete?</span>
                                                        <div className="flex gap-1.5">
                                                            <button onClick={executeDeletePhoto} className="p-1 bg-red-600 rounded text-white"><Check size={14} /></button>
                                                            <button onClick={() => setDeletingPhotoIndex(null)} className="p-1 bg-gray-600 rounded text-white"><X size={14} /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleMovePhoto(index, 'left')} disabled={index === 0} className="p-1 bg-white/10 hover:bg-white/20 rounded disabled:opacity-20"><ArrowLeft size={14} /></button>
                                                            <button onClick={() => handleMovePhoto(index, 'right')} disabled={index === albumPhotos.length - 1} className="p-1 bg-white/10 hover:bg-white/20 rounded disabled:opacity-20"><ArrowRight size={14} /></button>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSetCover(photo)}
                                                            className={`w-full py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${isCover ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                                                        >
                                                            {isCover ? 'Current Cover' : 'Set as Cover'}
                                                        </button>
                                                        <button onClick={() => confirmDeletePhoto(index)} className="p-1 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded"><Trash2 size={14} /></button>
                                                    </>
                                                )}
                                            </div>

                                            {isCover && (
                                                <div className="absolute top-0 right-0 bg-red-600 text-[8px] font-bold uppercase px-1 py-0.5 rounded-bl flex items-center gap-0.5">
                                                    <Check size={8} /> Cover
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 flex justify-between items-center bg-[#181818] sticky bottom-0">
                    <button
                        onClick={handleDeleteClick}
                        className={`flex items-center gap-2 px-3 py-2 rounded font-bold text-xs md:text-sm transition-all duration-300 ${isDeleteConfirming ? 'bg-red-900/50 text-red-500 border border-red-500' : 'text-gray-500 hover:text-red-500'}`}
                    >
                        {isDeleteConfirming ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
                        {isDeleteConfirming ? "Sure?" : "Delete"}
                    </button>

                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-400 hover:text-white font-medium transition text-sm disabled:opacity-50">Cancel</button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 md:px-6 py-2 rounded font-bold flex items-center gap-2 transition transform hover:scale-105 active:scale-95 text-sm"
                        >
                            {isSaving ? (
                                <><Loader2 size={14} className="animate-spin" /> Saving...</>
                            ) : (
                                <><Save size={14} /> Save</>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default EditModal;