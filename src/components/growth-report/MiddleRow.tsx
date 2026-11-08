import React, { useState } from 'react';
import {
  ListFilter,
  SlidersHorizontal,
  ChevronDown,
  BarChart2,
  Mail,
  Link2,
  Handshake,
  PhoneCall,
  Smile,
  Activity,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { GrowthReportData } from '../../types/index.ts';

interface MiddleRowProps {
  data: GrowthReportData;
}

export const MiddleRow: React.FC<MiddleRowProps> = ({ data }) => {
  const [activeFilterCol1, setActiveFilterCol1] = useState(false);
  const [activeFilterCol2, setActiveFilterCol2] = useState(false);

  const getSourceIcon = (iconName: string) => {
    switch (iconName) {
      case 'mail':
        return <Mail size={15} className="text-[#D92D50]" />;
      case 'link':
        return <Link2 size={15} className="text-[#D92D50]" />;
      case 'handshake':
        return <Handshake size={15} className="text-[#D92D50]" />;
      case 'phone':
      default:
        return <PhoneCall size={15} className="text-[#D92D50]" />;
    }
  };

  const getSpecialtyIcon = (iconName: string) => {
    switch (iconName) {
      case 'smile':
        return <Smile size={16} className="text-[#111111]" />;
      case 'activity':
        return <Activity size={16} className="text-[#111111]" />;
      case 'sparkles':
        return <Sparkles size={16} className="text-[#111111]" />;
      case 'stethoscope':
      default:
        return <Stethoscope size={16} className="text-[#111111]" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6 items-stretch">
      {/* COLUMN 1: Revenue by source */}
      <div className="bg-white rounded-[16px] p-5 flex flex-col justify-between border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#F2F4F7] flex items-center justify-center text-[#101828]">
              <ListFilter size={15} />
            </div>
            <button
              type="button"
              className="flex items-center gap-1 font-semibold text-[15px] text-[#101828] hover:text-[#D92D50] transition-colors cursor-pointer"
            >
              <span>Revenue by source</span>
              <ChevronDown size={14} className="text-[#667085]" />
            </button>
          </div>

          {/* Filters pill */}
          <button
            type="button"
            onClick={() => setActiveFilterCol1(!activeFilterCol1)}
            className={`h-7 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilterCol1
                ? 'bg-[#101828] text-white'
                : 'bg-white text-[#667085] hover:text-[#101828] border border-[#D0D5DD]'
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>Filters</span>
          </button>
        </div>

        {/* 4 Inner Rows */}
        <div className="space-y-2 flex-1 flex flex-col justify-center">
          {data.revenueBySource.map((source) => (
            <div
              key={source.id}
              className="bg-[#F8F9FA] rounded-[12px] px-3.5 py-2.5 flex items-center justify-between border border-[#EAECF0] hover:border-[#D0D5DD] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-[6px] bg-[#FEECEB] flex items-center justify-center shrink-0">
                  {getSourceIcon(source.icon)}
                </div>
                <span className="text-[13px] font-medium text-[#101828]">
                  {source.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#101828] tabular-nums">
                  €{source.amount.toLocaleString('en-IE')}
                </span>
                <span className="px-2 py-0.5 bg-white border border-[#EAECF0] text-[#667085] rounded-full text-[11px] font-medium tabular-nums">
                  {source.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMN 2: Clients by specialty (Hatched & Solid Bars) */}
      <div className="bg-white rounded-[16px] p-5 flex flex-col justify-between border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#F2F4F7] flex items-center justify-center text-[#101828]">
              <BarChart2 size={15} />
            </div>
            <span className="font-semibold text-[15px] text-[#101828]">Specialties</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveFilterCol2(!activeFilterCol2)}
            className={`h-7 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilterCol2
                ? 'bg-[#101828] text-white'
                : 'bg-white text-[#667085] hover:text-[#101828] border border-[#D0D5DD]'
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>Filters</span>
          </button>
        </div>

        {/* 4 Tall Vertical Bars */}
        <div className="flex-1 flex items-end justify-between px-3 pt-6 pb-2 min-h-[170px] gap-3">
          {data.clientsBySpecialty.map((item) => {
            // Scale bar height proportionally
            const heightPercent = Math.max(item.percentage * 1.8, 32);
            return (
              <div key={item.id} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Floating Icon Tile above the bar */}
                <div className="w-8 h-8 rounded-[8px] bg-[#F8F9FA] shadow-xs flex items-center justify-center mb-2 group-hover:scale-105 transition-transform border border-[#EAECF0]">
                  {getSpecialtyIcon(item.icon)}
                </div>

                {/* Vertical Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[42px] rounded-t-[12px] transition-all duration-300 relative border border-[#EAECF0] ${
                    item.isHatched
                      ? 'bg-hatched bg-[#F2F4F7]'
                      : 'bg-[#D92D50]'
                  }`}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#101828] text-white text-[10px] rounded font-semibold whitespace-nowrap z-20 pointer-events-none">
                    {item.count} clinics ({item.percentage}%)
                  </div>
                </div>

                <span className="text-[12px] font-medium text-[#667085] mt-2 group-hover:text-[#101828]">
                  {item.specialty}
                </span>
              </div>
            );
          })}
        </div>

        {/* Caption below with chevron-down */}
        <div className="pt-2 border-t border-[#F2F4F7] flex items-center justify-center">
          <button
            type="button"
            className="flex items-center gap-1 text-[12px] font-medium text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
          >
            <span>Clients by specialty</span>
            <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* COLUMN 3: Team Outreach Table & Work with Channels */}
      <div className="bg-white rounded-[16px] p-5 flex flex-col justify-between border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] overflow-hidden">
        {/* Top: Team Outreach Table */}
        <div>
          <div className="grid grid-cols-12 text-[11px] font-semibold text-[#A8A5A5] uppercase tracking-wider mb-2 px-1">
            <span className="col-span-5">Team</span>
            <span className="col-span-3 text-right">Revenue</span>
            <span className="col-span-4 text-right">Outreach</span>
          </div>

          <div className="space-y-1.5 mb-3">
            {data.teamPerformance.map((member) => (
              <div
                key={member.id}
                className="bg-[#F8F9FA] rounded-[10px] px-2.5 py-1.5 grid grid-cols-12 items-center text-xs border border-[#EAECF0]"
              >
                {/* Name with initials circle */}
                <div className="col-span-5 flex items-center gap-1.5 truncate">
                  <span className="w-5 h-5 rounded-[4px] bg-[#101828] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                    {member.initials}
                  </span>
                  <span className="font-medium text-[#101828] truncate">{member.name}</span>
                </div>

                {/* Revenue */}
                <div className="col-span-3 text-right font-semibold text-[#101828] tabular-nums">
                  €{member.revenue.toLocaleString('en-IE')}
                </div>

                {/* Outreach Pills: Black pill = replies, Grey pill = sent */}
                <div className="col-span-4 flex items-center justify-end gap-1 tabular-nums">
                  <span
                    className="px-1.5 py-0.5 bg-[#101828] text-white rounded-full text-[10px] font-semibold"
                    title="Replies received"
                  >
                    {member.replies}
                  </span>
                  <span
                    className="px-1.5 py-0.5 bg-[#EAECF0] text-[#667085] rounded-full text-[10px] font-semibold"
                    title="Messages sent"
                  >
                    {member.messagesSent}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tiny Legend */}
          <div className="flex items-center justify-end gap-3 text-[11px] font-medium text-[#667085] mb-2 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#101828]" /> Replies
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#EAECF0]" /> Sent
            </span>
          </div>

          {/* 3 Small Pills */}
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] text-[11px] font-medium text-[#101828] border border-[#EAECF0]">
              Top closer 💪
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] text-[11px] font-medium text-[#101828] border border-[#EAECF0]">
              Reply streak 🔥
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] text-[11px] font-medium text-[#101828] border border-[#EAECF0]">
              Top reviewer ⭐
            </span>
          </div>
        </div>

        {/* Bottom Section: Work with channels */}
        <div className="pt-2 border-t border-[#F2F4F7]">
          <div className="text-[13px] font-semibold text-[#101828] mb-2">
            Work with channels
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {data.channelCards.map((card) => (
              <div
                key={card.id}
                className="min-w-[130px] flex-1 bg-[#F8F9FA] rounded-[12px] p-2.5 border border-[#EAECF0] relative overflow-hidden flex flex-col justify-between shrink-0"
              >
                {/* Hatched strip on one side */}
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-hatched opacity-60" />

                <div className="text-[11px] font-medium text-[#667085] mb-1">
                  {card.title}
                </div>

                <div>
                  <div className="text-base font-semibold text-[#101828] leading-none tabular-nums">
                    {card.percentage}%
                  </div>
                  <div className="text-[12px] font-medium text-[#667085] mt-1 tabular-nums">
                    €{card.revenue.toLocaleString('en-IE')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
