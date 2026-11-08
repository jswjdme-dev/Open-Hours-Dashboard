import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { getLeadActivities, getLeads } from '../data/repo.ts';
import { LeadActivity, Lead } from '../types/index.ts';

export const AuditLogPage: React.FC = () => {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getLeadActivities(), getLeads()]).then(([acts, lds]) => {
      setActivities(acts);
      const lMap: Record<string, Lead> = {};
      lds.forEach((l) => {
        lMap[l.id] = l;
      });
      setLeads(lMap);
      setLoading(false);
    });
  }, []);

  const filteredActivities = activities.filter((act) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const leadName = leads[act.leadId]?.businessName || '';
      return act.text.toLowerCase().includes(q) || leadName.toLowerCase().includes(q) || act.createdBy.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Audit Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Compliance
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Immutable log of state mutations, stage transitions, and outbound client communication.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit actions, leads, or actors..."
            className="w-full bg-[#F4F2F2] rounded-full pl-9 pr-4 py-2 text-xs text-[#111111] placeholder-[#A8A5A5] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
          />
        </div>

        <span className="text-xs text-[#6B6B6B]">
          {filteredActivities.length} logged mutations
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-black/5">
          <h2 className="text-sm font-bold text-[#111111]">System Activity Stream</h2>
          <p className="text-xs text-[#6B6B6B]">Chronological audit ledger with actor attribution.</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B6B6B]">Loading audit stream...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B6B6B]">No activity events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-4">Entity / Prospect</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Audit Description</th>
                  <th className="py-3 px-4 text-right">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredActivities.slice(0, 50).map((act) => {
                  const lead = leads[act.leadId];
                  return (
                    <tr key={act.id} className="hover:bg-[#F9F9F9] transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[#6B6B6B]">
                        {act.createdAt}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#111111]">
                        {lead?.businessName || act.leadId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F4F2F2] font-semibold text-[10px] text-[#444444]">
                          {act.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#111111]">
                        {act.text}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-[#111111]">
                        {act.createdBy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
