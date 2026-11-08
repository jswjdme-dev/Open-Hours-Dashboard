import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  Euro,
  ArrowRight,
  Clock,
  Sparkles,
  PhoneCall,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { useIsDemoData } from '../lib/useDemoData.ts';
import { getGrowthReportMetrics, GrowthReportKpis } from '../lib/metrics.ts';

interface GrowthReportPageProps {
  onNavigateToTasks?: () => void;
  onNavigateToMrr?: () => void;
}

export const GrowthReportPage: React.FC<GrowthReportPageProps> = ({
  onNavigateToTasks,
  onNavigateToMrr,
}) => {
  const [metrics, setMetrics] = useState<GrowthReportKpis | null>(null);
  const [timeframe, setTimeframe] = useState('Jul 1 – Sep 30, 2026');
  const [loading, setLoading] = useState(true);

  // Growth Progress Chart state
  const [activeChartMetric, setActiveChartMetric] = useState<
    'Clients' | 'Revenue' | 'Leads' | 'Qualified' | 'Contacted' | 'Replies' | 'CallsBooked'
  >('Revenue');
  const [isCumulative, setIsCumulative] = useState(true);
  const [comparePrevious, setComparePrevious] = useState(true);
  const isDemo = useIsDemoData();

  const loadData = async () => {
    setLoading(true);
    const data = await getGrowthReportMetrics(timeframe);
    setMetrics(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [timeframe]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D92D50] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#6B6B6B]">Loading Growth Report...</span>
        </div>
      </div>
    );
  }

  // Format chart data based on cumulative toggle
  const chartData = metrics.growthChartData.map((item, idx, arr) => {
    const prevRatio = 0.82; // synthetic previous period trajectory curve for comparison
    const val = item[activeChartMetric];
    const prevVal = Math.round(val * prevRatio);

    if (!isCumulative && idx > 0) {
      const prevItemVal = arr[idx - 1][activeChartMetric];
      return {
        ...item,
        currentValue: Math.max(0, val - prevItemVal),
        previousValue: Math.max(0, prevVal - Math.round(prevItemVal * prevRatio)),
      };
    }

    return {
      ...item,
      currentValue: val,
      previousValue: prevVal,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. HEADER: Two-Tone Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="two-tone-title">
            Growth Report
          </h1>
          <p className="two-tone-subtitle">
            Lead metrics use creation date; revenue uses payment date. Solo-founder operations.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <Calendar size={14} className="text-[#73737A]" />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-[36px] bg-white border border-[#D0D0D5] rounded-full px-3.5 py-1 text-[13px] font-semibold text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer shadow-2xs"
          >
            <option value="Jul 1 – Sep 30, 2026">Q3 2026 (Jul 1 – Sep 30)</option>
            <option value="Apr 1 – Jun 30, 2026">Q2 2026 (Apr 1 – Jun 30)</option>
            <option value="Jan 1 – Mar 31, 2026">Q1 2026 (Jan 1 – Mar 31)</option>
          </select>
        </div>
      </div>

      {/* 2. KPI CARDS GRID: 4 columns desktop, 2 tablet, 1 mobile; deterministic 4-style cycling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Leads',
            value: metrics.leads.current,
            delta: metrics.leads.delta,
            sub: 'Total created',
          },
          {
            label: 'Qualified',
            value: metrics.qualified.current,
            delta: metrics.qualified.delta,
            sub: 'HOT + WARM',
          },
          {
            label: 'Contacted',
            value: metrics.contacted.current,
            delta: metrics.contacted.delta,
            sub: 'First message sent',
          },
          {
            label: 'Replies',
            value: metrics.replies.current,
            delta: metrics.replies.delta,
            rateBadge: `${metrics.replies.rate}% rate`,
            sub: 'Replied to pitch',
          },
          {
            label: 'Calls booked',
            value: metrics.callsBooked.current,
            delta: metrics.callsBooked.delta,
            sub: 'Logged calls',
          },
          {
            label: 'Interested',
            value: metrics.interested.current,
            delta: metrics.interested.delta,
            sub: 'Audit or concept',
          },
          {
            label: 'Clients won',
            value: metrics.clientsWon.current,
            delta: metrics.clientsWon.delta,
            sub: 'Active retainers',
          },
          {
            label: 'Revenue',
            value: `€${metrics.revenueEUR.current.toLocaleString()}`,
            delta: `+€${metrics.revenueEUR.delta.toLocaleString()}`,
            sub: 'Payment records only',
          },
        ].map((kpi, idx) => {
          // Cycle card styles deterministically: 0 -> ink, 1 -> deep blue, 2 -> neutral grey, 3 -> white
          const mod = idx % 4;
          const isDark = mod === 0 || mod === 1;
          const bgClass =
            mod === 0
              ? 'bg-[#0A0A0A] text-white'
              : mod === 1
              ? 'bg-[#1627E8] text-white'
              : mod === 2
              ? 'bg-[#C9C9CC] text-[#0A0A0A]'
              : 'bg-white text-[#0A0A0A] border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)]';

          const pillClass = isDark ? 'section-pill-label-dark' : 'section-pill-label';

          return (
            <div
              key={kpi.label}
              className={`p-5 rounded-[20px] flex flex-col justify-between min-h-[148px] transition-all ${bgClass}`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className={pillClass}>
                    {kpi.label}
                  </span>
                </div>
                <div className="text-[34px] sm:text-[38px] font-semibold tracking-tight mt-3 mb-1 tabular-nums leading-none">
                  {kpi.value}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-current/15 flex items-center justify-between text-[11px] font-medium opacity-90">
                <span>{kpi.sub}</span>
                {kpi.rateBadge ? (
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black'
                  }`}>
                    {kpi.rateBadge}
                  </span>
                ) : (
                  <span className="font-semibold">
                    {typeof kpi.delta === 'number' && kpi.delta > 0
                      ? `+${kpi.delta} vs prev`
                      : `${kpi.delta} vs prev`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FOLLOW-UP TASKS DUE TODAY PANEL */}
      <section className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="section-pill-label">
              Follow-up tasks due today
            </span>
          </div>

          {onNavigateToTasks && (
            <button
              type="button"
              onClick={onNavigateToTasks}
              className="h-[34px] px-3.5 rounded-full border border-[#D0D0D5] bg-white text-[#0A0A0A] hover:bg-[#F3F3F5] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <span>Go to Tasks & Reminders</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {metrics.dueTasks.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#F9F9F9] text-center text-xs text-[#6B6B6B]">
            All follow-up tasks for today have been completed.
          </div>
        ) : (
          <div className="space-y-2">
            {metrics.dueTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-black/5 hover:border-black/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#D92D50]" />
                  <div>
                    <span className="font-bold text-xs text-[#111111]">
                      {task.leadBusinessName}
                    </span>
                    <span className="text-xs text-[#6B6B6B] ml-2">
                      {task.taskText}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Due Today
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. GROWTH PROGRESS CHART */}
      <section className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="section-pill-label">
              Growth Progress
            </span>
          </div>

          {/* Toggles: Cumulative & Compare previous */}
          <div className="flex items-center gap-4 text-xs font-medium text-[#4A4A4F]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isCumulative}
                onChange={(e) => setIsCumulative(e.target.checked)}
                className="rounded accent-[var(--color-accent)] cursor-pointer"
              />
              <span>Cumulative</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={comparePrevious}
                onChange={(e) => setComparePrevious(e.target.checked)}
                className="rounded accent-[var(--color-accent)] cursor-pointer"
              />
              <span>Compare previous period</span>
            </label>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F6F6F8] rounded-full text-xs mb-3">
          {[
            { id: 'Clients', label: 'Clients' },
            { id: 'Revenue', label: 'Revenue (EUR)' },
            { id: 'Leads', label: 'Leads' },
            { id: 'Qualified', label: 'Qualified' },
            { id: 'Contacted', label: 'Contacted' },
            { id: 'Replies', label: 'Replies' },
            { id: 'CallsBooked', label: 'Calls booked' },
          ].map((tab) => {
            const isActive = activeChartMetric === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveChartMetric(tab.id as any)}
                className={`h-7 px-3 rounded-full font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0A0A0A] text-white shadow-2xs'
                    : 'text-[#4A4A4F] hover:text-[#0A0A0A]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Recharts Chart with stepAfter interpolation, solid deep blue #1627E8 and grey #C9C9CC */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E6E9" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#73737A' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#73737A' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A0A0A',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  fontSize: '12px',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                }}
                itemStyle={{ color: '#FFFFFF' }}
                labelStyle={{ color: '#B4B4B9', fontWeight: 600, marginBottom: '4px' }}
              />
              {comparePrevious && (
                <Line
                  type="stepAfter"
                  dataKey="previousValue"
                  name="Previous period"
                  stroke="#C9C9CC"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
              <Line
                type="stepAfter"
                dataKey="currentValue"
                name={`Current (${activeChartMetric})`}
                stroke="#1627E8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#1627E8', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#1627E8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 5. REVENUE BY SOURCE & 6. MRR TARGET PROGRESS BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 5. Revenue by Source */}
        <section className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="mb-2">
              <span className="section-pill-label">
                Revenue by Source
              </span>
            </div>
            <p className="text-xs text-[#73737A] mb-4">
              Attribution connecting origin lead source directly to cleared payments.
            </p>

            {metrics.revenueBySource.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#73737A]">
                No payment revenue recorded yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {metrics.revenueBySource.map((item) => (
                  <div key={item.source} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0A0A0A]">{item.source}</span>
                        <span className="text-[#73737A]">({item.count} settlements)</span>
                      </div>
                      <div className="font-semibold text-[#0A0A0A]">
                        €{item.amount.toLocaleString()}{' '}
                        <span className="text-[#73737A] font-normal">({item.percentage}%)</span>
                      </div>
                    </div>
                    {/* Progress bar: 8px tall rounded, filled part deep blue #1627E8 */}
                    <div className="w-full h-2 rounded-full bg-[#E9E9EC] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1627E8] transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 6. MRR Target Progress Bar */}
        <section className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="section-pill-label">
                MRR Target Progress
              </span>
              {onNavigateToMrr && (
                <button
                  type="button"
                  onClick={onNavigateToMrr}
                  className="h-[34px] px-3.5 rounded-full border border-[#D0D0D5] bg-white text-[#0A0A0A] hover:bg-[#F3F3F5] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <span>MRR Roadmap</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
            <p className="text-xs text-[#73737A] mb-4">
              Live contracted monthly recurring retainers against the primary scaling milestone.
            </p>

            <div className="p-5 rounded-[16px] bg-[#F6F6F8] space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-[#73737A] font-medium">Contracted Retainers</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-0.5 tabular-nums leading-none">
                    €{metrics.mrrProgress.current.toLocaleString()}
                    <span className="text-xs text-[#73737A] font-normal"> /mo</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#73737A] font-medium">Goal Milestone</div>
                  <div className="text-[24px] font-semibold text-[#73737A] mt-0.5 tabular-nums leading-none">
                    €{metrics.mrrProgress.target.toLocaleString()}
                    <span className="text-xs text-[#73737A] font-normal"> /mo</span>
                  </div>
                </div>
              </div>

              {/* Progress bar: 8px tall rounded, filled part deep blue #1627E8 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#73737A]">Milestone Progress</span>
                  <span className="font-semibold text-[#0A0A0A]">
                    {metrics.mrrProgress.percentage}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#C9C9CC] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1627E8] transition-all duration-500"
                    style={{ width: `${metrics.mrrProgress.percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#73737A] pt-2 border-t border-[#E3E3E6]">
                <span>Remaining gap to milestone:</span>
                <strong className="text-[#0A0A0A]">
                  €{Math.max(0, metrics.mrrProgress.target - metrics.mrrProgress.current).toLocaleString()} /mo
                </strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
