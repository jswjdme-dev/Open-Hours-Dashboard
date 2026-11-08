import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  Save,
  Check,
  Layers,
  RotateCcw,
  Copy,
  Edit2,
  Users,
} from 'lucide-react';
import {
  PortalExperienceConfig,
  PortalMilestoneConfig,
  PortalChecklistItemConfig,
  PortalPreset,
  PortalFeatureKey,
  PortalTabKey,
  Client,
} from '../../types/index.ts';
import {
  getPortalExperienceConfig,
  updatePortalExperienceConfig,
  generateWeeklySnapshotTasks,
  contentGuardCheck,
  getPortalPresets,
  savePortalPreset,
  renamePortalPreset,
  deletePortalPreset,
  getPortalFeaturesDefault,
  updatePortalFeaturesDefault,
  bulkApplyPresetToClients,
  getClients,
  copyPortalSettingsBetweenClients,
  resetClientPortalSettingsToDefault,
} from '../../data/repo.ts';

// Standard available delivery stage keys for mapping
const AVAILABLE_DELIVERY_STAGES = [
  { key: 'Kickoff', label: 'Kickoff & Intake' },
  { key: 'Branding', label: 'Branding & Assets' },
  { key: 'Concept', label: 'Website Concept' },
  { key: 'Design', label: 'Design Refinement' },
  { key: 'Review', label: 'Client Design Review' },
  { key: 'SEO', label: 'SEO & Structured Data' },
  { key: 'Security', label: 'Security & Domain Setup' },
  { key: 'Domain', label: 'Domain & DNS Connection' },
  { key: 'Launch', label: 'Launch & Verification' },
  { key: 'Completed', label: 'Live on Domain' },
];

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
      { key: 'thisMonthSnapshot', label: 'This month snapshot', description: 'Key performance metrics and GA4 highlights' },
      { key: 'nextMeeting', label: 'Next meeting', description: 'Scheduled calendar appointments and join links' },
      { key: 'bookMeeting', label: 'Book a meeting', description: 'Calendly booking button in portal Home and Files & Support tabs' },
      { key: 'recommendedForYou', label: 'Recommended for you', description: 'Tailored add-ons, audits and growth proposals' },
      { key: 'shareWithFriend', label: 'Share with a friend', description: 'Referral sharing cards and credit ledger' },
    ],
  },
  {
    tabKey: 'progress',
    tabLabel: 'PROGRESS',
    features: [
      { key: 'stageTimeline', label: 'Stage timeline', description: 'Full breakdown of delivery stages and checklist items' },
      { key: 'websitePreview', label: 'Website preview', description: 'Embedded demo sandbox and feedback commenting' },
      { key: 'expectedLaunchDate', label: 'Expected launch date', description: 'Estimated live launch milestone date banner' },
    ],
  },
  {
    tabKey: 'actions',
    tabLabel: 'ACTION ITEMS',
    features: [
      { key: 'requestsAndUploads', label: 'Requests & uploads', description: 'Client intake forms, file uploads, and questionnaire responses' },
    ],
  },
  {
    tabKey: 'reports',
    tabLabel: 'REPORTS',
    features: [
      { key: 'monthlyReports', label: 'Monthly reports', description: 'Published executive monthly reports and performance reviews' },
      { key: 'weeklySnapshot', label: 'Weekly snapshot', description: 'Weekly KPI updates (GA4, GBP, Core Web Vitals)' },
      { key: 'growthOverview', label: 'Growth overview', description: 'Multi-month trend chart of visitors, enquiries and calls' },
      { key: 'checkLiveButton', label: 'Check live button', description: 'External deep link to Google Analytics or Looker Studio' },
      { key: 'roiEstimator', label: 'Return estimator', description: 'Client return multiple estimation tile' },
    ],
  },
  {
    tabKey: 'files_support',
    tabLabel: 'FILES & SUPPORT',
    features: [
      { key: 'files', label: 'Files vault', description: 'Asset library, client logos and media downloads' },
      { key: 'meetings', label: 'Meetings archive', description: 'Upcoming appointments and past meeting notes' },
      { key: 'tickets', label: 'Tickets & change requests', description: 'Support tickets with in-scope / out-of-scope tracking' },
      { key: 'invoices', label: 'Invoices & statements', description: 'Billed invoices and payment status history' },
      { key: 'securityBasics', label: 'Security basics', description: 'SSL certificate, privacy policy and cookie banner status' },
      { key: 'reviewQrKit', label: 'Review QR kit', description: 'Downloadable Google Review QR code materials' },
      { key: 'contactLine', label: 'Account manager line', description: 'Direct contact card for the assigned account manager' },
    ],
  },
];

export const PortalExperienceManager: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'defaults_presets' | 'milestones_checklist'>('defaults_presets');
  const [config, setConfig] = useState<PortalExperienceConfig | null>(null);
  const [defaults, setDefaults] = useState<Record<PortalFeatureKey, boolean> | null>(null);
  const [presets, setPresets] = useState<PortalPreset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [taskGenResult, setTaskGenResult] = useState<string | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  // Content guard warning state for Welcome Offer
  const [welcomeOfferGuardWarning, setWelcomeOfferGuardWarning] = useState<string[]>([]);
  const [welcomeOfferGuardConfirmed, setWelcomeOfferGuardConfirmed] = useState(false);

  // Preset creation / rename modal
  const [newPresetModalOpen, setNewPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetFeatures, setNewPresetFeatures] = useState<Record<PortalFeatureKey, boolean>>({} as any);

  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  // Bulk Apply modal
  const [bulkApplyModalOpen, setBulkApplyModalOpen] = useState(false);
  const [selectedPresetForBulk, setSelectedPresetForBulk] = useState<string>('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Copy between clients modal
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceClientId, setCopySourceClientId] = useState('');
  const [copyTargetClientId, setCopyTargetClientId] = useState('');

  // Reset to default modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetClientId, setResetClientId] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [conf, defs, pres, clis] = await Promise.all([
        getPortalExperienceConfig(),
        getPortalFeaturesDefault(),
        getPortalPresets(),
        getClients(),
      ]);
      setConfig(conf);
      setDefaults(defs);
      setPresets(pres);
      setClients(clis);
      checkWelcomeOfferGuard(conf.welcomeOfferTitle, conf.welcomeOfferText);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const checkWelcomeOfferGuard = (title: string, text: string) => {
    const check = contentGuardCheck(title, text, []);
    if (check.hasWarning) {
      setWelcomeOfferGuardWarning(check.flaggedWords);
    } else {
      setWelcomeOfferGuardWarning([]);
    }
  };

  const handleToggleDefaultFeature = (key: PortalFeatureKey) => {
    if (!defaults) return;
    setDefaults({
      ...defaults,
      [key]: !defaults[key],
    });
  };

  const handleSaveDefaults = async () => {
    if (!defaults) return;
    setSaving(true);
    try {
      await updatePortalFeaturesDefault(defaults);
      showFeedback('Global portal feature defaults saved.');
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to save defaults.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenNewPresetModal = () => {
    setNewPresetName('');
    setNewPresetFeatures(defaults ? { ...defaults } : ({} as any));
    setNewPresetModalOpen(true);
  };

  const handleSaveNewPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await savePortalPreset({
        name: newPresetName.trim(),
        features: newPresetFeatures,
      });
      setPresets([...presets, created]);
      setNewPresetModalOpen(false);
      showFeedback(`Preset "${created.name}" created.`);
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to create preset.', 'error');
    }
  };

  const handleRenamePreset = async (presetId: string) => {
    if (!renamingName.trim()) return;
    try {
      const updated = await renamePortalPreset(presetId, renamingName.trim());
      setPresets(presets.map((p) => (p.id === presetId ? updated : p)));
      setRenamingPresetId(null);
      setRenamingName('');
      showFeedback(`Preset renamed to "${updated.name}".`);
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to rename preset.', 'error');
    }
  };

  const handleDeletePreset = async (presetId: string, name: string) => {
    if (!confirm(`Delete preset "${name}"?`)) return;
    try {
      await deletePortalPreset(presetId);
      setPresets(presets.filter((p) => p.id !== presetId));
      showFeedback(`Preset "${name}" deleted.`);
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to delete preset.', 'error');
    }
  };

  const handleOpenBulkApply = (presetId?: string) => {
    setSelectedPresetForBulk(presetId || (presets[0]?.id ?? ''));
    setSelectedClientIds(clients.map((c) => c.id));
    setBulkApplyModalOpen(true);
  };

  const handleExecuteBulkApply = async () => {
    if (!selectedPresetForBulk || selectedClientIds.length === 0) return;
    try {
      const res = await bulkApplyPresetToClients(selectedClientIds, selectedPresetForBulk);
      const pr = presets.find((p) => p.id === selectedPresetForBulk);
      setBulkApplyModalOpen(false);
      showFeedback(`Applied "${pr?.name || 'Preset'}" to ${res.updatedCount} clients.`);
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to apply preset.', 'error');
    }
  };

  const handleExecuteCopyBetweenClients = async () => {
    if (!copySourceClientId || !copyTargetClientId) return;
    if (copySourceClientId === copyTargetClientId) {
      showFeedback('Source and destination client cannot be the same.', 'error');
      return;
    }
    try {
      await copyPortalSettingsBetweenClients(copySourceClientId, copyTargetClientId);
      const target = clients.find((c) => c.id === copyTargetClientId);
      setCopyModalOpen(false);
      showFeedback(`Copied portal settings to ${target?.businessName || 'target client'}.`);
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to copy settings.', 'error');
    }
  };

  const handleExecuteResetClient = async () => {
    if (!resetClientId) return;
    try {
      await resetClientPortalSettingsToDefault(resetClientId);
      const target = clients.find((c) => c.id === resetClientId);
      setResetModalOpen(false);
      showFeedback(`Reset ${target?.businessName || 'client'} to global defaults.`);
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to reset client settings.', 'error');
    }
  };

  // Milestone checklist methods
  const handleWelcomeOfferTitleChange = (val: string) => {
    if (!config) return;
    const updated = { ...config, welcomeOfferTitle: val };
    setConfig(updated);
    checkWelcomeOfferGuard(val, updated.welcomeOfferText);
  };

  const handleWelcomeOfferTextChange = (val: string) => {
    if (!config) return;
    const updated = { ...config, welcomeOfferText: val };
    setConfig(updated);
    checkWelcomeOfferGuard(updated.welcomeOfferTitle, val);
  };

  const handleMoveChecklistItem = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const items = [...config.checklistItems];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    items.forEach((item, idx) => {
      item.order = idx + 1;
    });

    setConfig({ ...config, checklistItems: items });
  };

  const handleToggleChecklistItem = (id: string) => {
    if (!config) return;
    const updated = config.checklistItems.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setConfig({ ...config, checklistItems: updated });
  };

  const handleChecklistLabelChange = (id: string, label: string) => {
    if (!config) return;
    const updated = config.checklistItems.map((item) =>
      item.id === id ? { ...item, label } : item
    );
    setConfig({ ...config, checklistItems: updated });
  };

  const handleAddChecklistItem = () => {
    if (!config) return;
    const newItem: PortalChecklistItemConfig = {
      id: `chk_${Date.now()}`,
      label: 'New Onboarding Step',
      targetTab: 'home',
      order: config.checklistItems.length + 1,
      enabled: true,
      key: 'concept_ready',
    };
    setConfig({ ...config, checklistItems: [...config.checklistItems, newItem] });
  };

  const handleDeleteChecklistItem = (id: string) => {
    if (!config) return;
    const updated = config.checklistItems
      .filter((i) => i.id !== id)
      .map((i, idx) => ({ ...i, order: idx + 1 }));
    setConfig({ ...config, checklistItems: updated });
  };

  const handleSaveChecklistConfig = async () => {
    if (!config) return;

    if (config.bookingLink && !config.bookingLink.trim().startsWith('https://')) {
      showFeedback('Booking link must start with https://', 'error');
      return;
    }

    if (welcomeOfferGuardWarning.length > 0 && !welcomeOfferGuardConfirmed) {
      showFeedback('Please resolve or confirm content guard warnings.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updatePortalExperienceConfig(config);
      showFeedback('Portal configuration saved.');
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to save configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTasks = async () => {
    setGeneratingTasks(true);
    setTaskGenResult(null);
    try {
      const res = await generateWeeklySnapshotTasks();
      setTaskGenResult(`Generated ${res.createdCount} tasks.`);
    } catch (err: any) {
      setTaskGenResult(`Error: ${err?.message || 'Could not generate tasks'}`);
    } finally {
      setGeneratingTasks(false);
    }
  };

  if (loading || !defaults) {
    return (
      <div className="bg-white rounded-[24px] p-8 border border-black/5 text-center text-xs text-[#6B6B6B]">
        Loading portal settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-black/5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('defaults_presets')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'defaults_presets'
                ? 'bg-[#111111] text-white shadow-2xs'
                : 'bg-white border border-black/10 text-[#6B6B6B] hover:text-[#111111]'
            }`}
          >
            Feature Defaults & Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('milestones_checklist')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'milestones_checklist'
                ? 'bg-[#111111] text-white shadow-2xs'
                : 'bg-white border border-black/10 text-[#6B6B6B] hover:text-[#111111]'
            }`}
          >
            Checklist & Delivery Milestones
          </button>
        </div>

        {feedbackMsg && (
          <div
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: DEFAULTS MATRIX & PRESETS */}
      {/* ========================================================================= */}
      {activeSection === 'defaults_presets' && (
        <div className="space-y-6">
          {/* Presets Header Card */}
          <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full mb-2">
                  Portal Presets
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  Saved Feature Presets & Bulk Operations
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Package portal feature sets into reusable presets (Starter, Standard, Full), or apply across multiple clients at once.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenNewPresetModal}
                  className="px-3.5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create Preset</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenBulkApply()}
                  className="px-3.5 py-2 rounded-full bg-white border border-black/15 text-[#111111] text-xs font-bold hover:bg-black/5 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Users size={14} />
                  <span>Bulk Apply</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCopyModalOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-white border border-black/15 text-[#111111] text-xs font-bold hover:bg-black/5 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Copy size={14} />
                  <span>Copy from Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-white border border-black/15 text-[#111111] text-xs font-bold hover:bg-black/5 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Reset Client</span>
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {presets.map((preset) => {
                const enabledCount = Object.values(preset.features).filter(Boolean).length;
                const totalCount = Object.keys(preset.features).length;
                const isRenaming = renamingPresetId === preset.id;

                return (
                  <div
                    key={preset.id}
                    className="p-4 rounded-2xl border border-black/10 bg-[#FAFAFA] space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={renamingName}
                              onChange={(e) => setRenamingName(e.target.value)}
                              className="px-2 py-1 text-xs font-bold bg-white border border-black/20 rounded-lg w-full focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenamePreset(preset.id)}
                              className="p-1 rounded bg-black text-white hover:bg-gray-800"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[#111111]">{preset.name}</h4>
                              {preset.isDefault && (
                                <span className="px-2 py-0.2 bg-[#E9E9EC] text-[#111111] text-[10px] font-bold rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            {preset.description && (
                              <p className="text-[11px] text-[#6B6B6B] mt-0.5">{preset.description}</p>
                            )}
                          </div>
                        )}

                        {!isRenaming && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingPresetId(preset.id);
                                setRenamingName(preset.name);
                              }}
                              className="p-1 text-gray-500 hover:text-black rounded"
                              title="Rename preset"
                            >
                              <Edit2 size={13} />
                            </button>
                            {!preset.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeletePreset(preset.id, preset.name)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                title="Delete preset"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-[#6B6B6B]">
                        <span>Features Active</span>
                        <span className="font-bold text-[#111111]">
                          {enabledCount} of {totalCount}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleOpenBulkApply(preset.id)}
                        className="px-3 py-1.5 rounded-full bg-[#111111] text-white text-[11px] font-bold hover:bg-black transition-colors"
                      >
                        Bulk Apply...
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDefaults({ ...preset.features });
                          showFeedback(`Loaded "${preset.name}" into defaults editor.`);
                        }}
                        className="text-[11px] font-semibold text-[#111111] hover:underline cursor-pointer"
                      >
                        Load into Editor &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Global Defaults Feature Matrix */}
          <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5">
              <div>
                <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full mb-2">
                  Defaults Matrix
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  Global Portal Feature Defaults
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Configure default feature states for new clients and for clients using &ldquo;Use default&rdquo;.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveDefaults}
                disabled={saving}
                className="px-5 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Global Defaults'}</span>
              </button>
            </div>

            {/* Matrix Grouped by Tab */}
            <div className="space-y-6">
              {PORTAL_FEATURE_GROUPS.map((group) => {
                const groupActiveCount = group.features.filter((f) => defaults[f.key]).length;

                return (
                  <div
                    key={group.tabKey}
                    className="p-5 rounded-2xl border border-black/10 bg-[#FAFAFA] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                          Tab: {group.tabLabel}
                        </span>
                        <span className="text-[11px] text-[#A8A5A5]">
                          ({groupActiveCount} of {group.features.length} enabled)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...defaults };
                            group.features.forEach((f) => (updated[f.key] = true));
                            setDefaults(updated);
                          }}
                          className="text-[11px] font-semibold text-[#111111] hover:underline"
                        >
                          Enable All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...defaults };
                            group.features.forEach((f) => (updated[f.key] = false));
                            setDefaults(updated);
                          }}
                          className="text-[11px] font-semibold text-[#111111] hover:underline"
                        >
                          Disable All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.features.map((feature) => {
                        const isEnabled = defaults[feature.key] ?? true;

                        return (
                          <div
                            key={feature.key}
                            className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                              isEnabled
                                ? 'bg-white border-black/15 shadow-2xs'
                                : 'bg-[#F2F2F4] border-black/5 opacity-70'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-[#111111]">{feature.label}</div>
                              <p className="text-[11px] text-[#6B6B6B] leading-snug">
                                {feature.description}
                              </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleToggleDefaultFeature(feature.key)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#111111]" />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CHECKLIST & MILESTONES (EXISTING) */}
      {/* ========================================================================= */}
      {activeSection === 'milestones_checklist' && config && (
        <div className="space-y-6">
          {/* Booking link & scheduling settings */}
          <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
              <div>
                <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full mb-1">
                  Integrations
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  Booking & Scheduling Service
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Direct appointment scheduling link shown to clients in their portal Home and Files & Support tabs.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveChecklistConfig}
                disabled={saving}
                className="px-4 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Booking link (https:// only)
                </label>
                <input
                  type="url"
                  placeholder="https://calendly.com/jswjdme/30min"
                  value={config.bookingLink || ''}
                  onChange={(e) => setConfig({ ...config, bookingLink: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                />
                <span className="text-[11px] text-[#A8A5A5] block mt-1">
                  Third-party scheduling service.
                </span>
              </div>
            </div>
          </div>

          {/* Welcome Offer Banner Config */}
          <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
            <div>
              <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full mb-2">
                Onboarding Banner
              </span>
              <h3 className="text-base font-bold text-[#111111]">
                Client Welcome Moment & Onboarding Offer
              </h3>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Configured notice displayed at the top of the client portal until dismissed.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Offer Title</label>
                <input
                  type="text"
                  value={config.welcomeOfferTitle}
                  onChange={(e) => handleWelcomeOfferTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Offer Description</label>
                <textarea
                  rows={2}
                  value={config.welcomeOfferText}
                  onChange={(e) => handleWelcomeOfferTextChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50] resize-none"
                />
              </div>

              {welcomeOfferGuardWarning.length > 0 && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={15} className="text-amber-700" />
                    <span>Content Guard Flag: Unsafe wording detected</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Flagged phrases: <strong>{welcomeOfferGuardWarning.join(', ')}</strong>. Superlatives, guarantees, or invented numbers may violate advertising standards.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={welcomeOfferGuardConfirmed}
                      onChange={(e) => setWelcomeOfferGuardConfirmed(e.target.checked)}
                      className="rounded text-amber-700"
                    />
                    <span className="text-[11px] font-semibold text-amber-950">
                      I understand and confirm this copy meets regulatory standards.
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Onboarding Checklist Items */}
          <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full mb-2">
                  Intake Checklist
                </span>
                <h3 className="text-base font-bold text-[#111111]">
                  Default Onboarding Checklist Items
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Ordered steps presented to new clients upon portal activation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3.5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Step</span>
              </button>
            </div>

            <div className="divide-y divide-black/5">
              {config.checklistItems.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-[#111111] text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleChecklistLabelChange(item.id, e.target.value)}
                      className="px-3 py-1.5 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl flex-1 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveChecklistItem(idx, 'up')}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === config.checklistItems.length - 1}
                      onClick={() => handleMoveChecklistItem(idx, 'down')}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    {config.checklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer ml-1"
                        title="Delete step"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-black/5 flex justify-end">
              <button
                type="button"
                onClick={handleSaveChecklistConfig}
                disabled={saving}
                className="px-5 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Checklist Settings'}</span>
              </button>
            </div>
          </div>

          {/* Weekly Snapshot Trigger */}
          <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
            <div>
              <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full mb-2">
                Workflow Automation
              </span>
              <h3 className="text-base font-bold text-[#111111]">
                Weekly Snapshot Admin Task Workflow
              </h3>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Create an idempotent admin follow-up task per live client (&ldquo;Enter weekly snapshot for &lt;client&gt;&rdquo;).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#111111]">
                  Scheduled Weekday for Task Generation
                </label>
                <select
                  value={config.weeklySnapshotWeekday}
                  onChange={(e) =>
                    setConfig({ ...config, weeklySnapshotWeekday: parseInt(e.target.value, 10) })
                  }
                  className="px-3 py-1.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                </select>
                <span className="text-[10px] text-[#A8A5A5] block">
                  Automated trigger evaluates live clients every week on this day.
                </span>
              </div>

              <button
                type="button"
                onClick={handleGenerateTasks}
                disabled={generatingTasks}
                className="px-4 py-2 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Calendar size={13} />
                <span>{generatingTasks ? 'Generating...' : 'Run Task Generator Now'}</span>
              </button>
            </div>

            {taskGenResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{taskGenResult}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE PRESET */}
      {/* ========================================================================= */}
      {newPresetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#111111]">Create Portal Preset</h3>
            <form onSubmit={handleSaveNewPreset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Preset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP High-Touch, Minimalist"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-[#111111]">Feature Configuration</label>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {PORTAL_FEATURE_GROUPS.map((grp) => (
                    <div key={grp.tabKey} className="p-3 bg-gray-50 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-[#111111] uppercase tracking-wider">
                        {grp.tabLabel}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {grp.features.map((f) => (
                          <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newPresetFeatures[f.key] ?? false}
                              onChange={(e) =>
                                setNewPresetFeatures({
                                  ...newPresetFeatures,
                                  [f.key]: e.target.checked,
                                })
                              }
                              className="rounded text-black"
                            />
                            <span className="truncate">{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setNewPresetModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800"
                >
                  Create Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK APPLY PRESET WITH CONFIRM COUNT */}
      {/* ========================================================================= */}
      {bulkApplyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#111111]">Bulk Apply Preset</h3>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Select a preset to push across selected client accounts.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Preset to Apply</label>
                <select
                  value={selectedPresetForBulk}
                  onChange={(e) => setSelectedPresetForBulk(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({Object.values(p.features).filter(Boolean).length} features)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#111111]">
                    Select Target Clients ({selectedClientIds.length} of {clients.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedClientIds(clients.map((c) => c.id))}
                      className="text-[#111111] font-semibold hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedClientIds([])}
                      className="text-[#111111] font-semibold hover:underline"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-black/10 rounded-xl p-2 divide-y divide-black/5 bg-[#FAFAFA]">
                  {clients.map((c) => {
                    const isChecked = selectedClientIds.includes(c.id);
                    return (
                      <label key={c.id} className="py-1.5 px-2 flex items-center justify-between text-xs cursor-pointer hover:bg-white rounded">
                        <div>
                          <span className="font-semibold text-[#111111]">{c.businessName}</span>
                          <span className="text-[10px] text-[#A8A5A5] ml-2">{c.city}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClientIds([...selectedClientIds, c.id]);
                            } else {
                              setSelectedClientIds(selectedClientIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-black"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Confirm Count Callout */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                Are you sure you want to apply this preset to <strong>{selectedClientIds.length} clients</strong>? Existing custom overrides on these clients will be replaced by the preset values.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
              <button
                type="button"
                onClick={() => setBulkApplyModalOpen(false)}
                className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedClientIds.length === 0}
                onClick={handleExecuteBulkApply}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40"
              >
                Confirm & Apply to {selectedClientIds.length} Clients
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COPY BETWEEN CLIENTS */}
      {/* ========================================================================= */}
      {copyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <h3 className="text-base font-bold text-[#111111]">Copy Portal Settings from Client</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Source Client (Copy from)</label>
                <select
                  value={copySourceClientId}
                  onChange={(e) => setCopySourceClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none"
                >
                  <option value="">Select source client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Target Client (Copy to)</label>
                <select
                  value={copyTargetClientId}
                  onChange={(e) => setCopyTargetClientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none"
                >
                  <option value="">Select target client...</option>
                  {clients
                    .filter((c) => c.id !== copySourceClientId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.businessName}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!copySourceClientId || !copyTargetClientId}
                onClick={handleExecuteCopyBetweenClients}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40"
              >
                Copy Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET CLIENT TO DEFAULT */}
      {/* ========================================================================= */}
      {resetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <h3 className="text-base font-bold text-[#111111]">Reset Client to Global Defaults</h3>
            <p className="text-xs text-[#6B6B6B]">
              This removes all custom portal feature overrides for this client so they inherit the global defaults.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">Select Client</label>
              <select
                value={resetClientId}
                onChange={(e) => setResetClientId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!resetClientId}
                onClick={handleExecuteResetClient}
                className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-40"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
