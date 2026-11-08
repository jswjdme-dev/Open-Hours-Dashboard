import React, { useState } from 'react';
import { ChevronDown, Calendar, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GrowthHeaderProps {
  timeframe: string;
  onTimeframeChange: (range: string, label: string) => void;
}

export const GrowthHeader: React.FC<GrowthHeaderProps> = ({
  timeframe,
  onTimeframeChange,
}) => {
  const [timeframeEnabled, setTimeframeEnabled] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const timeframeOptions = [
    { label: 'Last 7 days', range: 'Sep 24 – Sep 30, 2026' },
    { label: 'Last 30 days', range: 'Sep 1 – Sep 30, 2026' },
    { label: 'This quarter', range: 'Jul 1 – Sep 30, 2026' },
    { label: 'Custom', range: 'Custom range' },
  ];

  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
      {/* Left: Big title + Demo data tag */}
      <div className="flex items-center gap-3">
        <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
          Growth report
        </h1>
        <span className="px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase bg-[#F8F9FB] text-[#667085] rounded-full border border-[#ECEEF2]">
          Demo data
        </span>
      </div>

      {/* Right: Dark toggle switch + Date-range pill */}
      <div className="flex items-center gap-3.5">
        {/* Dark toggle switch */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-[13px] font-medium text-[#667085]">Timeframe</span>
          <button
            type="button"
            role="switch"
            aria-checked={timeframeEnabled}
            onClick={() => setTimeframeEnabled(!timeframeEnabled)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] ${
              timeframeEnabled ? 'bg-[#101828]' : 'bg-[#D0D5DD]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                timeframeEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </label>

        {/* Date-range select pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-9 px-3.5 rounded-[10px] bg-white border border-[#D0D5DD] text-[13px] font-medium text-[#344054] flex items-center gap-2 shadow-xs hover:border-[#98A2B3] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50]"
            aria-expanded={dropdownOpen}
            aria-label="Select date range"
          >
            <Calendar size={14} className="text-[#667085]" />
            <span>{timeframe}</span>
            <ChevronDown size={14} className="text-[#667085]" />
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-52 bg-white rounded-[12px] shadow-lg border border-[#E8EAEE] p-1.5 z-30"
              >
                {timeframeOptions.map((opt) => {
                  const isSelected = timeframe === opt.range;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        onTimeframeChange(opt.range, opt.label);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-[8px] text-left font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#FEECEB] text-[#D92D50] font-semibold'
                          : 'text-[#101828] hover:bg-[#F2F4F7]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{opt.label}</div>
                        <div className="text-[11px] text-[#667085]">{opt.range}</div>
                      </div>
                      {isSelected && <Check size={14} className="text-[#D92D50]" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
