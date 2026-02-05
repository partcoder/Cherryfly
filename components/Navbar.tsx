import React, { useState, useEffect } from 'react';
import { Search, Layout, Grid, List, Plus } from 'lucide-react';
import { ViewMode } from '../types';

interface NavbarProps {
  onUploadClick: () => void;
  onSearch: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onUploadClick, onSearch, activeFilter, onFilterChange, viewMode, onViewChange }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Memories', value: 'ALL' },
    { label: 'Videos', value: 'VIDEO' },
    { label: 'Comics', value: 'COMIC' },
    { label: 'Photos', value: 'PHOTO' },
  ];

  return (
    <nav 
        className={`fixed top-0 w-full z-50 transition-colors duration-500 border-b ${
            isScrolled 
            ? 'bg-black/80 backdrop-blur-xl border-white/5' 
            : 'bg-transparent border-transparent'
        }`}
    >
      <div className="flex items-center justify-between px-4 md:px-12 py-3 md:py-4">
        <div className="flex items-center space-x-4 md:space-x-8">
          {/* Logo */}
          <div 
            className="flex items-center gap-1 cursor-pointer group"
            onClick={() => onFilterChange('ALL')}
          >
            <span className="text-red-600 text-xl md:text-3xl font-bold tracking-tighter group-hover:text-red-500 transition-colors drop-shadow-lg">CHERRYFLY</span>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex space-x-6 text-sm">
            {navItems.map((item) => (
                <span 
                    key={item.value}
                    onClick={() => onFilterChange(item.value)}
                    className={`cursor-pointer transition-all duration-300 px-3 py-1 rounded-full ${
                        activeFilter === item.value 
                        ? 'text-white font-bold bg-white/10 backdrop-blur-md border border-white/5' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {item.label}
                </span>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-6 text-white">
            {/* View Switcher (Desktop) */}
            <div className="hidden sm:flex items-center glass rounded-full p-1">
                <button 
                    onClick={() => onViewChange('STREAM')}
                    className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'STREAM' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    title="Stream View"
                >
                    <Layout size={16} />
                </button>
                <button 
                    onClick={() => onViewChange('FOLDERS')}
                    className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'FOLDERS' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    title="Folder View"
                >
                    <Grid size={16} />
                </button>
                <button 
                    onClick={() => onViewChange('TIMELINE')}
                    className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'TIMELINE' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    title="Timeline View"
                >
                    <List size={16} />
                </button>
            </div>

          {/* Search */}
          <div className={`flex items-center transition-all duration-300 rounded-full ${isSearchOpen ? 'glass pl-2 pr-3 py-1 absolute right-16 md:static md:right-auto z-50 bg-black/90 md:bg-transparent' : ''}`}>
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 hover:bg-white/10 rounded-full transition">
                <Search className="w-5 h-5 text-gray-300" />
            </button>
            <input 
                type="text" 
                placeholder="Search..." 
                className={`${isSearchOpen ? 'w-32 md:w-48 ml-2' : 'w-0'} bg-transparent border-none outline-none text-white text-sm transition-all duration-300 placeholder-gray-500`}
                onChange={(e) => onSearch(e.target.value)}
                onBlur={() => !isSearchOpen && setIsSearchOpen(false)}
            />
          </div>

          {/* Upload Button */}
          <button 
            onClick={onUploadClick}
            className="flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white w-8 h-8 md:w-auto md:h-auto md:px-4 md:py-2 rounded-full transition-all duration-300 hover:scale-105 group shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            title="Upload Memory"
          >
            <Plus size={18} className="md:mr-2" />
            <span className="hidden md:inline font-medium text-sm">Upload</span>
          </button>
          
          <div className="flex items-center space-x-2 cursor-pointer ml-1">
            <img 
              src="https://picsum.photos/seed/cherry/40/40" 
              alt="Profile" 
              className="rounded-full w-7 h-7 md:w-9 md:h-9 border-2 border-white/10 hover:border-white/30 transition shadow-lg"
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Menu / View Switcher */}
      <div className={`md:hidden border-t border-white/5 overflow-x-auto no-scrollbar transition-all duration-300 ${isScrolled ? 'bg-black/40 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="flex items-center justify-between px-4 py-2 gap-4">
             <div className="flex gap-2">
                 <button onClick={() => onViewChange('STREAM')} className={`${viewMode === 'STREAM' ? 'text-red-500 bg-white/10' : 'text-gray-400'} p-1.5 rounded-lg transition`}><Layout size={16}/></button>
                 <button onClick={() => onViewChange('FOLDERS')} className={`${viewMode === 'FOLDERS' ? 'text-red-500 bg-white/10' : 'text-gray-400'} p-1.5 rounded-lg transition`}><Grid size={16}/></button>
                 <button onClick={() => onViewChange('TIMELINE')} className={`${viewMode === 'TIMELINE' ? 'text-red-500 bg-white/10' : 'text-gray-400'} p-1.5 rounded-lg transition`}><List size={16}/></button>
             </div>
             <div className="flex gap-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                 {navItems.slice(1).map(item => (
                     <span key={item.value} onClick={() => onFilterChange(item.value)} className={`${activeFilter === item.value ? 'text-white' : ''} cursor-pointer`}>
                         {item.label}
                     </span>
                 ))}
             </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;