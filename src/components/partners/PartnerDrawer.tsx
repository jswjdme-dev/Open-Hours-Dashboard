import React, { useState, useEffect } from 'react';
import {
  X,
  Handshake,
  DollarSign,
  Building,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  Plus,
  ArrowRight,
  History,
  Users,
  ShieldCheck,
  Lock,
  Globe,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  Check,
  TrendingUp,
  AlertTriangle,
  Upload,
  KeyRound,
} from 'lucide-react';
import {
  Partner,
  PartnerActivity,
  PartnerStage,
  Role,
  Client,
  Payment,
  TimeEntry,
  TeamMemberProfile,
  PartnerDealTerms,
  PartnerDealVersion,
  DealModel,
  DealAppliesTo,
  DealCurrency,
  PartnerPortalType,
} from '../../types/index.ts';
import { normalizeRole } from '../../config/navigation.ts';
import {
  getPartnerActivities,
  addPartnerActivity,
  markPartnerFeePaid,
  getClients,
  getPayments,
  getTimeEntries,
  getTeamMembers,
  updatePartnerDealTerms,
  updatePartnerPortalSettings,
  generatePartnerPortalInvite,
  requestPartnerLogo,
} from '../../data/repo.ts';
import { computePartnerEarnings, PartnerEarningsComputation } from '../../lib/partners.ts';
import { validateLogoFile, getContrastTextColor } from '../../lib/branding.ts';
import { ManageCredentialModal } from '../auth/ManageCredentialModal.tsx';

interface PartnerDrawerProps {
  partner: Partner | null;
  userRole?: Role;
  onClose: () => void;
  onPartnerUpdated: () => void;
  onStageChange: (partner: Partner, newStage: PartnerStage) => void;
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
  onViewAsPartner?: (partnerId: string) => void;
}

type TabKey = 'Overview' | 'Deal' | 'Clients' | 'Earnings' | 'Portal' | 'Activity';

export const PartnerDrawer: React.FC<PartnerDrawerProps> = ({
  partner,
  userRole = 'Admin',
  onClose,
  onPartnerUpdated,
  onStageChange,
  onOpenClientWorkspace,
  onViewAsPartner,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [activities, setActivities] = useState<PartnerActivity[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allTimeEntries, setAllTimeEntries] = useState<TimeEntry[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [newNote, setNewNote] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [showPayInput, setShowPayInput] = useState(false);

  // Deal Editing State
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [dealSummary, setDealSummary] = useState('');
  const [dealModel, setDealModel] = useState<DealModel>('Revenue share % per client');
  const [sharePercentage, setSharePercentage] = useState('10');
  const [fixedAmount, setFixedAmount] = useState('250');
  const [appliesTo, setAppliesTo] = useState<DealAppliesTo>('Monthly fees');
  const [dealCurrency, setDealCurrency] = useState<DealCurrency>('EUR');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [docLink, setDocLink] = useState('');
  const [changeSummary, setChangeSummary] = useState('');

  // Portal Settings Editing State
  const [portalType, setPortalType] = useState<PartnerPortalType>('No portal');
  const [brandedName, setBrandedName] = useState('');
  const [brandedLogo, setBrandedLogo] = useState('');
  const [brandedColor, setBrandedColor] = useState('#D92D50');
  const [visibilityEnabled, setVisibilityEnabled] = useState(false);
  const [visBusinessName, setVisBusinessName] = useState(true);
  const [visProjectStage, setVisProjectStage] = useState(true);
  const [visMonthlyReport, setVisMonthlyReport] = useState(true);
  const [visContactName, setVisContactName] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [poweredByOpenHours, setPoweredByOpenHours] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [requestLogoFeedback, setRequestLogoFeedback] = useState<string | null>(null);
  const [manageCredOpen, setManageCredOpen] = useState(false);

  // Role permissions: Hide fee amounts from Developer and Ads Manager
  const canViewFees = normalizeRole(userRole) !== 'Developer' && normalizeRole(userRole) !== 'Ads Manager';

  const loadData = async () => {
    if (!partner) return;
    const [acts, cls, pays, tes, tms] = await Promise.all([
      getPartnerActivities(partner.id),
      getClients(),
      getPayments(),
      getTimeEntries(),
      getTeamMembers(),
    ]);
    setActivities(acts);
    setAllClients(cls);
    setAllPayments(pays);
    setAllTimeEntries(tes);
    setAllTeamMembers(tms);
  };

  useEffect(() => {
    if (partner) {
      loadData();
      // Initialize deal fields
      const terms = partner.dealTerms;
      setDealSummary(terms?.dealSummary || `${partner.referralTerms?.amount || 10}% on client revenue`);
      setDealModel((terms?.dealModel as DealModel) || (partner.referralTerms?.type === 'Fixed fee' ? 'Fixed fee per client' : 'Revenue share % per client'));
      setSharePercentage(String(terms?.sharePercentage ?? partner.referralTerms?.amount ?? 10));
      setFixedAmount(String(terms?.fixedAmount ?? (partner.referralTerms?.type === 'Fixed fee' ? partner.referralTerms.amount : 250)));
      setAppliesTo(terms?.appliesTo || 'Monthly fees');
      setDealCurrency(terms?.currency || 'EUR');
      setStartDate(terms?.startDate || partner.createdAt || '2026-07-01');
      setEndDate(terms?.endDate || '');
      setDocLink(terms?.documentLink || '');
      setChangeSummary('');
      setIsEditingDeal(false);

      // Initialize portal fields
      setPortalType(partner.portalType || 'No portal');
      setBrandedName(partner.portalBranding?.brandName || partner.organisation);
      setBrandedLogo(partner.portalBranding?.logoUrl || '');
      setBrandedColor(partner.portalBranding?.primaryColor || '#D92D50');
      setVisibilityEnabled(partner.clientVisibility?.enabled ?? false);
      setVisBusinessName(partner.clientVisibility?.businessName ?? true);
      setVisProjectStage(partner.clientVisibility?.projectStage ?? true);
      setVisMonthlyReport(partner.clientVisibility?.monthlyReportSummary ?? true);
      setVisContactName(partner.clientVisibility?.contactName ?? false);
      setPortalEmail(partner.portalLoginEmail || partner.email || '');
      setInviteFeedback(null);
      setPoweredByOpenHours(partner.poweredByOpenHours ?? true);
      setRequestLogoFeedback(null);
      setLogoUploadError(null);
    }
  }, [partner]);

  if (!partner) return null;

  // Handlers for admin logo upload and logo request
  const handleAdminLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingLogo(true);
    const res = await validateLogoFile(files[0]);
    setUploadingLogo(false);
    if (!res.valid || !res.dataUrl) {
      setLogoUploadError(res.error || 'Failed to validate logo file.');
      return;
    }
    setBrandedLogo(res.dataUrl);
  };

  const handleRequestPartnerLogo = async () => {
    try {
      await requestPartnerLogo(
        partner.id,
        'Please upload your high-resolution logo (PNG, JPG, or SVG up to 2 MB) for white-labeled portal branding.'
      );
      setRequestLogoFeedback('Brand logo request created! Partner sees this action item in their portal.');
      loadData();
    } catch {
      setRequestLogoFeedback('Failed to dispatch logo request.');
    }
  };

  // Single Source of Truth computation
  const earningsData: PartnerEarningsComputation = computePartnerEarnings(
    partner,
    allClients,
    allPayments,
    allTimeEntries,
    allTeamMembers
  );

  const partnerClients = allClients.filter(
    (c) => c.sourcePartnerId === partner.id || c.source === partner.name
  );

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    await addPartnerActivity({
      partnerId: partner.id,
      type: 'note',
      text: newNote.trim(),
      createdBy: 'Founder',
    });

    setNewNote('');
    const updated = await getPartnerActivities(partner.id);
    setActivities(updated);
    onPartnerUpdated();
  };

  const handlePayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    await markPartnerFeePaid(partner.id, amt);
    setShowPayInput(false);
    setPayAmount('');
    loadData();
    onPartnerUpdated();
  };

  const handleSaveDealTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPct = parseFloat(sharePercentage) || 10;
    const parsedFixed = parseFloat(fixedAmount) || 250;

    const newTerms: PartnerDealTerms = {
      dealSummary: dealSummary.trim() || `${parsedPct}% revenue share`,
      dealModel,
      sharePercentage: parsedPct,
      fixedAmount: parsedFixed,
      appliesTo,
      cashBasis: true,
      currency: dealCurrency,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate ? endDate : undefined,
      documentLink: docLink.trim() ? docLink.trim() : undefined,
    };

    await updatePartnerDealTerms(
      partner.id,
      newTerms,
      changeSummary.trim() || `Updated deal terms to ${newTerms.dealSummary}`
    );

    setIsEditingDeal(false);
    loadData();
    onPartnerUpdated();
  };

  const handleSavePortalSettings = async () => {
    await updatePartnerPortalSettings(partner.id, {
      portalType,
      portalBranding:
        portalType === 'Branded partner portal (partner logo, name, colours)'
          ? {
              brandName: brandedName.trim(),
              logoUrl: brandedLogo.trim(),
              primaryColor: brandedColor,
            }
          : undefined,
      clientVisibility: {
        enabled: visibilityEnabled,
        businessName: visBusinessName,
        projectStage: visProjectStage,
        monthlyReportSummary: visMonthlyReport,
        contactName: visContactName,
      },
      portalLoginEmail: portalEmail.trim() || undefined,
      poweredByOpenHours,
    });

    loadData();
    onPartnerUpdated();
  };

  const handleSendMagicLinkInvite = async () => {
    const res = await generatePartnerPortalInvite(partner.id);
    setInviteFeedback(res.message);
    loadData();
    onPartnerUpdated();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-[680px] bg-[#FBFBFB] shadow-2xl border-l border-black/10 z-50 flex flex-col animate-in slide-in-from-right duration-200"
        aria-label="Partner detail drawer"
      >
        {/* Header */}
        <div className="p-6 border-b border-black/5 bg-white shrink-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#A8A5A5] uppercase tracking-wider">
                  {partner.type} · {partner.city}, {partner.country}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1EFEF] text-[#6B6B6B]">
                  {partner.portalType || 'No portal'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#111111]">{partner.name}</h2>
              <div className="text-xs text-[#6B6B6B] font-medium">{partner.organisation}</div>
            </div>

            <div className="flex items-center gap-2">
              {onViewAsPartner && partner.portalType !== 'No portal' && (
                <button
                  type="button"
                  onClick={() => onViewAsPartner(partner.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>View as partner</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F1EFEF] hover:bg-[#E7E2E2] flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-black/5 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#A8A5A5]">Relationship Stage:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  partner.stage === 'Active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : partner.stage === 'Conversation' || partner.stage === 'Proposal'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {partner.stage}
              </span>
            </div>

            <select
              value={partner.stage}
              onChange={(e) => onStageChange(partner, e.target.value as PartnerStage)}
              className="text-xs font-bold bg-[#F1EFEF] px-2.5 py-1 rounded-lg border border-black/10 focus:outline-none cursor-pointer"
            >
              {(['Identified', 'Contacted', 'Conversation', 'Proposal', 'Active', 'Inactive'] as PartnerStage[]).map(
                (st) => (
                  <option key={st} value={st}>
                    Move to: {st}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto pt-4 border-t border-black/5 mt-4 custom-scrollbar">
            {[
              { id: 'Overview' as TabKey, label: 'Overview' },
              { id: 'Deal' as TabKey, label: 'Deal & History' },
              { id: 'Clients' as TabKey, label: `Clients (${partnerClients.length})` },
              { id: 'Earnings' as TabKey, label: 'Earnings Logic' },
              { id: 'Portal' as TabKey, label: 'Portal Settings' },
              { id: 'Activity' as TabKey, label: `Activity (${activities.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111] hover:bg-black/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="space-y-5">
              {/* Top Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#A8A5A5] uppercase block">Deal Model</span>
                  <span className="text-xs font-bold text-[#111111] mt-1 block truncate">
                    {partner.dealTerms?.dealModel || partner.referralTerms?.type || 'Revenue share'}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#A8A5A5] uppercase block">Clients Brought</span>
                  <span className="text-xl font-bold text-[#111111] tabular-nums mt-0.5 block">
                    {partnerClients.length}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#A8A5A5] uppercase block">Portal Access</span>
                  <span className="text-xs font-bold text-[#111111] mt-1 block truncate">
                    {partner.portalType || 'No portal'}
                  </span>
                </div>

                {canViewFees && (
                  <>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#A8A5A5] uppercase block">Client Payments</span>
                      <span className="text-lg font-bold text-[#111111] tabular-nums mt-0.5 block">
                        €{earningsData.grossClientPaymentsEUR.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#A8A5A5] uppercase block">Earnings Owed</span>
                      <span className="text-lg font-bold text-[#D92D50] tabular-nums mt-0.5 block">
                        €{earningsData.balanceOwedEUR.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 shadow-2xs">
                      <span className="text-[10px] font-semibold text-[#A8A5A5] uppercase block">Earnings Paid</span>
                      <span className="text-lg font-bold text-emerald-700 tabular-nums mt-0.5 block">
                        €{earningsData.earningsPaidEUR.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Deal Summary Box */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-2">
                <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center justify-between">
                  <span>Current Agreement Summary</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Deal')}
                    className="text-[#D92D50] hover:underline text-xs font-semibold cursor-pointer"
                  >
                    View Deal Details →
                  </button>
                </div>
                <p className="text-xs text-[#111111] leading-relaxed font-medium">
                  {partner.dealTerms?.dealSummary || 'Standard referral arrangement.'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B] pt-1">
                  <span>Applies on: {partner.dealTerms?.appliesTo || 'Monthly fees'}</span>
                  <span>·</span>
                  <span className="text-emerald-700 font-semibold">Payments Received (Cash Basis)</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-3">
                <div className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Contact Channels & Notes
                </div>
                <div className="space-y-2 text-xs">
                  {partner.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-[#A8A5A5]" />
                      <span className="text-[#6B6B6B]">Email:</span>
                      <span className="font-semibold text-[#111111]">{partner.email}</span>
                    </div>
                  )}
                  {partner.contactChannels.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[#A8A5A5] font-bold text-[11px]">{c.type}:</span>
                      <span className="font-medium text-[#111111]">{c.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-[#A8A5A5]" />
                    <span className="text-[#6B6B6B]">Location:</span>
                    <span className="font-medium text-[#111111]">{partner.city}, {partner.country}</span>
                  </div>
                </div>

                {partner.notes && (
                  <div className="pt-2 border-t border-black/5 text-xs text-[#6B6B6B] leading-relaxed">
                    <span className="font-semibold text-[#111111] block mb-0.5">Admin Notes:</span>
                    {partner.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DEAL (WITH HISTORY) */}
          {activeTab === 'Deal' && (
            <div className="space-y-6">
              {/* Current Deal Terms Card */}
              <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                    <FileText size={15} className="text-[#D92D50]" />
                    <span>Current Deal Agreement (Single Source of Truth)</span>
                  </div>
                  {!isEditingDeal && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDeal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>Edit Terms</span>
                    </button>
                  )}
                </div>

                {!isEditingDeal ? (
                  <div className="space-y-3.5 text-xs">
                    <div className="p-3 bg-[#F8F7F7] rounded-xl border border-black/5">
                      <span className="text-[10px] font-bold text-[#A8A5A5] uppercase block mb-1">
                        Deal Summary (Agreed text)
                      </span>
                      <p className="font-semibold text-[#111111] text-sm leading-relaxed">
                        {partner.dealTerms?.dealSummary || `${partner.referralTerms?.amount || 10}% on client retainers`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[#A8A5A5] text-[11px] block">Deal Model</span>
                        <span className="font-bold text-[#111111]">
                          {partner.dealTerms?.dealModel || 'Revenue share % per client'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#A8A5A5] text-[11px] block">Share / Fee</span>
                        <span className="font-bold text-[#111111]">
                          {partner.dealTerms?.dealModel?.includes('%') || !partner.dealTerms?.dealModel
                            ? `${partner.dealTerms?.sharePercentage || 10}%`
                            : `€${partner.dealTerms?.fixedAmount || 250}`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#A8A5A5] text-[11px] block">Applies To</span>
                        <span className="font-bold text-[#111111]">
                          {partner.dealTerms?.appliesTo || 'Monthly fees'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#A8A5A5] text-[11px] block">Accounting Basis</span>
                        <span className="font-bold text-emerald-700">
                          Cash Basis (Payments Received)
                        </span>
                      </div>

                      <div>
                        <span className="text-[#A8A5A5] text-[11px] block">Currency</span>
                        <span className="font-bold text-[#111111]">{partner.dealTerms?.currency || 'EUR'}</span>
                      </div>

                      <div>
                        <span className="text-[#A8A5A5] text-[11px] block">Effective Date</span>
                        <span className="font-bold text-[#111111]">{partner.dealTerms?.startDate || partner.createdAt}</span>
                      </div>
                    </div>

                    {partner.dealTerms?.documentLink && (
                      <div className="pt-2 border-t border-black/5 flex items-center gap-2">
                        <ExternalLink size={13} className="text-[#D92D50]" />
                        <span className="text-[#6B6B6B]">Signed Document:</span>
                        <a
                          href={partner.dealTerms.documentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#D92D50] hover:underline"
                        >
                          {partner.dealTerms.documentLink}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Edit Terms Form */
                  <form onSubmit={handleSaveDealTerms} className="space-y-4 pt-2 border-t border-black/5 text-xs animate-in fade-in duration-150">
                    <div>
                      <label className="font-semibold text-[#111111] block mb-1">Deal Summary *</label>
                      <input
                        type="text"
                        value={dealSummary}
                        onChange={(e) => setDealSummary(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-black/10 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-[#111111] block mb-1">Deal Model</label>
                        <select
                          value={dealModel}
                          onChange={(e) => setDealModel(e.target.value as DealModel)}
                          className="w-full p-2.5 rounded-xl border border-black/10 bg-[#F8F7F7]"
                        >
                          <option value="Revenue share % per client">Revenue share % per client</option>
                          <option value="Fixed fee per client">Fixed fee per client</option>
                          <option value="One-time referral fee">One-time referral fee</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>

                      {dealModel.includes('%') || dealModel === 'Custom' ? (
                        <div>
                          <label className="font-semibold text-[#111111] block mb-1">Share %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sharePercentage}
                            onChange={(e) => setSharePercentage(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-black/10"
                            required
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="font-semibold text-[#111111] block mb-1">Fixed Fee</label>
                          <input
                            type="number"
                            min="0"
                            value={fixedAmount}
                            onChange={(e) => setFixedAmount(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-black/10"
                            required
                          />
                        </div>
                      )}

                      <div>
                        <label className="font-semibold text-[#111111] block mb-1">Applies To</label>
                        <select
                          value={appliesTo}
                          onChange={(e) => setAppliesTo(e.target.value as DealAppliesTo)}
                          className="w-full p-2.5 rounded-xl border border-black/10 bg-[#F8F7F7]"
                        >
                          <option value="Setup fees">Setup fees</option>
                          <option value="Monthly fees">Monthly fees</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-[#111111] block mb-1">Currency</label>
                        <select
                          value={dealCurrency}
                          onChange={(e) => setDealCurrency(e.target.value as DealCurrency)}
                          className="w-full p-2.5 rounded-xl border border-black/10 bg-[#F8F7F7]"
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="BDT">BDT (৳)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-[#111111] block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-black/10"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-[#111111] block mb-1">Document Link</label>
                        <input
                          type="url"
                          value={docLink}
                          onChange={(e) => setDocLink(e.target.value)}
                          placeholder="https://..."
                          className="w-full p-2.5 rounded-xl border border-black/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-[#111111] block mb-1">
                        Reason / Summary for this version change *
                      </label>
                      <input
                        type="text"
                        value={changeSummary}
                        onChange={(e) => setChangeSummary(e.target.value)}
                        placeholder="e.g. Renegotiated commission tier following 5 successful client referrals"
                        className="w-full p-2.5 rounded-xl border border-black/10"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingDeal(false)}
                        className="px-4 py-2 text-xs font-semibold text-[#6B6B6B]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-all"
                      >
                        Save New Deal Version
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Deal Version History Timeline */}
              <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-4">
                <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                  <History size={15} className="text-[#D92D50]" />
                  <span>Deal Version History (Audited)</span>
                </div>

                {(!partner.dealHistory || partner.dealHistory.length === 0) ? (
                  <p className="text-xs text-[#A8A5A5] italic py-2">
                    No previous revisions. Currently on initial version 1.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {partner.dealHistory.map((ver: PartnerDealVersion) => (
                      <div
                        key={ver.id}
                        className="p-3.5 rounded-xl border border-black/5 bg-[#F8F7F7] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#111111]">Version {ver.version}</span>
                          <span className="text-[10px] text-[#A8A5A5]">{ver.changedAt} · by {ver.changedBy}</span>
                        </div>
                        <p className="text-[#6B6B6B] font-medium">{ver.terms.dealSummary}</p>
                        <div className="flex items-center gap-3 text-[11px] text-[#111111]">
                          <span>Model: {ver.terms.dealModel}</span>
                          <span>·</span>
                          <span>Applies: {ver.terms.appliesTo}</span>
                          <span>·</span>
                          <span>Share: {ver.terms.sharePercentage || ver.terms.fixedAmount}</span>
                        </div>
                        {ver.summaryOfChange && (
                          <div className="text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg mt-1 border border-amber-200/50">
                            <strong>Note:</strong> {ver.summaryOfChange}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CLIENTS */}
          {activeTab === 'Clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                  <Users size={15} className="text-[#D92D50]" />
                  <span>Clients Brought by {partner.name} ({partnerClients.length})</span>
                </div>
                <span className="text-[11px] text-[#6B6B6B]">
                  Only received payments generate partner earnings
                </span>
              </div>

              {partnerClients.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-black/5 text-center space-y-2">
                  <Users size={28} className="mx-auto text-[#A8A5A5]" />
                  <p className="text-xs font-semibold text-[#111111]">No clients brought yet</p>
                  <p className="text-[11px] text-[#6B6B6B]">
                    When leads from this partner convert to active clients, they appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {earningsData.clientBreakdowns.map((cb) => (
                    <div
                      key={cb.clientId}
                      className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#111111]">{cb.businessName}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {cb.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#111111] text-white">
                              {cb.package}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">
                            {cb.paymentCount} payments received · Latest: {cb.latestPaymentDate || 'Pending'}
                          </span>
                        </div>

                        {onOpenClientWorkspace && (
                          <button
                            type="button"
                            onClick={() => onOpenClientWorkspace(cb.clientId, cb.businessName)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F1EFEF] hover:bg-[#E7E2E2] text-xs font-semibold text-[#111111] transition-colors cursor-pointer"
                          >
                            <span>Client Workspace</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>

                      {/* Financial breakdown */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-[#F8F7F7] rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] text-[#A8A5A5] block">Payments Received (Real)</span>
                          <span className="font-bold text-[#111111] tabular-nums">
                            €{cb.grossPaymentsEUR.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#A8A5A5] block">Partner Share</span>
                          <span className="font-bold text-emerald-700 tabular-nums">
                            €{cb.partnerShareEUR.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#A8A5A5] block">Claimed Pipeline Value</span>
                          <span className="font-semibold text-[#6B6B6B] tabular-nums">
                            €{cb.claimedValueEUR?.toLocaleString()} <span className="text-[9px] uppercase">(Claimed)</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EARNINGS LOGIC (SINGLE SOURCE OF TRUTH) */}
          {activeTab === 'Earnings' && (
            <div className="space-y-6">
              {canViewFees ? (
                <>
                  {/* Ledger Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs">
                      <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                        Gross Client Payments (Cash Basis)
                      </span>
                      <span className="text-2xl font-bold text-[#111111] tabular-nums block">
                        €{earningsData.grossClientPaymentsEUR.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                        Verified from Payment records
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs">
                      <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                        Partner Share ({partner.dealTerms?.dealModel || 'Agreed %'})
                      </span>
                      <span className="text-2xl font-bold text-[#D92D50] tabular-nums block">
                        €{earningsData.partnerShareEUR.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                        Computed via src/lib/partners.ts
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-2xs">
                      <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                        Net to Open Hours
                      </span>
                      <span className="text-2xl font-bold text-emerald-800 tabular-nums block">
                        €{earningsData.netToOpenHoursEUR.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                        Gross minus partner share
                      </span>
                    </div>
                  </div>

                  {/* Effective Hourly Rate Line (Estimated from time tracking, hidden if no logs) */}
                  {earningsData.effectiveHourlyRateEUR !== null && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-emerald-700 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-950 block">
                            Effective Hourly Rate (Delivery Economics)
                          </span>
                          <span className="text-[11px] text-emerald-800">
                            Estimated across {earningsData.totalLoggedHours} logged delivery hours (Delivery cost: €{earningsData.deliveryCostEUR})
                          </span>
                        </div>
                      </div>
                      <span className="text-lg font-extrabold text-emerald-900 tabular-nums">
                        €{earningsData.effectiveHourlyRateEUR}/hr
                      </span>
                    </div>
                  )}

                  {/* Payout Reconciliation Card */}
                  <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                        Partner Fee Payout Ledger
                      </span>
                      <span className="text-xs font-semibold text-[#6B6B6B]">
                        Single Source of Truth
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8F7F7] rounded-xl text-xs">
                      <div>
                        <span className="text-[#A8A5A5] block">Total Share Earned</span>
                        <span className="font-bold text-[#111111] text-base tabular-nums">
                          €{earningsData.partnerShareEUR.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A8A5A5] block">Commissions Paid to Date</span>
                        <span className="font-bold text-emerald-700 text-base tabular-nums">
                          €{earningsData.earningsPaidEUR.toLocaleString()}
                        </span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-black/5 flex items-center justify-between">
                        <span className="font-bold text-[#111111]">Balance Owed to Partner:</span>
                        <span className="text-lg font-extrabold text-[#D92D50] tabular-nums">
                          €{earningsData.balanceOwedEUR.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Payout Action */}
                    {earningsData.balanceOwedEUR > 0 && (
                      <div className="pt-2">
                        {!showPayInput ? (
                          <button
                            type="button"
                            onClick={() => setShowPayInput(true)}
                            className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
                          >
                            Record Payout to Partner
                          </button>
                        ) : (
                          <form onSubmit={handlePayFee} className="flex items-center gap-2">
                            <input
                              type="number"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              placeholder={`Up to €${earningsData.balanceOwedEUR}`}
                              max={earningsData.balanceOwedEUR}
                              className="text-xs p-2 rounded-xl border border-black/10 w-44"
                              required
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold cursor-pointer"
                            >
                              Confirm Payout
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPayInput(false)}
                              className="text-xs text-[#A8A5A5] hover:text-[#111111]"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Claimed vs Real Revenue Principle Notice */}
                  <div className="p-4 bg-white rounded-2xl border border-black/5 text-xs space-y-1.5 text-[#6B6B6B]">
                    <span className="font-bold text-[#111111] block">Revenue & Pricing Accounting Rule:</span>
                    <p>
                      Partner-submitted prices and potential pipeline values are labeled as{' '}
                      <strong className="text-[#111111]">"Claimed"</strong>. Only verified, completed{' '}
                      <strong className="text-[#111111]">Payment records</strong> count as realized revenue.
                      Partner earnings are never entered manually; they are derived automatically via{' '}
                      <code className="text-[#D92D50]">src/lib/partners.ts</code> from client payments.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-[#F4F2F2] rounded-2xl p-6 text-xs text-[#A8A5A5] text-center">
                  🔒 Fee and financial accounting data restricted by system role policy.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PORTAL SETTINGS */}
          {activeTab === 'Portal' && (
            <div className="space-y-6">
              {/* Portal Selector */}
              <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-4">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
                  Partner Portal Mode
                </span>

                <div className="space-y-2">
                  {[
                    {
                      id: 'No portal' as PartnerPortalType,
                      title: 'No portal',
                      desc: 'Partner has no portal account. Communication handled offline.',
                    },
                    {
                      id: 'Standard partner portal (Open Hours branding)' as PartnerPortalType,
                      title: 'Standard partner portal',
                      desc: 'Open Hours branding, metrics dashboard, and verified referral tracking.',
                    },
                    {
                      id: 'Branded partner portal (partner logo, name, colours)' as PartnerPortalType,
                      title: 'Branded partner portal',
                      desc: 'Co-branded or white-labeled experience with partner logo and custom palette.',
                    },
                  ].map((pOpt) => (
                    <label
                      key={pOpt.id}
                      className={`p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                        portalType === pOpt.id
                          ? 'border-[#111111] bg-[#F8F7F7]'
                          : 'border-black/5 hover:border-black/15 bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-[#111111] block">{pOpt.title}</span>
                        <span className="text-[11px] text-[#6B6B6B]">{pOpt.desc}</span>
                      </div>
                      <input
                        type="radio"
                        name="portalSettingMode"
                        checked={portalType === pOpt.id}
                        onChange={() => setPortalType(pOpt.id)}
                        className="mt-1 accent-[#D92D50]"
                      />
                    </label>
                  ))}
                </div>

                {portalType === 'Branded partner portal (partner logo, name, colours)' && (
                  <div className="p-4 bg-[#F8F7F7] rounded-xl border border-black/5 space-y-4 pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111111] block">Branding Assets (Admin Managed)</span>
                      <button
                        type="button"
                        onClick={handleRequestPartnerLogo}
                        className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#111111] hover:bg-black text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <FileText size={12} />
                        <span>Request Logo</span>
                      </button>
                    </div>

                    {requestLogoFeedback && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                        <span>{requestLogoFeedback}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-[#6B6B6B] block mb-1">Brand Name</label>
                        <input
                          type="text"
                          value={brandedName}
                          onChange={(e) => setBrandedName(e.target.value)}
                          className="w-full p-2 rounded-lg border border-black/10 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#6B6B6B] block mb-1">Upload / Replace Logo</label>
                        <div className="space-y-1.5">
                          <label className="px-3 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-gray-50 text-[11px] font-bold text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                            <Upload size={12} />
                            <span>{brandedLogo ? 'Replace Logo File' : 'Upload PNG/SVG'}</span>
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                              onChange={handleAdminLogoUpload}
                              className="hidden"
                            />
                          </label>
                          {uploadingLogo && (
                            <span className="text-[10px] text-[#A8A5A5] block">Validating...</span>
                          )}
                          {brandedLogo && (
                            <div className="flex items-center gap-2 pt-1">
                              <img
                                src={brandedLogo}
                                alt="Partner logo"
                                className="h-6 max-w-[80px] object-contain rounded border border-black/5 p-0.5 bg-white"
                              />
                              <span className="text-[10px] text-emerald-700 font-bold">Attached</span>
                            </div>
                          )}
                          {logoUploadError && (
                            <span className="text-[10px] text-red-600 block">{logoUploadError}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-[#6B6B6B] block mb-1">Primary Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={brandedColor}
                            onChange={(e) => setBrandedColor(e.target.value)}
                            className="w-8 h-8 rounded border border-black/10 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandedColor}
                            onChange={(e) => setBrandedColor(e.target.value)}
                            className="w-full p-2 rounded-lg border border-black/10 bg-white font-mono text-xs uppercase"
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span
                            className="px-1.5 py-0.2 rounded font-bold"
                            style={{
                              backgroundColor: brandedColor,
                              color: getContrastTextColor(brandedColor),
                            }}
                          >
                            Text: {getContrastTextColor(brandedColor) === '#FFFFFF' ? 'White' : 'Dark'}
                          </span>
                          <span className="text-emerald-700 font-semibold">Contrast OK</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Toggle "Powered by Open Hours" */}
                    <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#111111] block">
                          "Powered by Open Hours" Footer Badge
                        </span>
                        <span className="text-[11px] text-[#6B6B6B]">
                          Default ON. Controls visibility in partner and branded client portals.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={poweredByOpenHours}
                          onChange={(e) => setPoweredByOpenHours(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#111111]" />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Credentials & Access (Part 4) */}
              {portalType !== 'No portal' && (
                <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-4">
                  <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                    <Lock size={15} className="text-[#D92D50]" />
                    <span>Credentials & Magic Link Access</span>
                  </div>

                  {/* Mock Auth Notice Banner */}
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                    <Lock size={15} className="shrink-0 mt-0.5 text-amber-700" />
                    <div>
                      <span className="font-bold">Security Notice: </span>
                      <span>Mock auth: do not give real people access until Supabase is live.</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Never store or display plaintext passwords. Access is granted passwordlessly.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-[#111111] block mb-1">
                        Portal Login Email
                      </label>
                      <input
                        type="email"
                        value={portalEmail}
                        onChange={(e) => setPortalEmail(e.target.value)}
                        placeholder="partner@domain.com"
                        className="w-full p-2.5 rounded-xl border border-black/10 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleSendMagicLinkInvite}
                        className="px-4 py-2 rounded-full border border-black/10 hover:bg-[#F8F7F7] text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles size={13} className="text-[#D92D50]" />
                        <span>Send Passwordless Magic Link Invite</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setManageCredOpen(true)}
                        className="px-3.5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <KeyRound size={13} />
                        <span>Manage Credentials & Reset</span>
                      </button>
                    </div>

                    {inviteFeedback && (
                      <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                        <span>{inviteFeedback}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Save portal settings */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePortalSettings}
                  className="px-6 py-2.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer"
                >
                  Save Portal Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVITY */}
          {activeTab === 'Activity' && (
            <div className="space-y-5">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
                  Log Partner Interaction
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log a conversation, referral update, or note..."
                    className="flex-1 text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none bg-white"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                  >
                    Post Note
                  </button>
                </div>
              </form>

              {/* Activity Timeline */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
                  Audit History
                </span>
                {activities.length === 0 ? (
                  <p className="text-xs text-[#A8A5A5] italic">No activities recorded yet.</p>
                ) : (
                  activities.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-2xs space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#A8A5A5]">
                        <span className="font-semibold text-[#111111]">{a.createdBy}</span>
                        <span>{a.createdAt}</span>
                      </div>
                      <p className="text-[#6B6B6B] leading-relaxed">{a.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {manageCredOpen && (
        <ManageCredentialModal
          isOpen={true}
          onClose={() => setManageCredOpen(false)}
          loginId={portalEmail || partner.email || ''}
          entityName={partner.name}
          roleLabel="Strategic Partner"
          onCredentialUpdated={loadData}
        />
      )}
    </>
  );
};
