import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Type, AlignLeft, Trash2, AlertTriangle, Folder, Search } from 'lucide-react';
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
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setTitle(movie.title);
        setDescription(movie.description);
        setFolderName(movie.folderName || '');
        setSearchContext(movie.searchContext || '');
        // Format date for input type="date" (YYYY-MM-DD)
        const d = movie.createdAt ? new Date(movie.createdAt) : new Date();
        const dateString = d.toISOString().split('T')[0];
        setDate(dateString);
        setIsDeleteConfirming(false); 
    }
  }, [movie, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(movie.id, {
        title,
        description,
        searchContext,
        folderName: folderName.trim() === '' ? undefined : folderName.trim(), 
        createdAt: new Date(date).toISOString()
    });
    onClose();
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
      <div className="glass-card w-full md:max-w-lg rounded-lg shadow-2xl border border-white/10 overflow-hidden animate-scale-in max-h-[85vh] overflow-y-auto no-scrollbar bg-[#181818]">
        
        <div className="flex justify-between items-center p-4 border-b border-white/10 sticky top-0 bg-[#181818]/95 backdrop-blur z-10">
          <h2 className="text-white font-bold text-lg">Edit Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-5">
            {/* Title Input */}
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

            {/* Description Input */}
            <div>
                <label className="flex items-center text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
                    <AlignLeft size={12} className="mr-1" /> Description
                </label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-black/30 text-white p-3 rounded border border-white/5 focus:border-red-600 outline-none transition resize-none text-sm"
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Input */}
                <div>
                    <label className="flex items-center text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
                        <Calendar size={12} className="mr-1" /> Date
                    </label>
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-black/30 text-white p-3 rounded border border-white/5 focus:border-red-600 outline-none transition text-sm"
                    />
                </div>

                {/* Folder Input */}
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

            {/* AI Search Context Input */}
            <div>
                <label className="flex items-center text-xs text-blue-400 mb-1 uppercase font-bold tracking-wider">
                    <Search size={12} className="mr-1" /> AI Keywords / Search Tags
                </label>
                <textarea 
                    value={searchContext}
                    onChange={(e) => setSearchContext(e.target.value)}
                    rows={3}
                    className="w-full bg-black/30 text-gray-300 p-3 rounded border border-dashed border-white/10 focus:border-blue-500 outline-none transition resize-none text-xs md:text-sm"
                    placeholder="Add keywords here..."
                />
            </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-[#181818]">
            <button 
                onClick={handleDeleteClick}
                className={`flex items-center gap-2 px-3 py-2 rounded font-bold text-xs md:text-sm transition-all duration-300 ${isDeleteConfirming ? 'bg-red-900/50 text-red-500 border border-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
                {isDeleteConfirming ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
                {isDeleteConfirming ? "Sure?" : "Delete"}
            </button>

            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-gray-400 hover:text-white font-medium transition text-sm"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 md:px-6 py-2 rounded font-bold flex items-center gap-2 transition transform hover:scale-105 text-sm"
                >
                    <Save size={14} />
                    Save
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default EditModal;