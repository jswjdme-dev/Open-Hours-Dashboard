import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Info,
} from 'lucide-react';
import {
  Client,
  PortalFeatureKey,
  PortalTabKey,
  PortalPreset,
} from '../../types/index.ts';
import {
  getClients,
  getPortalPresets,
  getPortalFeaturesDefault,
  getClientEffectivePortalFeatures,
  updateClientPortalFeatureOverrides,
  applyPresetToClient,
  copyPortalSettingsBetweenClients,
  resetClientPortalSettingsToDefault,
  updateClientGoogleReviewLink,
  updateClientSecurityBasics,
  updateClientPortal,
  getClientPortal,
  updateClientPortalSettings,
} from '../../data/repo.ts';

interface ClientPortalFeatureMatrixTabProps {
  client: Client;
  currentRole?: string;
  showToast: (msg: string) => void;
  onClientUpdated: () => void;
}

interface FeatureItemDef {
  key: PortalFeatureKey;
  label: string;
  description: string;
}

const PORTAL_FEATURE_GROUPS: Array<{
  tabKey: PortalTabKey;
  tabLabel: string;
  features: FeatureItemDef[];
}> = [
  {
    tabKey: 'home',
    tabLabel: 'HOME',
    features: [
      { key: 'onboardingChecklist', label: 'Onboarding checklist', description: 'Interactive milestone progress with next action item' },
      { key: 'progressTracker', label: 'Progress tracker', description: '4-step high-level delivery tracker' },
      { key: 'needsAttention', label: 'Needs attention', description: 'Open urgent requests and client blocking items' },
      { key: 'thisMonthSnapshot', label: 'This month snapshot', description: '3 KPI numbers from the latest published monthly report' },
      { key: 'nextMeeting', label: 'Next meeting', description: 'Upcoming review call with join link' },
      { key: 'bookMeeting', label: 'Book a meeting', description: 'Calendly integration button in Home and Files & Support tabs' },
      { key: 'recommendedForYou', label: 'Recommended for you', description: 'Approved add-ons and package suggestions' },
      { key: 'shareWithFriend', label: 'Share with a friend', description: 'Client referral card with referral link and rewards' },
    ],
  },
  {
    tabKey: 'progress',
    tabLabel: 'PROGRESS',
    features: [
      { key: 'stageTimeline', label: 'Stage timeline', description: 'Detailed delivery stages and task checklists' },
      { key: 'websitePreview', label: 'Website preview', description: 'Interactive draft website demo with pin feedback' },
      { key: 'expectedLaunchDate', label: 'Expected launch date', description: 'Target go-live milestone date header' },
    ],
  },
  {
    tabKey: 'actions',
    tabLabel: 'ACTION ITEMS',
    features: [
      { key: 'requestsAndUploads', label: 'Requests and uploads', description: 'Two-way asset exchange, logo upload, and document requests' },
    ],
  },
  {
    tabKey: 'reports',
    tabLabel: 'REPORTS',
    features: [
      { key: 'monthlyReports', label: 'Monthly reports', description: 'Formal monthly performance reports with PDF exports' },
      { key: 'weeklySnapshot', label: 'Weekly snapshot', description: 'Search and visitor metrics updated on schedule' },
      { key: 'growthOverview', label: 'Growth overview', description: '6-month search and enquiry trend charts' },
      { key: 'checkLiveButton', label: 'Check live website button', description: 'External button linking to Google Analytics or Looker Studio' },
      { key: 'roiEstimator', label: 'ROI estimator', description: 'Interactive return on investment estimator on reports' },
    ],
  },
  {
    tabKey: 'files_support',
    tabLabel: 'FILES & SUPPORT',
    features: [
      { key: 'files', label: 'Files', description: 'Asset library across Brand, Photos, and Deliverables' },
      { key: 'meetings', label: 'Meetings', description: 'Historical and upcoming video consultation bookings' },
      { key: 'tickets', label: 'Tickets', description: 'Helpdesk requests and technical support change requests' },
      { key: 'invoices', label: 'Invoices', description: 'Past payments and invoice receipts' },
      { key: 'securityBasics', label: 'Security basics', description: 'SSL, privacy policy, and cookie banner checklist' },
      { key: 'reviewQrKit', label: 'Review QR kit', description: 'Google review printable QR counter stand sheet' },
      { key: 'contactLine', label: 'Contact line', description: 'Dedicated direct account manager email & phone' },
    ],
  },
];

export const ClientPortalFeatureMatrixTab: React.FC<ClientPortalFeatureMatrixTabProps> = ({
  client,
  currentRole = 'Admin',
  showToast,
  onClientUpdated,
}) => {
  const [defaults, setDefaults] = useState<Record<PortalFeatureKey, boolean> | null>(null);
  const [effective, setEffective] = useState<Record<PortalFeatureKey, boolean> | null>(null);
  const [presets, setPresets] = useState<PortalPreset[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedSourceClientId, setSelectedSourceClientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Team visibility toggle
  const [showTeamToClient, setShowTeamToClient] = useState<boolean>(client.showTeamToClient !== false);

  // Live URL & Google Review Link
  const [liveUrl, setLiveUrl] = useState(client.liveReportUrl || '');
  const [liveLabel, setLiveLabel] = useState(client.liveReportLabel || '');
  const [googleReviewLink, setGoogleReviewLink] = useState(client.googleReviewLink || '');

  const loadMatrixData = async () => {
    try {
      setLoading(true);
      const [defs, pres, clis, eff, port] = await Promise.all([
        getPortalFeaturesDefault(),
        getPortalPresets(),
        getClients(),
        getClientEffectivePortalFeatures(client),
        getClientPortal(client.id),
      ]);
      setDefaults(defs);
      setPresets(pres);
      setAllClients(clis.filter((c) => c.id !== client.id));
      setEffective(eff);
      if (port?.liveReportUrl && !client.liveReportUrl) {
        setLiveUrl(port.liveReportUrl);
      }
      if (port?.liveReportLabel && !client.liveReportLabel) {
        setLiveLabel(port.liveReportLabel);
      }
    } catch (err: any) {
      console.error('Failed to load portal feature matrix data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrixData();
  }, [client.id, client.portalPresetId, client.portalFeatureOverrides]);

  const handleToggleFeature = async (
    featureKey: PortalFeatureKey,
    nextMode: 'on' | 'off' | 'default'
  ) => {
    try {
      setSavingKey(featureKey);
      await updateClientPortalFeatureOverrides(
        client.id,
        { [featureKey]: nextMode },
        currentRole
      );
      showToast(`Updated "${featureKey}" to ${nextMode}`);
      onClientUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to update feature override.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    if (!presetId) return;
    try {
      setSavingKey('preset');
      await applyPresetToClient(client.id, presetId, currentRole);
      showToast('Applied portal preset');
      onClientUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to apply preset.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm(`Reset all portal feature overrides for ${client.businessName} to global defaults?`)) {
      return;
    }
    try {
      setSavingKey('reset');
      await resetClientPortalSettingsToDefault(client.id, currentRole);
      showToast('Reset portal settings to default');
      onClientUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to reset settings.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleCopyFromClient = async () => {
    if (!selectedSourceClientId) return;
    const srcClient = allClients.find((c) => c.id === selectedSourceClientId);
    if (!srcClient) return;

    if (
      !confirm(
        `Copy all portal feature settings and preset from "${srcClient.businessName}" to "${client.businessName}"?`
      )
    ) {
      return;
    }

    try {
      setSavingKey('copy');
      await copyPortalSettingsBetweenClients(srcClient.id, client.id, currentRole);
      showToast(`Copied settings from ${srcClient.businessName}`);
      setSelectedSourceClientId('');
      onClientUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to copy settings.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveLiveLink = async () => {
    if (liveUrl && !liveUrl.trim().startsWith('https://')) {
      alert('Live link URL must start with https://');
      return;
    }
    try {
      await updateClientPortal(client.id, {
        liveReportUrl: liveUrl.trim() || undefined,
        liveReportLabel: liveLabel.trim() || undefined,
      });
      showToast('Saved live external dashboard link.');
      onClientUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to save live link.');
    }
  };

  const handleSaveReviewLink = async () => {
    if (googleReviewLink && !googleReviewLink.trim().startsWith('https://')) {
      alert('Google review link must start with https://');
      return;
    }
    try {
      await updateClientGoogleReviewLink(client.id, googleReviewLink.trim(), currentRole);
      showToast('Saved Google review link.');
      onClientUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to save review link.');
    }
  };

  const handleToggleShowTeam = async () => {
    const nextVal = !showTeamToClient;
    setShowTeamToClient(nextVal);
    try {
      await updateClientPortalSettings(client.id, { showTeamToClient: nextVal });
      showToast(`Show team to client: ${nextVal ? 'Enabled' : 'Disabled'}`);
      onClientUpdated();
    } catch (err: any) {
      setShowTeamToClient(!nextVal);
      alert(err?.message || 'Failed to update team visibility setting.');
    }
  };

  if (loading || !defaults || !effective) {
    return (
      <div className="p-8 text-center text-xs text-[#6B6B6B] bg-white rounded-[20px] border border-[#E3E3E6]">
        Loading portal feature matrix...
      </div>
    );
  }

  const overrides = client.portalFeatureOverrides || {};
  const currentPreset = presets.find((p) => p.id === client.portalPresetId);

  return (
    <div className="space-y-6">
      {/* 1. Header & Preset Controls Card */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E3E6]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0A0A0A] text-[12px] font-semibold text-[#0A0A0A]">
                Portal feature matrix
              </span>
              {currentPreset && (
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#1627E8]/10 text-[#1627E8] border border-[#1627E8]/20">
                  Preset: {currentPreset.name}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Control which sections appear in {client.businessName}&rsquo;s portal across the 5 primary tabs. Features disabled here are completely omitted from the portal view model payload.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={Boolean(savingKey)}
              className="px-3.5 py-1.5 rounded-full border border-[#E3E3E6] hover:bg-[#F3F3F5] text-xs font-semibold text-[#0A0A0A] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset to default</span>
            </button>
          </div>
        </div>

        {/* Presets & Copy Tools Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Apply Preset */}
          <div className="p-4 rounded-[14px] bg-[#F3F3F5] border border-[#E3E3E6] space-y-2">
            <label className="block text-xs font-bold text-[#0A0A0A]">
              Apply Saved Preset
            </label>
            <div className="flex items-center gap-2">
              <select
                value={client.portalPresetId || ''}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-[#E3E3E6] rounded-[10px] focus:outline-none"
              >
                <option value="">Choose preset (Starter, Standard, Full)...</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.description ? `(${p.description})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[10px] text-[#6B6B6B] block">
              Applying a preset overwrites individual custom overrides with preset baseline.
            </span>
          </div>

          {/* Copy from Client */}
          <div className="p-4 rounded-[14px] bg-[#F3F3F5] border border-[#E3E3E6] space-y-2">
            <label className="block text-xs font-bold text-[#0A0A0A]">
              Copy from Another Client
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedSourceClientId}
                onChange={(e) => setSelectedSourceClientId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-[#E3E3E6] rounded-[10px] focus:outline-none"
              >
                <option value="">Select source client...</option>
                {allClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName} ({c.package})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedSourceClientId || Boolean(savingKey)}
                onClick={handleCopyFromClient}
                className="px-3.5 py-2 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-[10px] transition-colors cursor-pointer disabled:opacity-40 inline-flex items-center gap-1"
              >
                <Copy size={13} />
                <span>Copy</span>
              </button>
            </div>
            <span className="text-[10px] text-[#6B6B6B] block">
              Replicates preset selection and custom overrides from selected client.
            </span>
          </div>
        </div>

        {/* Team Visibility Control */}
        <div className="pt-3 border-t border-[#E3E3E6] flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#0A0A0A] block">
              Show team to client
            </span>
            <span className="text-[11px] text-[#6B6B6B] block">
              Display assigned team members (first name & role label) on the Progress tab.
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleShowTeam}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showTeamToClient ? 'bg-[#12B76A]' : 'bg-[#C9C9CC]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                showTeamToClient ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Feature Matrix Grouped by 5 Tabs */}
      <div className="space-y-4">
        {PORTAL_FEATURE_GROUPS.map((grp) => {
          // Count active features in this tab
          const activeInGroup = grp.features.filter((f) => effective[f.key]).length;
          const totalInGroup = grp.features.length;
          const isTabCompletelyHidden = grp.tabKey !== 'home' && activeInGroup === 0;

          return (
            <div
              key={grp.tabKey}
              className={`bg-white rounded-[20px] p-6 border transition-all ${
                isTabCompletelyHidden
                  ? 'border-[#F04438]/30 bg-[#FFFDFD]'
                  : 'border-[#E3E3E6]'
              } shadow-xs space-y-4`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3E3E6]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                      {grp.tabLabel} Tab Features
                    </span>
                    {isTabCompletelyHidden && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#FEECEB] text-[#F04438] border border-[#F04438]/20">
                        Tab Hidden (All features off)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                    {activeInGroup} of {totalInGroup} features enabled in this tab.
                    {grp.tabKey === 'home' && ' (Home tab always remains visible in portal navigation).'}
                  </p>
                </div>
              </div>

              {/* Features List */}
              <div className="divide-y divide-[#E3E3E6]">
                {grp.features.map((item) => {
                  const currentSetting: 'on' | 'off' | 'default' =
                    overrides[item.key] || 'default';
                  const effectiveVal = effective[item.key];
                  const defaultVal = defaults[item.key];

                  return (
                    <div
                      key={item.key}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0A0A0A]">
                            {item.label}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              effectiveVal ? 'bg-[#12B76A]' : 'bg-[#C9C9CC]'
                            }`}
                            title={effectiveVal ? 'Visible in client portal' : 'Hidden in client portal'}
                          />
                        </div>
                        <p className="text-[11px] text-[#6B6B6B]">
                          {item.description}
                        </p>
                      </div>

                      {/* On / Off / Use default 3-state selector */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-[#F3F3F5] p-1 rounded-full border border-[#E3E3E6]">
                        <button
                          type="button"
                          onClick={() => handleToggleFeature(item.key, 'default')}
                          className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                            currentSetting === 'default'
                              ? 'bg-white text-[#0A0A0A] shadow-2xs'
                              : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                          }`}
                        >
                          Default ({defaultVal ? 'On' : 'Off'})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFeature(item.key, 'on')}
                          className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                            currentSetting === 'on'
                              ? 'bg-[#0A0A0A] text-white shadow-2xs'
                              : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                          }`}
                        >
                          On
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFeature(item.key, 'off')}
                          className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                            currentSetting === 'off'
                              ? 'bg-[#F04438] text-white shadow-2xs'
                              : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                          }`}
                        >
                          Off
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. External Links & QR Kit Setup */}
      <div className="bg-white rounded-[20px] p-6 border border-[#E3E3E6] shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider pb-3 border-b border-[#E3E3E6]">
          Portal Links & Integrations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Live external dashboard */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#0A0A0A]">
              &ldquo;Check Live&rdquo; External Analytics URL (https://)
            </label>
            <input
              type="url"
              placeholder="https://lookerstudio.google.com/..."
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none"
            />
            <input
              type="text"
              placeholder="Button Label (e.g. Google Analytics)"
              value={liveLabel}
              onChange={(e) => setLiveLabel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveLiveLink}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer"
            >
              Save Live Link
            </button>
          </div>

          {/* Google Review link for Review QR kit */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#0A0A0A]">
              Google Review Direct Review URL (https://)
            </label>
            <input
              type="url"
              placeholder="https://g.page/r/..."
              value={googleReviewLink}
              onChange={(e) => setGoogleReviewLink(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F3F3F5] border border-[#E3E3E6] rounded-[10px] focus:outline-none"
            />
            <span className="text-[10px] text-[#6B6B6B] block">
              Used to generate the printable Google Review QR Kit in the client&rsquo;s Files & Support tab.
            </span>
            <button
              type="button"
              onClick={handleSaveReviewLink}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#0A0A0A] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer"
            >
              Save Review URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
