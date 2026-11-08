import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Activity,
  Euro,
  Users,
  CheckCircle2,
  TrendingUp,
  Filter,
} from 'lucide-react';
import {
  getNicheAndSourceMetrics,
  NicheMetrics,
  CountryMetrics,
} from '../lib/metrics.ts';

export const NicheSourcePage: React.FC = () => {
  const [data, setData] = useState<{
    bySpecialty: NicheMetrics[];
    byCountry: CountryMetrics[];
    bySource: Array<{
      source: string;
      leads: number;
      replyRate: number;
      won: number;
      revenue: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'specialty' | 'country' | 'source'>('specialty');

  useEffect(() => {
    setLoading(true);
    getNicheAndSourceMetrics().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D92D50] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#6B6B6B]">Aggregating niche intelligence...</span>
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
              Niche & Source Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Breakdown of clinic leads, reply rates, booked calls, won clients, and settled revenue per medical specialty and country.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center p-1 bg-[#F4F2F2] rounded-full text-xs font-semibold">
          {[
            { id: 'specialty', label: 'By Specialty' },
            { id: 'country', label: 'By Country' },
            { id: 'source', label: 'By Origin Source' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-[#111111] shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: BY SPECIALTY */}
      {activeTab === 'specialty' && (
        <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-black/5">
            <h2 className="text-sm font-bold text-[#111111]">Clinical Specialties Ledger</h2>
            <p className="text-xs text-[#6B6B6B]">Performance distribution across targeted private practice verticals.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                  <th className="py-3 px-5">Specialty</th>
                  <th className="py-3 px-4">Leads</th>
                  <th className="py-3 px-4">Replies</th>
                  <th className="py-3 px-4">Reply Rate</th>
                  <th className="py-3 px-4">Calls Booked</th>
                  <th className="py-3 px-4">Clients Won</th>
                  <th className="py-3 px-4 text-right">Settled Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.bySpecialty.map((item) => (
                  <tr key={item.specialty} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#111111]">
                      {item.specialty}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#111111]">
                      {item.leadsCount}
                    </td>
                    <td className="py-3.5 px-4 text-[#6B6B6B]">
                      {item.repliesCount}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#D92D50]">
                      {item.replyRate}%
                    </td>
                    <td className="py-3.5 px-4 text-[#6B6B6B]">
                      {item.callsCount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {item.clientsWon} won
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#111111]">
                      €{item.revenueEUR.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: BY COUNTRY */}
      {activeTab === 'country' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {data.byCountry.map((item) => (
            <div key={item.country} className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#F1EFEF] flex items-center justify-center font-bold text-xs text-[#111111]">
                    <MapPin size={16} />
                  </div>
                  <h3 className="font-bold text-base text-[#111111]">{item.country}</h3>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {item.clientsWon} Clients Won
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F9F9F9]">
                  <div className="text-[11px] text-[#A8A5A5]">Total Leads</div>
                  <div className="text-xl font-extrabold text-[#111111] mt-0.5">{item.leadsCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F9F9F9]">
                  <div className="text-[11px] text-[#A8A5A5]">Reply Rate</div>
                  <div className="text-xl font-extrabold text-[#D92D50] mt-0.5">{item.replyRate}%</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F9F9F9]">
                  <div className="text-[11px] text-[#A8A5A5]">Calls Booked</div>
                  <div className="text-xl font-extrabold text-[#111111] mt-0.5">{item.callsCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F9F9F9]">
                  <div className="text-[11px] text-[#A8A5A5]">Realized Revenue</div>
                  <div className="text-xl font-extrabold text-[#111111] mt-0.5">€{item.revenueEUR.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: BY ORIGIN SOURCE */}
      {activeTab === 'source' && (
        <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-black/5">
            <h2 className="text-sm font-bold text-[#111111]">Prospect Acquisition Channels</h2>
            <p className="text-xs text-[#6B6B6B]">Performance per prospecting database and network channel.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                  <th className="py-3 px-5">Origin Channel</th>
                  <th className="py-3 px-4">Leads</th>
                  <th className="py-3 px-4">Reply Rate</th>
                  <th className="py-3 px-4">Won Retainers</th>
                  <th className="py-3 px-4 text-right">Settled Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.bySource.map((s) => (
                  <tr key={s.source} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#111111]">
                      {s.source}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#111111]">
                      {s.leads}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#D92D50]">
                      {s.replyRate}%
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600">
                      {s.won}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#111111]">
                      €{s.revenue.toLocaleString()}
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
