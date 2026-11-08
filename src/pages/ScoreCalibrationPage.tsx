import React, { useState, useEffect } from 'react';
import {
  Target,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { getLeads } from '../data/repo.ts';
import { Lead } from '../types/index.ts';

export const ScoreCalibrationPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeads().then((res) => {
      setLeads(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D92D50] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#6B6B6B]">Calibrating scoring weights...</span>
        </div>
      </div>
    );
  }

  const totalLeads = leads.length;
  const hasEnoughLeads = totalLeads >= 100;

  // Outcome correlation by score band
  const bands = ['HOT', 'WARM', 'COLD'] as const;
  const bandStats = bands.map((band) => {
    const bandLeads = leads.filter((l) => l.score.band === band);
    const wonCount = bandLeads.filter((l) => l.stage === 'Won').length;
    const repliedCount = bandLeads.filter((l) => Boolean(l.repliedAt) || l.channels.some((c) => c.status === 'Replied')).length;
    const wonRate = bandLeads.length > 0 ? Math.round((wonCount / bandLeads.length) * 100) : 0;
    const replyRate = bandLeads.length > 0 ? Math.round((repliedCount / bandLeads.length) * 100) : 0;

    return {
      band,
      count: bandLeads.length,
      pctOfTotal: totalLeads > 0 ? Math.round((bandLeads.length / totalLeads) * 100) : 0,
      wonCount,
      wonRate,
      replyRate,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Score Calibration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Empirical validation of the 7-criteria lead scoring model against real win/loss outcomes.
          </p>
        </div>
      </div>

      {/* SAMPLE SIZE WARNING (Part 4 requirement) */}
      {!hasEnoughLeads && (
        <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-5 flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Info size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-900">
              Evidence is weak, need ~100 leads
            </h2>
            <p className="text-xs text-amber-800 mt-0.5">
              Currently analyzing {totalLeads} fictional leads in demo dataset. Statistical significance for predictive score weighting requires a sample size of at least 100 evaluated prospects before adjusting individual criterion multipliers.
            </p>
          </div>
        </div>
      )}

      {/* Score Band vs Outcome Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-black/5">
          <h2 className="text-sm font-bold text-[#111111]">Score Band vs Conversion Outcome</h2>
          <p className="text-xs text-[#6B6B6B]">Empirical reply and win rates across HOT, WARM, and COLD score bands.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                <th className="py-3 px-5">Score Band</th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4">Leads Count</th>
                <th className="py-3 px-4">Share of Pipeline</th>
                <th className="py-3 px-4">Reply Rate</th>
                <th className="py-3 px-4 text-right">Win Rate (Won / Band)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {bandStats.map((b) => (
                <tr key={b.band} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-[#111111]">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        b.band === 'HOT'
                          ? 'bg-[#FCE9ED] text-[#D92D50]'
                          : b.band === 'WARM'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-[#F4F2F2] text-[#6B6B6B]'
                      }`}
                    >
                      {b.band === 'HOT' && <Flame size={13} />}
                      {b.band}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#6B6B6B]">
                    {b.band === 'HOT' ? '10 – 14 pts' : b.band === 'WARM' ? '7 – 9 pts' : '0 – 6 pts'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#111111]">
                    {b.count}
                  </td>
                  <td className="py-3.5 px-4 text-[#6B6B6B]">
                    {b.pctOfTotal}%
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#111111]">
                    {b.replyRate}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-[#D92D50]">
                    {b.wonRate}% ({b.wonCount} won)
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
