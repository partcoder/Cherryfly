
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, title, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-white/10 bg-[#181818]">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center text-red-600 mb-2">
                        <AlertTriangle size={32} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-white font-bold text-xl">Delete Library Item?</h2>
                        <p className="text-gray-400 text-sm">
                            Are you sure you want to delete <span className="text-white font-medium">"{title}"</span>? This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors border border-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition transform hover:scale-105"
                        >
                            <Trash2 size={18} />
                            Confirm Delete
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
