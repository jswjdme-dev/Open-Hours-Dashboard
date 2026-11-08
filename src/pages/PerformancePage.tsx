import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Mail,
  FlaskConical,
  Users,
  KanbanSquare,
  HelpCircle,
  Download,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  PerformancePeriod,
  PerformanceOverviewData,
  PerformanceOutreachData,
  PerformanceExperimentsData,
  PerformanceReferralsPartnersData,
  PerformanceDeliveryTeamData,
  getPerformanceOverviewMetrics,
  getPerformanceOutreachMetrics,
  getPerformanceExperimentsMetrics,
  getPerformanceReferralsPartnersMetrics,
  getPerformanceDeliveryTeamMetrics,
} from '../lib/performanceMetrics.ts';

interface PerformancePageProps {
  onNavigate?: (viewId: string, label: string) => void;
}

export type PerformanceTab =
  | 'overview'
  | 'outreach'
  | 'experiments'
  | 'referrals-partners'
  | 'delivery-team';

export const PerformancePage: React.FC<PerformancePageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<PerformanceTab>('overview');
  const [period, setPeriod] = useState<PerformancePeriod>('30d');
  const [loading, setLoading] = useState(true);

  // Active Tooltip State
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Tab Datasets
  const [overviewData, setOverviewData] = useState<PerformanceOverviewData | null>(null);
  const [outreachData, setOutreachData] = useState<PerformanceOutreachData | null>(null);
  const [experimentsData, setExperimentsData] = useState<PerformanceExperimentsData | null>(null);
  const [referralsPartnersData, setReferralsPartnersData] =
    useState<PerformanceReferralsPartnersData | null>(null);
  const [deliveryTeamData, setDeliveryTeamData] =
    useState<PerformanceDeliveryTeamData | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ov, out, exp, ref, del] = await Promise.all([
        getPerformanceOverviewMetrics(period),
        getPerformanceOutreachMetrics(),
        getPerformanceExperimentsMetrics(),
        getPerformanceReferralsPartnersMetrics(),
        getPerformanceDeliveryTeamMetrics(),
      ]);
      setOverviewData(ov);
      setOutreachData(out);
      setExperimentsData(exp);
      setReferralsPartnersData(ref);
      setDeliveryTeamData(del);
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [period]);

  // CSV Export
  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvContent = '';
    let fileName = `open_hours_performance_${activeTab}_${today}.csv`;

    if (activeTab === 'overview' && overviewData) {
      csvContent = 'Metric,Current Value,Previous Value,Delta,Sample Size,Calculation\n';
      overviewData.cards.forEach((c) => {
        csvContent += `"${c.label}","${c.displayValue}","${c.displayPrevious}","${c.delta}","${c.sampleSize}","${c.calculationTooltip.replace(/"/g, '""')}"\n`;
      });
    } else if (activeTab === 'outreach' && outreachData) {
      csvContent = 'Channel,Sent,Delivered,Replies,Reply Rate (%),Sample Size,Low Sample\n';
      outreachData.channels.forEach((ch) => {
        csvContent += `"${ch.channel}",${ch.sent},${ch.delivered},${ch.replies},${ch.replyRate}%,${ch.sampleSize},${ch.isLowSample ? 'Yes' : 'No'}\n`;
      });
    } else if (activeTab === 'experiments' && experimentsData) {
      csvContent = 'Experiment,Channel,Hypothesis,Sample Size,Result,Verdict,Date\n';
      experimentsData.experiments.forEach((exp) => {
        csvContent += `"${exp.title}","${exp.channel}","${exp.hypothesis.replace(/"/g, '""')}",${exp.sampleSize},"${exp.result.replace(/"/g, '""')}","${exp.verdict}","${exp.date}"\n`;
      });
    } else if (activeTab === 'referrals-partners' && referralsPartnersData) {
      csvContent = 'Partner Name,Organisation,Clients Brought,Active Clients,Demos Created,Agreed Count,Conversion Rate (%),Earnings EUR,Owed EUR\n';
      referralsPartnersData.partners.forEach((p) => {
        csvContent += `"${p.name}","${p.organisation}",${p.clientsBrought},${p.activeClients},${p.demosCreated},${p.agreedCount},${p.demoConversionRate}%,€${p.totalEarningsEUR},€${p.balanceOwedEUR}\n`;
      });
    } else if (activeTab === 'delivery-team' && deliveryTeamData) {
      csvContent = 'Member Name,Role,Composite Score,Tasks Completed,On-Time Rate %,Revision Rate %,Turnaround Hours\n';
      deliveryTeamData.teamScores.forEach((m) => {
        csvContent += `"${m.memberName}","${m.role || 'Specialist'}",${m.score},${m.totalCompletedTasks},${m.onTimeRate}%,${m.lowRevisionRate}%,${m.avgTurnaroundHours}h\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reusable Tooltip Popover Component
  const MetricTooltip: React.FC<{ id: string; calculation: string }> = ({
    id,
    calculation,
  }) => {
    const isOpen = activeTooltipId === id;
    return (
      <div className="relative inline-block ml-1.5 align-middle">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTooltipId(isOpen ? null : id);
          }}
          onMouseEnter={() => setActiveTooltipId(id)}
          onMouseLeave={() => setActiveTooltipId(null)}
          className="p-0.5 rounded-full text-[#A8A5A5] hover:text-[#111111] hover:bg-black/5 transition-colors cursor-pointer"
          title="How is this calculated?"
        >
          <HelpCircle size={13} />
        </button>
        {isOpen && (
          <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#111111] text-white text-[11px] leading-relaxed rounded-xl shadow-xl border border-white/10 pointer-events-none animate-in fade-in duration-100">
            <div className="font-bold mb-1 text-white flex items-center gap-1">
              <Info size={12} className="text-amber-400" />
              <span>How is this calculated?</span>
            </div>
            <p className="text-[#D0D0D0]">{calculation}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="two-tone-title">Performance</h1>
          <p className="two-tone-subtitle">
            Executive intelligence cockpit · Multi-dimensional acquisition, outreach, experiments, and delivery telemetry
          </p>
        </div>

        {/* Global Controls: Period Selector & Export CSV */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Selector */}
          <div className="inline-flex p-1 bg-[#EBE8E8] rounded-full border border-black/5 text-xs">
            {(
              [
                { key: '30d', label: 'Last 30 days' },
                { key: '90d', label: 'Last 90 days' },
                { key: 'month', label: 'This month' },
                { key: 'all', label: 'All time' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  period === opt.key
                    ? 'bg-white text-[#111111] shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white border border-black/15 text-[#111111] hover:bg-black/5 transition-all shadow-2xs cursor-pointer"
            title="Export metrics to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 5 TABS NAVIGATION */}
      <div className="flex items-center border-b border-black/10 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-[#D92D50] text-[#D92D50]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <TrendingUp size={14} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outreach')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'outreach'
              ? 'border-[#D92D50] text-[#D92D50]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <Mail size={14} />
          <span>Outreach</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('experiments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'experiments'
              ? 'border-[#D92D50] text-[#D92D50]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <FlaskConical size={14} />
          <span>Experiments</span>
          {experimentsData && !experimentsData.isUnlocked && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
              Unlocks at 100
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('referrals-partners')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'referrals-partners'
              ? 'border-[#D92D50] text-[#D92D50]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <Users size={14} />
          <span>Referrals &amp; Partners</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery-team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'delivery-team'
              ? 'border-[#D92D50] text-[#D92D50]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <KanbanSquare size={14} />
          <span>Delivery &amp; Team</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs text-[#6B6B6B] flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-[#D92D50] border-t-transparent rounded-full animate-spin" />
          <span>Computing performance telemetry across system records...</span>
        </div>
      ) : (
        <div>
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW (6 HEADLINE CARDS + PREVIOUS PERIOD COMPARISON) */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && overviewData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#111111]">
                    Acquisition &amp; Financial Headlines
                  </h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Primary pipeline progression and cash performance for {overviewData.timeframeLabel}
                  </p>
                </div>
              </div>

              {/* Grid of 6 Headline Cards (Max 6 Widgets) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {overviewData.cards.map((card) => {
                  const isPositive = card.delta > 0;
                  const isNeutral = card.delta === 0;
                  return (
                    <div
                      key={card.id}
                      className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between hover:border-black/10 transition-all"
                    >
                      <div>
                        {/* Card Header & Tooltip */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                            {card.label}
                          </span>
                          <MetricTooltip
                            id={card.id}
                            calculation={card.calculationTooltip}
                          />
                        </div>

                        {/* Large Value & Comparison */}
                        <div className="flex items-baseline gap-3 my-1">
                          <span className="text-2xl sm:text-3xl font-bold text-[#111111] tabular-nums tracking-tight">
                            {card.displayValue}
                          </span>
                          <div
                            className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                              isNeutral
                                ? 'bg-gray-100 text-gray-700'
                                : isPositive
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight size={13} className="mr-0.5" />
                            ) : !isNeutral ? (
                              <ArrowDownRight size={13} className="mr-0.5" />
                            ) : null}
                            <span>
                              {card.percentChange !== null
                                ? `${card.percentChange > 0 ? '+' : ''}${card.percentChange}%`
                                : `${card.delta > 0 ? '+' : ''}${card.delta}`}
                            </span>
                          </div>
                        </div>

                        {/* Previous Period Context */}
                        <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                          Prior: <strong className="text-[#111111]">{card.displayPrevious}</strong>
                        </div>
                      </div>

                      {/* Mini Sparkline Chart Widget */}
                      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                        <div className="w-28 h-10">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={card.chartData}>
                              <Bar
                                dataKey="value"
                                radius={[4, 4, 0, 0]}
                                fill="#E0E0E0"
                              >
                                {card.chartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={index === 1 ? '#D92D50' : '#E0E0E0'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <span className="text-[10px] text-[#A8A5A5] font-semibold text-right">
                          {card.sampleSize}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: OUTREACH (BY CHANNEL, TEMPLATE, SEQUENCE STEP; BEST/WORST; LOW SAMPLE) */}
          {/* ========================================================================= */}
          {activeTab === 'outreach' && outreachData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  Channel &amp; Copy Performance
                </h2>
                <p className="text-xs text-[#6B6B6B]">
                  Aggregated dispatch responses, template reply rates, and multi-step drop-offs
                </p>
              </div>

              {/* Grid (Max 4 Widgets for Tab 2) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* WIDGET 1: Channel Breakdown */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Response by Channel
                      </span>
                      <MetricTooltip
                        id="tt_channel"
                        calculation="Replies divided by total logged outreach dispatches across Email, LinkedIn, Instagram, WhatsApp, and Phone channels."
                      />
                    </div>
                    {outreachData.bestChannel && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Top: {outreachData.bestChannel.channel} ({outreachData.bestChannel.replyRate}%)
                      </span>
                    )}
                  </div>

                  {/* Channel Chart */}
                  <div className="w-full h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={outreachData.channels}
                        layout="vertical"
                        margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                      >
                        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                        <YAxis
                          type="category"
                          dataKey="channel"
                          tick={{ fontSize: 11 }}
                          width={65}
                        />
                        <RechartsTooltip
                          formatter={(v: any) => [`${v}% Reply Rate`, 'Rate']}
                        />
                        <Bar dataKey="replyRate" fill="#D92D50" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Channel Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F7F7] text-[#A8A5A5] text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2 px-2.5">Channel</th>
                          <th className="py-2 px-2">Sent</th>
                          <th className="py-2 px-2">Replies</th>
                          <th className="py-2 px-2">Reply Rate</th>
                          <th className="py-2 px-2 text-right">Sample Notice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {outreachData.channels.map((ch) => (
                          <tr key={ch.channel} className="hover:bg-[#F8F7F7]">
                            <td className="py-2 px-2.5 font-bold text-[#111111]">
                              {ch.channel}
                            </td>
                            <td className="py-2 px-2 text-[#6B6B6B] tabular-nums">
                              {ch.sent}
                            </td>
                            <td className="py-2 px-2 font-semibold text-[#111111] tabular-nums">
                              {ch.replies}
                            </td>
                            <td className="py-2 px-2 font-bold text-[#111111] tabular-nums">
                              {ch.replyRate}%
                            </td>
                            <td className="py-2 px-2 text-right">
                              {ch.isLowSample ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                  Low sample (&lt;20 sends)
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#A8A5A5]">Verified ({ch.sent})</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* WIDGET 2: Template Performance */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Template Variations
                      </span>
                      <MetricTooltip
                        id="tt_template"
                        calculation="Individual copy effectiveness measured by unique reply events divided by total times each sequence template was dispatched."
                      />
                    </div>
                    {outreachData.bestTemplate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        Top Copy: {outreachData.bestTemplate.replyRate}%
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {outreachData.templates.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[#A8A5A5]">
                        Not enough data yet (Sample size: 0 templates)
                      </div>
                    ) : (
                      outreachData.templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="p-3 rounded-2xl bg-[#F8F7F7] border border-black/5 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-[#111111] block">
                              {tpl.title}
                            </span>
                            <span className="text-[11px] text-[#6B6B6B]">
                              {tpl.channel} · {tpl.uses} dispatches · {tpl.replies} replies
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-bold text-[#111111] block tabular-nums">
                              {tpl.replyRate}%
                            </span>
                            {tpl.isLowSample ? (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                                Low sample
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#A8A5A5]">N={tpl.uses}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* WIDGET 3: Sequence Step Progression */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Sequence Step Drop-Off
                      </span>
                      <MetricTooltip
                        id="tt_step"
                        calculation="Conversion and drop-off rate as prospects progress through each scheduled follow-up touchpoint."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {outreachData.sequenceSteps.map((step) => (
                      <div key={step.stepNumber} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#111111]">
                            Step {step.stepNumber}: {step.title} ({step.delayHours}h delay)
                          </span>
                          <span className="font-bold text-[#111111]">
                            {step.replyRate}% reply ({step.replies}/{step.sends})
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-[#111111] rounded-full"
                            style={{ width: `${Math.min(100, step.replyRate * 3)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WIDGET 4: Safety & Volume Pacing */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Safety Pacing &amp; Limits
                      </span>
                      <MetricTooltip
                        id="tt_safety"
                        calculation="Current dispatch volume compared with max safety limit (50/day) to safeguard domain reputation."
                      />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      SLA Safe
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-2xl bg-[#F8F7F7] border border-black/5">
                      <span className="text-[11px] text-[#6B6B6B] block">Daily Dispatch Ceiling</span>
                      <span className="text-xl font-bold text-[#111111] block tabular-nums">
                        {outreachData.dailySafetyLimit} / day
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#F8F7F7] border border-black/5">
                      <span className="text-[11px] text-[#6B6B6B] block">Total Logged Sends</span>
                      <span className="text-xl font-bold text-[#111111] block tabular-nums">
                        {outreachData.totalSends}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                    Hard safety limits prevent spam flags by restricting outbox velocity across all team members.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: EXPERIMENTS (UNLOCKS AT 100 LEADS; LINK TO LEARNING LOG) */}
          {/* ========================================================================= */}
          {activeTab === 'experiments' && experimentsData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#111111]">
                    Hypothesis Testing &amp; Experiments
                  </h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Empirical split tests on outreach, offers, teardowns, and qualification rules
                  </p>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('intelligence-learning', 'Learning Log')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#111111] hover:bg-black text-white transition-all shadow-2xs cursor-pointer"
                  >
                    <BookOpen size={13} />
                    <span>Open Learning Log &rarr;</span>
                  </button>
                )}
              </div>

              {/* Requirement: Experiments tab shows "unlocks at 100 leads" if <100 leads */}
              {!experimentsData.isUnlocked ? (
                <div className="bg-white rounded-[24px] p-8 border border-black/5 shadow-xs space-y-6 text-center max-w-2xl mx-auto my-6">
                  <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                    <FlaskConical size={26} />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-[#111111]">
                      Experiments Unlock at 100 Leads
                    </h3>
                    <p className="text-xs text-[#6B6B6B] max-w-md mx-auto leading-relaxed">
                      To prevent misleading optimizations on small sample sizes, controlled A/B testing unlocks once the clinic registry contains at least 100 prospects.
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2 max-w-md mx-auto">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#6B6B6B]">Sample Size Progress</span>
                      <span className="text-[#111111] font-bold">
                        {experimentsData.totalLeadsCount} / {experimentsData.minLeadsRequired} Leads
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (experimentsData.totalLeadsCount /
                              experimentsData.minLeadsRequired) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-[#A8A5A5] block">
                      {experimentsData.remainingLeads} more leads required for 95% statistical power
                    </span>
                  </div>

                  {/* Link to Learning Log */}
                  <div className="pt-2">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('intelligence-learning', 'Learning Log')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#111111] hover:bg-black text-white transition-all shadow-xs cursor-pointer"
                      >
                        <BookOpen size={14} />
                        <span>Review Qualitative Insights in Learning Log</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Unlocked Experiments View */
                <div className="grid grid-cols-1 gap-4">
                  {experimentsData.experiments.map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3 hover:border-black/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                              {exp.channel}
                            </span>
                            <span className="text-[10px] text-[#A8A5A5]">· {exp.date}</span>
                          </div>
                          <h3 className="text-sm font-bold text-[#111111]">{exp.title}</h3>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            exp.verdict === 'Validated'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : exp.verdict === 'Codified into Rules'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          Verdict: {exp.verdict}
                        </span>
                      </div>

                      <p className="text-xs text-[#6B6B6B] leading-relaxed">
                        <strong>Hypothesis:</strong> {exp.hypothesis}
                      </p>

                      <div className="p-3 rounded-xl bg-[#F8F7F7] border border-black/5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#111111]">
                          <strong>Result:</strong> {exp.result}
                        </span>
                        <span className="text-[11px] text-[#A8A5A5] font-semibold">
                          Sample size: {exp.sampleSize} clinics
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: REFERRALS AND PARTNERS */}
          {/* ========================================================================= */}
          {activeTab === 'referrals-partners' && referralsPartnersData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  Referral Funnel &amp; Partner Performance
                </h2>
                <p className="text-xs text-[#6B6B6B]">
                  Client word-of-mouth qualification pipeline, retainer credit economics, and partner deal attribution
                </p>
              </div>

              {/* Grid of Max 5 Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* WIDGET 1: Referral Conversion Funnel */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Client Referral Conversion Funnel
                      </span>
                      <MetricTooltip
                        id="tt_ref_funnel"
                        calculation="Conversion from Referral Invited to Applied, Approved by admin, and Qualified upon first invoice settlement."
                      />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {referralsPartnersData.qualifiedReferralsCount} Qualified
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                    {referralsPartnersData.referralFunnel.map((step) => (
                      <div
                        key={step.stage}
                        className="p-3 rounded-2xl bg-[#F8F7F7] border border-black/5 flex flex-col justify-between"
                      >
                        <span className="text-[10px] uppercase font-bold text-[#6B6B6B]">
                          {step.stage}
                        </span>
                        <span className="text-xl font-bold text-[#111111] my-1 tabular-nums">
                          {step.count}
                        </span>
                        <span className="text-[9px] text-[#A8A5A5] font-semibold">
                          {step.conversionFromPrior !== null
                            ? `${step.conversionFromPrior}% conversion`
                            : 'Top of funnel'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                    Qualification strictly requires a settled first invoice payment before credit months become applicable.
                  </p>
                </div>

                {/* WIDGET 2: Referral Economics */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Referral Economics &amp; Costs
                      </span>
                      <MetricTooltip
                        id="tt_ref_eco"
                        calculation="Total retainer credit months granted multiplied by client contract value (valued at €1,200/mo baseline)."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#F8F7F7] border border-black/5">
                      <span className="text-[11px] text-[#6B6B6B] block">Months Credited</span>
                      <span className="text-2xl font-bold text-[#111111] block tabular-nums">
                        {referralsPartnersData.totalMonthsCredited} months
                      </span>
                      <span className="text-[10px] text-[#A8A5A5] mt-1 block">
                        Applied to active retainers
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F8F7F7] border border-black/5">
                      <span className="text-[11px] text-[#6B6B6B] block">Estimated Cost Value</span>
                      <span className="text-2xl font-bold text-[#D92D50] block tabular-nums">
                        €{referralsPartnersData.totalEstimatedCostEUR.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#A8A5A5] mt-1 block">
                        Zero cash out-of-pocket
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                    Referral rewards grant fee waivers on existing capacity without incurring upfront marketing cost.
                  </p>
                </div>

                {/* WIDGET 3: Partner Sourcing & Demo-to-Agreed Conversion */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Partner Performance &amp; Conversion Attribution
                      </span>
                      <MetricTooltip
                        id="tt_partner_table"
                        calculation="Client practices brought by registered partners, concept mockups created, Agreed opportunity conversion, and cash-collected earnings."
                      />
                    </div>
                    <span className="text-xs font-bold text-[#111111]">
                      Overall Demo Conversion: {referralsPartnersData.overallDemoConversionRate}%
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F7F7] text-[#A8A5A5] text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Partner</th>
                          <th className="py-2.5 px-3">Organisation</th>
                          <th className="py-2.5 px-3">Clients Brought</th>
                          <th className="py-2.5 px-3">Active Retainers</th>
                          <th className="py-2.5 px-3">Concept Demos</th>
                          <th className="py-2.5 px-3">Agreed Conversion</th>
                          <th className="py-2.5 px-3 text-right">Cash Earnings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {referralsPartnersData.partners.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#A8A5A5]">
                              Not enough data yet (Sample size: 0 partners)
                            </td>
                          </tr>
                        ) : (
                          referralsPartnersData.partners.map((p) => (
                            <tr key={p.id} className="hover:bg-[#F8F7F7]">
                              <td className="py-2.5 px-3 font-bold text-[#111111]">{p.name}</td>
                              <td className="py-2.5 px-3 text-[#6B6B6B]">{p.organisation}</td>
                              <td className="py-2.5 px-3 font-semibold text-[#111111] tabular-nums">
                                {p.clientsBrought}
                              </td>
                              <td className="py-2.5 px-3 text-[#6B6B6B] tabular-nums">
                                {p.activeClients}
                              </td>
                              <td className="py-2.5 px-3 text-[#6B6B6B] tabular-nums">
                                {p.demosCreated}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#111111] tabular-nums">
                                {p.demoConversionRate}% ({p.agreedCount}/{p.demosCreated || 0})
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[#111111] tabular-nums">
                                €{p.totalEarningsEUR.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: DELIVERY AND TEAM */}
          {/* ========================================================================= */}
          {activeTab === 'delivery-team' && deliveryTeamData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  Delivery Quality &amp; Team Telemetry
                </h2>
                <p className="text-xs text-[#6B6B6B]">
                  Client onboarding turnaround times, reporting SLAs, sub-team capacity, and weighted team performance indices
                </p>
              </div>

              {/* Grid (Max 5 Widgets for Tab 5) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* WIDGET 1: Onboarding SLA */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Client Onboarding Turnaround
                      </span>
                      <MetricTooltip
                        id="tt_onboarding"
                        calculation="Average business days elapsed between agreement contract start date and live delivery/portal activation."
                      />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      SLA Target: {deliveryTeamData.onboardingSlaDays} days
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-[#111111] tabular-nums">
                      {deliveryTeamData.avgOnboardingDays} days
                    </span>
                    <span className="text-xs text-emerald-700 font-bold">
                      {(deliveryTeamData.onboardingSlaDays - deliveryTeamData.avgOnboardingDays).toFixed(1)} days faster than target SLA
                    </span>
                  </div>

                  <p className="text-xs text-[#6B6B6B] leading-relaxed">
                    Currently tracking <strong>{deliveryTeamData.activeOnboardingCount} active onboarding engagements</strong> through production staging.
                  </p>
                </div>

                {/* WIDGET 2: Monthly Reporting On-Time Rate */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Monthly Reporting SLA Compliance
                      </span>
                      <MetricTooltip
                        id="tt_report_sla"
                        calculation="Percentage of client monthly reports published strictly on or before their agreed scheduled monthly report date."
                      />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Target: 95%
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-[#111111] tabular-nums">
                      {deliveryTeamData.reportOnTimeRate}%
                    </span>
                    <span className="text-xs text-[#6B6B6B]">
                      {deliveryTeamData.onTimeReportsCount} / {deliveryTeamData.totalReportsPublished} reports on time
                    </span>
                  </div>

                  <p className="text-xs text-[#6B6B6B] leading-relaxed">
                    Zero report arrears ensure high client retention and low monthly billing disputes.
                  </p>
                </div>

                {/* WIDGET 3: Sub-Team Capacity Allocation */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Sub-Team Capacity &amp; Utilization
                      </span>
                      <MetricTooltip
                        id="tt_subteam_cap"
                        calculation="Active assigned client practices compared against maximum defined client capacity per delivery sub-team."
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {deliveryTeamData.subTeams.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#A8A5A5]">
                        Not enough data yet (Sample size: 0 sub-teams)
                      </div>
                    ) : (
                      deliveryTeamData.subTeams.map((st) => (
                        <div key={st.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#111111] flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: st.color }}
                              />
                              <span>{st.name}</span>
                            </span>
                            <span className="font-semibold text-[#111111] tabular-nums">
                              {st.assignedClients} / {st.maxClients} clients ({st.utilizationRate}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${st.utilizationRate}%`,
                                backgroundColor: st.color || '#D92D50',
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* WIDGET 4: Team Performance Composite Index */}
                <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Team Performance Composite Scores
                      </span>
                      <MetricTooltip
                        id="tt_team_scores"
                        calculation="Weighted composite score (0-100) calculated from settings weights: On-time (25%), Low Revisions (20%), Turnaround (20%), QA Pass (20%), Hours Consistency (15%)."
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {deliveryTeamData.teamScores.map((score) => (
                      <div
                        key={score.memberId}
                        className="p-3 rounded-2xl bg-[#F8F7F7] border border-black/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#111111] block">
                            {score.memberName}
                          </span>
                          <span className="text-[11px] text-[#6B6B6B]">
                            {score.role || 'Specialist'} · {score.totalCompletedTasks} tasks completed · {score.onTimeRate}% on-time
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-bold text-[#111111] block tabular-nums">
                            {score.score}/100
                          </span>
                          {score.hasEnoughData ? (
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              Verified Index
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                              Low sample (&lt;10 tasks)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
