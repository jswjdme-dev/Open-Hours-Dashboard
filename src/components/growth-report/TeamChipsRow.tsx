import React from 'react';
import { Plus } from 'lucide-react';
import { TeamMember } from '../../types/index.ts';
import { LogoMark } from '../common/LogoMark.tsx';

interface TeamChipsRowProps {
  teamMembers: TeamMember[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  onAddMember?: () => void;
}

export const TeamChipsRow: React.FC<TeamChipsRowProps> = ({
  teamMembers,
  selectedMemberId,
  onSelectMember,
  onAddMember,
}) => {
  return (
    <div className="flex items-center gap-2.5 mb-6 flex-wrap">
      {/* Circular outlined "+" button */}
      <button
        type="button"
        onClick={onAddMember}
        className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center text-[#111111] hover:border-black hover:bg-white/60 transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50]"
        aria-label="Add team member"
      >
        <Plus size={15} />
      </button>

      {/* Team member pills */}
      {teamMembers.map((member) => {
        const isSelected = selectedMemberId === member.id;
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelectMember(member.id)}
            className={`h-8 rounded-full px-2.5 pl-1.5 flex items-center gap-2 text-xs font-semibold transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] ${
              isSelected
                ? 'bg-[#111111] text-white shadow-sm'
                : 'bg-white text-[#111111] border border-black/5 hover:border-black/15 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-[#F1EFEF] text-[#111111]'
              }`}
            >
              {member.initials}
            </span>
            <span className="pr-1">{member.name}</span>
          </button>
        );
      })}

      {/* Black circle chip with logo mark (= whole company, selected by default) */}
      <button
        type="button"
        onClick={() => onSelectMember('all')}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] ${
          selectedMemberId === 'all'
            ? 'bg-[#111111] text-white ring-2 ring-[#111111] ring-offset-2'
            : 'bg-white text-[#111111] border border-black/10 hover:border-black/30'
        }`}
        aria-label="All company"
        title="Entire Company"
      >
        <LogoMark size={14} />
      </button>
    </div>
  );
};
