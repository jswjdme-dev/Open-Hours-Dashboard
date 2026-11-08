import React, { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Check,
  Plus,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Sliders,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  Lock,
  Eye,
  EyeOff,
  Coins,
  Shield,
  Layers,
} from 'lucide-react';
import {
  Client,
  ClientReferralAdminDetails,
  ReferralMilestoneRow,
  ReferralMonthEntry,
  ExplainerConfig,
  GuestPortalFeatureAccess,
  PortalFeatureKey,
} from '../../types/index.ts';
import {
  getClientReferralDetails,
  recordReferralLedgerEntry,
  updateClientReferralSettings,
  DEFAULT_CLIENT_EXPLAINER,
  DEFAULT_GUEST_EXPLAINER,
  DEFAULT_GUEST_PORTAL_FEATURE_ACCESS,
} from '../../data/repo.ts';
import { ExplainerEditor } from '../referral/ExplainerEditor.tsx';

interface ClientReferralsAdminTabProps {
  client: Client;
  currentRole?: string; // 'Admin' | 'Account Manager' | etc.
  showToast: (msg: string) => void;
  onClientUpdated?: () => void;
}

export const ClientReferralsAdminTab: React.FC<ClientReferralsAdminTabProps> = ({
  client,
  currentRole = 'Admin',
  showToast,
  onClientUpdated,
}) => {
  const [details, setDetails] = useState<ClientReferralAdminDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Settings & Override editor state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [overrideMode, setOverrideMode] = useState<'use_default' | 'on' | 'off'>(
    client.referralOverrideMode || 'use_default'
  );
  const [customRows, setCustomRows] = useState<ReferralMilestoneRow[]>([]);
  const [friendRewardMonths, setFriendRewardMonths] = useState<number>(
    client.referralFriendRewardMonths ?? 1
  );
  const [savingsPriceAmount, setSavingsPriceAmount] = useState<number | ''>(
    client.savingsPriceAmount ?? 350
  );
  const [savingsPriceCurrency, setSavingsPriceCurrency] = useState<string>(
    client.savingsPriceCurrency || 'EUR'
  );
  const [savingsPricePeriod, setSavingsPricePeriod] = useState<'month' | 'quarter' | 'year'>(
    (client.savingsPricePeriod as any) || 'month'
  );

  // Visual Explainer states
  const [clientExplainer, setClientExplainer] = useState<ExplainerConfig>(
    client.referralClientExplainer || { ...DEFAULT_CLIENT_EXPLAINER }
  );
  const [guestExplainer, setGuestExplainer] = useState<ExplainerConfig>(
    client.referralGuestExplainer || { ...DEFAULT_GUEST_EXPLAINER }
  );
  const [guestFeatureAccess, setGuestFeatureAccess] = useState<GuestPortalFeatureAccess>(
    (client.referralGuestFeatureAccess as any) || { ...DEFAULT_GUEST_PORTAL_FEATURE_ACCESS }
  );

  // Visual Editors subtab ('clientExplainer' | 'guestExplainer' | 'lockSettings')
  const [visualEditorTab, setVisualEditorTab] = useState<
    'clientExplainer' | 'guestExplainer' | 'lockSettings'
  >('clientExplainer');

  const [savingSettings, setSavingSettings] = useState(false);

  // Apply months modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyMonths, setApplyMonths] = useState<number>(1);
  const [applyNote, setApplyNote] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);

  // Adjustment modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjMonths, setAdjMonths] = useState<number>(1);
  const [adjReason, setAdjReason] = useState('');
  const [submittingAdj, setSubmittingAdj] = useState(false);

  const canViewFinancials =
    currentRole.toLowerCase() === 'admin' ||
    currentRole.toLowerCase().includes('founder') ||
    currentRole.toLowerCase().includes('account manager') ||
    currentRole.toLowerCase() === 'am';

  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await getClientReferralDetails(client.id);
      setDetails(data);
      setOverrideMode(data.overrideMode);
      setFriendRewardMonths(data.friendRewardMonths ?? 1);
      setCustomRows(
        data.customMilestoneRows && data.customMilestoneRows.length > 0
          ? [...data.customMilestoneRows]
          : [...data.activeMilestoneRows]
      );
      if (data.clientExplainer) {
        setClientExplainer({ ...data.clientExplainer });
      }
      if (data.guestExplainer) {
        setGuestExplainer({ ...data.guestExplainer });
      }
      if (data.guestFeatureAccess) {
        setGuestFeatureAccess({ ...DEFAULT_GUEST_PORTAL_FEATURE_ACCESS, ...data.guestFeatureAccess });
      }
    } catch (err: any) {
      console.error('Failed to load client referral details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [client.id]);

  const handleCopyLink = () => {
    if (!details) return;
    navigator.clipboard.writeText(details.shareUrl);
    setCopiedLink(true);
    showToast('Referral link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await updateClientReferralSettings(
        client.id,
        {
          overrideMode,
          customRows: overrideMode === 'on' ? customRows : undefined,
          friendRewardMonths: overrideMode === 'on' ? friendRewardMonths : undefined,
          savingsPriceAmount: typeof savingsPriceAmount === 'number' ? savingsPriceAmount : undefined,
          savingsPriceCurrency,
          savingsPricePeriod,
          clientExplainer,
          guestExplainer,
          guestFeatureAccess,
        },
        currentRole
      );
      setIsEditingSettings(false);
      showToast('Client referral settings saved.');
      await loadDetails();
      if (onClientUpdated) onClientUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to update referral settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCustomRow = () => {
    const maxVal = customRows.length > 0 ? Math.max(...customRows.map((r) => r.qualifiedReferrals)) : 0;
    setCustomRows((prev) => [
      ...prev,
      {
        id: `c_row_${Date.now()}`,
        qualifiedReferrals: maxVal + 1,
        rewardMonths: 1,
      },
    ]);
  };

  const handleRemoveCustomRow = (idx: number) => {
    setCustomRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCustomRowChange = (
    idx: number,
    field: 'qualifiedReferrals' | 'rewardMonths',
    val: number
  ) => {
    setCustomRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleFeatureAccessChange = (
    feature: keyof GuestPortalFeatureAccess,
    level: 'open' | 'locked' | 'hidden'
  ) => {
    setGuestFeatureAccess((prev: any) => ({
      ...prev,
      [feature]: level,
    }));
  };

  const handleRecordApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (applyMonths <= 0) return;
    try {
      setSubmittingApply(true);
      await recordReferralLedgerEntry(
        client.id,
        'applied',
        applyMonths,
        applyNote || 'Months applied towards subscription fee',
        currentRole
      );
      setApplyModalOpen(false);
      setApplyMonths(1);
      setApplyNote('');
      showToast('Recorded applied referral months.');
      await loadDetails();
    } catch (err: any) {
      alert(err?.message || 'Failed to record applied months.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      alert('Adjustment reason is required.');
      return;
    }
    try {
      setSubmittingAdj(true);
      await recordReferralLedgerEntry(
        client.id,
        'adjustment',
        adjMonths,
        adjReason.trim(),
        currentRole
      );
      setAdjModalOpen(false);
      setAdjMonths(1);
      setAdjReason('');
      showToast('Recorded referral ledger adjustment.');
      await loadDetails();
    } catch (err: any) {
      alert(err?.message || 'Failed to record adjustment.');
    } finally {
      setSubmittingAdj(false);
    }
  };

  if (loading || !details) {
    return (
      <div className="p-8 text-center text-xs text-[#6B6B6B] bg-white rounded-[20px] border border-[#E3E3E6]">
        Loading referral details...
      </div>
    );
  }

  const counts = details.counts || {
    applied: details.referredList.length,
    waiting: details.referredList.filter((r) => r.status === 'Applied').length,
    approved: details.referredList.filter((r) => r.status === 'Approved').length,
    qualified: details.referredList.filter((r) => r.status === 'Qualified').length,
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Referral Link Card */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E3E6]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0A0A0A] text-[12px] font-semibold text-[#0A0A0A]">
                Client referral link & code
              </span>
              <span
                className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                  overrideMode === 'off'
                    ? 'bg-[#FEECEB] text-[#F04438] border border-[#F04438]/20'
                    : overrideMode === 'on'
                    ? 'bg-[#E7F8EF] text-[#12B76A] border border-[#12B76A]/20'
                    : 'bg-[#F3F3F5] text-[#0A0A0A] border border-[#E3E3E6]'
                }`}
              >
                {overrideMode === 'off'
                  ? 'Disabled (Off)'
                  : overrideMode === 'on'
                  ? 'Custom Override (On)'
                  : 'Using Global Defaults'}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Unique referral code and public invitation link for {client.businessName}. Earned months are computed by selectors based on active milestones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              className="px-3.5 py-1.5 rounded-full border border-[#E3E3E6] hover:bg-[#F3F3F5] text-xs font-semibold text-[#0A0A0A] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sliders size={13} />
              <span>{isEditingSettings ? 'Close settings' : 'Edit referral settings'}</span>
            </button>
          </div>
        </div>

        {/* Code & URL Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-[14px] bg-[#F3F3F5] border border-[#E3E3E6]">
            <span className="text-[11px] text-[#6B6B6B] block">Unique Referral Code</span>
            <div className="font-mono text-base font-bold text-[#0A0A0A] mt-1 tracking-wider">
              {details.referralCode}
            </div>
          </div>

          <div className="md:col-span-2 p-3.5 rounded-[14px] bg-[#F3F3F5] border border-[#E3E3E6] flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-[#6B6B6B] block">Public Guest Welcome Link</span>
              <div className="font-mono text-xs text-[#0A0A0A] truncate mt-0.5 select-all">
                {details.shareUrl}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-full bg-[#0A0A0A] hover:bg-[#D92D50] text-white text-xs font-bold transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
            >
              {copiedLink ? <Check size={13} className="text-[#12B76A]" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied' : 'Copy link'}</span>
            </button>
          </div>
        </div>

        {/* 4 Counts Banner: Applied, Waiting, Approved, Qualified */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-[14px] bg-[#FAFAFA] border border-[#E3E3E6] text-center">
            <span className="text-[11px] text-[#6B6B6B] block mb-0.5">Applied</span>
            <span className="text-xl font-bold text-[#0A0A0A] tabular-nums">
              {counts.applied}
            </span>
          </div>
          <div className="p-3 rounded-[14px] bg-[#FFF4E5] border border-[#FEE4C2] text-center">
            <span className="text-[11px] text-[#B54708] block mb-0.5">Waiting (Application in review)</span>
            <span className="text-xl font-bold text-[#B54708] tabular-nums">
              {counts.waiting}
            </span>
          </div>
          <div className="p-3 rounded-[14px] bg-[#F3F3F5] border border-[#E3E3E6] text-center">
            <span className="text-[11px] text-[#0A0A0A] block mb-0.5">Approved (Onboarding)</span>
            <span className="text-xl font-bold text-[#0A0A0A] tabular-nums">
              {counts.approved}
            </span>
          </div>
          <div className="p-3 rounded-[14px] bg-[#E7F8EF] border border-[#12B76A]/20 text-center">
            <span className="text-[11px] text-[#12B76A] block mb-0.5">Qualified (First Paid)</span>
            <span className="text-xl font-bold text-[#12B76A] tabular-nums">
              {counts.qualified}
            </span>
          </div>
        </div>

        {/* Settings & Visual Editors (Collapsible) */}
        {isEditingSettings && (
          <div className="p-5 rounded-[16px] bg-[#FAFAFA] border border-[#E3E3E6] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E6]">
              <h4 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                Client Referral Configuration & Visual Editors
              </h4>
              <span className="text-[11px] text-[#6B6B6B]">
                Mode: <strong className="text-[#0A0A0A]">{overrideMode}</strong>
              </span>
            </div>

            {/* Mode Selector: On / Off / Use default */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#0A0A0A]">
                Referral Mode for this Client
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideMode('use_default')}
                  className={`p-3 rounded-[12px] border text-left cursor-pointer transition-all ${
                    overrideMode === 'use_default'
                      ? 'border-[#0A0A0A] bg-white shadow-2xs'
                      : 'border-[#E3E3E6] bg-[#F3F3F5] text-[#6B6B6B]'
                  }`}
                >
                  <span className="block text-xs font-bold text-[#0A0A0A]">Use Default</span>
                  <span className="text-[11px] text-[#6B6B6B] block mt-0.5">
                    Inherits milestone table and settings from Settings &gt; Referral defaults
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverrideMode('on')}
                  className={`p-3 rounded-[12px] border text-left cursor-pointer transition-all ${
                    overrideMode === 'on'
                      ? 'border-[#0A0A0A] bg-white shadow-2xs'
                      : 'border-[#E3E3E6] bg-[#F3F3F5] text-[#6B6B6B]'
                  }`}
                >
                  <span className="block text-xs font-bold text-[#0A0A0A]">On (Custom Milestones)</span>
                  <span className="text-[11px] text-[#6B6B6B] block mt-0.5">
                    Override with bespoke reward milestones and friend reward for this client
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverrideMode('off')}
                  className={`p-3 rounded-[12px] border text-left cursor-pointer transition-all ${
                    overrideMode === 'off'
                      ? 'border-[#F04438] bg-white shadow-2xs'
                      : 'border-[#E3E3E6] bg-[#F3F3F5] text-[#6B6B6B]'
                  }`}
                >
                  <span className="block text-xs font-bold text-[#F04438]">Off (Disabled)</span>
                  <span className="text-[11px] text-[#6B6B6B] block mt-0.5">
                    Hides the referral card from this client&rsquo;s portal
                  </span>
                </button>
              </div>
            </div>

            {/* Savings Price Inputs (Amount, Currency, Period) */}
            <div className="p-4 rounded-[14px] bg-white border border-[#E3E3E6] space-y-3">
              <div>
                <h5 className="text-xs font-bold text-[#0A0A0A]">
                  Savings Price (Client Portal CTA Text)
                </h5>
                <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                  Populates the portal button: &ldquo;See how a referral can save you{' '}
                  <strong className="text-[#0A0A0A]">
                    {savingsPriceAmount ? `${savingsPriceCurrency === 'EUR' ? '€' : savingsPriceCurrency === 'USD' ? '$' : '£'}${savingsPriceAmount} / ${savingsPricePeriod}` : '...'}
                  </strong>
                  &rdquo;. Leave blank to hide the button.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    placeholder="e.g. 350"
                    value={savingsPriceAmount}
                    onChange={(e) =>
                      setSavingsPriceAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
                    Currency
                  </label>
                  <select
                    value={savingsPriceCurrency}
                    onChange={(e) => setSavingsPriceCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
                    Period
                  </label>
                  <select
                    value={savingsPricePeriod}
                    onChange={(e) => setSavingsPricePeriod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none"
                  >
                    <option value="month">month</option>
                    <option value="quarter">quarter</option>
                    <option value="year">year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Milestones and Friend Reward (when mode === 'on') */}
            {overrideMode === 'on' && (
              <div className="space-y-4 p-4 rounded-[14px] bg-white border border-[#E3E3E6]">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-[#0A0A0A]">
                      Custom Milestone Ladder for {client.businessName}
                    </h5>
                    <p className="text-[11px] text-[#6B6B6B]">
                      Additive ladder: each reached milestone adds reward months (step 0.5, max 12).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomRow}
                    className="px-3 py-1 text-xs font-bold rounded-full bg-[#0A0A0A] text-white hover:bg-[#D92D50] transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add Milestone Row</span>
                  </button>
                </div>

                <div className="border border-[#E3E3E6] rounded-[12px] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F3F3F5] text-[#6B6B6B] border-b border-[#E3E3E6] text-[11px]">
                      <tr>
                        <th className="p-2.5">Qualified Referrals (≥ 1)</th>
                        <th className="p-2.5">Reward Months (Step 0.5, Max 12)</th>
                        <th className="p-2.5 text-right w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E6]">
                      {customRows.map((row, idx) => (
                        <tr key={row.id || idx}>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min={1}
                              value={row.qualifiedReferrals}
                              onChange={(e) =>
                                handleCustomRowChange(
                                  idx,
                                  'qualifiedReferrals',
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              className="w-24 px-2 py-1 text-xs border border-[#E3E3E6] rounded-[8px]"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min={0.5}
                              max={12}
                              step={0.5}
                              value={row.rewardMonths}
                              onChange={(e) =>
                                handleCustomRowChange(
                                  idx,
                                  'rewardMonths',
                                  parseFloat(e.target.value) || 0.5
                                )
                              }
                              className="w-24 px-2 py-1 text-xs border border-[#E3E3E6] rounded-[8px]"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomRow(idx)}
                              className="p-1 text-[#F04438] hover:bg-[#FEECEB] rounded-[6px] cursor-pointer"
                              title="Remove row"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Friend Reward for this client */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                    Reward Given to Referred Friend (Months)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    step={0.5}
                    value={friendRewardMonths}
                    onChange={(e) => setFriendRewardMonths(parseFloat(e.target.value) || 0)}
                    className="w-48 px-3 py-1.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                    Free care months credited to the friend upon onboarding (default 1, can be 0).
                  </span>
                </div>
              </div>
            )}

            {/* 3 Visual Editors Tabs */}
            <div className="space-y-4 pt-3 border-t border-[#E3E3E6]">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                    Visual Explainer &amp; Lock Settings
                  </h5>
                  <p className="text-[11px] text-[#6B6B6B]">
                    Customize the whiteboard explainers and public guest portal tab permissions for this client.
                  </p>
                </div>
              </div>

              {/* Subtabs Bar */}
              <div className="flex items-center gap-2 border-b border-[#E3E3E6] pb-2">
                <button
                  type="button"
                  onClick={() => setVisualEditorTab('clientExplainer')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    visualEditorTab === 'clientExplainer'
                      ? 'bg-[#0A0A0A] text-white'
                      : 'bg-[#F3F3F5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                  }`}
                >
                  1. Client Explainer Editor
                </button>
                <button
                  type="button"
                  onClick={() => setVisualEditorTab('guestExplainer')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    visualEditorTab === 'guestExplainer'
                      ? 'bg-[#0A0A0A] text-white'
                      : 'bg-[#F3F3F5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                  }`}
                >
                  2. Guest Explainer Editor
                </button>
                <button
                  type="button"
                  onClick={() => setVisualEditorTab('lockSettings')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    visualEditorTab === 'lockSettings'
                      ? 'bg-[#0A0A0A] text-white'
                      : 'bg-[#F3F3F5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                  }`}
                >
                  3. Lock Settings (Guest Portal)
                </button>
              </div>

              {/* Tab 1: Client Explainer Editor */}
              {visualEditorTab === 'clientExplainer' && (
                <ExplainerEditor
                  title="Client Explainer Modal Configuration"
                  value={clientExplainer}
                  onChange={(exp) => setClientExplainer(exp)}
                  onResetToDefault={() => setClientExplainer({ ...DEFAULT_CLIENT_EXPLAINER })}
                />
              )}

              {/* Tab 2: Guest Explainer Editor */}
              {visualEditorTab === 'guestExplainer' && (
                <ExplainerEditor
                  title="Guest Explainer (/welcome?ref=CODE) Configuration"
                  value={guestExplainer}
                  onChange={(exp) => setGuestExplainer(exp)}
                  onResetToDefault={() => setGuestExplainer({ ...DEFAULT_GUEST_EXPLAINER })}
                  onCopyFromClient={() => setGuestExplainer({ ...clientExplainer })}
                />
              )}

              {/* Tab 3: Lock Settings */}
              {visualEditorTab === 'lockSettings' && (
                <div className="bg-white rounded-[16px] p-5 border border-[#E3E3E6] space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-[#0A0A0A]">
                      Guest Portal Tab Access Matrix
                    </h5>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                      Configure visibility across the 5 client portal tabs when visitors arrive via this client&rsquo;s link <code className="font-mono bg-black/5 px-1 py-0.5 rounded">/welcome?ref={details.referralCode}</code>.
                    </p>
                  </div>

                  <div className="border border-[#E3E3E6] rounded-[12px] overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F3F3F5] text-[#6B6B6B] border-b border-[#E3E3E6] text-[11px]">
                        <tr>
                          <th className="p-3">Portal Tab</th>
                          <th className="p-3">Access Level</th>
                          <th className="p-3">Guest Experience</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3E3E6]">
                        {(
                          [
                            { key: 'home', label: '1. Overview / Home', desc: 'Shows the Board Explainer, 4 pillars, and Apply CTA' },
                            { key: 'progress', label: '2. Progress & Timeline', desc: 'Milestone tracking and project timeline' },
                            { key: 'actions', label: '3. Action Items', desc: 'Intake and action items' },
                            { key: 'reports', label: '4. Performance Reports', desc: 'Monthly performance summaries' },
                            { key: 'files_support', label: '5. Files & Support', desc: 'Brand assets and support tickets' },
                          ] as const
                        ).map((feat) => {
                          const currentVal = (guestFeatureAccess as any)?.[feat.key] ?? 'locked';
                          return (
                            <tr key={feat.key} className="hover:bg-[#FAFAFA]">
                              <td className="p-3 font-semibold text-[#0A0A0A]">{feat.label}</td>
                              <td className="p-3">
                                <select
                                  value={currentVal}
                                  onChange={(e) =>
                                    handleFeatureAccessChange(feat.key as any, e.target.value as any)
                                  }
                                  className="px-3 py-1.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[8px] font-medium text-[#0A0A0A] focus:outline-none"
                                >
                                  <option value="locked">Locked (visible with lock badge & tooltip)</option>
                                  <option value="hidden">Hidden (tab not shown to guest)</option>
                                  <option value="open">Open (accessible sample preview)</option>
                                </select>
                              </td>
                              <td className="p-3 text-[11px] text-[#6B6B6B]">{feat.desc}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E3E6]">
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="px-4 py-2 text-xs text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSettings}
                onClick={handleSaveSettings}
                className="px-5 py-2 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Referral Months KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Ink */}
        <div className="bg-[#0A0A0A] text-white rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-white/30 text-[12px] font-semibold text-white w-fit">
            Earned
          </span>
          <div className="mt-4">
            <div className="text-[36px] font-semibold tracking-tight tabular-nums leading-none">
              {details.earnedMonths}
            </div>
            <span className="text-[12px] text-white/70 block mt-1">
              months earned from qualified referrals
            </span>
          </div>
        </div>

        {/* CARD 2: Deep blue */}
        <div className="bg-[#1627E8] text-white rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-white/30 text-[12px] font-semibold text-white w-fit">
            Applied
          </span>
          <div className="mt-4">
            <div className="text-[36px] font-semibold tracking-tight tabular-nums leading-none">
              {details.appliedMonths}
            </div>
            <span className="text-[12px] text-white/70 block mt-1">
              months applied towards care fee
            </span>
          </div>
        </div>

        {/* CARD 3: Neutral grey */}
        <div className="bg-[#C9C9CC] text-[#0A0A0A] rounded-[20px] p-5 shadow-xs flex flex-col justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0A0A0A]/40 text-[12px] font-semibold text-[#0A0A0A] w-fit">
            Remaining
          </span>
          <div className="mt-4">
            <div className="text-[36px] font-semibold tracking-tight tabular-nums leading-none text-[#0A0A0A]">
              {details.remainingMonths}
            </div>
            <span className="text-[12px] text-[#0A0A0A]/70 block mt-1">
              free months available to use
            </span>
          </div>
        </div>

        {/* CARD 4: White with border (Estimated Cost for Admin/AM) */}
        <div className="bg-white text-[#0A0A0A] rounded-[20px] p-5 border border-[#E3E3E6] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0A0A0A] text-[12px] font-semibold text-[#0A0A0A]">
              Estimated cost
            </span>
            <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">
              Admin / AM
            </span>
          </div>
          <div className="mt-4">
            {canViewFinancials ? (
              <>
                <div className="text-[36px] font-semibold tracking-tight tabular-nums leading-none text-[#0A0A0A]">
                  €{details.estimatedCostEUR.toLocaleString()}
                </div>
                <span className="text-[12px] text-[#6B6B6B] block mt-1">
                  {details.remainingMonths} mo × €{details.monthlyFeeEUR.toLocaleString()}/mo fee
                </span>
              </>
            ) : (
              <span className="text-xs text-[#6B6B6B]">Restricted to Admin / AM</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Action Buttons & Next Reward Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-[20px] p-4 border border-[#E3E3E6]">
        <div className="text-xs text-[#6B6B6B]">
          {details.nextReward ? (
            <span>
              Next reward milestone: <strong className="text-[#0A0A0A]">{details.nextReward.moreNeeded} more qualified referral{details.nextReward.moreNeeded > 1 ? 's' : ''}</strong> = {details.nextReward.rewardMonths} months credit.
            </span>
          ) : (
            <span>All configured milestone rows reached.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdjModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[#E3E3E6] text-[#0A0A0A] hover:bg-[#F3F3F5] transition-colors cursor-pointer"
          >
            Adjust Balance (+/-)
          </button>
          <button
            type="button"
            disabled={details.remainingMonths <= 0}
            onClick={() => {
              setApplyMonths(Math.min(1, details.remainingMonths));
              setApplyModalOpen(true);
            }}
            className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#0A0A0A] hover:bg-[#D92D50] text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            Record Applied Month
          </button>
        </div>
      </div>

      {/* 4. Referred Businesses Table */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E6]">
          <div>
            <h3 className="text-sm font-bold text-[#0A0A0A]">Referred Businesses</h3>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Introductions carrying code {details.referralCode}. Qualified status requires first paid subscription fee.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F3F5] text-[#0A0A0A] border border-[#E3E3E6]">
            {details.referredList.length} Total
          </span>
        </div>

        {details.referredList.length === 0 ? (
          <div className="p-8 text-center rounded-[14px] bg-[#F3F3F5] border border-[#E3E3E6] space-y-1">
            <Gift size={24} className="mx-auto text-[#6B6B6B]" />
            <h4 className="text-xs font-bold text-[#0A0A0A]">No Referrals Yet</h4>
            <p className="text-[11px] text-[#6B6B6B]">
              When friends or colleagues apply via this client&rsquo;s link, they will appear here.
            </p>
          </div>
        ) : (
          <div className="border border-[#E3E3E6] rounded-[16px] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3F3F5] text-[#6B6B6B] font-semibold border-b border-[#E3E3E6] text-[11px]">
                <tr>
                  <th className="p-3">Business Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Notes & Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3E6]">
                {details.referredList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-[#0A0A0A]">{item.businessName}</div>
                      <div className="text-[11px] text-[#6B6B6B] font-mono">ID: {item.id}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-[#6B6B6B]">{item.date}</td>
                    <td className="p-3">
                      {item.status === 'Qualified' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E7F8EF] text-[#12B76A] border border-[#12B76A]/20">
                          <CheckCircle2 size={11} />
                          <span>Qualified (Paid)</span>
                        </span>
                      )}
                      {item.status === 'Approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F3F5] text-[#0A0A0A] border border-[#E3E3E6]">
                          <Clock size={11} />
                          <span>Approved (Awaiting 1st Payment)</span>
                        </span>
                      )}
                      {item.status === 'Applied' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF4E5] text-[#B54708] border border-[#FEE4C2]">
                          <span>Applied (Waiting)</span>
                        </span>
                      )}
                      {item.status === 'Flagged' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEECEB] text-[#F04438] border border-[#F04438]/20">
                          <AlertTriangle size={11} />
                          <span>Flagged (Self-referral)</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-[#6B6B6B]">
                      {item.flagReason ? (
                        <span className="text-[#F04438] font-medium">{item.flagReason}</span>
                      ) : item.paymentAmountEUR ? (
                        <span className="text-[#12B76A]">First paid fee: €{item.paymentAmountEUR}</span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Ledger History */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E6]">
          <div>
            <h3 className="text-sm font-bold text-[#0A0A0A]">Referral Ledger</h3>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Immutable ledger entries. Revenue remains recorded solely through payment transactions.
            </p>
          </div>
          <span className="text-xs text-[#6B6B6B] font-mono">
            {details.ledgerEntries.length} entries
          </span>
        </div>

        {details.ledgerEntries.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#6B6B6B] rounded-[14px] bg-[#F3F3F5]">
            No manual ledger entries recorded yet.
          </div>
        ) : (
          <div className="border border-[#E3E3E6] rounded-[16px] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3F3F5] text-[#6B6B6B] font-semibold border-b border-[#E3E3E6] text-[11px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Months</th>
                  <th className="p-3">Note / Reason</th>
                  <th className="p-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3E6]">
                {details.ledgerEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="p-3 font-mono text-[#6B6B6B]">{e.date}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.type === 'applied'
                            ? 'bg-[#1627E8]/10 text-[#1627E8]'
                            : e.type === 'adjustment'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-[#0A0A0A]">
                      {e.months > 0 ? `+${e.months}` : e.months}
                    </td>
                    <td className="p-3 text-[#6B6B6B]">{e.note || '—'}</td>
                    <td className="p-3 text-[11px] text-[#6B6B6B]">{e.createdBy || 'Admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Applied Month */}
      {applyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-[24px] p-6 shadow-2xl border border-[#E3E3E6] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Apply Referral Months</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Remaining available: <strong className="text-[#0A0A0A]">{details.remainingMonths} month(s)</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordApply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                  Months to Apply
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={details.remainingMonths}
                  step={0.5}
                  required
                  value={applyMonths}
                  onChange={(e) => setApplyMonths(parseFloat(e.target.value) || 0.5)}
                  className="w-full p-2.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                  Note
                </label>
                <textarea
                  rows={2}
                  value={applyNote}
                  onChange={(e) => setApplyNote(e.target.value)}
                  placeholder="e.g. Applied against upcoming care fee invoice"
                  className="w-full p-2.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply || applyMonths <= 0 || applyMonths > details.remainingMonths}
                  className="px-5 py-2 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingApply ? 'Recording...' : 'Record Applied'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjustment */}
      {adjModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-[24px] p-6 shadow-2xl border border-[#E3E3E6] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Adjust Referral Balance</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Record positive or negative month adjustments with a required reason.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjModalOpen(false)}
                className="text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                  Months (+/-)
                </label>
                <input
                  type="number"
                  step={0.5}
                  required
                  value={adjMonths}
                  onChange={(e) => setAdjMonths(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none"
                />
                <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                  Positive number adds months; negative number deducts.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                  Reason for Adjustment <span className="text-[#D92D50]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Reconciliation credit, client goodwill..."
                  className="w-full p-2.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdj || !adjReason.trim()}
                  className="px-5 py-2 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingAdj ? 'Recording...' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
