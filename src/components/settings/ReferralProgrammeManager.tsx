import React, { useState, useEffect } from 'react';
import {
  Gift,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Search,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Calculator,
  Info,
} from 'lucide-react';
import {
  ReferralProgrammeConfig,
  ReferralCredit,
  ReferralCreditStatus,
  ReferralMilestoneRow,
  GuestPortalFeatureAccess,
  ExplainerConfig,
} from '../../types/index.ts';
import {
  getReferralProgrammeConfig,
  updateReferralProgrammeConfig,
  getReferralCredits,
  applyReferralCredit,
  rejectReferralCredit,
  computeAdditiveEarnedMonths,
  contentGuardCheck,
  DEFAULT_CLIENT_EXPLAINER,
  DEFAULT_GUEST_EXPLAINER,
  DEFAULT_GUEST_PORTAL_FEATURE_ACCESS,
} from '../../data/repo.ts';
import { ExplainerEditor } from '../referral/ExplainerEditor.tsx';

interface ReferralProgrammeManagerProps {
  currentRole: string;
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

export const ReferralProgrammeManager: React.FC<ReferralProgrammeManagerProps> = ({
  currentRole,
}) => {
  const [config, setConfig] = useState<ReferralProgrammeConfig>({
    enabled: false,
    milestoneRows: [
      { id: 'm1', qualifiedReferrals: 1, rewardMonths: 1 },
      { id: 'm2', qualifiedReferrals: 2, rewardMonths: 1 },
      { id: 'm3', qualifiedReferrals: 3, rewardMonths: 1.5 },
      { id: 'm4', qualifiedReferrals: 5, rewardMonths: 2 },
    ],
    maxRewardsPerClientPerYear: 6,
    rewardWording: 'free care months',
    shareMessageTemplate:
      'I recommend working with Open Hours. They provide reliable digital systems and ongoing support: {{link}} (Note: I may receive a credit if you join).',
  });
  const [credits, setCredits] = useState<ReferralCredit[]>([]);
  const [, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Wording guard check for config inputs
  const [wordingWarning, setWordingWarning] = useState<string[]>([]);
  const [wordingConfirmed, setWordingConfirmed] = useState(false);

  // Interactive live example test input
  const [testReferralsCount, setTestReferralsCount] = useState<number>(3);

  // Active Explainer Visual Editor tab ('client' | 'guest')
  const [explainerSectionTab, setExplainerSectionTab] = useState<'client' | 'guest'>('client');

  // Filters & Search for Credits
  const [statusFilter, setStatusFilter] = useState<'All' | ReferralCreditStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Apply Modal state
  const [applyModalCredit, setApplyModalCredit] = useState<ReferralCredit | null>(null);
  const [applyNote, setApplyNote] = useState('');
  const [applying, setApplying] = useState(false);

  // Reject Modal state
  const [rejectModalCredit, setRejectModalCredit] = useState<ReferralCredit | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cfg, creds] = await Promise.all([
        getReferralProgrammeConfig(),
        getReferralCredits(),
      ]);
      setConfig(cfg);
      setCredits(creds);
    } catch (err: any) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runWordingCheck = (rewardWording: string, template: string) => {
    const check = contentGuardCheck('Referral Programme', `${rewardWording} ${template}`);
    if (check.hasWarning) {
      setWordingWarning(check.flaggedWords);
    } else {
      setWordingWarning([]);
      setWordingConfirmed(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    setConfigSuccessMsg(null);

    // 1. Mandatory template clause validation
    if (!config.shareMessageTemplate.includes('I may receive a credit if you join')) {
      setConfigError('The share message template must keep the line "I may receive a credit if you join" for transparency.');
      return;
    }

    // 2. Validate milestone rows
    if (!config.milestoneRows || config.milestoneRows.length === 0) {
      setConfigError('At least one milestone row is required in the milestone table.');
      return;
    }

    for (const r of config.milestoneRows) {
      if (r.qualifiedReferrals < 1) {
        setConfigError('Qualified referrals in each row must be at least 1.');
        return;
      }
      if (r.rewardMonths <= 0 || r.rewardMonths > 12) {
        setConfigError('Reward months must be between 0.5 and 12 months.');
        return;
      }
    }

    // 3. Wording guard check
    const check = contentGuardCheck('Referral Programme', `${config.rewardWording} ${config.shareMessageTemplate}`);
    if (check.hasWarning && !wordingConfirmed) {
      setWordingWarning(check.flaggedWords);
      setConfigError('Content guard warning: Please review flagged terms and check the confirmation box before saving.');
      return;
    }

    try {
      setSavingConfig(true);
      const updated = await updateReferralProgrammeConfig(config, currentRole);
      setConfig(updated);
      setConfigSuccessMsg('Referral programme settings saved successfully.');
      setTimeout(() => setConfigSuccessMsg(null), 3500);
    } catch (err: any) {
      setConfigError(err?.message || 'Failed to save settings.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Milestone row mutations
  const handleAddRow = () => {
    const existing = config.milestoneRows || [];
    const maxQual = existing.length > 0 ? Math.max(...existing.map((r) => r.qualifiedReferrals)) : 0;
    const newRow: ReferralMilestoneRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      qualifiedReferrals: maxQual + 1,
      rewardMonths: 1,
    };
    setConfig((prev) => ({
      ...prev,
      milestoneRows: [...(prev.milestoneRows || []), newRow],
    }));
  };

  const handleRemoveRow = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      milestoneRows: (prev.milestoneRows || []).filter((_, idx) => idx !== index),
    }));
  };

  const handleRowChange = (index: number, field: 'qualifiedReferrals' | 'rewardMonths', value: number) => {
    setConfig((prev) => {
      const nextRows = [...(prev.milestoneRows || [])];
      nextRows[index] = {
        ...nextRows[index],
        [field]: value,
      };
      return { ...prev, milestoneRows: nextRows };
    });
  };

  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    setConfig((prev) => {
      const rows = [...(prev.milestoneRows || [])];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= rows.length) return prev;
      const temp = rows[index];
      rows[index] = rows[targetIdx];
      rows[targetIdx] = temp;
      return { ...prev, milestoneRows: rows };
    });
  };

  // Computed live example
  const computedExampleMonths = computeAdditiveEarnedMonths(
    testReferralsCount,
    config.milestoneRows || [],
    config.maxRewardsPerClientPerYear
  );

  const handleConfirmApply = async () => {
    if (!applyModalCredit) return;
    try {
      setApplying(true);
      await applyReferralCredit(applyModalCredit.id, applyNote, currentRole);
      setApplyModalCredit(null);
      setApplyNote('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to apply credit.');
    } finally {
      setApplying(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalCredit || !rejectReason.trim()) return;
    try {
      setRejecting(true);
      await rejectReferralCredit(rejectModalCredit.id, rejectReason, currentRole);
      setRejectModalCredit(null);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject credit.');
    } finally {
      setRejecting(false);
    }
  };

  // Metrics
  const pendingCount = credits.filter((c) => c.status === 'Pending').length;
  const eligibleCount = credits.filter((c) => c.status === 'Eligible').length;
  const appliedCount = credits.filter((c) => c.status === 'Applied').length;
  const rejectedCount = credits.filter((c) => c.status === 'Rejected').length;

  // Filtered credits
  const filteredCredits = credits.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReferrer = c.referrerClientBusinessName?.toLowerCase().includes(q);
      const matchReferred = c.referredClientBusinessName?.toLowerCase().includes(q);
      const matchApp = c.applicationReferenceCode?.toLowerCase().includes(q);
      const matchId = c.id.toLowerCase();
      if (!matchReferrer && !matchReferred && !matchApp && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Programme Configuration Card */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E3E6]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0A0A0A] text-[12px] font-semibold text-[#0A0A0A] bg-transparent">
                Referral defaults
              </span>
              <span
                className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                  config.enabled
                    ? 'bg-[#E7F8EF] text-[#12B76A] border border-[#12B76A]/20'
                    : 'bg-[#F3F3F5] text-[#6B6B6B] border border-[#E3E3E6]'
                }`}
              >
                {config.enabled ? 'Enabled' : 'Disabled (Default)'}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Configure additive milestones, annual caps, and client-visible referral copy. Clients earn the reward months of every milestone reached once a referred business makes its first paid fee.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B6B6B]">Global Status:</span>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                config.enabled ? 'bg-[#0A0A0A]' : 'bg-[#C9C9CC]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {configSuccessMsg && (
          <div className="p-3 bg-[#E7F8EF] border border-[#12B76A]/30 text-[#12B76A] text-xs font-semibold rounded-[14px] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#12B76A] shrink-0" />
            <span>{configSuccessMsg}</span>
          </div>
        )}

        {configError && (
          <div className="p-3 bg-[#FEECEB] border border-[#F04438]/30 text-[#F04438] text-xs font-semibold rounded-[14px] flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#F04438] shrink-0" />
            <span>{configError}</span>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Milestone Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                  Milestone Table (Additive Mode)
                </h4>
                <p className="text-[11px] text-[#6B6B6B]">
                  Each reached row adds to the client&rsquo;s earned reward months. Rows are evaluated sequentially.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#0A0A0A] text-white hover:bg-[#D92D50] transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Row</span>
              </button>
            </div>

            <div className="border border-[#E3E3E6] rounded-[16px] overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3F3F5] text-[#6B6B6B] font-semibold border-b border-[#E3E3E6] text-[11px]">
                  <tr>
                    <th className="p-3 w-16">Reorder</th>
                    <th className="p-3">Qualified Referrals (≥ 1)</th>
                    <th className="p-3">Reward Months (Step 0.5, Max 12)</th>
                    <th className="p-3 w-20 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E3E6]">
                  {(config.milestoneRows || []).map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-[#6B6B6B]">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveRow(idx, 'up')}
                            className="p-1 hover:text-[#0A0A0A] disabled:opacity-30 cursor-pointer"
                            title="Move up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (config.milestoneRows || []).length - 1}
                            onClick={() => handleMoveRow(idx, 'down')}
                            className="p-1 hover:text-[#0A0A0A] disabled:opacity-30 cursor-pointer"
                            title="Move down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            required
                            value={row.qualifiedReferrals}
                            onChange={(e) =>
                              handleRowChange(idx, 'qualifiedReferrals', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-24 px-3 py-1.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none focus:border-[#D92D50]"
                          />
                          <span className="text-[11px] text-[#6B6B6B]">referrals</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0.5}
                            max={12}
                            step={0.5}
                            required
                            value={row.rewardMonths}
                            onChange={(e) =>
                              handleRowChange(idx, 'rewardMonths', parseFloat(e.target.value) || 0.5)
                            }
                            className="w-24 px-3 py-1.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none focus:border-[#D92D50]"
                          />
                          <span className="text-[11px] text-[#6B6B6B]">months credit</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1.5 text-[#F04438] hover:bg-[#FEECEB] rounded-[8px] transition-colors cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live Example Box */}
            <div className="p-4 rounded-[14px] bg-[#F3F3F5] border border-[#E3E3E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Calculator size={16} className="text-[#1627E8] shrink-0" />
                <span className="font-semibold text-[#0A0A0A]">Live Additive Example:</span>
                <span className="text-[#6B6B6B]">Compute earned reward for</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={testReferralsCount}
                  onChange={(e) => setTestReferralsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-16 px-2 py-1 text-xs text-center bg-white border border-[#E3E3E6] rounded-[8px] font-bold"
                />
                <span className="text-[#6B6B6B]">qualified referrals:</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-[#1627E8]">
                  {testReferralsCount} qualified referrals = {computedExampleMonths} month{computedExampleMonths === 1 ? '' : 's'}
                </span>
                {config.maxRewardsPerClientPerYear && computedExampleMonths >= config.maxRewardsPerClientPerYear && (
                  <span className="text-[10px] text-[#6B6B6B] block">
                    (capped at {config.maxRewardsPerClientPerYear} months/year)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Programme Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                Max Months Per Client Per Year
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={config.maxRewardsPerClientPerYear}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setConfig((prev) => ({ ...prev, maxRewardsPerClientPerYear: val }));
                }}
                className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none focus:border-[#D92D50]"
              />
              <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                Upper limit per calendar year to manage capacity
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                Friend Reward (Months Given to Friend)
              </label>
              <input
                type="number"
                min={0}
                max={12}
                step={0.5}
                required
                value={config.friendRewardMonths ?? 1}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setConfig((prev) => ({ ...prev, friendRewardMonths: val }));
                }}
                className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none focus:border-[#D92D50]"
              />
              <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                Default: 1 month (can be 0). Credited upon approved onboarding.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A0A0A] mb-1">
                Reward Wording (Client-Visible)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. free care months"
                value={config.rewardWording || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfig((prev) => ({ ...prev, rewardWording: val }));
                  runWordingCheck(val, config.shareMessageTemplate);
                }}
                className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none focus:border-[#D92D50]"
              />
              <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                Free-text description displayed in client portal tiles
              </span>
            </div>
          </div>

          {/* Share Message Template */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0A0A0A]">
                Share Message Template
              </label>
              <span className="text-[11px] text-[#D92D50] font-semibold">
                Required line: &ldquo;I may receive a credit if you join&rdquo;
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={config.shareMessageTemplate}
              onChange={(e) => {
                const val = e.target.value;
                setConfig((prev) => ({ ...prev, shareMessageTemplate: val }));
                runWordingCheck(config.rewardWording || '', val);
              }}
              className="w-full p-3 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none focus:border-[#D92D50] leading-relaxed resize-none"
            />
            <p className="text-[11px] text-[#6B6B6B]">
              Place <code className="bg-black/5 px-1 py-0.5 rounded font-mono">{'{{link}}'}</code> where the client&rsquo;s personal referral URL will be populated.
            </p>
          </div>

          {/* Guest Portal Settings: Referrer Name Toggle */}
          <div className="p-4 rounded-[16px] bg-[#F9F9FA] border border-[#E3E3E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-bold text-[#0A0A0A]">
                Show Referrer Name in Guest Portal
              </h5>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                When enabled, visitors to <code className="font-mono bg-black/5 px-1 py-0.5 rounded">/welcome?ref=CODE</code> see &ldquo;Invited by [Business Name]&rdquo;. When disabled (default), calm neutral wording is displayed.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  showReferrerNameInGuestPortal: !prev.showReferrerNameInGuestPortal,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                config.showReferrerNameInGuestPortal ? 'bg-[#0A0A0A]' : 'bg-[#C9C9CC]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.showReferrerNameInGuestPortal ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Guest Portal Feature Access Matrix */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                Guest Portal Feature Access Defaults
              </h4>
              <p className="text-[11px] text-[#6B6B6B]">
                Configure the default visibility across the 5 client portal tabs for temporary guest visitors at <code className="font-mono bg-black/5 px-1 py-0.5 rounded">/welcome?ref=CODE</code>.
              </p>
            </div>

            <div className="border border-[#E3E3E6] rounded-[16px] overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3F3F5] text-[#6B6B6B] font-semibold border-b border-[#E3E3E6] text-[11px]">
                  <tr>
                    <th className="p-3">Portal Tab</th>
                    <th className="p-3">Access Level</th>
                    <th className="p-3">Behavior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E3E6]">
                  {(
                    [
                      { key: 'home', label: '1. Overview / Home', desc: 'Shows the Whiteboard Explainer, 4 pillars, and Apply button' },
                      { key: 'progress', label: '2. Progress & Timeline', desc: 'Milestone tracking and project timeline' },
                      { key: 'actions', label: '3. Action Items', desc: 'Pending approvals and client intake tasks' },
                      { key: 'reports', label: '4. Performance Reports', desc: 'Monthly performance summaries' },
                      { key: 'files_support', label: '5. Files & Support', desc: 'Brand assets and support tickets' },
                    ] as const
                  ).map((feat) => {
                    const currentVal =
                      (config.guestPortalFeatureAccess as any)?.[feat.key] ??
                      (feat.key === 'home' ? 'open' : 'locked');

                    return (
                      <tr key={feat.key} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-3 font-semibold text-[#0A0A0A]">{feat.label}</td>
                        <td className="p-3">
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              const val = e.target.value as 'open' | 'locked' | 'hidden';
                              setConfig((prev) => ({
                                ...prev,
                                guestPortalFeatureAccess: {
                                  ...((prev.guestPortalFeatureAccess as any) || DEFAULT_GUEST_PORTAL_FEATURE_ACCESS),
                                  [feat.key]: val,
                                },
                              }));
                            }}
                            className="px-3 py-1.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] font-medium text-[#0A0A0A] focus:outline-none focus:border-[#D92D50]"
                          >
                            <option value="locked">Locked (visible with lock badge & tooltip)</option>
                            <option value="hidden">Hidden (tab not shown to guest)</option>
                            <option value="open">Open (fully accessible sample preview)</option>
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

          {/* Visual Explainer Editors (Default Client & Guest) */}
          <div className="space-y-4 pt-2 border-t border-[#E3E3E6]">
            <div>
              <h4 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                Default Whiteboard Explainers
              </h4>
              <p className="text-[11px] text-[#6B6B6B]">
                Customize the default hand-drawn whiteboard visual explainers for clients (modal) and prospective guests (<code className="font-mono bg-black/5 px-1 py-0.5 rounded">/welcome</code> route).
              </p>
            </div>

            <div className="flex items-center gap-2 border-b border-[#E3E3E6] pb-2">
              <button
                type="button"
                onClick={() => setExplainerSectionTab('client')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  explainerSectionTab === 'client'
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-[#F3F3F5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Default Client Explainer
              </button>
              <button
                type="button"
                onClick={() => setExplainerSectionTab('guest')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  explainerSectionTab === 'guest'
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-[#F3F3F5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Default Guest Explainer (/welcome)
              </button>
            </div>

            {explainerSectionTab === 'client' && (
              <ExplainerEditor
                title="Default Client Explainer"
                value={config.defaultClientExplainer || DEFAULT_CLIENT_EXPLAINER}
                onChange={(nextExp) =>
                  setConfig((prev) => ({
                    ...prev,
                    defaultClientExplainer: nextExp,
                  }))
                }
                onResetToDefault={() =>
                  setConfig((prev) => ({
                    ...prev,
                    defaultClientExplainer: { ...DEFAULT_CLIENT_EXPLAINER },
                  }))
                }
              />
            )}

            {explainerSectionTab === 'guest' && (
              <ExplainerEditor
                title="Default Guest Explainer (/welcome)"
                value={config.defaultGuestExplainer || DEFAULT_GUEST_EXPLAINER}
                onChange={(nextExp) =>
                  setConfig((prev) => ({
                    ...prev,
                    defaultGuestExplainer: nextExp,
                  }))
                }
                onResetToDefault={() =>
                  setConfig((prev) => ({
                    ...prev,
                    defaultGuestExplainer: { ...DEFAULT_GUEST_EXPLAINER },
                  }))
                }
              />
            )}
          </div>

          {/* Wording Guard Warning */}
          {wordingWarning.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-[14px] space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle size={15} className="text-amber-700" />
                <span>Wording Guard Notice: Promotional or Superlative Term Detected</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Flagged term(s): <strong className="text-amber-950">{wordingWarning.join(', ')}</strong>. Client-visible templates must use neutral wording without promotional promises or fabricated statistics.
              </p>
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wordingConfirmed}
                  onChange={(e) => setWordingConfirmed(e.target.checked)}
                  className="rounded text-[#D92D50] focus:ring-[#D92D50] mt-0.5"
                />
                <span className="text-[11px] font-semibold text-amber-950">
                  I confirm this copy is compliant, neutral across niches, and accurately describes service terms.
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {savingConfig ? 'Saving...' : 'Save Programme Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Referral Credits & Attribution Table */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E3E3E6]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0A0A0A] text-[12px] font-semibold text-[#0A0A0A] bg-transparent">
                Referral attribution
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Review client referrals and qualification status. Credits are recognized once the referred client makes their first paid fee.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-full bg-[#FFF4E5] text-[#B54708] font-bold border border-[#FEE4C2]">
              {pendingCount} Pending
            </span>
            <span className="px-3 py-1 rounded-full bg-[#E7F8EF] text-[#12B76A] font-bold border border-[#12B76A]/20 flex items-center gap-1">
              <Sparkles size={12} />
              <span>{eligibleCount} Eligible</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-[#F3F3F5] text-[#0A0A0A] font-bold border border-[#E3E3E6]">
              {appliedCount} Applied
            </span>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Eligible', 'Pending', 'Applied', 'Rejected'] as Array<'All' | ReferralCreditStatus>).map(
              (tab) => {
                const isActive = statusFilter === tab;
                const count =
                  tab === 'All'
                    ? credits.length
                    : tab === 'Eligible'
                    ? eligibleCount
                    : tab === 'Pending'
                    ? pendingCount
                    : tab === 'Applied'
                    ? appliedCount
                    : rejectedCount;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0A0A0A] text-white shadow-2xs'
                        : 'bg-[#F3F3F5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                    }`}
                  >
                    <span>{tab}</span>
                    <span className="ml-1.5 text-[10px] opacity-75">({count})</span>
                  </button>
                );
              }
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search business or ref code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-full focus:outline-none focus:border-[#D92D50]"
            />
          </div>
        </div>

        {/* Credits Table */}
        {filteredCredits.length === 0 ? (
          <div className="p-10 text-center rounded-[16px] bg-[#F3F3F5] border border-[#E3E3E6] space-y-2">
            <Gift size={28} className="mx-auto text-[#6B6B6B]" />
            <h4 className="text-xs font-bold text-[#0A0A0A]">No Referral Credits Recorded</h4>
            <p className="text-[11px] text-[#6B6B6B] max-w-sm mx-auto">
              {statusFilter === 'All'
                ? 'Referrals from clients will appear here when applications with referral codes are received.'
                : `No referral credits matching status "${statusFilter}".`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E3E3E6] rounded-[16px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3F3F5] text-[#6B6B6B] font-semibold border-b border-[#E3E3E6] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Referrer Client</th>
                  <th className="p-3.5">Referred Client / App</th>
                  <th className="p-3.5">Reward</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Flags & Notes</th>
                  <th className="p-3.5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3E6]">
                {filteredCredits.map((credit) => {
                  return (
                    <tr key={credit.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-[#0A0A0A]">
                          {credit.referrerClientBusinessName || credit.referrerClientId}
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] font-mono">
                          ID: {credit.referrerClientId}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-[#0A0A0A]">
                          {credit.referredClientBusinessName || 'New Client'}
                        </div>
                        <div className="text-[11px] text-[#6B6B6B]">
                          App: <span className="font-mono">{credit.applicationReferenceCode || credit.applicationId}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-[#0A0A0A]">{credit.reward}</span>
                        <span className="text-[10px] text-[#6B6B6B] block">
                          Recorded on payment
                        </span>
                      </td>

                      <td className="p-3.5">
                        {credit.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF4E5] text-[#B54708] border border-[#FEE4C2]">
                            <Clock size={11} />
                            <span>Pending (Awaiting First Payment)</span>
                          </span>
                        )}
                        {credit.status === 'Eligible' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E7F8EF] text-[#12B76A] border border-[#12B76A]/20">
                            <Sparkles size={11} />
                            <span>Eligible (Ready to Apply)</span>
                          </span>
                        )}
                        {credit.status === 'Applied' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F3F5] text-[#0A0A0A] border border-[#E3E3E6]">
                            <CheckCircle2 size={11} />
                            <span>Applied</span>
                          </span>
                        )}
                        {credit.status === 'Rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEECEB] text-[#F04438] border border-[#F04438]/20">
                            <X size={11} />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="space-y-1">
                          {credit.isSelfReferralSuspected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle size={10} />
                              <span>Suspected Self-Referral</span>
                            </span>
                          )}
                          {credit.isCapExceeded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
                              <AlertTriangle size={10} />
                              <span>Yearly Cap Exceeded</span>
                            </span>
                          )}
                          {credit.selfReferralReason && (
                            <p className="text-[10px] text-amber-800 line-clamp-2">
                              {credit.selfReferralReason}
                            </p>
                          )}
                          {credit.note && (
                            <p className="text-[11px] text-[#6B6B6B] italic">
                              &ldquo;{credit.note}&rdquo;
                            </p>
                          )}
                          {credit.decidedBy && (
                            <span className="text-[10px] text-[#6B6B6B] block">
                              Decided by {credit.decidedBy} on {credit.decidedAt?.split('T')[0]}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {credit.status === 'Eligible' && (
                            <button
                              type="button"
                              onClick={() => {
                                setApplyModalCredit(credit);
                                setApplyNote(`Referral credit applied to next payment cycle for ${credit.referrerClientBusinessName}`);
                              }}
                              className="px-3 py-1 rounded-full bg-[#0A0A0A] hover:bg-[#D92D50] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            >
                              Apply Reward
                            </button>
                          )}

                          {(credit.status === 'Pending' || credit.status === 'Eligible') && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalCredit(credit);
                                setRejectReason(credit.isSelfReferralSuspected ? 'Rejected due to suspected self-referral.' : '');
                              }}
                              className="px-2.5 py-1 rounded-full bg-[#F3F3F5] hover:bg-[#FEECEB] text-[#6B6B6B] hover:text-[#F04438] border border-[#E3E3E6] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          )}

                          {credit.status === 'Applied' && (
                            <span className="text-xs font-semibold text-[#12B76A] flex items-center gap-1">
                              <Check size={12} />
                              <span>Applied</span>
                            </span>
                          )}

                          {credit.status === 'Rejected' && (
                            <span className="text-xs font-semibold text-[#F04438]">
                              Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Apply Reward */}
      {applyModalCredit && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-[24px] p-6 shadow-2xl border border-[#E3E3E6] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">
                  Apply Referral Credit
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Reward: <strong className="text-[#0A0A0A]">{applyModalCredit.reward}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalCredit(null)}
                className="text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-[#F3F3F5] rounded-[14px] border border-[#E3E3E6] text-xs text-[#0A0A0A] space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Info size={14} className="text-[#1627E8]" />
                Single Source of Truth Rule:
              </span>
              <p className="text-[11px] leading-relaxed text-[#6B6B6B]">
                Payments remain the single source of truth for revenue. This credit is recorded as a note on the referrer&rsquo;s next payment record, never as recognized revenue and never as a negative payment.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0A0A0A]">
                Payment Note / Reference
              </label>
              <textarea
                rows={3}
                value={applyNote}
                onChange={(e) => setApplyNote(e.target.value)}
                placeholder="Note appended to the client's next scheduled payment record..."
                className="w-full p-2.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none focus:border-[#D92D50] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApplyModalCredit(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applying}
                onClick={handleConfirmApply}
                className="px-5 py-2 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Confirm & Apply to Next Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Reward */}
      {rejectModalCredit && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-[24px] p-6 shadow-2xl border border-[#E3E3E6] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">
                  Reject Referral Credit
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Referrer: {rejectModalCredit.referrerClientBusinessName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalCredit(null)}
                className="text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0A0A0A]">
                Reason for Rejection <span className="text-[#D92D50]">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Flagged self-referral, matching business name, or exceeded annual cap..."
                className="w-full p-2.5 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[12px] focus:outline-none focus:border-[#D92D50] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalCredit(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#F04438] text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Reject Credit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
