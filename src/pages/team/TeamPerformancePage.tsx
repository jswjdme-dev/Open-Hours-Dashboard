import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Target,
  Clock,
  TrendingUp,
  Euro,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Briefcase,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  getTeamManagementOverview,
  getTeamPerformanceScores,
} from '../../data/repo.ts';
import {
  MemberPerformanceScore,
  TeamPerformanceWeights,
  Role,
} from '../../types/index.ts';
import { normalizeRole } from '../../config/navigation.ts';

interface TeamPerformancePageProps {
  currentRole: Role;
}

export const TeamPerformancePage: React.FC<TeamPerformancePageProps> = ({ currentRole }) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [scores, setScores] = useState<MemberPerformanceScore[]>([]);
  const [weights, setWeights] = useState<TeamPerformanceWeights | null>(null);
  const [showRanking, setShowRanking] = useState(false);
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = normalizeRole(currentRole) === 'Admin';

  const loadData = async () => {
    setLoading(true);
    const [perf, ov] = await Promise.all([
      getTeamPerformanceScores(period),
      getTeamManagementOverview(),
    ]);

    setScores(perf.scores);
    setWeights(perf.weights);
    setShowRanking(perf.showRankingToMembers || isAdmin);
    setOverview(ov);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [period, currentRole]);

  if (loading || !weights || !overview) {
    return (
      <div className="py-16 text-center text-xs text-[#A8A5A5]">
        Loading team performance & profitability metrics...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Team Performance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              KPIs & Margins
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Solo-founder team scorecards, client profitability, live status, and first-hire trigger meter.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 bg-white outline-none cursor-pointer shadow-2xs"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* TOP ROW: LIVE STATUS & 120-HOUR HIRE TRIGGER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Who is working now */}
        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A5]">
              Active Now
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-2">
            {overview.activeWorkingNow.length === 0 ? (
              <p className="text-xs text-[#6B6B6B] italic">No active timers right now.</p>
            ) : (
              overview.activeWorkingNow.map((w: any) => (
                <div
                  key={w.memberId}
                  className="p-2.5 rounded-xl bg-[#FAFAFA] border border-black/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center justify-center">
                      {w.avatarInitials}
                    </div>
                    <div>
                      <div className="font-bold text-[#111111]">{w.memberName}</div>
                      <div className="text-[10px] text-[#6B6B6B] line-clamp-1">{w.currentTask}</div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                    {w.elapsedMinutes}m
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: 120 Delivery Hours First-Hire Trigger Meter */}
        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A5]">
              First-Hire Trigger
            </span>
            <span className="text-xs font-bold text-[#D92D50]">
              {Math.round((overview.totalDeliveryHoursThisMonth / 120) * 100)}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-[#111111] tabular-nums">
              {overview.totalDeliveryHoursThisMonth}{' '}
              <span className="text-xs text-[#6B6B6B] font-semibold">/ 120 hrs</span>
            </div>
            <span className="text-[11px] text-[#6B6B6B]">Target threshold</span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#F1EFEF] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D92D50] transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((overview.totalDeliveryHoursThisMonth / 120) * 100))}%`,
              }}
            />
          </div>

          <p className="text-[10px] text-[#A8A5A5] leading-tight">
            When solo delivery exceeds 120 hrs/month, profitability model dictates hiring an operations assistant.
          </p>
        </div>

        {/* Card 3: HYPOTHESIS Weights Notice */}
        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A5]">
              Score Formulation
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE9ED] text-[#D92D50]">
              HYPOTHESIS
            </span>
          </div>
          <p className="text-[11px] text-[#444444] leading-relaxed">
            On-time tasks ({weights.onTimeCompletionWeight * 100}%), low revisions (
            {weights.lowRevisionWeight * 100}%), turnaround speed ({weights.turnaroundWeight * 100}
            %), QA pass rate ({weights.qaChecklistPassWeight * 100}%), consistency (
            {weights.hoursConsistencyWeight * 100}%).
          </p>
          <div className="text-[10px] text-[#A8A5A5]">
            *Weights are adjustable in Team Settings by Admin.
          </div>
        </div>
      </div>

      {/* PERFORMANCE RANKING TABLE */}
      {showRanking && (
        <div className="bg-white rounded-[24px] border border-black/5 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#111111]">Member Performance Scores</h2>
              <span className="text-xs text-[#6B6B6B]">
                (Requires 10+ completed tasks for score validity)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 text-center">Score (0-100)</th>
                  <th className="py-2.5 px-3">On-Time</th>
                  <th className="py-2.5 px-3">Low Revisions</th>
                  <th className="py-2.5 px-3">Turnaround</th>
                  <th className="py-2.5 px-3">QA Pass</th>
                  <th className="py-2.5 px-3 text-right">Logged Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {scores.map((sc, idx) => (
                  <tr key={sc.memberId} className="hover:bg-black/1">
                    <td className="py-3 px-3 font-bold text-[#A8A5A5]">#{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-[#111111]">{sc.memberName}</td>
                    <td className="py-3 px-3 text-center">
                      {sc.hasEnoughData ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#111111] text-white font-black text-xs">
                          {sc.score}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                          Not enough data yet (needs 10+ completed tasks)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#111111]">{sc.onTimeRate}%</td>
                    <td className="py-3 px-3 font-semibold text-[#111111]">{sc.lowRevisionRate}%</td>
                    <td className="py-3 px-3 font-semibold text-[#111111]">
                      {sc.avgTurnaroundHours}h avg
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#111111]">{sc.qaPassRate}%</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#111111]">
                      {sc.totalLoggedHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLIENT PROFITABILITY CARD (Estimated) */}
      {isAdmin && (
        <div className="bg-white rounded-[24px] border border-black/5 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#111111]">Client Profitability Analysis</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F2F2] text-[#6B6B6B]">
                  Labelled Estimated
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B]">
                Per client = logged delivery hours × cost rates vs revenue collected from Payment records.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
                <tr>
                  <th className="py-2.5 px-3">Client Practice</th>
                  <th className="py-2.5 px-3">Delivery Hours</th>
                  <th className="py-2.5 px-3">Estimated Cost</th>
                  <th className="py-2.5 px-3">Paid Revenue</th>
                  <th className="py-2.5 px-3">Net Margin</th>
                  <th className="py-2.5 px-3 text-right">Effective Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {overview.clientProfitability.map((cp: any) => (
                  <tr key={cp.client.id} className="hover:bg-black/1">
                    <td className="py-3 px-3 font-bold text-[#111111]">
                      {cp.client.businessName}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#6B6B6B]">{cp.totalHours} hrs</td>
                    <td className="py-3 px-3 text-[#6B6B6B] tabular-nums">€{cp.costEUR}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-700 tabular-nums">
                      €{cp.revenueEUR.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#111111] tabular-nums">
                      €{cp.netMarginEUR.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-[#D92D50] tabular-nums">
                      {cp.effectiveHourlyRateEUR > 0 ? `€${cp.effectiveHourlyRateEUR}/hr` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
