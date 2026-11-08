import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Handshake,
  Euro,
  CheckCircle2,
  Clock,
  Building,
  Filter,
  Search,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Partner, Client, Payment, TimeEntry, TeamMemberProfile } from '../types/index.ts';
import { getPartners, getClients, getPayments, getTimeEntries, getTeamMembers } from '../data/repo.ts';
import { computePartnerEarnings, PartnerEarningsComputation } from '../lib/partners.ts';

export const PartnerFeesPage: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPartners(),
      getClients(),
      getPayments(),
      getTimeEntries(),
      getTeamMembers(),
    ]).then(([pts, clis, pays, tes, tms]) => {
      setPartners(pts);
      setClients(clis);
      setPayments(pays);
      setTimeEntries(tes);
      setTeamMembers(tms);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#D92D50] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#6B6B6B]">Reconciling partner fee ledger...</span>
        </div>
      </div>
    );
  }

  // Precompute single source of truth earnings for every partner
  const computations: PartnerEarningsComputation[] = partners.map((partner) =>
    computePartnerEarnings(partner, clients, payments, timeEntries, teamMembers)
  );

  const totalGrossClientPayments = computations.reduce((sum, c) => sum + c.grossClientPaymentsEUR, 0);
  const totalPartnerShareEarned = computations.reduce((sum, c) => sum + c.partnerShareEUR, 0);
  const totalPartnerPaid = computations.reduce((sum, c) => sum + c.earningsPaidEUR, 0);
  const totalPartnerOwed = computations.reduce((sum, c) => sum + c.balanceOwedEUR, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Partner Referral Fees
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            B2B referral commissions computed on received client payments (cash basis single source of truth).
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#111111] text-white rounded-[24px] p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-white/70 font-medium">Pending Commissions Owed</div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            €{totalPartnerOwed.toLocaleString()}
          </div>
          <div className="text-[11px] text-white/60 mt-1">
            Reconciled against payment receipts
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-[#6B6B6B] font-medium">Total Gross Client Payments</div>
          <div className="mt-2 text-2xl font-extrabold text-[#111111]">
            €{totalGrossClientPayments.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-1">
            Cash received from referred clinics
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-[#6B6B6B] font-medium">Commissions Paid to Date</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">
            €{totalPartnerPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-1">
            Settled bank transfers
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-[#6B6B6B] font-medium">Active Partner Agreements</div>
          <div className="mt-2 text-2xl font-extrabold text-[#111111]">
            {partners.filter((p) => p.stage === 'Active').length}
          </div>
          <div className="text-[11px] text-[#6B6B6B] mt-1">
            Cash-basis agreements
          </div>
        </div>
      </div>

      {/* Partner Fees Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-black/5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Partner Commission Ledger (Single Source of Truth)</h2>
            <p className="text-xs text-[#6B6B6B]">
              Calculated dynamically via <code className="text-[#D92D50]">src/lib/partners.ts</code> from client payment records.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Cash Basis Accounting
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                <th className="py-3 px-5">Partner</th>
                <th className="py-3 px-4">Deal Model & Terms</th>
                <th className="py-3 px-4">Clients Brought</th>
                <th className="py-3 px-4">Gross Client Payments</th>
                <th className="py-3 px-4">Partner Share</th>
                <th className="py-3 px-4">Commissions Paid</th>
                <th className="py-3 px-4">Effective Rate</th>
                <th className="py-3 px-4 text-right">Balance Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {computations.map((comp) => {
                const partner = partners.find((p) => p.id === comp.partnerId);
                const owed = comp.balanceOwedEUR;

                return (
                  <tr key={comp.partnerId} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-[#111111]">{comp.partnerName}</div>
                      <div className="text-[11px] text-[#A8A5A5]">{partner?.organisation}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#111111] block">{comp.dealModel}</span>
                      <span className="text-[11px] text-[#6B6B6B]">
                        {comp.sharePercentage ? `${comp.sharePercentage}%` : `€${comp.fixedAmount}`} ({comp.appliesTo})
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#111111] tabular-nums">
                      {comp.clientsBroughtCount}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#111111] tabular-nums">
                      €{comp.grossClientPaymentsEUR.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#D92D50] tabular-nums">
                      €{comp.partnerShareEUR.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-emerald-600 tabular-nums">
                      €{comp.earningsPaidEUR.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-semibold text-[#6B6B6B] tabular-nums">
                      {comp.effectiveHourlyRateEUR !== null ? (
                        <span className="text-emerald-800 font-bold">€{comp.effectiveHourlyRateEUR}/hr</span>
                      ) : (
                        <span className="text-[#A8A5A5]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-black tabular-nums">
                      {owed > 0 ? (
                        <span className="text-[#D92D50]">€{owed.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-700">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
