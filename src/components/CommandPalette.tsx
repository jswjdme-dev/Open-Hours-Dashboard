import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building, Navigation, ArrowRight } from 'lucide-react';
import { searchApp } from '../data/repo.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (targetId: string, label: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ title: string; category: string; targetId: string }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      searchApp('').then(setResults);
      // Auto focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      searchApp(query).then((res) => {
        setResults(res);
        setSelectedIndex(0);
      });
    }
  }, [query, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        const item = results[selectedIndex];
        onSelect(item.targetId, item.title);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelect]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-black/10 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/5 gap-3">
          <Search size={19} className="text-[#A8A5A5] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, reports, or navigation..."
            className="w-full bg-transparent text-[15px] text-[#111111] placeholder-[#A8A5A5] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#A8A5A5] hover:text-[#111111] p-1"
              aria-label="Clear query"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono font-medium text-[#6B6B6B] bg-[#F1EFEF] rounded border border-black/5">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B6B6B]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[#A8A5A5] uppercase tracking-wider">
                {query ? 'Results' : 'Suggested & Quick Jump'}
              </div>
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isClient = item.category === 'Client';
                return (
                  <button
                    key={item.targetId + idx}
                    type="button"
                    onClick={() => {
                      onSelect(item.targetId, item.title);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#FCE9ED] text-[#D92D50]'
                        : 'text-[#111111] hover:bg-[#F4F2F2]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#D92D50] text-white' : 'bg-[#F1EFEF] text-[#6B6B6B]'
                        }`}
                      >
                        {isClient ? <Building size={14} /> : <Navigation size={14} />}
                      </div>
                      <span className="font-medium truncate">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-[#A8A5A5] uppercase">{item.category}</span>
                      <ArrowRight size={13} className={isSelected ? 'text-[#D92D50]' : 'text-transparent'} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 bg-[#FBFBFB] border-t border-black/5 flex items-center justify-between text-[11px] text-[#A8A5A5]">
          <div className="flex items-center gap-2">
            <span>Navigate <kbd className="px-1 py-0.5 bg-white border border-black/10 rounded">↑</kbd> <kbd className="px-1 py-0.5 bg-white border border-black/10 rounded">↓</kbd></span>
            <span>·</span>
            <span>Select <kbd className="px-1 py-0.5 bg-white border border-black/10 rounded">↵</kbd></span>
          </div>
          <span>Open Hours Console</span>
        </div>
      </div>
    </div>
  );
};
