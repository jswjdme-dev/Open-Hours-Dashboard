import React from 'react';
import { ArrowLeft, Clock } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  category?: string;
  onBackToGrowthReport: () => void;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  category = 'Module',
  onBackToGrowthReport,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[520px] text-center p-8 bg-white/60 rounded-[28px] border border-black/5">
      <div className="w-16 h-16 rounded-2xl bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center mb-5 shadow-sm">
        <Clock size={28} />
      </div>

      <div className="text-xs font-bold text-[#D92D50] uppercase tracking-wider mb-2">
        {category}
      </div>

      <h2 className="text-2xl font-bold text-[#111111] mb-2 tracking-tight">
        {title}
      </h2>

      <p className="text-[#6B6B6B] text-[15px] max-w-md mb-8 leading-relaxed">
        Coming in Phase 2. The full clinic workflow, automated reporting, and campaign management for this section will be unlocked in the next release.
      </p>

      <button
        type="button"
        onClick={onBackToGrowthReport}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-[14px] font-medium transition-all duration-200 shadow-md cursor-pointer hover:scale-102"
      >
        <ArrowLeft size={16} />
        <span>Return to Growth report</span>
      </button>
    </div>
  );
};
