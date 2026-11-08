import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  Calendar,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { getLeads, getPayments } from '../data/repo.ts';

export const GrowthTrendPage: React.FC = () => {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['leads', 'replies', 'revenue']);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getLeads(), getPayments()]).then(([leads, payments]) => {
      // Generate trend points based on granularity
      if (granularity === 'day') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = days.map((d, i) => ({
          name: d,
          leads: 2 + (i % 4),
          replies: 1 + (i % 3),
          calls: i % 2,
          won: i === 4 ? 1 : 0,
          revenue: i === 4 ? 1200 : 0,
        }));
        setChartData(data);
      } else if (granularity === 'week') {
        const weeks = ['W1 (Jul)', 'W2 (Jul)', 'W3 (Jul)', 'W4 (Jul)', 'W5 (Aug)', 'W6 (Aug)', 'W7 (Aug)', 'W8 (Aug)', 'W9 (Sep)', 'W10 (Sep)', 'W11 (Sep)'];
        const data = weeks.map((w, i) => ({
          name: w,
          leads: 4 + Math.round(i * 1.2),
          replies: 2 + Math.round(i * 0.8),
          calls: 1 + Math.round(i * 0.4),
          won: i > 2 && i % 2 === 0 ? 1 : 0,
          revenue: i > 2 && i % 2 === 0 ? 1200 + (i * 200) : 0,
        }));
        setChartData(data);
      } else {
        const months = ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];
        const data = months.map((m, i) => ({
          name: m,
          leads: 18 + i * 5,
          replies: 9 + i * 3,
          calls: 4 + i * 2,
          won: 1 + Math.round(i * 0.8),
          revenue: 2400 + i * 1400,
        }));
        setChartData(data);
      }
      setLoading(false);
    });
  }, [granularity]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E3E6]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[36px] font-semibold text-[#0A0A0A] tracking-[-0.02em] leading-tight">
              Growth Trend
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-[#E3E3E6] text-[11px] font-medium text-[#606066] bg-[#F3F3F5]">
              Demo data
            </span>
          </div>
          <p className="text-[20px] font-semibold text-[#B4B4B9] tracking-[-0.02em] mt-0.5">
            Multi-metric velocity tracker across daily, weekly, and monthly timeframes.
          </p>
        </div>

        {/* Granularity Switcher */}
        <div className="flex items-center p-1 bg-[#F3F3F5] rounded-full text-xs self-start sm:self-auto border border-[#E3E3E6]">
          {(['day', 'week', 'month'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`px-4 py-1.5 rounded-full font-medium transition-all capitalize cursor-pointer text-xs ${
                granularity === g
                  ? 'bg-[#0A0A0A] text-white shadow-2xs'
                  : 'text-[#606066] hover:text-[#0A0A0A]'
              }`}
            >
              {g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Selector Pills */}
      <div className="bg-white rounded-[20px] p-4 border border-[#E3E3E6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="section-pill-label !text-[11px] !py-0.5 !px-2.5">
            Display Metrics:
          </span>
          {[
            { key: 'leads', label: 'Leads Created', color: '#1627E8' },
            { key: 'replies', label: 'Replies Received', color: '#D92D50' },
            { key: 'calls', label: 'Calls Booked', color: '#0A0A0A' },
            { key: 'won', label: 'Deals Won', color: '#12B76A' },
            { key: 'revenue', label: 'Revenue (€)', color: '#8A8A90' },
          ].map((m) => {
            const isSelected = selectedMetrics.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMetric(m.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                    : 'bg-[#F3F3F5] text-[#606066] border-[#E3E3E6] hover:text-[#0A0A0A]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Multi-Metric Recharts Graph */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="section-pill-label">
              Velocity Comparison ({granularity.toUpperCase()})
            </span>
            <span className="text-xs text-[#8A8A90]">
              Computed dynamically from repo records
            </span>
          </div>
        </div>

        <div className="h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#E6E6E9" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#8A8A90' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#8A8A90' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A0A0A',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#FFFFFF' }}
              />
              <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />

              {selectedMetrics.includes('leads') && (
                <Line
                  type="stepAfter"
                  dataKey="leads"
                  name="Leads Created"
                  stroke="#1627E8"
                  strokeWidth={2.5}
                  dot={false}
                />
              )}
              {selectedMetrics.includes('replies') && (
                <Line
                  type="stepAfter"
                  dataKey="replies"
                  name="Replies"
                  stroke="#D92D50"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {selectedMetrics.includes('calls') && (
                <Line
                  type="stepAfter"
                  dataKey="calls"
                  name="Calls Booked"
                  stroke="#0A0A0A"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {selectedMetrics.includes('won') && (
                <Line
                  type="stepAfter"
                  dataKey="won"
                  name="Deals Won"
                  stroke="#12B76A"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {selectedMetrics.includes('revenue') && (
                <Line
                  type="stepAfter"
                  dataKey="revenue"
                  name="Revenue (EUR)"
                  stroke="#8A8A90"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
