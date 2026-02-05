import React from 'react';
import { Movie } from '../types';
import { Play, Calendar, Film, Image as ImageIcon } from 'lucide-react';
import CardOptions from './CardOptions';

interface TimelineViewProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onEdit: (movie: Movie) => void;
  onDelete: (id: string) => void;
  onAddPhotos: (movie: Movie) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ movies, onPlay, onEdit, onDelete, onAddPhotos }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 relative">
      {/* Vertical Line: Offset slightly left on mobile, center on desktop */}
      <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gray-700/50"></div>

      {movies.map((movie, index) => {
        const isLeft = index % 2 === 0;
        const date = new Date(movie.createdAt).toLocaleDateString(undefined, {
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        return (
          <div key={movie.id} className={`relative flex items-center justify-between mb-8 md:mb-12 ${isLeft ? 'flex-row' : 'flex-row-reverse'} group`}>

            {/* Center Dot: Offset to match line on mobile */}
            <div className="absolute left-6 md:left-1/2 transform -translate-x-1/2 w-3 h-3 md:w-4 md:h-4 bg-[#141414] border-2 border-red-600 rounded-full z-10 group-hover:scale-125 transition"></div>

            {/* Content Card */}
            {/* Mobile: Always full width with left padding. Desktop: Alternating sides */}
            <div className={`w-full md:w-[45%] pl-12 md:pl-0 ${isLeft ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'}`}>
              <div
                onClick={() => onPlay(movie)}
                className="glass p-3 md:p-4 rounded-lg shadow-lg hover:bg-[#2a2a2a] transition cursor-pointer border border-[#333] hover:border-red-600/50"
              >
                <div className={`flex items-center gap-2 text-gray-400 text-[10px] md:text-xs mb-2 ${isLeft ? 'md:justify-end' : ''}`}>
                  <Calendar size={12} />
                  {date}
                </div>

                <h3 className="text-white font-bold text-base md:text-lg mb-1 line-clamp-1">{movie.title}</h3>
                <p className="text-gray-400 text-xs md:text-sm line-clamp-2 mb-3 font-light">{movie.description}</p>

                <div className={`flex gap-3 ${isLeft ? 'md:justify-end' : ''}`}>
                  {/* Thumbnail Preview */}
                  <div className="relative w-full h-24 md:h-32 rounded overflow-hidden">
                    <img src={movie.thumbnailUrl} alt={movie.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play className="text-white fill-white w-8 h-8" />
                    </div>
                    {/* Card Options Button */}
                    <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CardOptions
                        onEdit={() => onEdit(movie)}
                        onDelete={() => onDelete(movie.id)}
                        onAddPhotos={() => onAddPhotos(movie)}
                        mediaType={movie.mediaType}
                      />
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] md:text-xs text-white font-bold flex items-center gap-1 backdrop-blur-sm">
                      {movie.mediaType === 'COMIC' ? <ImageIcon size={10} /> : movie.mediaType === 'PHOTO' ? <ImageIcon size={10} /> : <Film size={10} />}
                      {movie.mediaType === 'COMIC' ? 'Comic' : movie.mediaType === 'PHOTO' ? 'Photo' : 'Video'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty space for the other side (desktop only) */}
            <div className="hidden md:block w-[45%]"></div>
          </div>
        );
      })}
    </div>
  );
};

export default TimelineView;