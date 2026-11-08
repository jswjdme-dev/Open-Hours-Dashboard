import React, { useEffect } from 'react';
import { Search } from 'lucide-react';

interface TopSearchProps {
  onOpenCommandPalette: () => void;
}

export const TopSearch: React.FC<TopSearchProps> = ({ onOpenCommandPalette }) => {
  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  return (
    <div className="w-full flex items-center justify-start mb-6">
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="w-full max-w-[480px] h-[46px] bg-white rounded-full px-5 flex items-center gap-3 text-left shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-black/5 hover:border-black/15 transition-all duration-200 cursor-pointer group focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none"
        aria-label="Open search dialog"
      >
        <Search size={18} className="text-[#A8A5A5] group-hover:text-[#111111] transition-colors shrink-0" />
        <span className="text-[14px] text-[#A8A5A5] group-hover:text-[#6B6B6B] transition-colors truncate">
          Try searching &ldquo;clients&rdquo;
        </span>
        <div className="ml-auto hidden sm:flex items-center gap-1">
          <kbd className="px-2 py-0.5 text-[11px] font-mono text-[#A8A5A5] bg-[#F4F2F2] rounded-md border border-black/5 group-hover:text-[#6B6B6B]">
            ⌘K
          </kbd>
        </div>
      </button>
    </div>
  );
};
