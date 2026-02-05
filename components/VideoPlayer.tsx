import React, { useRef, useEffect } from 'react';
import { X, ChevronDown, AlertTriangle, BookOpen, Film, Image as ImageIcon } from 'lucide-react';
import { Movie } from '../types';

interface VideoPlayerProps {
    movie: Movie | null;
    onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (movie) {
            console.log("Playing Media:", {
                id: movie.id,
                title: movie.title,
                mediaType: movie.mediaType,
                hasVideoUrl: !!movie.videoUrl,
                comicPagesCount: movie.comicPages?.length || 0,
                aiStatus: movie.aiStatus
            });
        }

        if (movie && movie.mediaType === 'VIDEO' && videoRef.current) {
            // Handle the play promise
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => { });
            }
        }
    }, [movie]);

    if (!movie) return null;

    // Render Comic View
    if (movie.mediaType === 'COMIC') {
        if (!movie.comicPages || movie.comicPages.length === 0) {
            return (
                <div className="fixed inset-0 z-[70] bg-[#111] flex items-center justify-center p-4">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X size={24} /></button>
                    <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10 max-w-sm">
                        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-white text-xl font-bold mb-2">Comic Pages Missing</h3>
                        <p className="text-gray-400">The comic pages for "{movie.title}" could not be loaded. This can happen if the AI analysis was skipped or failed.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 z-[70] bg-[#111] flex flex-col items-center overflow-y-auto no-scrollbar">
                {/* Header */}
                <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-[80]">
                    <h2 className="text-white text-lg md:text-2xl font-bold drop-shadow-md ml-2">{movie.title} <span className="text-[10px] md:text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded ml-2 align-middle">COMIC</span></h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-red-500 transition bg-black/50 rounded-full p-2"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Pages */}
                <div className="w-full max-w-4xl pt-24 pb-20 px-4 flex flex-col gap-8 items-center">
                    {movie.comicPages.map((page, index) => (
                        <div key={index} className="w-full relative group">
                            <img
                                src={page}
                                alt={`Page ${index + 1} `}
                                className="w-full h-auto rounded-lg shadow-2xl border border-[#333]"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x1200?text=Page+Load+Error';
                                }}
                            />
                            <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] md:text-xs text-white font-bold flex items-center gap-1 backdrop-blur-sm">
                                {movie.mediaType === 'COMIC' ? <BookOpen size={10} /> : movie.mediaType === 'PHOTO' ? <ImageIcon size={10} /> : <Film size={10} />}
                                {movie.mediaType === 'COMIC' ? 'Comic' : movie.mediaType === 'PHOTO' ? 'Photo' : 'Video'}
                            </div>
                            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-xs md:text-sm font-bold backdrop-blur-sm">
                                Page {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Render Photo View (Handles single photo and photo sets)
    if (movie.mediaType === 'PHOTO') {
        const rawPhotos = (movie.comicPages && movie.comicPages.length > 0) ? movie.comicPages : [movie.videoUrl];

        // Defensive: Ensure all photos have data: prefix if they are raw base64
        const photos = rawPhotos.map(p => {
            if (p && !p.startsWith('http') && !p.startsWith('data:') && p.length > 100) {
                return `data:image/jpeg;base64,${p}`;
            }
            return p;
        });

        return (
            <div className="fixed inset-0 z-[100] bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col items-center overflow-y-auto no-scrollbar pt-20 pb-32">
                <button
                    onClick={onClose}
                    className="fixed top-6 right-6 md:top-10 md:right-10 text-white/70 hover:text-white z-[110] bg-white/5 hover:bg-white/10 rounded-full p-3 transition-colors border border-white/10"
                >
                    <X size={24} />
                </button>

                <div className="w-full max-w-5xl px-4 md:px-8 space-y-12 flex flex-col items-center">
                    <div className="text-center space-y-2 mb-4">
                        <h2 className="text-white text-3xl md:text-5xl font-black tracking-tighter drop-shadow-2xl">{movie.title}</h2>
                        {movie.description && <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto font-light">{movie.description}</p>}
                    </div>

                    <div className="w-full space-y-10">
                        {photos.map((photo, index) => (
                            <div key={index} className="w-full group animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
                                <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5 group-hover:border-white/20 transition-all duration-700">
                                    <img
                                        src={photo}
                                        alt={`${movie.title} - ${index + 1}`}
                                        className="w-full h-auto object-contain bg-black/50"
                                        loading={index < 2 ? "eager" : "lazy"}
                                    />
                                    {photos.length > 1 && (
                                        <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs md:text-sm font-bold text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {index + 1} / {photos.length}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-10 pb-20 flex flex-col items-center gap-4">
                        <div className="w-12 h-1 bg-white/20 rounded-full"></div>
                        <p className="text-gray-600 text-sm font-medium tracking-widest uppercase">End of Set</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render Video View
    return (
        <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 text-white hover:text-gray-300 z-[80] bg-black bg-opacity-50 rounded-full p-2"
            >
                <X size={28} />
            </button>

            <div className="w-full h-full relative flex items-center justify-center">
                {movie.videoUrl ? (
                    <video
                        ref={videoRef}
                        src={movie.videoUrl}
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                    />
                ) : (
                    <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10">
                        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-white text-xl font-bold mb-2">Video Unavailable</h3>
                        <p className="text-gray-400 max-w-sm">The video file for "{movie.title}" could not be found. It may have failed to upload.</p>
                    </div>
                )}

                <div className="absolute top-4 left-4 p-4 bg-gradient-to-b from-black to-transparent w-full pointer-events-none">
                    <h2 className="text-white text-lg md:text-2xl font-bold drop-shadow-md pr-12 truncate">{movie.title}</h2>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;