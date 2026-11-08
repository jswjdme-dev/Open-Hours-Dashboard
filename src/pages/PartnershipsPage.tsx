import React, { useState, useEffect } from 'react';
import {
  Handshake,
  Plus,
  LayoutGrid,
  List,
  Building,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  MapPin,
  Sparkles,
  Users,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  X,
  Check,
} from 'lucide-react';
import {
  Partner,
  PartnerStage,
  Role,
  Client,
  Payment,
  TimeEntry,
  TeamMemberProfile,
  ClientPackage,
} from '../types/index.ts';
import { normalizeRole } from '../config/navigation.ts';
import {
  getPartners,
  movePartnerStage,
  getClients,
  getPayments,
  getTimeEntries,
  getTeamMembers,
  getPendingPartnerClients,
  approvePartnerClient,
  rejectPartnerClient,
} from '../data/repo.ts';
import { PartnerDrawer } from '../components/partners/PartnerDrawer.tsx';
import { AddPartnerModal } from '../components/partners/AddPartnerModal.tsx';
import { computePartnerEarnings, PartnerEarningsComputation } from '../lib/partners.ts';

interface PartnershipsPageProps {
  userRole?: Role;
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
  onViewAsPartner?: (partnerId: string) => void;
}

const partnerStages: PartnerStage[] = [
  'Identified',
  'Contacted',
  'Conversation',
  'Proposal',
  'Active',
  'Inactive',
];

export const PartnershipsPage: React.FC<PartnershipsPageProps> = ({
  userRole = 'Admin',
  onOpenClientWorkspace,
  onViewAsPartner,
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [pendingClients, setPendingClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'Table' | 'Kanban'>('Table');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Review & Approve pending partner client modal state
  const [reviewingClient, setReviewingClient] = useState<Client | null>(null);
  const [overrideMonthly, setOverrideMonthly] = useState('');
  const [overrideSetup, setOverrideSetup] = useState('');
  const [overridePkg, setOverridePkg] = useState<ClientPackage>('Regular');
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Role permissions: Hide fee amounts from Developer and Ads Manager
  const canViewFees = normalizeRole(userRole) !== 'Developer' && normalizeRole(userRole) !== 'Ads Manager';

  const loadData = async () => {
    setLoading(true);
    const [pList, cList, payList, teList, tmList, pendList] = await Promise.all([
      getPartners(),
      getClients(),
      getPayments(),
      getTimeEntries(),
      getTeamMembers(),
      getPendingPartnerClients(),
    ]);
    setPartners(pList);
    setClients(cList);
    setPayments(payList);
    setTimeEntries(teList);
    setTeamMembers(tmList);
    setPendingClients(pendList);
    setLoading(false);
  };

  const handleApproveClient = async () => {
    if (!reviewingClient) return;
    try {
      setActionLoading(true);
      await approvePartnerClient(reviewingClient.id, {
        package: overridePkg,
        monthlyFeeEUR: parseFloat(overrideMonthly) || reviewingClient.monthlyFeeEUR || 1200,
        setupFeeEUR: parseFloat(overrideSetup) || reviewingClient.setupFeeEUR || 2500,
      });
      setActionFeedback(`Approved "${reviewingClient.businessName}". 12 onboarding requests & portal launched!`);
      setTimeout(() => {
        setReviewingClient(null);
        setActionFeedback(null);
      }, 1500);
      loadData();
    } catch {
      setActionFeedback('Failed to approve client.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClient = async () => {
    if (!reviewingClient) return;
    try {
      setActionLoading(true);
      await rejectPartnerClient(reviewingClient.id, rejectReasonText.trim() || 'Terms not agreed');
      setActionFeedback(`Rejected "${reviewingClient.businessName}".`);
      setTimeout(() => {
        setReviewingClient(null);
        setActionFeedback(null);
      }, 1500);
      loadData();
    } catch {
      setActionFeedback('Failed to reject client.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStageChange = async (partner: Partner, newStage: PartnerStage) => {
    await movePartnerStage(partner.id, newStage);
    loadData();
    if (selectedPartner?.id === partner.id) {
      setSelectedPartner({ ...selectedPartner, stage: newStage });
    }
  };

  // Pre-calculate earnings computations for each partner (single source of truth)
  const earningsMap = new Map<string, PartnerEarningsComputation>();
  partners.forEach((p) => {
    earningsMap.set(p.id, computePartnerEarnings(p, clients, payments, timeEntries, teamMembers));
  });

  // KPIs
  const partnersContacted = partners.filter((p) => p.stage !== 'Identified').length;
  const activePartnersCount = partners.filter((p) => p.stage === 'Active').length;
  const totalClientsBrought = partners.reduce(
    (sum, p) => sum + (earningsMap.get(p.id)?.clientsBroughtCount || 0),
    0
  );
  const totalFeesOwed = partners.reduce(
    (sum, p) => sum + (earningsMap.get(p.id)?.balanceOwedEUR ?? p.feesOwed),
    0
  );
  const totalFeesPaid = partners.reduce(
    (sum, p) => sum + (earningsMap.get(p.id)?.earningsPaidEUR ?? p.feesPaid),
    0
  );

  return (
    <div className="w-full space-y-6">
      {/* Title & Add Partner */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
            Partnerships
          </h1>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
            Demo data
          </span>
          <span className="text-xs text-[#A8A5A5] font-semibold">
            {partners.length} Strategic Partners
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center p-0.5 bg-white rounded-full border border-black/5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('Table')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'Table' ? 'bg-[#111111] text-white' : 'text-[#6B6B6B]'
              }`}
              title="Table view"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('Kanban')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'Kanban' ? 'bg-[#111111] text-white' : 'text-[#6B6B6B]'
              }`}
              title="Kanban view"
            >
              <LayoutGrid size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Add Partner</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Partners Contacted</span>
          <span className="text-2xl font-bold text-[#111111] tabular-nums">{partnersContacted}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Active Partners</span>
          <span className="text-2xl font-bold text-[#111111] tabular-nums">{activePartnersCount}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Clients Brought</span>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums">{totalClientsBrought}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Earnings Owed</span>
          {canViewFees ? (
            <span className="text-2xl font-bold text-[#D92D50] tabular-nums">
              €{totalFeesOwed.toLocaleString('en-IE')}
            </span>
          ) : (
            <span className="text-xs font-bold text-[#A8A5A5]">Restricted</span>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">Commissions Paid</span>
          {canViewFees ? (
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">
              €{totalFeesPaid.toLocaleString('en-IE')}
            </span>
          ) : (
            <span className="text-xs font-bold text-[#A8A5A5]">Restricted</span>
          )}
        </div>
      </div>

      {/* Pending Partner Clients Approvals Banner */}
      {pendingClients.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertTriangle size={15} />
              <span>
                {pendingClients.length} Partner Client{pendingClients.length > 1 ? 's' : ''} Pending Administrative Approval
              </span>
            </div>
            <span className="text-[11px] text-amber-800 font-semibold">
              Action Required: Review terms before onboarding and portal creation
            </span>
          </div>
          <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200/60 overflow-hidden">
            {pendingClients.map((pc) => (
              <div
                key={pc.id}
                className="p-3.5 flex items-center justify-between flex-wrap gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-[#111111]">{pc.businessName}</span>
                  <span className="text-[#6B6B6B] ml-2">
                    ({pc.package} · {pc.specialty} · {pc.country}) · Referred by{' '}
                    <strong className="text-[#111111]">{pc.sourcePartnerName || pc.source}</strong>
                  </span>
                  <span className="ml-2 text-amber-900 font-semibold">
                    Claimed: €{pc.claimedPrice?.toLocaleString() || pc.monthlyFeeEUR?.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReviewingClient(pc);
                    setOverridePkg(pc.package);
                    setOverrideMonthly(String(pc.monthlyFeeEUR || 1200));
                    setOverrideSetup(String(pc.setupFeeEUR || 2500));
                    setRejectReasonText('');
                    setActionFeedback(null);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#111111] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
                >
                  Review & Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main View: Table vs Kanban */}
      {viewMode === 'Table' ? (
        /* TABLE VIEW - Section 2B: type, deal model, portal type, clients brought, earnings owed/paid */
        <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8F7F7] text-[#6B6B6B] font-bold border-b border-black/5 text-[11px] uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">Partner</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Deal Model</th>
                  <th className="py-3 px-3">Portal Type</th>
                  <th className="py-3 px-3">Clients Brought</th>
                  {canViewFees && (
                    <>
                      <th className="py-3 px-3">Earnings Owed</th>
                      <th className="py-3 px-3">Earnings Paid</th>
                    </>
                  )}
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {partners.map((p) => {
                  const comp = earningsMap.get(p.id);
                  const clientsBrought = comp ? comp.clientsBroughtCount : 0;
                  const balanceOwed = comp ? comp.balanceOwedEUR : p.feesOwed;
                  const paidAmount = comp ? comp.earningsPaidEUR : p.feesPaid;
                  const dealModelName = p.dealTerms?.dealModel || (p.referralTerms?.type === 'Fixed fee' ? 'Fixed fee per client' : 'Revenue share % per client');
                  const portalName = p.portalType || 'No portal';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPartner(p)}
                      className="hover:bg-[#FCE9ED]/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111111] group-hover:text-[#D92D50] transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-[#A8A5A5]">{p.organisation}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 font-medium text-[#111111]">{p.type}</td>

                      {/* Deal Model */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#111111] block">
                          {dealModelName}
                        </span>
                        <span className="text-[11px] text-[#6B6B6B]">
                          {p.dealTerms?.sharePercentage ? `${p.dealTerms.sharePercentage}%` : p.dealTerms?.fixedAmount ? `€${p.dealTerms.fixedAmount}` : `${p.referralTerms?.amount || 10}%`} ({p.dealTerms?.appliesTo || 'Monthly'})
                        </span>
                      </td>

                      {/* Portal Type */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            portalName.startsWith('Branded')
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : portalName.startsWith('Standard')
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-gray-100 text-[#6B6B6B]'
                          }`}
                        >
                          {portalName.startsWith('Branded')
                            ? 'Branded'
                            : portalName.startsWith('Standard')
                            ? 'Standard'
                            : 'No portal'}
                        </span>
                      </td>

                      {/* Clients Brought */}
                      <td className="py-3 px-3 tabular-nums font-bold text-[#111111]">
                        {clientsBrought}
                      </td>

                      {/* Earnings Owed / Paid */}
                      {canViewFees && (
                        <>
                          <td className="py-3 px-3 tabular-nums font-bold text-[#D92D50]">
                            €{balanceOwed.toLocaleString('en-IE')}
                          </td>
                          <td className="py-3 px-3 tabular-nums font-bold text-emerald-700">
                            €{paidAmount.toLocaleString('en-IE')}
                          </td>
                        </>
                      )}

                      {/* Stage */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.stage === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.stage === 'Conversation' || p.stage === 'Proposal'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p.stage}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {p.portalType && p.portalType !== 'No portal' && onViewAsPartner ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewAsPartner(p.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#111111] hover:bg-black text-white transition-colors cursor-pointer shadow-2xs"
                          >
                            <ExternalLink size={10} />
                            <span>View as partner</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex items-start gap-4 min-w-max">
            {partnerStages.map((stage) => {
              const stagePartners = partners.filter((p) => p.stage === stage);
              return (
                <div
                  key={stage}
                  className="w-72 shrink-0 bg-[#F4F2F2] rounded-3xl p-3 border border-black/5 flex flex-col min-h-[400px]"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="font-bold text-xs text-[#111111]">{stage}</span>
                    <span className="w-5 h-5 rounded-full bg-white text-[11px] font-bold text-[#6B6B6B] flex items-center justify-center shadow-2xs">
                      {stagePartners.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {stagePartners.map((p) => {
                      const comp = earningsMap.get(p.id);
                      const clientsBrought = comp ? comp.clientsBroughtCount : 0;
                      const balanceOwed = comp ? comp.balanceOwedEUR : p.feesOwed;
                      const portalName = p.portalType || 'No portal';

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPartner(p)}
                          className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                        >
                          <div>
                            <div className="font-bold text-xs text-[#111111] group-hover:text-[#D92D50] transition-colors">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[#A8A5A5]">{p.organisation}</div>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#6B6B6B]">{p.type}</span>
                            <span className="font-bold text-[#111111]">
                              {p.dealTerms?.dealModel || 'Revenue share'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[11px]">
                            <span className="text-[#A8A5A5]">Clients: {clientsBrought}</span>
                            {canViewFees && (
                              <span className="font-bold text-[#D92D50] tabular-nums">
                                €{balanceOwed.toLocaleString('en-IE')} owed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Partner Detail Drawer */}
      <PartnerDrawer
        partner={selectedPartner}
        userRole={userRole}
        onClose={() => setSelectedPartner(null)}
        onPartnerUpdated={loadData}
        onStageChange={handleStageChange}
        onOpenClientWorkspace={onOpenClientWorkspace}
        onViewAsPartner={onViewAsPartner}
      />

      {/* Add Partner Modal */}
      <AddPartnerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onPartnerCreated={loadData}
      />

      {/* Review & Approve Pending Partner Client Modal */}
      {reviewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-black/5 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Building size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111111]">
                    Review Partner Referral
                  </h3>
                  <p className="text-[11px] text-[#6B6B6B]">
                    Referred by {reviewingClient.sourcePartnerName || reviewingClient.source}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingClient(null)}
                className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#6B6B6B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {actionFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>{actionFeedback}</span>
                </div>
              )}

              {/* Client Details Summary */}
              <div className="p-4 rounded-2xl bg-[#F8F7F7] border border-black/5 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm text-[#111111]">{reviewingClient.businessName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    Pending Approval
                  </span>
                </div>
                <div className="text-[#6B6B6B] grid grid-cols-2 gap-2 text-[11px]">
                  <div>Principal: <strong>{reviewingClient.ownerName}</strong></div>
                  <div>Email: <strong>{reviewingClient.portalUserEmail || 'None provided'}</strong></div>
                  <div>Specialty: <strong>{reviewingClient.specialty}</strong></div>
                  <div>Location: <strong>{reviewingClient.city}, {reviewingClient.country}</strong></div>
                </div>
              </div>

              {!reviewingClient.portalUserEmail && (
                <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-700 shrink-0" />
                  <span>No email yet: add one before sending portal access</span>
                </div>
              )}

              {/* Package & Fee Terms */}
              <div className="space-y-3">
                <span className="font-bold text-[#111111] uppercase tracking-wider text-[11px] block">
                  Verify Package Tier & Commercial Terms
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['Regular', 'Advanced', 'Premium'] as ClientPackage[]).map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => {
                        setOverridePkg(pkg);
                        setOverrideMonthly(pkg === 'Premium' ? '2800' : pkg === 'Advanced' ? '1800' : '1200');
                        setOverrideSetup(pkg === 'Premium' ? '3500' : pkg === 'Advanced' ? '3000' : '2500');
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        overridePkg === pkg
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'bg-white border-black/10 text-[#111111]'
                      }`}
                    >
                      <div className="font-bold">{pkg}</div>
                      <div className="text-[10px] opacity-80">
                        {pkg === 'Premium' ? '€2,800/mo' : pkg === 'Advanced' ? '€1,800/mo' : '€1,200/mo'}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                      Monthly Retainer (€)
                    </label>
                    <input
                      type="number"
                      value={overrideMonthly}
                      onChange={(e) => setOverrideMonthly(e.target.value)}
                      className="w-full p-2 rounded-xl border border-black/10 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                      Setup Build Fee (€)
                    </label>
                    <input
                      type="number"
                      value={overrideSetup}
                      onChange={(e) => setOverrideSetup(e.target.value)}
                      className="w-full p-2 rounded-xl border border-black/10 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Reject Option */}
              <div className="pt-2 border-t border-black/5">
                <label className="text-[11px] font-semibold text-[#6B6B6B] block mb-1">
                  Optional Reason (if rejecting):
                </label>
                <input
                  type="text"
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  placeholder="e.g. Incompatible practice requirements or terms"
                  className="w-full p-2 rounded-xl border border-black/10 bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRejectClient}
                  className="px-4 py-2.5 rounded-full border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Reject Referral
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApproveClient}
                  className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Approve & Launch Onboarding (12 Tasks + Portal)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
