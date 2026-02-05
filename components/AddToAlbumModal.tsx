
import React, { useState, useRef } from 'react';
import { X, Upload, ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { Movie } from '../types';
import { convertFileToBase64 } from '../utils/videoUtils';
import { updateMovieInStorage } from '../utils/db';

interface AddToAlbumModalProps {
    movie: Movie;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: (movie: Movie) => void;
}

const AddToAlbumModal: React.FC<AddToAlbumModalProps> = ({ movie, isOpen, onClose, onUpdated }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const targetFiles = e.target.files as FileList;
        if (targetFiles && targetFiles.length > 0) {
            const selectedFiles = Array.from(targetFiles).filter(f => f.type.startsWith('image/'));
            setFiles(selectedFiles);
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setIsUploading(true);

        try {
            const newPages: string[] = [];
            for (const file of files) {
                const base64 = await convertFileToBase64(file);
                newPages.push(`data:image/jpeg;base64,${base64}`);
            }

            const updatedMovie = {
                ...movie,
                comicPages: [...(movie.comicPages || []), ...newPages]
            };

            const saved = await updateMovieInStorage(movie.id, { comicPages: updatedMovie.comicPages });

            setIsComplete(true);
            setTimeout(() => {
                onUpdated(saved);
                onClose();
                setFiles([]);
                setIsUploading(false);
                setIsComplete(false);
            }, 1500);

        } catch (err) {
            console.error("Failed to add photos:", err);
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <ImageIcon className="text-blue-500" size={20} />
                        Add to "{movie.title}"
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {!isUploading && !isComplete ? (
                        <div className="space-y-6">
                            <div
                                className="border-2 border-dashed border-white/10 bg-white/5 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-white/10 transition group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {files.length > 0 ? (
                                    <div className="text-center">
                                        <ImageIcon className="w-12 h-12 text-blue-500 mb-4 mx-auto" />
                                        <p className="text-white font-medium">{files.length} photos selected</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 text-gray-500 group-hover:text-blue-500 mb-4 transition" />
                                        <p className="text-white font-medium">Select more photos</p>
                                        <p className="text-gray-500 text-sm">Add to this album</p>
                                    </>
                                )}
                            </div>

                            {files.length > 0 && (
                                <button
                                    onClick={handleUpload}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20"
                                >
                                    Confirm Addition
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10">
                            {isComplete ? (
                                <>
                                    <CheckCircle className="w-16 h-16 text-green-500 animate-scale-in mb-4" />
                                    <p className="text-white font-bold text-xl">Photos Added!</p>
                                </>
                            ) : (
                                <>
                                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                                    <p className="text-white font-medium text-lg">Uploading photos...</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddToAlbumModal;
