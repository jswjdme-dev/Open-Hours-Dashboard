import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Mail, Phone, Link2, Flame, ArrowRight, AlertCircle } from 'lucide-react';
import { Lead } from '../../types/index.ts';

interface KanbanCardProps {
  lead: Lead;
  onOpenDrawer: (leadId: string) => void;
  onConvertClick?: (lead: Lead) => void;
  isStale?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  lead,
  onOpenDrawer,
  onConvertClick,
  isStale = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) ${
          isDragging ? 'rotate(3deg) scale(1.03)' : ''
        }`,
        zIndex: isDragging ? 999 : undefined,
      }
    : undefined;

  // Calculate days in stage
  const createdDate = new Date(lead.createdAt).getTime();
  const daysInStage = Math.max(1, Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24)));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDrawer(lead.id)}
      className={`rounded-[12px] p-3.5 border transition-all cursor-grab active:cursor-grabbing select-none group relative ${
        isDragging
          ? 'bg-white shadow-[0_12px_24px_-4px_rgba(16,24,40,0.12)] border-[#D92D50] ring-2 ring-[#D92D50]/20 z-50'
          : 'bg-white border-[#ECEEF2] hover:border-[#D0D5DD] shadow-[0_1px_2px_rgba(16,24,40,0.03)] hover:-translate-y-0.5'
      }`}
    >
      {/* Stale dot: amber dot if no activity for 7+ days in active stage */}
      {isStale && (
        <span
          title="No activity for 7+ days"
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white shadow-2xs"
        />
      )}

      {/* Header: Specialty + Score */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
          {lead.specialty} · {lead.city}
        </span>

        <span
          className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-0.5 ${
            lead.score.isDisqualified
              ? 'bg-[#F2F4F7] text-[#667085]'
              : lead.score.band === 'HOT'
              ? 'bg-[#FEECEB] text-[#D92D50]'
              : lead.score.band === 'WARM'
              ? 'bg-[#FEF0C7] text-[#B54708]'
              : 'bg-[#F2F4F7] text-[#667085]'
          }`}
        >
          {!lead.score.isDisqualified && lead.score.band === 'HOT' && (
            <Flame size={10} className="fill-[#D92D50]" />
          )}
          <span>{lead.score.isDisqualified ? 'Disq' : lead.score.band}</span>
        </span>
      </div>

      {/* Business Name */}
      <h4 className="font-semibold text-[14px] text-[#101828] group-hover:text-[#D92D50] transition-colors leading-tight mb-2">
        {lead.businessName}
      </h4>

      {/* Owner name & reviews */}
      <div className="flex items-center justify-between text-[12px] text-[#475467] mb-2.5">
        <span className="truncate max-w-[120px] font-medium">{lead.ownerName}</span>
        <span className="font-mono text-[11px] font-medium text-[#667085]">
          ⭐ {lead.googleRating}
        </span>
      </div>

      {/* Bottom Footer: Channels, Days in Stage & Owner Avatar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F2F4F7] text-[11px]">
        {/* Channel icons */}
        <div className="flex items-center gap-1">
          {lead.channels.slice(0, 2).map((c) => (
            <span
              key={c.id}
              className="w-4 h-4 rounded-[4px] bg-[#F2F4F7] flex items-center justify-center text-[#667085]"
            >
              {c.type === 'Email' ? <Mail size={9} /> : <Phone size={9} />}
            </span>
          ))}
          <span className="text-[#667085] pl-1 font-semibold">{daysInStage}d</span>
        </div>

        {/* Assigned Owner Avatar */}
        <div className="flex items-center gap-1.5">
          {lead.stage === 'Won' && onConvertClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConvertClick(lead);
              }}
              className="px-2 py-0.5 rounded-[6px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[9px] font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Convert</span>
              <ArrowRight size={8} />
            </button>
          )}

          <span
            className="w-5 h-5 rounded-full bg-[#101828] text-white text-[9px] font-bold flex items-center justify-center"
            title={`Assigned to ${lead.assignedTo}`}
          >
            {lead.assignedTo.charAt(0)}
          </span>
        </div>
      </div>
    </div>
  );
};
