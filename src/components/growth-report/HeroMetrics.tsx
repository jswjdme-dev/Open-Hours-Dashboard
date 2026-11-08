import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Star,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import { GrowthReportData } from '../../types/index.ts';

interface HeroMetricsProps {
  data: GrowthReportData['hero'];
  timeframe: string;
}

export const HeroMetrics: React.FC<HeroMetricsProps> = ({ data, timeframe }) => {
  // Format revenue: split integer and decimal
  const formattedRevenue = Math.floor(data.revenue).toLocaleString('en-IE');
  const formattedPrev = data.previousRevenue.toLocaleString('en-IE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedDiff = data.growthDiff.toLocaleString('en-IE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 items-stretch">
      {/* Left Block: Hero Revenue Metric */}
      <div className="lg:col-span-6 flex flex-col justify-between py-1">
        <div>
          <span className="section-pill-label mb-2 inline-flex">
            Revenue
          </span>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Big Hero Number */}
            <div className="text-[52px] sm:text-[56px] font-semibold tracking-[-0.03em] leading-none text-[#0A0A0A] tabular-nums">
              €{formattedRevenue}
              <span className="text-[#B4B4B9] font-normal">.00</span>
            </div>

            {/* Red Badge 1: Trend */}
            <div className="h-7 px-2.5 rounded-full bg-[var(--color-accent)] text-white text-[13px] font-bold flex items-center gap-1 shadow-2xs">
              <span className="text-[10px]">▲</span>
              <span>{data.growthPercent}%</span>
            </div>

            {/* Red Badge 2: Growth Delta */}
            <div className="h-7 px-2.5 rounded-full bg-[var(--color-accent)] text-white text-[13px] font-semibold flex items-center shadow-2xs">
              <span>€{formattedDiff}</span>
            </div>
          </div>
        </div>

        {/* Subtitle comparison row */}
        <div className="flex items-center gap-2 text-xs text-[#73737A] mt-2 flex-wrap">
          <span>vs prev. €{formattedPrev}</span>
          <div className="flex items-center gap-1 font-semibold text-[#0A0A0A] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
            <span>{timeframe}</span>
            <ChevronDown size={12} />
          </div>
        </div>
      </div>

      {/* Right Block: Three Deterministic KPI Cards */}
      <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* 1. Ink Card: Top channel */}
        <div className="bg-[#0A0A0A] text-white rounded-[20px] p-4.5 flex flex-col justify-between shadow-2xs transition-all">
          <div>
            <div className="mb-2">
              <span className="section-pill-label-dark">
                Top channel
              </span>
            </div>
            <div className="text-[34px] font-semibold tracking-tight text-white leading-none tabular-nums mt-1">
              {data.topChannel.replies}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-[6px] bg-white/20 text-white text-[9px] font-bold flex items-center justify-center">
                {data.topChannel.code}
              </span>
              <span className="text-[13px] font-medium text-white/90">
                {data.topChannel.name}
              </span>
            </div>
            <ChevronRight size={14} className="text-white/60" />
          </div>
        </div>

        {/* 2. Deep Blue Card: Best deal */}
        <div className="bg-[#1627E8] text-white rounded-[20px] p-4.5 flex flex-col justify-between shadow-2xs transition-all group">
          <div className="flex items-start justify-between">
            <span className="section-pill-label-dark">
              Best deal
            </span>
            <div className="w-6 h-6 rounded-[6px] bg-white/20 text-white flex items-center justify-center">
              <Star size={13} className="fill-white text-white" />
            </div>
          </div>

          <div className="my-1">
            <div className="text-[30px] font-bold tracking-tight text-white leading-tight tabular-nums">
              €{data.bestDeal.amount.toLocaleString('en-IE')}
            </div>
            <div className="text-[13px] font-medium text-white/80 truncate mt-0.5">
              {data.bestDeal.clientName}
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white text-white hover:text-[#0A0A0A] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="View best deal details"
            >
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* 3. Neutral Grey Card: Leads */}
        <div className="bg-[#C9C9CC] text-[#0A0A0A] rounded-[20px] p-4.5 flex flex-col justify-between shadow-2xs transition-all">
          <div>
            <div className="mb-2">
              <span className="section-pill-label">
                Leads
              </span>
            </div>
            <div className="inline-flex items-center text-[34px] font-semibold text-[#0A0A0A] leading-none tabular-nums mt-1">
              {data.leads.total}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#0A0A0A]/10 text-[13px] text-[#0A0A0A] font-semibold">
            <Flame size={14} className="text-[var(--color-accent)] fill-[var(--color-accent)]" />
            <span>{data.leads.hot} hot</span>
            <ChevronDown size={13} className="text-[#0A0A0A]/60 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
