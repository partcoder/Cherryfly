import React from 'react';
import { Movie } from '../types';
import { Play, Loader2, Clock } from 'lucide-react';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onPlay: (movie: Movie) => void;
}

const MovieRow: React.FC<MovieRowProps> = ({ title, movies, onPlay }) => {
  if (movies.length === 0) return null;

  return (
    <div className="px-4 md:px-12 my-8 space-y-4">
      <h2 className="text-white text-xl md:text-2xl font-semibold hover:text-gray-300 cursor-pointer transition w-fit">
        {title}
      </h2>
      
      <div className="relative group">
        <div className="flex overflow-x-scroll no-scrollbar space-x-4 py-4 scroll-smooth">
          {movies.map((movie) => (
            <div 
              key={movie.id} 
              className="relative flex-none w-[160px] md:w-[240px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10 group/card"
              onClick={() => onPlay(movie)}
            >
              <img 
                src={movie.thumbnailUrl} 
                alt={movie.title} 
                className={`w-full h-full object-cover ${movie.aiStatus === 'PENDING' ? 'opacity-50 grayscale' : ''}`}
                loading="lazy"
              />
              
              {movie.aiStatus === 'PENDING' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white p-2 text-center">
                    <Clock className="animate-pulse mb-2 text-yellow-500" size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Pending AI</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/card:bg-opacity-40 transition-all duration-300 flex flex-col justify-end p-4 opacity-0 group-hover/card:opacity-100">
                <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center mb-2 shadow-lg">
                    {movie.aiStatus === 'PENDING' ? <Loader2 className="animate-spin text-black" size={20} /> : <Play className="fill-black w-5 h-5 ml-1" />}
                </div>
                <h3 className="text-white font-bold text-sm leading-tight drop-shadow-md">{movie.title}</h3>
                <div className="text-[10px] text-green-400 font-bold mt-1">{movie.matchScore}% Match</div>
                <div className="flex flex-wrap gap-1 mt-1">
                    {movie.genre.slice(0, 2).map((g, i) => (
                        <span key={i} className="text-[9px] text-gray-300">{g}{i < 1 ? ' • ' : ''}</span>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieRow;