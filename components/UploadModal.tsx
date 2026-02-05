import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Film, Loader2, Wand2, Image as ImageIcon, BookOpen, Folder } from 'lucide-react';
import { Movie, AnalysisStage } from '../types';
import { extractFrame, convertFileToBase64 } from '../utils/videoUtils';
import { analyzeVideoFrame, generateMoviePoster, generateComicPages } from '../services/geminiService';
import { saveMovieToStorage } from '../utils/db';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieCreated: (movie: Movie) => void;
  existingFolders: string[];
  initialFolder?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onMovieCreated, existingFolders, initialFolder }) => {
  const [stage, setStage] = useState<AnalysisStage>(AnalysisStage.IDLE);
  const [file, setFile] = useState<File | null>(null);
  const [isComicMode, setIsComicMode] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialFolder) {
            setSelectedFolder(initialFolder);
        } else {
            setSelectedFolder('');
        }
    }
  }, [isOpen, initialFolder]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setIsComicMode(false);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.type.startsWith('video/') || droppedFile.type.startsWith('image/')) {
            setFile(droppedFile);
            setIsComicMode(false);
            setError(null);
        } else {
            setError("Please upload a video or image file.");
        }
    }
  };

  const processFile = async () => {
    if (!file) return;

    try {
      let frameBase64 = '';
      const isVideo = file.type.startsWith('video/');
      let mediaType: 'VIDEO' | 'PHOTO' | 'COMIC' = 'VIDEO';
      if (!isVideo) {
          mediaType = isComicMode ? 'COMIC' : 'PHOTO';
      }

      setStage(AnalysisStage.EXTRACTING);
      setProgress(5);

      if (isVideo) {
        frameBase64 = await extractFrame(file, 2.0);
      } else {
        frameBase64 = await convertFileToBase64(file);
      }
      
      setStage(AnalysisStage.ANALYZING);
      setProgress(isVideo ? 30 : 20);
      const metadata = await analyzeVideoFrame(frameBase64);
      
      setStage(AnalysisStage.GENERATING);
      setProgress(isVideo ? 60 : 40);
      const posterUrl = await generateMoviePoster(metadata, frameBase64);

      let comicPages: string[] = [];
      if (mediaType === 'COMIC') {
          setStage(AnalysisStage.GENERATING_COMIC);
          setProgress(60);
          comicPages = await generateComicPages(frameBase64, metadata);
      } else {
          setProgress(80);
      }

      setStage(AnalysisStage.COMPLETE);
      setProgress(100);

      const createdAt = file.lastModified 
        ? new Date(file.lastModified).toISOString() 
        : new Date().toISOString();

      const newMovie: Movie = {
        id: crypto.randomUUID(),
        title: metadata.title,
        description: metadata.description,
        searchContext: metadata.searchContext,
        thumbnailUrl: posterUrl,
        videoUrl: '', 
        comicPages: comicPages,
        matchScore: Math.floor(Math.random() * (99 - 85) + 85),
        year: new Date(createdAt).getFullYear(),
        duration: mediaType === 'COMIC' ? "Comic Issue #1" : (mediaType === 'PHOTO' ? "Photo" : "Unknown"),
        genre: metadata.genre,
        createdAt: createdAt,
        mediaType: mediaType,
        folderName: selectedFolder.trim() || undefined
      };
      
      await saveMovieToStorage(newMovie, file);

      setTimeout(() => {
        onMovieCreated({
             ...newMovie,
             videoUrl: URL.createObjectURL(file) 
        });
        resetModal();
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process file");
      setStage(AnalysisStage.ERROR);
    }
  };

  const resetModal = () => {
    setFile(null);
    setStage(AnalysisStage.IDLE);
    setProgress(0);
    setError(null);
    setIsComicMode(false);
    setSelectedFolder('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-5 border-b border-white/10 bg-white/5 sticky top-0 backdrop-blur z-10">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Upload className="text-red-500" size={20}/> 
            {initialFolder ? `Add to "${initialFolder}"` : "Add to Library"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8">
          {stage === AnalysisStage.IDLE && (
            <div className="space-y-4 md:space-y-6">
                <div 
                    className="border-2 border-dashed border-white/10 bg-white/5 rounded-xl p-6 md:p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-red-600 hover:bg-white/10 transition group"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="video/*,image/*" 
                    className="hidden" 
                />
                
                {file ? (
                    <div className="text-center">
                        {file.type.startsWith('video/') ? (
                            <Film className="w-10 h-10 md:w-12 md:h-12 text-red-600 mb-2 md:mb-4 mx-auto drop-shadow-lg" />
                        ) : (
                            <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-blue-500 mb-2 md:mb-4 mx-auto drop-shadow-lg" />
                        )}
                        <p className="text-white font-medium break-all text-sm">{file.name}</p>
                        <p className="text-gray-400 text-xs mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-white/10 transition">
                             <Upload className="w-6 h-6 md:w-8 md:h-8 text-gray-400 group-hover:text-red-500 transition" />
                        </div>
                        <p className="text-white font-medium mb-1 text-sm md:text-base">Tap to Upload</p>
                        <p className="text-gray-500 text-xs md:text-sm">Video or Photo</p>
                    </>
                )}
                </div>

                {file && (
                    <div className="space-y-3 md:space-y-4 animate-slide-up">
                        {/* Folder Selection */}
                        <div className="flex items-center justify-between glass p-3 md:p-4 rounded-xl border border-white/5">
                             <div className="flex items-center gap-2 md:gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <Folder className="text-red-500" size={18} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xs md:text-sm">Folder</p>
                                </div>
                             </div>
                             <div className="relative">
                                 <input 
                                     type="text" 
                                     list="upload-folder-list"
                                     value={selectedFolder}
                                     onChange={(e) => setSelectedFolder(e.target.value)}
                                     placeholder="Auto"
                                     className="bg-black/40 text-white text-xs md:text-sm px-2 py-1.5 rounded border border-white/10 focus:border-red-600 outline-none w-32 md:w-40 text-right placeholder-gray-500"
                                 />
                                 <datalist id="upload-folder-list">
                                    {existingFolders.map(f => <option key={f} value={f} />)}
                                 </datalist>
                             </div>
                        </div>

                        {/* Comic Toggle for Images */}
                        {!file.type.startsWith('video/') && (
                            <div className="flex items-center justify-between glass p-3 md:p-4 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                                        <BookOpen className="text-yellow-500" size={18} />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-xs md:text-sm">Comic Mode</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={isComicMode}
                                        onChange={(e) => setIsComicMode(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 md:w-11 md:h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                        )}
                    </div>
                )}
            </div>
          )}

          {stage !== AnalysisStage.IDLE && stage !== AnalysisStage.ERROR && (
             <div className="flex flex-col items-center justify-center py-6 md:py-8">
                <div className="relative w-16 h-16 md:w-24 md:h-24 mb-6 md:mb-8">
                    <Loader2 className="w-full h-full text-red-600 animate-spin" strokeWidth={1} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Wand2 className="w-6 h-6 md:w-10 md:h-10 text-white drop-shadow-lg" />
                    </div>
                </div>
                
                <h3 className="text-lg md:text-2xl font-bold text-white mb-2 text-center">
                    {stage === AnalysisStage.EXTRACTING && "Processing..."}
                    {stage === AnalysisStage.ANALYZING && "Dreaming..."}
                    {stage === AnalysisStage.GENERATING && "Designing..."}
                    {stage === AnalysisStage.GENERATING_COMIC && "Inking Comic..."}
                    {stage === AnalysisStage.COMPLETE && "Added!"}
                </h3>
                <p className="text-gray-400 text-xs md:text-sm mb-6 md:mb-8 text-center max-w-xs leading-relaxed">
                    {stage === AnalysisStage.ANALYZING && "Gemini is watching your clip."}
                    {stage === AnalysisStage.GENERATING && "Creating cinematic art."}
                </p>

                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-red-600 to-red-400 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
             </div>
          )}

          {stage === AnalysisStage.ERROR && (
              <div className="text-center py-8">
                  <p className="text-red-500 mb-4 bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-sm">{error}</p>
                  <button 
                    onClick={() => setStage(AnalysisStage.IDLE)}
                    className="text-white underline hover:text-red-400 text-sm"
                  >
                      Try Again
                  </button>
              </div>
          )}
        </div>

        {/* Footer */}
        {stage === AnalysisStage.IDLE && (
            <div className="p-4 md:p-5 border-t border-white/10 bg-white/5 flex justify-end">
                <button 
                    onClick={processFile}
                    disabled={!file}
                    className={`px-6 py-2 md:px-8 md:py-3 rounded-full font-bold transition flex items-center gap-2 text-sm md:text-base ${file ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-600/30' : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}
                >
                    <Wand2 size={16} />
                    {file ? (isComicMode ? "Create Comic" : "Magic Upload") : "Select File"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;