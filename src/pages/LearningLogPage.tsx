import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { getLeads } from '../data/repo.ts';
import { Lead } from '../types/index.ts';

export const LearningLogPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeads().then((res) => {
      setLeads(res);
      setLoading(false);
    });
  }, []);

  const lostLeads = leads.filter((l) => l.stage === 'Lost');
  const wonLeads = leads.filter((l) => l.stage === 'Won');

  const learnings = [
    {
      id: 'learn_1',
      date: '2026-09-28',
      category: 'Outreach Channel',
      insight: 'LinkedIn direct messages to clinic clinical directors yield 3.8x faster replies than general reception emails.',
      evidence: 'Observed across 18 Dublin dental practices with named practice principals.',
      status: 'Validated',
    },
    {
      id: 'learn_2',
      date: '2026-09-21',
      category: 'Audit Teardown',
      insight: 'Including a mobile page speed test and 15-second Loom clip comparing competitor booking flows triggers instant replies.',
      evidence: '4 out of 5 clinics that received custom Loom audits agreed to the 20-minute concept call.',
      status: 'Validated',
    },
    {
      id: 'learn_3',
      date: '2026-09-14',
      category: 'Pricing Objection',
      insight: 'Clinics asking about setup fee waivers convert when offered a 30-day performance review rather than a fee discount.',
      evidence: 'Tested with Corrib Chiropractic and Dunmore Dental Care.',
      status: 'Testing',
    },
    {
      id: 'learn_4',
      date: '2026-09-07',
      category: 'Disqualification Rule',
      insight: 'Clinics with HSE or NHS contract dependencies over 70% consistently decline private patient marketing.',
      evidence: 'All 3 public-funded prospects stalled at proposal review due to administrative funding blocks.',
      status: 'Codified into Rules',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Learning Log
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Institutional knowledge repository compiling validated sales tactics, objection patterns, and channel feedback.
          </p>
        </div>
      </div>

      {/* Log Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {learnings.map((log) => (
          <div key={log.id} className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-[#D92D50] bg-[#FCE9ED] px-2.5 py-0.5 rounded-full text-[10px]">
                  {log.category}
                </span>
                <span className="text-[#A8A5A5]">{log.date}</span>
              </div>
              <h2 className="text-sm font-bold text-[#111111] leading-snug">
                {log.insight}
              </h2>
              <div className="text-xs text-[#6B6B6B] mt-2.5 bg-[#F9F9F9] p-3 rounded-xl border border-black/5">
                <strong className="text-[#111111] block mb-0.5">Observed Evidence:</strong>
                {log.evidence}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-black/5 text-xs">
              <span className="text-[#A8A5A5]">Validation State</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                {log.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lost Reason Analysis Section */}
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#111111]">Loss Patterns Breakdown</h2>
        <p className="text-xs text-[#6B6B6B]">Required exit reasons recorded on lost prospect files.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
          {['Price', 'Trust', 'No need', 'Existing agency', 'No reply', 'Other'].map((reason) => {
            const count = lostLeads.filter((l) => l.lostReason === reason).length;
            return (
              <div key={reason} className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-black/5 text-center">
                <div className="text-[11px] text-[#A8A5A5] font-semibold">{reason}</div>
                <div className="text-xl font-black text-[#111111] mt-1">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
