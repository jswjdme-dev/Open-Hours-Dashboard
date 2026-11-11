import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Brain,
  Building2,
  Wallet,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Euro,
  LifeBuoy,
  Inbox,
  ShieldCheck,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  getAttentionItems,
  getOverviewSummary,
  AttentionItem,
  OverviewSummaryCards,
} from '../lib/metrics.ts';
import { getClientsWithRemainingReferralMonths, getCustomWebsiteAttentionItems } from '../data/repo.ts';

interface OverviewPageProps {
  onNavigate: (viewId: string, label: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [summary, setSummary] = useState<OverviewSummaryCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [att, sum, remainingClients, customWebsiteAtt] = await Promise.all([
        getAttentionItems(),
        getOverviewSummary(),
        getClientsWithRemainingReferralMonths(),
        getCustomWebsiteAttentionItems(),
      ]);

      const referralItems: AttentionItem[] = remainingClients.map((rc) => ({
        id: `ref_rem_${rc.clientId}`,
        category: 'billing',
        title: `${rc.businessName}: ${rc.remainingMonths} referral month${rc.remainingMonths === 1 ? '' : 's'} available`,
        subtitle: `Remaining reward ready to apply. Estimated value €${rc.estimatedCostEUR}.`,
        badgeText: 'Referral credit',
        severity: 'info',
        targetView: 'clients',
      }));

      setAttentionItems([...att, ...referralItems, ...customWebsiteAtt]);
      setSummary(sum);
    } catch (err: any) {
      console.error('Failed to load overview data:', err);
      setErrorMessage(err?.message || 'Failed to load dashboard overview data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDomainEvent = () => {
      loadData();
    };
    window.addEventListener('domainEventEmitted', handleDomainEvent);
    return () => {
      window.removeEventListener('domainEventEmitted', handleDomainEvent);
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header: Title 32-40px/500, muted subtitle, hairline divider */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[32px] sm:text-[36px] font-medium text-[#111827] tracking-tight leading-tight">
            Overview
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1 font-normal">
            Solo-founder executive cockpit · Ireland &amp; Malta clinic acquisition
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E5E7EB] bg-white text-xs font-medium text-[#4B5563]">
            Demo data
          </span>
        </div>
      </div>

      {/* Error Alert if load failed */}
      {errorMessage && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[12px] p-4 flex items-start gap-3 text-xs text-[#DC2626] animate-in fade-in">
          <AlertTriangle size={18} className="text-[#DC2626] shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-semibold text-[14px]">Error Loading Overview Data</div>
            <p className="text-[#DC2626] text-[13px]">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="px-3.5 py-1 bg-white border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] rounded-[8px] font-medium text-[12px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* TOP STRIP: Needs Attention Today */}
      <section className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[17px] font-medium text-[#111827]">
              Needs attention today
            </h2>
          </div>

          {attentionItems.length > 0 ? (
            <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
              {attentionItems.length} Action{attentionItems.length > 1 ? 's' : ''} Required
            </span>
          ) : (
            <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
              All clear
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-6 text-center text-[14px] text-[#6B7280]">Scanning tasks and account SLAs...</div>
        ) : attentionItems.length === 0 ? (
          <div className="p-5 text-center rounded-[10px] bg-[#F9FAFB] text-[14px] text-[#4B5563] flex flex-col items-center gap-1.5 border border-[#E5E7EB]">
            <CheckCircle2 size={20} className="text-[#16A34A]" />
            <span className="font-medium text-[#111827]">All clear today!</span>
            <span>No overdue tasks, blocked deliverables, or outstanding escalations.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate(item.targetView, item.title)}
                className={`p-4 rounded-[10px] border transition-all cursor-pointer group flex flex-col justify-between ${
                  item.severity === 'urgent'
                    ? 'bg-[#FEF9C3] border-[#FEF08A] text-[#111827]'
                    : 'bg-[#F9FAFB] border-[#E5E7EB] hover:bg-[#F3F4F6]'
                }`}
                role="button"
                tabIndex={0}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11.5px] font-medium px-2 py-0.5 rounded-full ${
                        item.severity === 'urgent'
                          ? 'bg-[#FEF08A] text-[#854D0E]'
                          : 'bg-white border border-[#E5E7EB] text-[#4B5563]'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                    <ArrowRight size={14} className="text-[#6B7280] group-hover:text-[#111827] transition-colors" />
                  </div>
                  <div className="font-medium text-[14px] text-[#111827] group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </div>
                  <p className="text-[12.5px] text-[#4B5563] mt-1 line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION SUMMARY CARDS GRID: 4. Summary Tiles (White card with title left, Open link right, 2x2 stat tiles #F9FAFB, no border) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: GROWTH */}
        <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
              <h2 className="text-[17px] font-medium text-[#111827]">
                Growth
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('reports-growth', 'Growth Report')}
                className="text-[var(--accent)] hover:underline text-[13px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Total Leads</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    {summary.growth.leadsCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Outreach Reply Rate</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    {summary.growth.replyRate}%
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Clients Won</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    {summary.growth.clientsWon}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Revenue (Period)</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    €{summary.growth.revenueInPeriod.toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#6B7280]">No growth records found.</div>
            )}
          </div>
        </div>

        {/* CARD 2: SALES */}
        <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
              <h2 className="text-[17px] font-medium text-[#111827]">
                Sales Pipeline
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('leads', 'Leads')}
                className="text-[var(--accent)] hover:underline text-[13px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">New Leads</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    {summary.sales.newLeads}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">HOT Leads</div>
                  <div className="text-[28px] font-medium text-[var(--accent)] mt-1 flex items-center gap-1 tabular-nums leading-none">
                    <Flame size={20} className="fill-[var(--accent)]" />
                    {summary.sales.hotLeads}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Follow-ups Due</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    {summary.sales.followUpsDue}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Suppression List</div>
                  <div className="text-[28px] font-medium text-[#6B7280] mt-1 tabular-nums leading-none">
                    {summary.sales.suppressionCount}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#6B7280]">No sales pipeline data.</div>
            )}
          </div>
        </div>

        {/* CARD 3: INTELLIGENCE */}
        <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
              <h2 className="text-[17px] font-medium text-[#111827]">
                Intelligence
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('intelligence-niche', 'Niche & Source')}
                className="text-[var(--accent)] hover:underline text-[13px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Largest Drop-off Step</div>
                  <div className="text-[16px] font-medium text-[#111827] mt-1">
                    {summary.intelligence.largestDropOff}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Latest Insight</div>
                  <div className="text-[13px] text-[#111827] font-normal mt-1 line-clamp-2 leading-relaxed">
                    {summary.intelligence.latestLearning}
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] text-[12px] text-[#D97706] font-medium flex items-center justify-between">
                  <span>Statistical Reliability:</span>
                  <strong>{summary.intelligence.hasEnoughData ? 'Solid' : `Weak (${summary.intelligence.leadCount}/100 leads)`}</strong>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#6B7280]">No intelligence insights available.</div>
            )}
          </div>
        </div>

        {/* CARD 4: CLIENTS */}
        <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
              <h2 className="text-[17px] font-medium text-[#111827]">
                Clients &amp; Delivery
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('clients', 'Clients')}
                className="text-[var(--accent)] hover:underline text-[13px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Active Clinics</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    {summary.clients.activeClients}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">In Delivery</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    {summary.clients.inDelivery}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Blocked on Client</div>
                  <div className="text-[28px] font-medium text-[var(--crimson)] mt-1 tabular-nums leading-none">
                    {summary.clients.blocked}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Avg Health Score</div>
                  <div className="text-[28px] font-medium text-[#16A34A] mt-1 tabular-nums leading-none">
                    {summary.clients.averageHealth}/100
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#6B7280]">No client accounts active.</div>
            )}
          </div>
        </div>

        {/* CARD 5: BUSINESS & REVENUE */}
        <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
              <h2 className="text-[17px] font-medium text-[#111827]">
                Business &amp; Finance
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('payments', 'Payments')}
                className="text-[var(--accent)] hover:underline text-[13px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">Settled Revenue</div>
                  <div className="text-[28px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    €{summary.business.revenue.toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB]">
                  <div className="text-[12px] text-[#6B7280] font-normal">MRR vs Goal</div>
                  <div className="text-[24px] font-medium text-[#111827] mt-1 tabular-nums leading-none">
                    €{summary.business.mrr.toLocaleString()}
                    <span className="text-[12px] text-[#6B7280] font-normal"> / €10k</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[#F9FAFB] col-span-2 flex items-center justify-between">
                  <div>
                    <div className="text-[12px] text-[#6B7280] font-normal">Overdue Invoices</div>
                    <div className="text-[14px] font-medium text-[#111827] mt-0.5">
                      {summary.business.overduePaymentsCount === 0
                        ? 'Zero overdue accounts'
                        : `${summary.business.overduePaymentsCount} overdue (€${summary.business.overduePaymentsAmount.toLocaleString()})`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-medium text-[var(--accent)]">
                      {summary.business.mrrProgressPct}% of Goal
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#6B7280]">No payment ledgers recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
