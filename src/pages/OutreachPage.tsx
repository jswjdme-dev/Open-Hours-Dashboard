import React, { useState, useEffect } from 'react';
import {
  Send,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  Phone,
  Link2,
  TrendingUp,
  AlertOctagon,
  Edit2,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { MessageTemplate, ChannelType } from '../types/index.ts';
import {
  getMessageTemplates,
  getOutreachLogs,
  getDailySendLimit,
  getOutreachCallsBookedStats,
} from '../data/repo.ts';
import { LogOutreachModal } from '../components/outreach/LogOutreachModal.tsx';
import { TemplateEditorModal } from '../components/outreach/TemplateEditorModal.tsx';

export const OutreachPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Analytics' | 'Templates' | 'Logs'>('Analytics');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [timeframe, setTimeframe] = useState('Last 7 days');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [callsBookedStats, setCallsBookedStats] = useState<{
    totalCallsBooked: number;
    byChannel: Record<string, number>;
  }>({ totalCallsBooked: 0, byChannel: {} });

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [complianceNoticeOpen, setComplianceNoticeOpen] = useState(true);

  const loadData = async () => {
    const tpls = await getMessageTemplates();
    setTemplates(tpls);
    const limit = await getDailySendLimit();
    setDailyLimit(limit);
    const stats = await getOutreachCallsBookedStats();
    setCallsBookedStats(stats);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fictional realistic outreach counters
  const sentToday = 18;
  const sentThisWeek = 86;
  const repliesThisWeek = 24;
  const replyRate = 27.9;
  const bouncesCount = 2; // 2.3% (< 5%)
  const optOutsCount = 1;

  // Daily tracker calculation
  const limitPercent = Math.round((sentToday / dailyLimit) * 100);
  const isOverLimit = sentToday > dailyLimit;
  const isNearLimit = limitPercent >= 80 && !isOverLimit;

  // Bounce rate check
  const bounceRate = Math.round((bouncesCount / sentThisWeek) * 100);
  const hasBounceWarning = bounceRate >= 5;

  // Chart 1: Sent vs Replies Per Day
  const dailyData = [
    { day: 'Mon', sent: 16, replies: 4 },
    { day: 'Tue', sent: 20, replies: 6 },
    { day: 'Wed', sent: 22, replies: 7 },
    { day: 'Thu', sent: 18, replies: 5 },
    { day: 'Fri', sent: 10, replies: 2 },
  ];

  // Chart 2: Reply rate by template
  const templateChartData = templates.map((t) => ({
    name: t.title.length > 22 ? t.title.substring(0, 20) + '...' : t.title,
    rate: t.replyRate,
    version: `v${t.version}`,
  }));

  // Per-channel counters table (Calls Booked computed from real data)
  const channelBreakdown = [
    { channel: 'Email', sent: 54, replies: 17, rate: '31.5%', audits: 6, calls: callsBookedStats.byChannel['Email'] ?? 0 },
    { channel: 'LinkedIn', sent: 22, replies: 5, rate: '22.7%', audits: 3, calls: callsBookedStats.byChannel['LinkedIn'] ?? 0 },
    { channel: 'Phone', sent: 6, replies: 2, rate: '33.3%', audits: 1, calls: callsBookedStats.byChannel['Phone'] ?? 0 },
    { channel: 'WhatsApp', sent: 4, replies: 0, rate: '0.0%', audits: 0, calls: callsBookedStats.byChannel['WhatsApp'] ?? 0 },
    { channel: 'Facebook', sent: 0, replies: 0, rate: '—', audits: 0, calls: callsBookedStats.byChannel['Facebook'] ?? 0 },
    { channel: 'Instagram', sent: 0, replies: 0, rate: '—', audits: 0, calls: callsBookedStats.byChannel['Instagram'] ?? 0 },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
            Outreach
          </h1>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
            Demo data
          </span>
        </div>

        <button
          type="button"
          onClick={() => setLogModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-102"
        >
          <Send size={14} />
          <span>Log outreach</span>
        </button>
      </div>

      {/* Bounce Warning Banner (if >5%) */}
      {hasBounceWarning && (
        <div className="bg-[#D92D50] text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <AlertOctagon size={20} className="shrink-0" />
            <div>
              <div className="text-xs font-bold">Domain Safeguard: High Bounce Rate Detected ({bounceRate}%)</div>
              <div className="text-[11px] text-white/80">
                Bounce rate exceeds 5% in the last 7 days. Pause cold email sequences immediately to prevent domain reputation damage.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Notice (Collapsible) */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setComplianceNoticeOpen(!complianceNoticeOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              NEEDS PROFESSIONAL ADVICE
            </span>
            <span className="text-xs font-bold text-[#111111]">
              Legal & Compliance Framework (Ireland & Malta)
            </span>
          </div>
          {complianceNoticeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {complianceNoticeOpen && (
          <div className="px-4 pb-3.5 pt-1 text-xs text-[#6B6B6B] border-t border-black/5 space-y-1">
            <p>
              Cold outreach rules differ by country and by company type. Get professional advice for Ireland and Malta before scaling email outreach.
            </p>
            <p className="text-[11px] text-[#A8A5A5]">
              Corporate emails in Ireland follow ePrivacy Regulations (S.I. 336/2011), while sole traders require opt-in. In Malta, the Data Protection Act (Cap. 586) applies. Always honor the permanent Suppression list.
            </p>
          </div>
        )}
      </div>

      {/* Top Toolbar: Date Range & Tabs */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2.5 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center p-1 bg-white rounded-full border border-black/5 shadow-2xs">
          {(['Analytics', 'Templates', 'Logs'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Date Range Select */}
        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="Last 7 days">Last 7 days</option>
            <option value="Last 30 days">Last 30 days</option>
            <option value="This quarter">This quarter</option>
          </select>
        </div>
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'Analytics' && (
        <div className="space-y-6">
          {/* KPI Row (with black feature card for Replies this week) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
            {/* Sent today */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Sent today</span>
              <span className="text-2xl font-bold text-[#111111] tabular-nums">{sentToday}</span>
            </div>

            {/* Sent this week */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Sent this week</span>
              <span className="text-2xl font-bold text-[#111111] tabular-nums">{sentThisWeek}</span>
            </div>

            {/* BLACK FEATURE CARD: Replies this week */}
            <div className="bg-[#111111] text-white rounded-2xl p-4 shadow-md col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-white/70 block mb-1">Replies this week</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-white tabular-nums">{repliesThisWeek}</span>
                <span className="text-xs text-emerald-400 font-semibold">▲ Active</span>
              </div>
            </div>

            {/* Reply rate */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Reply rate</span>
              <span className="text-2xl font-bold text-[#111111] tabular-nums">{replyRate}%</span>
            </div>

            {/* Bounces */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Bounces</span>
              <span className="text-2xl font-bold text-[#111111] tabular-nums">{bouncesCount}</span>
            </div>

            {/* Opt-outs */}
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
              <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Opt-outs</span>
              <span className="text-2xl font-bold text-[#D92D50] tabular-nums">{optOutsCount}</span>
            </div>
          </div>

          {/* Daily Send Tracker vs Configurable Limit */}
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#111111]">Daily Email Throttle: </span>
                <span className="text-[#6B6B6B]">{sentToday} / {dailyLimit} emails sent today ({limitPercent}%)</span>
              </div>
              <span className="text-[11px] text-[#A8A5A5]">Configurable in Settings</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-[#F1EFEF] rounded-full overflow-hidden p-0.5 border border-black/5">
              <div
                style={{ width: `${Math.min(limitPercent, 100)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverLimit
                    ? 'bg-[#D92D50]'
                    : isNearLimit
                    ? 'bg-amber-400'
                    : 'bg-[#111111]'
                }`}
              />
            </div>

            {/* Over limit alert */}
            {isOverLimit && (
              <div className="text-xs text-[#D92D50] font-bold pt-1">
                ⚠️ Over your daily limit. Sending too much too fast can damage your email domain.
              </div>
            )}
            {isNearLimit && (
              <div className="text-xs text-amber-700 font-semibold pt-1">
                Approaching daily send limit (80%+ reached).
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Sent vs Replies Per Day (Hatched & Solid Bars) */}
            <div className="bg-[#F4F2F2] rounded-[24px] p-5 border border-black/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xs text-[#111111]">
                  Sent vs Replies per Day
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-[#6B6B6B]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-hatched bg-gray-400" /> Sent
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#D92D50]" /> Replies
                  </span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0DCDC" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                    />
                    <Bar dataKey="sent" fill="#A8A5A5" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="replies" fill="#D92D50" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Reply Rate by Template */}
            <div className="bg-[#F4F2F2] rounded-[24px] p-5 border border-black/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xs text-[#111111]">
                  Reply Rate by Template (%)
                </h3>
                <span className="text-[11px] text-[#A8A5A5]">Tested copy benchmarks</span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={templateChartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0DCDC" />
                    <XAxis type="number" domain={[0, 40]} tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: '#111' }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Reply Rate']}
                      contentStyle={{ backgroundColor: '#111', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                    />
                    <Bar dataKey="rate" fill="#111111" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Per-Channel Counters Table */}
          <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
              Channel Performance Breakdown
            </h3>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
                  <tr>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Sent</th>
                    <th className="py-2.5 px-3">Replies</th>
                    <th className="py-2.5 px-3">Reply Rate</th>
                    <th className="py-2.5 px-3">Audits Sent</th>
                    <th className="py-2.5 px-3">Calls Booked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {channelBreakdown.map((row) => (
                    <tr key={row.channel} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-[#111111]">{row.channel}</td>
                      <td className="py-2.5 px-3 tabular-nums">{row.sent}</td>
                      <td className="py-2.5 px-3 tabular-nums font-semibold">{row.replies}</td>
                      <td className="py-2.5 px-3 tabular-nums font-bold text-[#D92D50]">{row.rate}</td>
                      <td className="py-2.5 px-3 tabular-nums">{row.audits}</td>
                      <td className="py-2.5 px-3 tabular-nums">{row.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE LIBRARY */}
      {activeTab === 'Templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111111]">Outreach Template Library</h3>
              <p className="text-xs text-[#6B6B6B]">
                Templates maintain strict version history. Edits automatically generate a new version number.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-[20px] p-4.5 border border-black/5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A5A5]">
                      {tpl.channel} · Version v{tpl.version}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(tpl)}
                      className="inline-flex items-center gap-1 text-xs text-[#6B6B6B] hover:text-[#D92D50] font-semibold cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit & bump version</span>
                    </button>
                  </div>

                  <h4 className="font-bold text-sm text-[#111111] mb-1">
                    {tpl.title}
                  </h4>
                  <p className="text-xs text-[#6B6B6B] mb-3">
                    {tpl.description}
                  </p>

                  <div className="bg-[#F8F7F7] p-3 rounded-xl text-xs font-mono text-[#111111] whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar border border-black/5 mb-3">
                    {tpl.content}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-black/5 text-xs text-[#A8A5A5]">
                  <span>Used: <strong className="text-[#111111]">{tpl.timesUsed} times</strong></span>
                  <span>Reply Rate: <strong className="text-[#D92D50]">{tpl.replyRate}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OUTREACH LOGS */}
      {activeTab === 'Logs' && (
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-2xs space-y-3">
          <h3 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
            Outreach Dispatch Audit Trail
          </h3>
          <p className="text-xs text-[#6B6B6B]">
            All outgoing interactions logged. Historical records retain exact template version used.
          </p>

          <div className="divide-y divide-black/5 text-xs">
            {[
              { id: '1', lead: 'Ranelagh Dental Loft', ch: 'Email', tpl: 'Initial Practice Growth Intro (v1)', status: 'Sent', date: '2026-10-04 10:15', by: 'Founder' },
              { id: '2', lead: 'Corrib Chiropractic', ch: 'Email', tpl: 'Growth Audit Offer (v1)', status: 'Replied', date: '2026-09-22 14:30', by: 'Founder' },
              { id: '3', lead: 'St. Julian Spine & Posture', ch: 'Email', tpl: 'Initial Practice Growth Intro (v1)', status: 'Replied', date: '2026-09-18 09:45', by: 'Founder' },
              { id: '4', lead: 'Killarney Wellness Physio', ch: 'Email', tpl: 'Initial Practice Growth Intro (v1)', status: 'Bounced', date: '2026-09-15 11:20', by: 'Sarah M.' },
            ].map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#111111]">{log.lead}</div>
                  <div className="text-[11px] text-[#A8A5A5]">
                    {log.ch} · {log.tpl} · Logged by {log.by}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'Replied'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.status === 'Bounced'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-[11px] text-[#A8A5A5]">{log.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Outreach Modal */}
      <LogOutreachModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onLogged={loadData}
      />

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={Boolean(editingTemplate)}
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSaved={loadData}
      />
    </div>
  );
};
