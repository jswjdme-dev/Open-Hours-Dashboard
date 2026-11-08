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
      {/* Page Header: Large Two-Tone Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="two-tone-title">
            Overview
          </h1>
          <p className="two-tone-subtitle">
            Solo-founder executive cockpit · Ireland & Malta clinic acquisition
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <span className="section-pill-label">
            Demo data
          </span>
        </div>
      </div>

      {/* Error Alert if load failed */}
      {errorMessage && (
        <div className="bg-[#FEECEB] border border-[#FECDCA] rounded-[20px] p-4 flex items-start gap-3 text-xs text-[#B42318] animate-in fade-in">
          <AlertTriangle size={18} className="text-[#B42318] shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-bold text-[14px]">Error Loading Overview Data</div>
            <p className="text-[#B42318] text-[13px]">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="px-3.5 py-1 bg-white border border-[#FECDCA] text-[#B42318] hover:bg-[#FEECEB] rounded-full font-semibold text-[12px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* TOP STRIP: Needs Attention Today */}
      <section className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="section-pill-label">
              Needs attention today
            </span>
          </div>

          {attentionItems.length > 0 ? (
            <span className="text-[12px] font-semibold px-3 py-1 rounded-full bg-[#FEECEB] text-[#B42318] border border-[#FECDCA]">
              {attentionItems.length} Action{attentionItems.length > 1 ? 's' : ''} Required
            </span>
          ) : (
            <span className="text-[12px] font-semibold px-3 py-1 rounded-full bg-[#E7F8EF] text-[#027A48] border border-[#A6F4C5]">
              All clear
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-6 text-center text-[14px] text-[#73737A]">Scanning tasks and account SLAs...</div>
        ) : attentionItems.length === 0 ? (
          <div className="p-5 text-center rounded-[14px] bg-[#F6F6F8] text-[14px] text-[#4A4A4F] flex flex-col items-center gap-1.5">
            <CheckCircle2 size={20} className="text-[#12B76A]" />
            <span className="font-semibold text-[#0A0A0A]">All clear today!</span>
            <span>No overdue tasks, blocked deliverables, or outstanding escalations.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate(item.targetView, item.title)}
                className="p-4 rounded-[14px] bg-[#F6F6F8] hover:bg-[#E9E9EC] transition-all cursor-pointer group flex flex-col justify-between"
                role="button"
                tabIndex={0}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${
                        item.severity === 'urgent'
                          ? 'bg-[#FEECEB] text-[#B42318]'
                          : 'bg-[#FFF4E5] text-[#B54708]'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                    <ArrowRight size={14} className="text-[#73737A] group-hover:text-[#0A0A0A] transition-colors" />
                  </div>
                  <div className="font-semibold text-[14px] text-[#0A0A0A] group-hover:text-[var(--color-accent)] transition-colors">
                    {item.title}
                  </div>
                  <p className="text-[13px] text-[#4A4A4F] font-medium mt-1 line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION SUMMARY CARDS GRID: 4. Summary Tiles (White card with pill title, 2x2 stat tiles #F6F6F8) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: GROWTH */}
        <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3] mb-4">
              <span className="section-pill-label">
                Growth
              </span>
              <button
                type="button"
                onClick={() => onNavigate('reports-growth', 'Growth Report')}
                className="h-[34px] px-3.5 rounded-full border border-[#D0D0D5] bg-white text-[#0A0A0A] hover:bg-[#F3F3F5] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Total Leads</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    {summary.growth.leadsCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Outreach Reply Rate</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    {summary.growth.replyRate}%
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Clients Won</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    {summary.growth.clientsWon}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Revenue (Period)</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    €{summary.growth.revenueInPeriod.toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#73737A]">No growth records found.</div>
            )}
          </div>
        </div>

        {/* CARD 2: SALES */}
        <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3] mb-4">
              <span className="section-pill-label">
                Sales Pipeline
              </span>
              <button
                type="button"
                onClick={() => onNavigate('leads', 'Leads')}
                className="h-[34px] px-3.5 rounded-full border border-[#D0D0D5] bg-white text-[#0A0A0A] hover:bg-[#F3F3F5] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">New Leads</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    {summary.sales.newLeads}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">HOT Leads</div>
                  <div className="text-[30px] font-semibold text-[var(--color-accent)] mt-1 flex items-center gap-1 tabular-nums leading-none">
                    <Flame size={20} className="fill-[var(--color-accent)]" />
                    {summary.sales.hotLeads}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Follow-ups Due</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    {summary.sales.followUpsDue}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Suppression List</div>
                  <div className="text-[30px] font-semibold text-[#73737A] mt-1 tabular-nums leading-none">
                    {summary.sales.suppressionCount}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#73737A]">No sales pipeline data.</div>
            )}
          </div>
        </div>

        {/* CARD 3: INTELLIGENCE */}
        <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3] mb-4">
              <span className="section-pill-label">
                Intelligence
              </span>
              <button
                type="button"
                onClick={() => onNavigate('intelligence-niche', 'Niche & Source')}
                className="h-[34px] px-3.5 rounded-full border border-[#D0D0D5] bg-white text-[#0A0A0A] hover:bg-[#F3F3F5] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Largest Drop-off Step</div>
                  <div className="text-[18px] font-semibold text-[#0A0A0A] mt-1">
                    {summary.intelligence.largestDropOff}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Latest Insight</div>
                  <div className="text-[13px] text-[#0A0A0A] font-medium mt-1 line-clamp-2 leading-relaxed">
                    {summary.intelligence.latestLearning}
                  </div>
                </div>

                <div className="p-3 rounded-[12px] bg-[#FFF4E5] border border-[#FEDF89] text-[12px] text-[#B54708] font-medium flex items-center justify-between">
                  <span>Statistical Reliability:</span>
                  <strong>{summary.intelligence.hasEnoughData ? 'Solid' : `Weak (${summary.intelligence.leadCount}/100 leads)`}</strong>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#73737A]">No intelligence insights available.</div>
            )}
          </div>
        </div>

        {/* CARD 4: CLIENTS */}
        <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3] mb-4">
              <span className="section-pill-label">
                Clients & Delivery
              </span>
              <button
                type="button"
                onClick={() => onNavigate('clients', 'Clients')}
                className="h-[34px] px-3.5 rounded-full border border-[#D0D0D5] bg-white text-[#0A0A0A] hover:bg-[#F3F3F5] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Active Clinics</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    {summary.clients.activeClients}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">In Delivery</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    {summary.clients.inDelivery}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Blocked on Client</div>
                  <div className="text-[30px] font-semibold text-[var(--color-accent)] mt-1 tabular-nums leading-none">
                    {summary.clients.blocked}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Avg Health Score</div>
                  <div className="text-[30px] font-semibold text-[#027A48] mt-1 tabular-nums leading-none">
                    {summary.clients.averageHealth}/100
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#73737A]">No client accounts active.</div>
            )}
          </div>
        </div>

        {/* CARD 5: BUSINESS & REVENUE */}
        <div className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E3E3E6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F3] mb-4">
              <span className="section-pill-label">
                Business & Finance
              </span>
              <button
                type="button"
                onClick={() => onNavigate('payments', 'Payments')}
                className="h-[34px] px-3.5 rounded-full border border-[#D0D0D5] bg-white text-[#0A0A0A] hover:bg-[#F3F3F5] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span>Open</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {summary ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">Settled Revenue</div>
                  <div className="text-[30px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    €{summary.business.revenue.toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8]">
                  <div className="text-[13px] text-[#4A4A4F] font-medium">MRR vs Goal</div>
                  <div className="text-[26px] font-semibold text-[#0A0A0A] mt-1 tabular-nums leading-none">
                    €{summary.business.mrr.toLocaleString()}
                    <span className="text-[13px] text-[#73737A] font-medium"> / €10k</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-[#F6F6F8] col-span-2 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] text-[#4A4A4F] font-medium">Overdue Invoices</div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A] mt-0.5">
                      {summary.business.overduePaymentsCount === 0
                        ? 'Zero overdue accounts'
                        : `${summary.business.overduePaymentsCount} overdue (€${summary.business.overduePaymentsAmount.toLocaleString()})`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[13px] font-semibold text-[var(--color-accent)]">
                      {summary.business.mrrProgressPct}% of Goal
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[14px] text-[#73737A]">No payment ledgers recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
