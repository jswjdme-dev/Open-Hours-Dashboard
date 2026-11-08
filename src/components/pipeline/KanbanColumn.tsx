import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Lead, LeadStage } from '../../types/index.ts';
import { KanbanCard } from './KanbanCard.tsx';

interface KanbanColumnProps {
  stage: LeadStage | string;
  stageType?: string;
  leads: Lead[];
  totalLeadsCount: number;
  onOpenDrawer: (leadId: string) => void;
  onConvertClick: (lead: Lead) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  leads,
  totalLeadsCount,
  onOpenDrawer,
  onConvertClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { stage },
  });

  const sharePercent = totalLeadsCount > 0 ? Math.round((leads.length / totalLeadsCount) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 flex flex-col rounded-[16px] p-3.5 border transition-colors ${
        isOver
          ? 'bg-[#FEECEB]/60 border-[#D92D50]'
          : 'bg-[#F2F4F7] border-[#E4E7EC]'
      }`}
    >
      {/* Column Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13px] text-[#101828]">{stage}</span>
            <span className="w-5 h-5 rounded-full bg-white text-[11px] font-semibold text-[#667085] flex items-center justify-center border border-[#E4E7EC] shadow-2xs">
              {leads.length}
            </span>
          </div>
          <span className="text-[12px] text-[#667085] font-semibold">{sharePercent}%</span>
        </div>

        {/* Hatched progress strip showing share of total */}
        <div className="w-full h-1.5 bg-white/70 rounded-full overflow-hidden border border-[#E4E7EC]">
          <div
            style={{ width: `${Math.max(sharePercent, 4)}%` }}
            className="h-full bg-hatched bg-[#D92D50] rounded-full"
          />
        </div>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[420px] max-h-[640px] pr-0.5 custom-scrollbar">
        {leads.length === 0 ? (
          <div className="h-28 flex items-center justify-center border border-dashed border-[#D0D5DD] rounded-[12px] text-[13px] text-[#667085] font-medium text-center p-3">
            Drop leads here
          </div>
        ) : (
          leads.map((lead) => {
            // Check stale: > 7 days since lastActivityAt
            const lastDate = lead.lastActivityAt ? new Date(lead.lastActivityAt).getTime() : 0;
            const daysSinceActivity = lastDate ? (Date.now() - lastDate) / (1000 * 60 * 60 * 24) : 99;
            const isStale = daysSinceActivity >= 7 && stage !== 'Won' && stage !== 'Lost';

            return (
              <KanbanCard
                key={lead.id}
                lead={lead}
                onOpenDrawer={onOpenDrawer}
                onConvertClick={onConvertClick}
                isStale={isStale}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
