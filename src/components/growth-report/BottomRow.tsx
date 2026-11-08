import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GrowthReportData } from '../../types/index.ts';

interface BottomRowProps {
  data: GrowthReportData;
  onTabChange: (tab: 'Revenue' | 'Leads' | 'Win/Loss') => void;
  activeTab: 'Revenue' | 'Leads' | 'Win/Loss';
}

export const BottomRow: React.FC<BottomRowProps> = ({
  data,
  onTabChange,
  activeTab,
}) => {
  const [selectedChannel, setSelectedChannel] = useState('LinkedIn outreach');
  const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ week: string; current: number; prev: number } | null>(null);
  const [hoveredSliderMarker, setHoveredSliderMarker] = useState<string | null>(null);

  const channelsList = [
    'LinkedIn outreach',
    'Cold email',
    'Partner referrals',
    'Phone & other',
  ];

  // Pipeline points
  const pipelineWeeks = data.pipelineDynamic.weeklyData;
  const maxCurrent = Math.max(...pipelineWeeks.map((d) => d.current));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
      {/* LEFT (WIDE): Channel value Card */}
      <div className="xl:col-span-8 bg-white rounded-[16px] p-5 flex flex-col justify-between border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          {/* Left: Small crimson circular icon + label + select */}
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#D92D50] flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-white" />
            </div>

            <span className="text-[13px] font-medium text-[#667085]">
              Channel value
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setChannelDropdownOpen(!channelDropdownOpen)}
                className="flex items-center gap-1 font-semibold text-[15px] text-[#101828] hover:text-[#D92D50] transition-colors cursor-pointer"
                aria-expanded={channelDropdownOpen}
              >
                <span>{selectedChannel}</span>
                <ChevronDown size={14} className="text-[#667085]" />
              </button>

              <AnimatePresence>
                {channelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 top-7 w-44 bg-white rounded-[12px] shadow-lg border border-[#E8EAEE] p-1.5 z-30"
                  >
                    {channelsList.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          setSelectedChannel(ch);
                          setChannelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-[8px] text-xs font-semibold ${
                          selectedChannel === ch
                            ? 'bg-[#FEECEB] text-[#D92D50]'
                            : 'text-[#101828] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Segmented tabs [Revenue | Leads | Win/Loss] */}
          <div className="flex items-center p-1 bg-[#F2F4F7] rounded-full border border-[#EAECF0]">
            {(['Revenue', 'Leads', 'Win/Loss'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#101828] shadow-xs'
                      : 'text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  {tab === 'Win/Loss' ? 'W/L' : tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body: Crimson card on left + Bar Chart on right */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 flex-1">
          {/* Crimson Feature Card */}
          <div className="w-full md:w-44 bg-[#D92D50] text-white rounded-[12px] p-4 flex flex-row md:flex-col justify-between shadow-xs relative overflow-hidden shrink-0">
            {/* Background subtle light hatched decoration */}
            <div className="absolute inset-0 bg-hatched-white opacity-15 pointer-events-none" />

            {/* Vertical rotated label or top kicker */}
            <div className="relative z-10">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-white/70 block mb-2">
                Average monthly
              </span>

              <div className="space-y-2.5">
                <div>
                  <div className="text-[10px] text-white/75 font-medium">Revenue</div>
                  <div className="text-lg font-bold tracking-tight tabular-nums">
                    €{data.channelValue.stats.revenue.toLocaleString('en-IE')}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-white/75 font-medium">Leads</div>
                  <div className="text-base font-bold tabular-nums">
                    {data.channelValue.stats.leadsTotal}
                    <span className="text-[11px] font-normal text-white/80 ml-1.5">
                      {data.channelValue.stats.leadsQualified}/{data.channelValue.stats.leadsClosed}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-white/75 font-medium">Win/Loss</div>
                  <div className="text-base font-bold tabular-nums">
                    {data.channelValue.stats.winLoss}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="flex-1 bg-transparent flex flex-col justify-between relative pt-6 pb-1 pl-2 pr-12 min-h-[170px]">
            {/* SVG Pattern Definition for Hatched Bars */}
            <svg className="absolute w-0 h-0">
              <defs>
                <pattern
                  id="hatchPattern"
                  width="8"
                  height="8"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0, 0, 0, 0.12)" strokeWidth="2.5" />
                </pattern>
              </defs>
            </svg>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            <div className="absolute inset-0 right-12 flex flex-col justify-between pointer-events-none py-6 pl-2">
              <div className="border-b border-[#EAECF0] w-full" />
              <div className="border-b border-[#EAECF0] w-full" />
              <div className="border-b border-[#EAECF0] w-full" />
              <div className="border-b border-[#EAECF0] w-full" />
            </div>

            {/* Right-side y-axis labels in muted grey */}
            <div className="absolute right-0 top-6 bottom-6 flex flex-col justify-between text-[11px] font-mono text-[#667085] font-medium text-right pointer-events-none tabular-nums">
              <span>{activeTab === 'Revenue' ? '€1,450' : activeTab === 'Leads' ? '100' : '25'}</span>
              <span>{activeTab === 'Revenue' ? '€1,100' : activeTab === 'Leads' ? '75' : '18'}</span>
              <span>{activeTab === 'Revenue' ? '€750' : activeTab === 'Leads' ? '50' : '12'}</span>
              <span>{activeTab === 'Revenue' ? '€400' : activeTab === 'Leads' ? '25' : '5'}</span>
            </div>

            {/* Bars container */}
            <div className="flex-1 flex items-end justify-around relative z-10 gap-2 h-full">
              {data.channelValue.monthlyBars.map((bar, i) => {
                // Max normalized value
                const maxVal = activeTab === 'Revenue' ? 1450 : activeTab === 'Leads' ? 100 : 25;
                const barHeight = Math.min(Math.max((bar.value / maxVal) * 100, 15), 95);

                return (
                  <div
                    key={bar.month + i}
                    className="flex-1 max-w-[46px] flex flex-col items-center justify-end h-full relative group"
                  >
                    {/* Crimson tooltip pill above highest bars */}
                    {bar.tooltipPill && (
                      <div className="absolute -top-4 px-2 py-0.5 rounded-full bg-[#D92D50] text-white text-[10px] font-bold shadow-xs whitespace-nowrap z-20 animate-in fade-in duration-200">
                        {bar.tooltipPill}
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      style={{ height: `${barHeight}%` }}
                      className={`w-full rounded-t-[8px] transition-all duration-300 relative border border-[#EAECF0] ${
                        bar.isHatched
                          ? 'bg-hatched bg-[#F2F4F7]'
                          : 'bg-[#D92D50]'
                      }`}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#101828] text-white text-[9px] rounded font-bold whitespace-nowrap z-20 pointer-events-none">
                        {bar.month}: {bar.value}
                      </div>
                    </div>

                    <span className="text-[11px] font-medium text-[#667085] mt-1.5">
                      {bar.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Pipeline dynamic Card */}
      <div className="xl:col-span-4 bg-white rounded-[16px] p-5 flex flex-col justify-between border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div>
          {/* Title */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-[#111111]">
              Pipeline dynamic
            </h3>
            <span className="text-[11px] font-semibold text-[#A8A5A5]">
              W1 – W7
            </span>
          </div>

          {/* Line Chart Area */}
          <div className="relative w-full h-[140px] pt-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 280 120"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Soft crimson-to-transparent area fill */}
                <linearGradient id="crimsonGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D92D50" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#D92D50" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area under solid line */}
              <polygon
                points="0,110 0,65 46,55 92,60 138,35 184,45 230,22 276,12 280,12 280,110"
                fill="url(#crimsonGradient)"
              />

              {/* Faint dashed line for previous period */}
              <path
                d="M 0,85 C 46,75 92,70 138,62 C 184,55 230,48 276,38"
                fill="none"
                stroke="#A8A5A5"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                strokeOpacity="0.6"
              />

              {/* Solid crimson curve */}
              <path
                d="M 0,65 C 46,55 92,60 138,35 C 184,45 230,22 276,12"
                fill="none"
                stroke="#D92D50"
                strokeWidth="2.6"
                strokeLinecap="round"
              />

              {/* Data points */}
              {[
                { cx: 0, cy: 65, w: 'W1', val: 1200, prev: 980 },
                { cx: 46, cy: 55, w: 'W2', val: 1450, prev: 1120 },
                { cx: 92, cy: 60, w: 'W3', val: 1380, prev: 1280 },
                { cx: 138, cy: 35, w: 'W4', val: 1890, prev: 1400 },
                { cx: 184, cy: 45, w: 'W5', val: 1720, prev: 1510 },
                { cx: 230, cy: 22, w: 'W6', val: 2150, prev: 1690 },
                { cx: 276, cy: 12, w: 'W7', val: 2410, prev: 1820 },
              ].map((pt) => (
                <circle
                  key={pt.w}
                  cx={pt.cx}
                  cy={pt.cy}
                  r="3.5"
                  fill="#FFFFFF"
                  stroke="#D92D50"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-5 transition-all"
                  onMouseEnter={() => setHoveredPoint({ week: pt.w, current: pt.val, prev: pt.prev })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            {/* Hover Tooltip for Line Chart */}
            {hoveredPoint && (
              <div className="absolute top-1 right-2 px-2.5 py-1 bg-[#111111] text-white text-[11px] rounded-lg shadow-lg z-20 pointer-events-none">
                <span className="font-bold">{hoveredPoint.week}:</span> €{hoveredPoint.current} (prev €{hoveredPoint.prev})
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Gradient Slider Track (crimson to green) with two round markers */}
        <div className="mt-4 pt-3 border-t border-black/5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B6B6B] mb-2">
            <span>Velocity Index</span>
            <span className="text-[#111111] font-bold">W4 — W7 Focus</span>
          </div>

          <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-[#D92D50] via-amber-400 to-emerald-500 shadow-inner">
            {/* Marker 1 (W4 position ~ 45%) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-[45%] -translate-x-1/2 cursor-pointer group"
              onMouseEnter={() => setHoveredSliderMarker('W4')}
              onMouseLeave={() => setHoveredSliderMarker(null)}
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-[#111111] shadow-md group-hover:scale-125 transition-transform" />
              {hoveredSliderMarker === 'W4' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-[#111111] text-white text-[10px] font-bold rounded whitespace-nowrap shadow-md pointer-events-none">
                  Week 4 (€1,890)
                </div>
              )}
            </div>

            {/* Marker 2 (W7 position ~ 92%) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-[92%] -translate-x-1/2 cursor-pointer group"
              onMouseEnter={() => setHoveredSliderMarker('W7')}
              onMouseLeave={() => setHoveredSliderMarker(null)}
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-emerald-600 shadow-md group-hover:scale-125 transition-transform" />
              {hoveredSliderMarker === 'W7' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-[#111111] text-white text-[10px] font-bold rounded whitespace-nowrap shadow-md pointer-events-none">
                  Week 7 Peak (€2,410)
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#A8A5A5] mt-2">
            <span>Outreach Launch</span>
            <span>Target Velocity</span>
          </div>
        </div>
      </div>
    </div>
  );
};
