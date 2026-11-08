import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Euro,
  Filter,
} from 'lucide-react';
import { getPeriodComparisonMetrics, PeriodKpiRow } from '../lib/metrics.ts';

export const PeriodComparisonPage: React.FC = () => {
  const [data, setData] = useState<{
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    rows: PeriodKpiRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPeriodComparisonMetrics().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D92D50] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#6B6B6B]">Comparing performance windows...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Period Comparison
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Cohort delta comparison across quarters: {data.currentPeriodLabel} vs {data.previousPeriodLabel}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-white border border-black/10 text-xs font-semibold text-[#111111] shadow-2xs">
            Baseline: Quarter-over-Quarter
          </span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Quarterly KPI Deltas</h2>
            <p className="text-xs text-[#6B6B6B]">Comprehensive audit of volume, conversion velocity, and realized revenue.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                <th className="py-3 px-5">Core KPI Metric</th>
                <th className="py-3 px-4">{data.currentPeriodLabel}</th>
                <th className="py-3 px-4">{data.previousPeriodLabel}</th>
                <th className="py-3 px-4">Variance / Delta</th>
                <th className="py-3 px-4 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.rows.map((row) => (
                <tr key={row.label} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-[#111111]">
                    {row.label}
                  </td>

                  <td className="py-3.5 px-4 font-extrabold text-[#111111]">
                    {row.currentValue}
                  </td>

                  <td className="py-3.5 px-4 text-[#6B6B6B] font-medium">
                    {row.previousValue}
                  </td>

                  <td className="py-3.5 px-4 font-bold">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        row.deltaPositive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {row.delta}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {row.deltaPositive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                        <TrendingUp size={15} />
                        <span>Up</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs">
                        <TrendingDown size={15} />
                        <span>Down</span>
                      </span>
                    )}
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
