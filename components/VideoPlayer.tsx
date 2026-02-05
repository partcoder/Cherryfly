import React, { useRef, useEffect } from 'react';
import { X, ChevronDown, AlertTriangle } from 'lucide-react';
import { Movie } from '../types';

interface VideoPlayerProps {
  movie: Movie | null;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (movie && movie.mediaType === 'VIDEO' && videoRef.current) {
        // Handle the play promise
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {});
        }
    }
  }, [movie]);

  if (!movie) return null;

  // Render Comic View
  if (movie.mediaType === 'COMIC' && movie.comicPages) {
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
                            alt={`Page ${index + 1}`} 
                            className="w-full h-auto rounded-lg shadow-2xl border border-[#333]"
                        />
                        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-xs md:text-sm font-bold backdrop-blur-sm">
                            Page {index + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  // Render Photo View
  if (movie.mediaType === 'PHOTO') {
      return (
        <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center p-4">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 text-white hover:text-gray-300 z-[80] bg-black bg-opacity-50 rounded-full p-2"
            >
                <X size={28} />
            </button>
            
            <div className="relative max-w-full max-h-full">
                <img 
                    src={movie.videoUrl} // We store the photo URL here
                    alt={movie.title} 
                    className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
                />
                <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none px-4">
                     <h2 className="text-white text-lg md:text-xl font-bold drop-shadow-md bg-black/50 inline-block px-4 py-2 rounded max-w-full truncate">{movie.title}</h2>
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