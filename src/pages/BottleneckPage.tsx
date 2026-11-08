import React, { useState, useEffect } from 'react';
import {
  GitPullRequestDraft,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { getLeads, getTasks } from '../data/repo.ts';
import { Lead } from '../types/index.ts';

export const BottleneckPage: React.FC = () => {
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
          <span className="text-xs font-semibold text-[#6B6B6B]">Detecting pipeline friction...</span>
        </div>
      </div>
    );
  }

  // Find stagnant leads (e.g. In contact or audit sent for > 14 days)
  const stagnantLeads = leads.filter(
    (l) => l.stage !== 'Won' && l.stage !== 'Lost' && l.stage !== 'Not Now'
  );

  const bottlenecks = [
    {
      title: 'Audit Video Turnaround SLA',
      stage: 'Audit Sent → Concept Shown',
      impact: 'High',
      frictionPct: '42%',
      cause: 'Audit preparation takes 3-4 days on average. Cold leads lose momentum if not delivered within 48h.',
      fix: 'Standardise Loom audit template with pre-recorded clinic teardown modules.',
    },
    {
      title: 'Multi-Partner Approval Hesitation',
      stage: 'Concept Shown → Proposal Sent',
      impact: 'Medium',
      frictionPct: '28%',
      cause: 'Practice owners need consultation with co-directors or practice managers before approving retainer spend.',
      fix: 'Provide one-page "Executive Partner ROI summary" PDF designed for clinic co-owners.',
    },
    {
      title: 'Price vs Value Alignment',
      stage: 'Proposal Sent → Won',
      impact: 'Medium',
      frictionPct: '22%',
      cause: 'Tier 1 Regular package (€1,200/mo) perceived high by single-practitioner clinics with <25 Google reviews.',
      fix: 'Clarify patient lifetime value calculation during the concept review call.',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Bottleneck Diagnostics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Structural friction points in the clinic acquisition funnel and recommended mitigation protocols.
          </p>
        </div>
      </div>

      {/* Primary Friction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {bottlenecks.map((b) => (
          <div key={b.title} className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50] bg-[#FCE9ED] px-2.5 py-0.5 rounded-full">
                  {b.impact} Friction
                </span>
                <span className="text-xs font-bold text-[#111111]">{b.frictionPct} drop</span>
              </div>
              <h2 className="text-base font-bold text-[#111111]">{b.title}</h2>
              <div className="text-[11px] font-semibold text-[#A8A5A5] mt-0.5">{b.stage}</div>
              <p className="text-xs text-[#6B6B6B] mt-3">{b.cause}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-black/5 text-xs">
              <strong className="text-[#111111] block mb-1">Recommended Fix:</strong>
              <span className="text-[#6B6B6B] text-[11px]">{b.fix}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stagnant Leads Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Active Leads In Pipeline</h2>
            <p className="text-xs text-[#6B6B6B]">Monitoring dwell time across active prospect negotiations.</p>
          </div>
          <span className="text-xs text-[#6B6B6B]">{stagnantLeads.length} leads in flight</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                <th className="py-3 px-5">Practice / Clinic</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Specialty</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {stagnantLeads.slice(0, 10).map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="py-3.5 px-5 font-bold text-[#111111]">
                    {lead.businessName}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-[#F4F2F2] text-[#111111] font-semibold text-[11px]">
                      {lead.stage}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#D92D50]">
                    {lead.score.total} pts ({lead.score.band})
                  </td>
                  <td className="py-3.5 px-4 text-[#6B6B6B]">
                    {lead.specialty}
                  </td>
                  <td className="py-3.5 px-4 text-[#6B6B6B]">
                    {lead.city}, {lead.country}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-[#111111]">
                    {lead.ownerName}
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
