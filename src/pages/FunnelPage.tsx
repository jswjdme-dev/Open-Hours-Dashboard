import React, { useState, useEffect } from 'react';
import {
  Filter as FilterIcon,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getFunnelMetrics, FunnelStageData } from '../lib/metrics.ts';

export const FunnelPage: React.FC = () => {
  const [funnelData, setFunnelData] = useState<{
    stages: FunnelStageData[];
    totalLeads: number;
    totalWon: number;
    overallConversion: number;
    largestDropOff: {
      from: string;
      to: string;
      dropCount: number;
      dropRatePct: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFunnelMetrics().then((data) => {
      setFunnelData(data);
      setLoading(false);
    });
  }, []);

  if (loading || !funnelData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D92D50] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#6B6B6B]">Building pipeline funnel...</span>
        </div>
      </div>
    );
  }

  const maxStageCount = funnelData.totalLeads || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Pipeline Funnel
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Conversion stages computed directly from active leads and stage milestone timestamps in repo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white rounded-2xl border border-black/5 shadow-2xs text-xs">
            <span className="text-[#A8A5A5] font-medium">Full Funnel Conversion: </span>
            <strong className="text-[#D92D50] font-bold">{funnelData.overallConversion}%</strong>
          </div>
        </div>
      </div>

      {/* DIAGNOSTICS CARD: Largest Drop-Off */}
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center font-bold shrink-0">
            <TrendingDown size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50] bg-[#FCE9ED] px-2 py-0.5 rounded-full">
                Primary Bottleneck
              </span>
              <span className="text-xs text-[#A8A5A5]">Diagnostics Assessment</span>
            </div>
            <h2 className="text-base font-bold text-[#111111] mt-1">
              Largest Drop-Off: {funnelData.largestDropOff.from} → {funnelData.largestDropOff.to}
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-1 max-w-2xl">
              {funnelData.largestDropOff.dropCount} leads dropped off at this transition ({funnelData.largestDropOff.dropRatePct}% drop rate). Main friction points: slow custom audit generation turnaround, multi-decision-maker clinic partner delays, and unverified direct clinic owner channels.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F9F9F9] border border-black/5 text-right shrink-0">
          <div className="text-[11px] text-[#A8A5A5] font-semibold">Drop Count</div>
          <div className="text-2xl font-black text-[#D92D50]">
            -{funnelData.largestDropOff.dropCount} leads
          </div>
        </div>
      </div>

      {/* VISUAL FUNNEL REPRESENTATION */}
      {/* Rules: Stage labels must NEVER overlap the funnel shapes or conversion pills; keep every label fully readable. */}
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-[#111111]">
            Stage Retention & Falloff
          </h2>
          <span className="text-xs text-[#6B6B6B]">
            Sequential Progression ({funnelData.stages.length} Stages)
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {funnelData.stages.map((st, idx) => {
            const widthPct = Math.max(12, Math.round((st.count / maxStageCount) * 100));
            const isWon = st.stage === 'Won';

            return (
              <div key={st.stage} className="space-y-1.5">
                {/* Clean un-overlapped label and metrics row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-[11px] font-mono text-[#A8A5A5] font-bold">
                      0{idx + 1}
                    </span>
                    <span className="font-bold text-[#111111]">{st.stage}</span>
                    <span className="text-[11px] text-[#A8A5A5]">
                      ({st.count} leads reached)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {idx > 0 && (
                      <span className="text-[11px] font-semibold text-[#6B6B6B]">
                        Step: <strong className="text-[#111111]">{st.conversionFromPrev}%</strong>
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-[#D92D50]">
                      {st.conversionFromStart}% of total
                    </span>
                  </div>
                </div>

                {/* Funnel shape bar without any overlapping text */}
                <div className="w-full h-5 rounded-full bg-[#F4F2F2] overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWon
                        ? 'bg-emerald-500'
                        : idx === 0
                        ? 'bg-[#111111]'
                        : 'bg-[#D92D50]'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STAGE LEDGER TABLE */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-black/5">
          <h2 className="text-sm font-bold text-[#111111]">Stage Ledger</h2>
          <p className="text-xs text-[#6B6B6B]">Detailed breakdown per sequential pipeline milestone.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                <th className="py-3 px-5">Stage Name</th>
                <th className="py-3 px-4">Leads Reached</th>
                <th className="py-3 px-4">Step Conversion</th>
                <th className="py-3 px-4">Overall Conversion</th>
                <th className="py-3 px-4">Average Time in Stage</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {funnelData.stages.map((st, i) => (
                <tr key={st.stage} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-[#111111]">
                    {st.stage}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#111111]">
                    {st.count}
                  </td>
                  <td className="py-3.5 px-4 text-[#6B6B6B]">
                    {i === 0 ? 'Baseline (100%)' : `${st.conversionFromPrev}%`}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#D92D50]">
                    {st.conversionFromStart}%
                  </td>
                  <td className="py-3.5 px-4 text-[#6B6B6B]">
                    ~{st.avgDaysInStage} days
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        st.stage === 'Won'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-[#F4F2F2] text-[#444444]'
                      }`}
                    >
                      {st.stage === 'Won' ? 'Goal Achieved' : 'Active Pipeline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
