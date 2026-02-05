
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, FolderInput, Plus } from 'lucide-react';

interface CardOptionsProps {
    onEdit: () => void;
    onDelete: () => void;
    onMove: () => void;
    onAddPhotos?: () => void;
    mediaType?: 'VIDEO' | 'PHOTO' | 'COMIC';
}

const CardOptions: React.FC<CardOptionsProps> = ({ onEdit, onDelete, onMove, onAddPhotos, mediaType }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleOptionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors backdrop-blur-md border border-white/10"
            >
                <MoreVertical size={16} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[#181818] border border-white/10 rounded-lg shadow-2xl z-[100] overflow-hidden animate-scale-in origin-top-right">
                    <button
                        onClick={(e) => handleOptionClick(e, onEdit)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left border-b border-white/5"
                    >
                        <Edit2 size={14} className="text-blue-400" />
                        Edit
                    </button>

                    <button
                        onClick={(e) => handleOptionClick(e, onMove)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left border-b border-white/5"
                    >
                        <FolderInput size={14} className="text-purple-400" />
                        Move
                    </button>

                    {mediaType === 'PHOTO' && onAddPhotos && (
                        <button
                            onClick={(e) => handleOptionClick(e, onAddPhotos)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left border-b border-white/5"
                        >
                            <Plus size={14} className="text-green-400" />
                            Add Photos
                        </button>
                    )}

                    <button
                        onClick={(e) => handleOptionClick(e, onDelete)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default CardOptions;
