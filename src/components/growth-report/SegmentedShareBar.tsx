import React, { useState } from 'react';
import { Mail, Link2, Handshake, PhoneCall } from 'lucide-react';
import { GrowthReportData } from '../../types/index.ts';

interface SegmentedShareBarProps {
  segments: GrowthReportData['shareSegments'];
}

export const SegmentedShareBar: React.FC<SegmentedShareBarProps> = ({ segments }) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'mail':
        return <Mail size={13} className="text-[#6B6B6B]" />;
      case 'link':
        return <Link2 size={13} className="text-[#6B6B6B]" />;
      case 'handshake':
        return <Handshake size={13} className="text-[#6B6B6B]" />;
      case 'phone':
      default:
        return <PhoneCall size={13} className="text-[#6B6B6B]" />;
    }
  };

  return (
    <div className="w-full mb-6">
      <div className="w-full bg-[#F4F2F2] rounded-full p-1 flex items-center gap-1 shadow-inner border border-black/5 overflow-hidden">
        {segments.map((seg) => {
          return (
            <div
              key={seg.id}
              style={{ width: `${Math.max(seg.percentage, 12)}%` }}
              className="relative group transition-all duration-200"
              onMouseEnter={() => setHoveredSegment(seg.id)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="h-10 bg-white rounded-full px-3 flex items-center justify-between text-xs font-semibold text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-[#FCE9ED] transition-colors cursor-pointer whitespace-nowrap overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-[#F1EFEF] group-hover:bg-white flex items-center justify-center shrink-0">
                    {getIcon(seg.icon)}
                  </div>
                  <span className="font-bold tabular-nums">€{seg.amount.toLocaleString('en-IE')}</span>
                </div>
                <span className="text-[#6B6B6B] group-hover:text-[#D92D50] text-[11px] tabular-nums shrink-0">
                  {seg.percentage}%
                </span>
              </div>

              {/* Tooltip on hover */}
              {hoveredSegment === seg.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-[#111111] text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-lg z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-semibold">{seg.tooltip}</div>
                  <div className="text-[11px] text-white/70">
                    €{seg.amount.toLocaleString('en-IE')} · {seg.percentage}% of revenue
                  </div>
                  <div className="w-2 h-2 bg-[#111111] rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
