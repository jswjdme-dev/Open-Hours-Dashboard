import React from 'react';
import { Target, TrendingUp, CheckCircle2, Flame, Award } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const goals = [
    {
      title: 'Q4 2026 Clinic Retainers',
      target: '5 Won Clinics',
      current: '2 Won (Harbour Dental & Sliema Physio)',
      progress: 40,
      badge: 'On Track',
      notes: 'Focus on private dental surgeries in Dublin 2 & 4 and Sliema promenade.',
    },
    {
      title: 'Practice Audits Delivered',
      target: '30 Video Audits',
      current: '14 Completed',
      progress: 47,
      badge: 'Active',
      notes: 'Average conversion from audit sent to concept shown is 48%.',
    },
    {
      title: 'Monthly Recurring Revenue',
      target: '€10,000 / month',
      current: '€4,820 / month',
      progress: 48.2,
      badge: 'Primary Goal',
      notes: 'Targeting average clinic retainer of €1,800 to €3,200 for combined Web + SEO + Google Ads.',
    },
    {
      title: 'Direct Strategic Referral Partners',
      target: '6 Active Partners',
      current: '2 Active, 2 in Conversation',
      progress: 66.7,
      badge: 'Strong Momentum',
      notes: 'GDPR consultants and clinic fitout suppliers have highest lead conversion.',
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
          Goals
        </h1>
        <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
          Demo data
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((g, i) => (
          <div
            key={i}
            className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#A8A5A5] uppercase tracking-wider">
                  Target Metric
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FCE9ED] text-[#D92D50] text-[10px] font-bold">
                  {g.badge}
                </span>
              </div>

              <h3 className="text-lg font-bold text-[#111111] mb-1">{g.title}</h3>
              <div className="text-xs text-[#6B6B6B] mb-4">{g.notes}</div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#111111]">{g.current}</span>
                  <span className="text-[#A8A5A5]">Goal: {g.target}</span>
                </div>

                <div className="w-full h-2.5 bg-[#F1EFEF] rounded-full overflow-hidden p-0.5">
                  <div
                    style={{ width: `${g.progress}%` }}
                    className="h-full rounded-full bg-[#111111] transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#A8A5A5] pt-2 border-t border-black/5 flex items-center justify-between">
              <span>Sprint: Sep – Dec 2026</span>
              <span className="font-bold text-[#111111]">{g.progress}% Complete</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
