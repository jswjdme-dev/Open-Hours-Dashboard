import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Euro,
  ExternalLink,
  Flame,
  Sparkles,
  ArrowUpRight,
  Layers,
  Activity,
} from 'lucide-react';
import { Client, ClientPackage, ClinicSpecialty } from '../types/index.ts';
import { getClients, getMrrMetrics } from '../data/repo.ts';

interface MrrPageProps {
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

export const MrrPage: React.FC<MrrPageProps> = ({ onOpenClientWorkspace }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [mrrData, cliList] = await Promise.all([getMrrMetrics(), getClients()]);
    setMetrics(mrrData);
    setClients(cliList.filter((c) => !c.archivedAt && (c.status === 'Live' || c.status === 'Care' || c.status === 'Onboarding')));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalMrr = metrics?.totalMrr || 0;
  const totalArr = metrics?.totalArr || 0;
  const activeSubs = metrics?.activeSubscriptions || 0;
  const arpu = metrics?.arpu || 0;

  // Milestone targets
  const milestones = [
    {
      label: 'Seed Traction',
      targetMrr: 5000,
      targetDate: 'Q2 2026',
      status: 'Achieved',
      desc: 'First 3 clinic retainers validated',
    },
    {
      label: 'Scale 10k MRR',
      targetMrr: 10000,
      targetDate: 'Nov 2026',
      status: totalMrr >= 10000 ? 'Achieved' : 'In progress',
      desc: 'Achieve cash-flow positive expansion',
    },
    {
      label: 'Growth 15k MRR',
      targetMrr: 15000,
      targetDate: 'Q1 2027',
      status: totalMrr >= 15000 ? 'Achieved' : 'Upcoming',
      desc: 'Dedicated account manager hire',
    },
    {
      label: 'Dominance 25k MRR',
      targetMrr: 25000,
      targetDate: 'Q3 2027',
      status: totalMrr >= 25000 ? 'Achieved' : 'Upcoming',
      desc: '15+ high-tier clinic partners across IE & MT',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header: Large Two-Tone Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="two-tone-title">
            MRR Roadmap
          </h1>
          <p className="two-tone-subtitle">
            Contracted monthly recurring revenue trajectory, package distribution, and expansion milestones.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <span className="section-pill-label">
            Demo data
          </span>
        </div>
      </div>

      {/* Hero Metrics Row: Deterministic 4-Color KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ink (Contracted MRR) */}
        <div className="bg-[#0A0A0A] text-white rounded-[20px] p-5 shadow-2xs flex flex-col justify-between min-h-[148px] transition-all">
          <div className="flex items-start justify-between">
            <span className="section-pill-label-dark">Contracted MRR</span>
            <Euro size={16} className="text-white/60" />
          </div>
          <div className="mt-3">
            <div className="text-[34px] sm:text-[38px] font-semibold tracking-tight text-white tabular-nums leading-none">
              €{totalMrr.toLocaleString()}
              <span className="text-xs font-normal text-white/60 ml-1">/ mo</span>
            </div>
            <div className="text-[11px] text-white/70 mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {activeSubs} active clinic subscriptions
            </div>
          </div>
        </div>

        {/* Card 2: Deep Blue (ARR) */}
        <div className="bg-[#1627E8] text-white rounded-[20px] p-5 shadow-2xs flex flex-col justify-between min-h-[148px] transition-all">
          <div className="flex items-start justify-between">
            <span className="section-pill-label-dark">Annual Run Rate (ARR)</span>
            <TrendingUp size={16} className="text-white/60" />
          </div>
          <div className="mt-3">
            <div className="text-[34px] sm:text-[38px] font-semibold tracking-tight text-white tabular-nums leading-none">
              €{totalArr.toLocaleString()}
            </div>
            <div className="text-[11px] text-white/80 font-medium mt-2.5 pt-2 border-t border-white/15 flex items-center gap-1">
              <ArrowUpRight size={13} />
              +14% vs last quarter
            </div>
          </div>
        </div>

        {/* Card 3: Neutral Grey (ARPU) */}
        <div className="bg-[#C9C9CC] text-[#0A0A0A] rounded-[20px] p-5 shadow-2xs flex flex-col justify-between min-h-[148px] transition-all">
          <div className="flex items-start justify-between">
            <span className="section-pill-label">Average Revenue / Account</span>
            <Users size={16} className="text-[#0A0A0A]/60" />
          </div>
          <div className="mt-3">
            <div className="text-[34px] sm:text-[38px] font-semibold tracking-tight text-[#0A0A0A] tabular-nums leading-none">
              €{arpu.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#4A4A4F] mt-2.5 pt-2 border-t border-[#0A0A0A]/10">
              Weighted across tiers
            </div>
          </div>
        </div>

        {/* Card 4: White with Border (Net Churn) */}
        <div className="bg-white text-[#0A0A0A] border border-[#E3E3E6] rounded-[20px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[148px] transition-all">
          <div className="flex items-start justify-between">
            <span className="section-pill-label">Monthly Churn Rate</span>
            <ShieldCheck size={16} className="text-[#027A48]" />
          </div>
          <div className="mt-3">
            <div className="text-[34px] sm:text-[38px] font-semibold tracking-tight text-[#0A0A0A] tabular-nums leading-none">
              0.0%
            </div>
            <div className="text-[11px] text-[#027A48] font-semibold mt-2.5 pt-2 border-t border-[#E3E3E6]">
              Zero client churn to date
            </div>
          </div>
        </div>
      </div>

      {/* Package & Specialty Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tier Distribution */}
        <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3]">
            <span className="section-pill-label">Package Distribution</span>
            <span className="text-xs text-[#73737A]">3 Standard Tiers</span>
          </div>

          <div className="space-y-3.5">
            {[
              { name: 'Regular', fee: '€1,200/mo', key: 'Regular' as ClientPackage, color: 'bg-[#C9C9CC]' },
              { name: 'Advanced', fee: '€1,800/mo', key: 'Advanced' as ClientPackage, color: 'bg-[#1627E8]' },
              { name: 'Premium', fee: '€2,800/mo', key: 'Premium' as ClientPackage, color: 'bg-[#0A0A0A]' },
            ].map((tier) => {
              const count = metrics?.packageBreakdown?.[tier.key]?.count || 0;
              const mrr = metrics?.packageBreakdown?.[tier.key]?.mrr || 0;
              const pct = totalMrr > 0 ? Math.round((mrr / totalMrr) * 100) : 0;

              return (
                <div key={tier.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0A0A0A]">{tier.name}</span>
                      <span className="text-[#73737A]">({tier.fee})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#73737A]">{count} clinics</span>
                      <span className="font-semibold text-[#0A0A0A]">€{mrr.toLocaleString()} ({pct}%)</span>
                    </div>
                  </div>
                  {/* Progress bar: 8px tall rounded */}
                  <div className="w-full h-2 rounded-full bg-[#E9E9EC] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tier.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specialty Distribution */}
        <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3]">
            <span className="section-pill-label">MRR by Clinic Specialty</span>
            <span className="text-xs text-[#73737A]">Core Niches</span>
          </div>

          <div className="space-y-3.5">
            {[
              { name: 'Dental', key: 'Dental' as ClinicSpecialty },
              { name: 'Physio', key: 'Physio' as ClinicSpecialty },
              { name: 'Aesthetics', key: 'Aesthetics' as ClinicSpecialty },
              { name: 'Chiropractic', key: 'Chiropractic' as ClinicSpecialty },
            ].map((spec) => {
              const count = metrics?.specialtyBreakdown?.[spec.key]?.count || 0;
              const mrr = metrics?.specialtyBreakdown?.[spec.key]?.mrr || 0;
              const pct = totalMrr > 0 ? Math.round((mrr / totalMrr) * 100) : 0;

              return (
                <div key={spec.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0A0A0A]">{spec.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#73737A]">{count} clinics</span>
                      <span className="font-semibold text-[#0A0A0A]">€{mrr.toLocaleString()} ({pct}%)</span>
                    </div>
                  </div>
                  {/* Progress bar: 8px tall rounded */}
                  <div className="w-full h-2 rounded-full bg-[#E9E9EC] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1627E8] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestones Roadmap Card */}
      <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3]">
          <div>
            <span className="section-pill-label">Growth Milestone Targets</span>
            <p className="text-xs text-[#73737A] mt-2">Stepping-stones to regional category leadership.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#73737A]">Next Target Gap</div>
            <div className="text-sm font-semibold text-[var(--color-accent)]">
              €{Math.max(0, 10000 - totalMrr).toLocaleString()} to €10k MRR
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((m, idx) => {
            const isDone = totalMrr >= m.targetMrr;
            const progress = Math.min(100, Math.round((totalMrr / m.targetMrr) * 100));

            return (
              <div
                key={m.label}
                className={`p-4 rounded-[16px] border transition-all ${
                  isDone
                    ? 'border-[#A6F4C5] bg-[#E7F8EF]/50'
                    : m.status === 'In progress'
                    ? 'border-[#D0D0D5] bg-[#F6F6F8] shadow-2xs'
                    : 'border-[#E3E3E6] bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#73737A]">
                    Step 0{idx + 1}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isDone
                        ? 'bg-[#E7F8EF] text-[#027A48] border border-[#A6F4C5]'
                        : m.status === 'In progress'
                        ? 'bg-[#0A0A0A] text-white'
                        : 'bg-[#E9E9EC] text-[#4A4A4F]'
                    }`}
                  >
                    {isDone ? 'Reached' : m.targetDate}
                  </span>
                </div>

                <div className="text-[15px] font-semibold text-[#0A0A0A]">{m.label}</div>
                <div className="text-lg font-bold text-[#0A0A0A] mt-0.5 tabular-nums">
                  €{m.targetMrr.toLocaleString()}
                  <span className="text-xs font-normal text-[#73737A]"> /mo</span>
                </div>

                <p className="text-[12px] text-[#4A4A4F] mt-2 line-clamp-2 leading-relaxed">{m.desc}</p>

                <div className="mt-4 pt-3 border-t border-black/5">
                  <div className="flex justify-between text-[11px] font-medium text-[#73737A] mb-1.5">
                    <span>Progress</span>
                    <span className="font-semibold text-[#0A0A0A]">{progress}%</span>
                  </div>
                  {/* Progress bar: 8px tall rounded */}
                  <div className="w-full h-2 rounded-full bg-[#E9E9EC] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone ? 'bg-[#027A48]' : 'bg-[#1627E8]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MRR Contributing Clients Table */}
      <div className="bg-white rounded-[20px] border border-[#E3E3E6] overflow-hidden">
        <div className="p-5 border-b border-[#E3E3E6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="section-pill-label">Active Retainer Roster</span>
            <span className="text-xs text-[#8A8A90]">Currently contributing clinics in active service.</span>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F3F3F5] text-[#0A0A0A] font-tabular">
            Total MRR: €{totalMrr.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="console-table">
            <thead>
              <tr>
                <th className="py-3 px-5 text-left">Practice</th>
                <th className="py-3 px-4 text-left">Specialty</th>
                <th className="py-3 px-4 text-left">Location</th>
                <th className="py-3 px-4 text-left">Package</th>
                <th className="py-3 px-4 text-right">Monthly Fee</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-[#F9F9FB] transition-colors cursor-default">
                  <td className="py-3.5 px-5 font-semibold text-[#0A0A0A]">
                    {client.businessName}
                  </td>
                  <td className="py-3.5 px-4 text-[#606066]">
                    {client.specialty}
                  </td>
                  <td className="py-3.5 px-4 text-[#606066]">
                    {client.city}, {client.country}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E9E9EC] font-medium text-[11px] text-[#0A0A0A]">
                      {client.package}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#0A0A0A] text-right font-tabular">
                    €{client.monthlyFeeEUR?.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E7F8EF] text-[#12B76A] border border-[#12B76A]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                      {client.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {onOpenClientWorkspace && (
                      <button
                        type="button"
                        onClick={() => onOpenClientWorkspace(client.id, client.businessName)}
                        className="btn-outline-pill !py-1 !px-2.5 !text-[11px] inline-flex items-center gap-1"
                      >
                        <span>Workspace</span>
                        <ExternalLink size={11} />
                      </button>
                    )}
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
