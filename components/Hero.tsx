import React from 'react';
import { Play, Info, PlusCircle, Pencil, Eye } from 'lucide-react';
import { Movie } from '../types';

interface HeroProps {
  movie?: Movie;
  onPlay: (movie: Movie) => void;
  onUploadClick: () => void;
  onEditClick: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ movie, onPlay, onUploadClick, onEditClick }) => {
  if (!movie) {
    return (
      <div className="relative h-[60vh] md:h-[80vh] w-full text-white flex flex-col items-center justify-center bg-black/90 border-b border-white/5 text-center px-4 animate-fade-in">
        <div className="max-w-2xl animate-slide-up z-10">
          <h1 className="text-4xl md:text-7xl font-bold mb-4 md:mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 drop-shadow-2xl">Cherryfly</h1>
          <p className="text-sm md:text-xl text-gray-400 mb-6 md:mb-8 leading-relaxed max-w-lg mx-auto px-4">
            Your personal AI-powered memory vault. Upload photos or videos, and watch them transform into cinematic experiences.
          </p>
          <button
            onClick={onUploadClick}
            className="glass bg-white/10 hover:bg-white/20 text-white px-6 py-2 md:px-8 md:py-3 rounded-full font-bold transition flex items-center mx-auto gap-2 transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-white/20 text-sm md:text-base"
          >
            <PlusCircle size={20} className="md:w-6 md:h-6" />
            Start Creating
          </button>
        </div>
        {/* Abstract Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 md:w-64 md:h-64 bg-red-900/20 rounded-full blur-[60px] md:blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 md:w-64 md:h-64 bg-blue-900/10 rounded-full blur-[60px] md:blur-[100px]"></div>
      </div>
    );
  }

  // Determine button text and icon based on mediaType
  let actionText = "Play";
  let ActionIcon = Play;

  if (movie.mediaType === 'COMIC') {
    actionText = "Read";
  } else if (movie.mediaType === 'PHOTO') {
    actionText = "View";
    ActionIcon = Eye;
  }

  return (
    <div className="relative h-[60vh] md:h-[85vh] w-full text-white overflow-hidden animate-fade-in">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-full">
        <img
          src={movie.thumbnailUrl}
          alt={movie.title}
          className="w-full h-full object-cover object-center animate-scale-in"
          style={{ animationDuration: '10s' }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="absolute top-[28%] md:top-[30%] left-4 md:left-12 max-w-[95%] md:max-w-xl z-20 animate-slide-up">
        <h1 className="text-3xl md:text-6xl font-bold mb-2 md:mb-4 drop-shadow-2xl leading-tight tracking-tight line-clamp-2 text-white">
          {movie.title}
        </h1>

        <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-2 md:mb-6 font-medium text-xs md:text-base">
          <span className="text-green-400 font-bold drop-shadow-md">{movie.matchScore}% Match</span>
          <span className="text-gray-200 drop-shadow-md">
            {movie.endDate ? (
              `${new Date(movie.createdAt).getFullYear()} - ${new Date(movie.endDate).getFullYear()}`
            ) : (
              movie.year
            )}
          </span>
          <span className="border border-gray-400/50 bg-black/30 backdrop-blur-sm text-gray-200 px-1.5 py-0.5 text-[10px] md:text-xs rounded">HD</span>
          <span className="text-gray-200 drop-shadow-md">{movie.duration}</span>
        </div>

        <p className="text-xs md:text-lg text-gray-200 mb-4 md:mb-8 drop-shadow-lg line-clamp-3 leading-relaxed max-w-lg font-light">
          {movie.description}
        </p>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <button
            onClick={() => onPlay(movie)}
            className="bg-white text-black px-5 py-2 md:px-8 md:py-3 rounded-full flex items-center font-bold hover:bg-gray-200 transition transform hover:scale-105 shadow-xl text-sm md:text-base"
          >
            <ActionIcon className="w-4 h-4 md:w-5 md:h-5 mr-2 fill-current" />
            {actionText}
          </button>

          <button
            onClick={() => onEditClick(movie)}
            className="glass bg-white/20 text-white px-5 py-2 md:px-8 md:py-3 rounded-full flex items-center font-bold hover:bg-white/30 transition transform hover:scale-105 shadow-xl border border-white/20 backdrop-blur-md text-sm md:text-base"
          >
            <Pencil className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;