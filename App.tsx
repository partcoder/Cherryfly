import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import TimelineView from './components/TimelineView';
import FolderView from './components/FolderView';
import UploadModal from './components/UploadModal';
import VideoPlayer from './components/VideoPlayer';
import EditModal from './components/EditModal';
import AddToAlbumModal from './components/AddToAlbumModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { Movie, ViewMode } from './types';
import { getMoviesFromStorage, updateMovieInStorage, deleteMovieFromStorage } from './utils/db';

const App: React.FC = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadModalInitialFolder, setUploadModalInitialFolder] = useState<string | undefined>(undefined);
    const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [activeFilter, setActiveFilter] = useState('ALL');
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
    const [addingPhotosToMovie, setAddingPhotosToMovie] = useState<Movie | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Movie | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('STREAM');

    useEffect(() => {
        const loadMovies = async () => {
            try {
                const storedMovies = await getMoviesFromStorage();
                setMovies(storedMovies);
            } catch (e) {
                console.error("Failed to load movies from storage", e);
            }
        };
        loadMovies();
    }, []);

    const handleMovieCreated = (newMovie: Movie) => {
        setMovies(prev => [newMovie, ...prev]);
    };

    const handleMovieUpdated = async (id: string, updates: Partial<Movie>) => {
        try {
            const updated = await updateMovieInStorage(id, updates);
            setMovies(prev => prev.map(m => m.id === id ? updated : m));
        } catch (e) {
            console.error("Failed to update movie", e);
            throw e;
        }
    };

    const handleMovieDeleted = async (id: string) => {
        try {
            await deleteMovieFromStorage(id);
            setMovies(prev => prev.filter(m => m.id !== id));
            if (playingMovie?.id === id) setPlayingMovie(null);
            if (editingMovie?.id === id) setEditingMovie(null);
            setItemToDelete(null);
        } catch (e) {
            console.error("Failed to delete movie", e);
            alert("Failed to delete memory. Please try again.");
        }
    };

    const confirmDelete = (movieOrId: Movie | string) => {
        if (typeof movieOrId === 'string') {
            const movie = movies.find(m => m.id === movieOrId);
            if (movie) setItemToDelete(movie);
        } else {
            setItemToDelete(movieOrId);
        }
    };

    const openUploadModal = (folderName?: string) => {
        setUploadModalInitialFolder(folderName);
        setIsUploadModalOpen(true);
    };

    const closeUploadModal = () => {
        setIsUploadModalOpen(false);
        setTimeout(() => setUploadModalInitialFolder(undefined), 300);
    };

    const existingFolders = useMemo(() => {
        const folders = new Set<string>();
        movies.forEach(m => {
            if (m.folderName) folders.add(m.folderName);
        });
        return Array.from(folders).sort();
    }, [movies]);

    const filteredMovies = useMemo(() => {
        let result = movies;

        if (activeFilter === 'VIDEO') {
            result = result.filter(m => m.mediaType === 'VIDEO');
        } else if (activeFilter === 'COMIC') {
            result = result.filter(m => m.mediaType === 'COMIC');
        } else if (activeFilter === 'PHOTO') {
            result = result.filter(m => m.mediaType === 'PHOTO');
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(movie =>
                movie.title.toLowerCase().includes(lowerQuery) ||
                movie.description.toLowerCase().includes(lowerQuery) ||
                (movie.searchContext && movie.searchContext.toLowerCase().includes(lowerQuery)) ||
                (movie.folderName && movie.folderName.toLowerCase().includes(lowerQuery)) ||
                movie.genre.some(g => g.toLowerCase().includes(lowerQuery))
            );
        }

        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [movies, searchQuery, activeFilter]);

    const featuredMovie = useMemo(() => {
        // Find the most recent movie marked as featured
        const featured = filteredMovies.find(m => m.isFeatured);
        return featured || filteredMovies[0];
    }, [filteredMovies]);

    const groupedMovies = useMemo(() => {
        const groups: { [key: string]: Movie[] } = {};
        const sorted = [...filteredMovies].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        let currentClusterName = "";

        sorted.forEach((movie, index) => {
            if (movie.folderName) {
                if (!groups[movie.folderName]) groups[movie.folderName] = [];
                groups[movie.folderName].push(movie);
                return;
            }

            const movieTime = new Date(movie.createdAt).getTime();
            const prevMovie = index > 0 ? sorted[index - 1] : null;

            let addToCurrent = false;

            if (prevMovie && !prevMovie.folderName) {
                const timeDiff = Math.abs((new Date(prevMovie.createdAt).getTime()) - movieTime);
                const ONE_DAY = 24 * 60 * 60 * 1000;
                if (timeDiff < 3 * ONE_DAY) {
                    addToCurrent = true;
                }
            }

            if (addToCurrent && currentClusterName) {
                groups[currentClusterName].push(movie);
            } else {
                const date = new Date(movie.createdAt);
                const monthStr = date.toLocaleString('default', { month: 'short' });
                currentClusterName = `${monthStr} ${date.getDate()}, ${date.getFullYear()}`;
                if (!groups[currentClusterName]) groups[currentClusterName] = [];
                groups[currentClusterName].push(movie);
            }
        });

        return groups;
    }, [filteredMovies]);

    const sortedGroupKeys = Object.keys(groupedMovies).sort((a, b) => {
        const moviesA = groupedMovies[a];
        const moviesB = groupedMovies[b];
        if (!moviesA?.[0] || !moviesB?.[0]) return 0;

        // Sort groups by the newest item in each group
        const dateA = new Date(moviesA[0].createdAt).getTime();
        const dateB = new Date(moviesB[0].createdAt).getTime();
        return dateB - dateA;
    });

    return (
        <div className="min-h-screen bg-[#050505] overflow-x-hidden font-sans pb-20 animate-fade-in text-gray-100">
            <Navbar
                onUploadClick={() => openUploadModal()}
                onSearch={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                viewMode={viewMode}
                onViewChange={setViewMode}
            />

            {viewMode === 'STREAM' && (
                <Hero
                    movie={featuredMovie}
                    onPlay={setPlayingMovie}
                    onUploadClick={() => openUploadModal()}
                    onEditClick={setEditingMovie}
                />
            )}

            {/* Main Content Area: Adjusted top margins for better mobile layout. 
          Mobile Navbar height is approx 100px. 
          If Stream view (Hero exists), we pull content up (-mt). 
          If other views, we push content down (pt).
      */}
            <div className={`relative z-10 pb-10 space-y-6 md:space-y-8 ${viewMode === 'STREAM' ? '-mt-16 md:-mt-32' : 'pt-36 md:pt-24'}`}>

                {(searchQuery || activeFilter !== 'ALL') && (
                    <div className="px-4 md:px-12 pt-8 animate-slide-up">
                        <h2 className="text-gray-400 text-base md:text-lg">
                            {activeFilter !== 'ALL' && <span className="font-bold text-white mr-2">{activeFilter}S</span>}
                            {searchQuery && <span>Results for "{searchQuery}"</span>}
                        </h2>
                    </div>
                )}

                {filteredMovies.length === 0 ? (
                    <div className="px-4 md:px-12 mt-12 text-center text-gray-500 py-20 animate-fade-in">
                        <p className="text-lg md:text-xl mb-4">No memories found.</p>
                        {activeFilter !== 'ALL' || searchQuery ? (
                            <button onClick={() => { setActiveFilter('ALL'); setSearchQuery(''); }} className="text-white underline">Clear Filters</button>
                        ) : (
                            <button onClick={() => openUploadModal()} className="text-white underline">Upload Something</button>
                        )}
                    </div>
                ) : (
                    <>
                        {viewMode === 'STREAM' && sortedGroupKeys.map((dateKey, index) => (
                            <div key={dateKey} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                                <MovieRow
                                    title={dateKey}
                                    movies={groupedMovies[dateKey]}
                                    onPlay={setPlayingMovie}
                                    onEdit={setEditingMovie}
                                    onDelete={confirmDelete}
                                    onAddPhotos={setAddingPhotosToMovie}
                                />
                            </div>
                        ))}

                        {viewMode === 'FOLDERS' && (
                            <div className="animate-slide-up">
                                <FolderView
                                    groupedMovies={groupedMovies}
                                    onPlay={setPlayingMovie}
                                    onUploadToFolder={openUploadModal}
                                    onEdit={setEditingMovie}
                                    onDelete={confirmDelete}
                                    onAddPhotos={setAddingPhotosToMovie}
                                />
                            </div>
                        )}

                        {viewMode === 'TIMELINE' && (
                            <div className="animate-slide-up">
                                <TimelineView
                                    movies={filteredMovies}
                                    onPlay={setPlayingMovie}
                                    onEdit={setEditingMovie}
                                    onDelete={confirmDelete}
                                    onAddPhotos={setAddingPhotosToMovie}
                                />
                            </div>
                        )}
                    </>
                )}

            </div>

            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={closeUploadModal}
                onMovieCreated={handleMovieCreated}
                existingFolders={existingFolders}
                initialFolder={uploadModalInitialFolder}
            />

            <VideoPlayer
                movie={playingMovie}
                onClose={() => setPlayingMovie(null)}
            />

            {editingMovie && (
                <EditModal
                    movie={editingMovie}
                    isOpen={!!editingMovie}
                    onClose={() => setEditingMovie(null)}
                    onSave={handleMovieUpdated}
                    onDelete={confirmDelete}
                    existingFolders={existingFolders}
                />
            )}

            {addingPhotosToMovie && (
                <AddToAlbumModal
                    movie={addingPhotosToMovie}
                    isOpen={!!addingPhotosToMovie}
                    onClose={() => setAddingPhotosToMovie(null)}
                    onUpdated={(updated) => {
                        setMovies(prev => prev.map(m => m.id === updated.id ? updated : m));
                    }}
                />
            )}

            <DeleteConfirmModal
                isOpen={!!itemToDelete}
                title={itemToDelete?.title || ''}
                onClose={() => setItemToDelete(null)}
                onConfirm={() => itemToDelete && handleMovieDeleted(itemToDelete.id)}
            />
        </div>
    );
};

export default App;