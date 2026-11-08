import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  ShieldAlert,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Plus,
  Download,
  Upload,
  Database,
  FileCheck,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Layout,
} from 'lucide-react';
import {
  SequenceVersion,
  SequenceStep,
  Role,
  ApplicationPageSettings,
} from '../types/index.ts';
import { normalizeRole } from '../config/navigation.ts';
import {
  getSequenceVersions,
  saveSequenceVersion,
  getDailySendLimit,
  updateDailySendLimit,
  exportAllDataJson,
  importDataJson,
  getApplicationSettings,
  updateApplicationSettings,
} from '../data/repo.ts';
import { SuppressionListPage } from './SuppressionListPage.tsx';
import { SuggestionTemplatesManager } from '../components/settings/SuggestionTemplatesManager.tsx';
import { WebsiteTemplatesManager } from '../components/settings/WebsiteTemplatesManager.tsx';
import { WebsiteStudioSettingsManager } from '../components/settings/WebsiteStudioSettingsManager.tsx';
import { PortalExperienceManager } from '../components/settings/PortalExperienceManager.tsx';
import { ReferralProgrammeManager } from '../components/settings/ReferralProgrammeManager.tsx';
import { PackagesSettingsManager } from '../components/settings/PackagesSettingsManager.tsx';
import { LeadFieldsManager } from '../components/settings/LeadFieldsManager.tsx';
import { runUnitTests } from '../lib/logic.test.ts';
import { runSequenceAndTaskTests } from '../lib/sequenceTests.ts';

interface SettingsPageProps {
  initialSubTab?: 'suppression' | 'sequence' | 'retention' | 'tests' | 'backup' | 'suggestions' | 'application' | 'templates' | 'portal' | 'referral' | 'packages' | 'lead-fields';
  currentRole: Role;
  onRoleChange: (role: Role) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  initialSubTab = 'sequence',
  currentRole,
  onRoleChange,
}) => {
  const [subTab, setSubTab] = useState<'suppression' | 'sequence' | 'retention' | 'tests' | 'backup' | 'suggestions' | 'application' | 'templates' | 'portal' | 'referral' | 'packages' | 'lead-fields'>(
    initialSubTab
  );

  // Sequence state
  const [sequenceVersions, setSequenceVersions] = useState<SequenceVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<SequenceVersion | null>(null);
  const [editableSteps, setEditableSteps] = useState<SequenceStep[]>([]);
  const [newVersionName, setNewVersionName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Daily limit & retention state
  const [dailyLimit, setDailyLimit] = useState(30);
  const [autoArchiveLost, setAutoArchiveLost] = useState(true);
  const [limitSavedMsg, setLimitSavedMsg] = useState('');

  // Backup & Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    counts: Record<string, number>;
    rawJson: string;
  } | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Application page settings state
  const [appSettings, setAppSettings] = useState<ApplicationPageSettings>({
    formEnabled: true,
    introText: '',
    privacyUrl: '/privacy',
    confirmationText: 'Thank you. Open Hours will verify your details and contact you soon.',
  });
  const [savingAppSettings, setSavingAppSettings] = useState(false);
  const [appSettingsSavedMsg, setAppSettingsSavedMsg] = useState('');
  const [copiedApplyPath, setCopiedApplyPath] = useState(false);

  // Unit tests state (Only rendered in DEV)
  const isDevMode = Boolean(import.meta.env.DEV);
  const [testResults, setTestResults] = useState<Array<{ test: string; passed: boolean; message?: string }>>([]);

  const loadData = async () => {
    const [seqs, limit, appSet] = await Promise.all([
      getSequenceVersions(),
      getDailySendLimit(),
      getApplicationSettings(),
    ]);
    setSequenceVersions(seqs);
    const active = seqs.find((s) => s.isActive) || seqs[0];
    if (active) {
      setActiveVersion(active);
      setEditableSteps([...active.steps]);
    }
    setDailyLimit(limit);
    setAppSettings(appSet);
  };

  useEffect(() => {
    loadData();
    if (isDevMode) {
      const basic = runUnitTests();
      runSequenceAndTaskTests().then((seqRes) => {
        setTestResults([
          ...basic,
          ...seqRes.map((r) => ({ test: r.name, passed: r.passed, message: r.details })),
        ]);
      });
    }
  }, []);

  const handleStepDelayChange = (index: number, newHours: number) => {
    const updated = [...editableSteps];
    updated[index] = { ...updated[index], delayHours: newHours };
    setEditableSteps(updated);
  };

  const handleSaveNewSequenceVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    const ver = await saveSequenceVersion(newVersionName, editableSteps);
    setSaveSuccessMsg(`Saved as Sequence ${ver.name} (v${ver.versionNumber})!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
    loadData();
  };

  const handleSaveDailyLimit = async () => {
    await updateDailySendLimit(dailyLimit);
    setLimitSavedMsg('Daily limit updated successfully.');
    setTimeout(() => setLimitSavedMsg(''), 2500);
  };

  // Export JSON handler
  const handleExportJson = () => {
    const jsonStr = exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-hours-console-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON stage 1: File selection & count preview
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          setImportStatus({ type: 'error', message: 'The selected file is not a valid JSON object.' });
          return;
        }

        const counts: Record<string, number> = {
          leads: Array.isArray(parsed.leads) ? parsed.leads.length : 0,
          clients: Array.isArray(parsed.clients) ? parsed.clients.length : 0,
          projects: Array.isArray(parsed.projects) ? parsed.projects.length : 0,
          requests: Array.isArray(parsed.requests) ? parsed.requests.length : 0,
          files: Array.isArray(parsed.files) ? parsed.files.length : 0,
          meetings: Array.isArray(parsed.meetings) ? parsed.meetings.length : 0,
          tickets: Array.isArray(parsed.tickets) ? parsed.tickets.length : 0,
          payments: Array.isArray(parsed.payments) ? parsed.payments.length : 0,
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices.length : 0,
          partners: Array.isArray(parsed.partners) ? parsed.partners.length : 0,
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks.length : 0,
        };

        setImportPreview({ counts, rawJson: text });
        setImportStatus(null);
      } catch (err: any) {
        setImportStatus({ type: 'error', message: 'Failed to read file: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  // Import JSON stage 2: Confirm merge
  const handleConfirmImport = () => {
    if (!importPreview) return;
    const res = importDataJson(importPreview.rawJson);
    if (res.success) {
      setImportStatus({
        type: 'success',
        message: 'Data successfully merged into storage! Record counts updated without overwriting existing data.',
      });
      setImportPreview(null);
      loadData();
    } else {
      setImportStatus({
        type: 'error',
        message: res.error || 'Failed to merge imported data.',
      });
    }
  };

  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAppSettings(true);
    try {
      const updated = await updateApplicationSettings(appSettings, currentRole);
      setAppSettings(updated);
      setAppSettingsSavedMsg('Application page settings saved successfully.');
      setTimeout(() => setAppSettingsSavedMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAppSettings(false);
    }
  };

  // If user role is Developer or Ads Manager, notify in UI
  const isRestrictedRole = normalizeRole(currentRole) === 'Developer' || normalizeRole(currentRole) === 'Ads Manager';

  const tabsList = [
    { id: 'sequence', label: 'Follow-up sequence' },
    { id: 'lead-fields', label: 'Lead fields' },
    { id: 'suppression', label: 'Suppression list' },
    { id: 'suggestions', label: 'Suggestion templates' },
    { id: 'templates', label: 'Website Studio' },
    { id: 'portal', label: 'Portal experience' },
    { id: 'packages', label: 'Packages' },
    { id: 'referral', label: 'Referral defaults' },
    { id: 'application', label: 'Application page' },
    { id: 'retention', label: 'Throttle & Retention' },
    { id: 'backup', label: 'Backup & Storage' },
    ...(isDevMode ? [{ id: 'tests', label: 'Unit Tests & Validation' }] : []),
  ];

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
            Settings
          </h1>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
            Admin Governance
          </span>
        </div>

        {/* Active Role Indicator */}
        <div className="flex items-center gap-2 text-xs bg-white rounded-full px-3 py-1.5 border border-black/5 shadow-2xs">
          <span className="text-[#A8A5A5] font-semibold">Active Role:</span>
          <span className="font-bold text-[#111111]">{currentRole}</span>
        </div>
      </div>

      {isRestrictedRole && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>
            <strong>Role Policy Applied:</strong> As {currentRole}, partnership financial figures and administrative sequence definitions are restricted. Switch to &ldquo;Admin&rdquo; above to manage these settings.
          </span>
        </div>
      )}

      {/* Sub Tabs Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2 border border-black/5 flex flex-wrap items-center gap-2">
        {tabsList.map((tab) => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: SEQUENCE */}
      {subTab === 'sequence' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#111111]">
                  Automated Task Sequence Rules
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  When a prospect lead moves to &ldquo;Contacted&rdquo;, tasks are scheduled using these delays. Delays can be edited, and saving creates an immutable new version so existing active tasks preserve their original timetable.
                </p>
              </div>

              {activeVersion && (
                <span className="px-3 py-1 bg-[#FCE9ED] text-[#D92D50] text-xs font-bold rounded-full">
                  Active: v{activeVersion.versionNumber}
                </span>
              )}
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Editable Steps */}
            <form onSubmit={handleSaveNewSequenceVersion} className="space-y-3 pt-2">
              <div className="divide-y divide-black/5">
                {editableSteps.map((step, idx) => (
                  <div key={step.stepNumber} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center">
                        {step.stepNumber}
                      </span>
                      <div>
                        <div className="font-bold text-[#111111]">{step.title}</div>
                        <div className="text-[11px] text-[#A8A5A5]">
                          Channel: {step.channel} · Template link
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#6B6B6B]">Delay:</span>
                      <input
                        type="number"
                        min="0"
                        max="720"
                        value={step.delayHours}
                        onChange={(e) => handleStepDelayChange(idx, parseInt(e.target.value) || 0)}
                        className="w-20 p-1.5 text-xs text-center font-bold border border-black/10 rounded-lg bg-[#F1EFEF]"
                      />
                      <span className="text-[#6B6B6B]">hours ({Math.round(step.delayHours / 24)}d)</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="New version name (e.g. Q4 Accelerated 24h Sequence)"
                    className="text-xs p-2 rounded-xl border border-black/10 w-72"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRestrictedRole}
                  className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save as New Sequence Version
                </button>
              </div>
            </form>
          </div>

          {/* Historical Sequence Versions */}
          <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
              Immutable Version Archive
            </h4>
            <div className="divide-y divide-black/5 text-xs">
              {sequenceVersions.map((ver) => (
                <div key={ver.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#111111]">
                      {ver.name} (v{ver.versionNumber})
                    </div>
                    <div className="text-[11px] text-[#A8A5A5]">
                      Created on {ver.createdAt} · {ver.steps.length} sequence steps
                    </div>
                  </div>
                  {ver.isActive ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#A8A5A5]">Archived Version</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: LEAD CUSTOM FIELDS */}
      {subTab === 'lead-fields' && <LeadFieldsManager />}

      {/* SUBTAB 2: SUPPRESSION LIST */}
      {subTab === 'suppression' && <SuppressionListPage />}

      {/* SUBTAB 3: SUGGESTION TEMPLATES */}
      {subTab === 'suggestions' && <SuggestionTemplatesManager />}

      {/* SUBTAB: WEBSITE STUDIO CONFIGURATION */}
      {subTab === 'templates' && <WebsiteStudioSettingsManager />}

      {/* SUBTAB: PORTAL EXPERIENCE */}
      {subTab === 'portal' && <PortalExperienceManager />}

      {/* SUBTAB: PACKAGES */}
      {subTab === 'packages' && (
        <PackagesSettingsManager currentRole={currentRole} />
      )}

      {/* SUBTAB: REFERRAL PROGRAMME */}
      {subTab === 'referral' && (
        <ReferralProgrammeManager currentRole={currentRole} />
      )}

      {/* SUBTAB: APPLICATION PAGE */}
      {subTab === 'application' && (
        <div className="space-y-6">
          {/* Card 1: Public Intake Link */}
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-black/5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-[#111111] flex items-center gap-2">
                <FileText size={16} className="text-[#D92D50]" />
                <span>Public Application Route</span>
              </h3>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                The public intake URL for prospective private businesses to submit single-page website applications.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#344054]">
                Apply Link (Route Path)
              </label>
              <div className="flex items-center gap-2 max-w-lg">
                <input
                  type="text"
                  readOnly
                  value="/apply"
                  className="flex-1 px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-black/10 bg-[#F8F9FB] text-[#101828] select-all cursor-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('/apply').then(() => {
                      setCopiedApplyPath(true);
                      setTimeout(() => setCopiedApplyPath(false), 2500);
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#111111] hover:bg-black text-white cursor-pointer transition-colors"
                >
                  {copiedApplyPath ? <Check size={14} className="text-[#12B76A]" /> : <Copy size={14} />}
                  <span>{copiedApplyPath ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href="/apply"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-black/10 hover:bg-[#F2F4F7] text-[#344054] cursor-pointer transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Preview</span>
                </a>
              </div>
              <div className="p-3 bg-[#FFF4E5] border border-[#FEE4C2] rounded-xl text-xs text-[#B54708] flex items-start gap-2 max-w-lg">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>Do not place this link on your public website until Supabase intake is connected.</span>
              </div>
            </div>
          </div>

          {/* Card 2: Form Configuration */}
          <form onSubmit={handleSaveAppSettings} className="bg-white rounded-[24px] p-5 sm:p-6 border border-black/5 shadow-xs space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-[#111111]">
                  Application Page Content & Controls
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Manage the public clinic application form status, instructions, privacy notice destination, and thank-you messaging.
                </p>
              </div>

              {appSettingsSavedMsg && (
                <div className="p-2.5 px-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={15} />
                  <span>{appSettingsSavedMsg}</span>
                </div>
              )}
            </div>

            {/* Toggle form enable/disable */}
            <div className="p-4 rounded-2xl bg-[#F8F9FB] border border-black/5 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-xs text-[#111111]">
                  Enable Public Application Intake
                </div>
                <div className="text-[11.5px] text-[#6B6B6B] mt-0.5">
                  When disabled, visitors navigating to <code>/apply</code> will see &ldquo;Applications are closed&rdquo; and submissions are blocked.
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appSettings.formEnabled}
                  onChange={(e) =>
                    setAppSettings((prev) => ({ ...prev, formEnabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#D0D5DD] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D92D50]"></div>
              </label>
            </div>

            {/* Intro text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#344054]">
                Page Intro Text
              </label>
              <textarea
                rows={3}
                value={appSettings.introText}
                onChange={(e) =>
                  setAppSettings((prev) => ({ ...prev, introText: e.target.value }))
                }
                placeholder="Apply to work with Open Hours. We design, build, and support high-performing websites..."
                className="w-full p-3 rounded-xl border border-black/10 bg-white text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none"
              />
              <span className="text-[11px] text-[#8C8F97]">
                Displayed below the title header on the public <code>/apply</code> page.
              </span>
            </div>

            {/* Privacy notice URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#344054]">
                Privacy Notice URL
              </label>
              <input
                type="text"
                value={appSettings.privacyUrl}
                onChange={(e) =>
                  setAppSettings((prev) => ({ ...prev, privacyUrl: e.target.value }))
                }
                placeholder="/privacy or https://example.com/privacy"
                className="w-full p-2.5 rounded-xl border border-black/10 bg-white text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
              <span className="text-[11px] text-[#8C8F97]">
                Linked in the applicant consent checkbox disclosure.
              </span>
            </div>

            {/* Confirmation text */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#344054]">
                Post-Submission Confirmation Text
              </label>
              <textarea
                rows={3}
                value={appSettings.confirmationText}
                onChange={(e) =>
                  setAppSettings((prev) => ({ ...prev, confirmationText: e.target.value }))
                }
                placeholder="Thank you. Open Hours will verify your details and contact you soon."
                className="w-full p-3 rounded-xl border border-black/10 bg-white text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none"
              />
              <span className="text-[11px] text-[#8C8F97]">
                Shown on the confirmation screen immediately after submission.
              </span>
            </div>

            {/* Website URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#344054]">
                Website URL
              </label>
              <input
                type="url"
                value={appSettings.websiteUrl || ''}
                onChange={(e) =>
                  setAppSettings((prev) => ({ ...prev, websiteUrl: e.target.value }))
                }
                placeholder="https://openhours.example.com"
                className="w-full p-2.5 rounded-xl border border-black/10 bg-white text-xs text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
              <span className="text-[11px] text-[#8C8F97]">
                Official Open Hours website URL (https only). Displayed on expired preview pages.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-black/5 flex items-center justify-between">
              <span className="text-[11px] text-[#6B6B6B]">
                Changes take effect immediately across all application routes.
              </span>
              <button
                type="submit"
                disabled={savingAppSettings || isRestrictedRole}
                className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingAppSettings ? 'Saving...' : 'Save Application Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 4: RETENTION & DAILY THROTTLE */}
      {subTab === 'retention' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-[#111111]">
                Daily Cold Outreach Throttle
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Protects clinic email domains from deliverability penalties and ISP flags by capping outgoing messages per day.
              </p>
            </div>

            {limitSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{limitSavedMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-[#111111]">
                Max Emails / Day:
              </label>
              <input
                type="number"
                min="5"
                max="150"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 30)}
                className="w-24 p-2 text-xs font-bold border border-black/10 rounded-xl bg-[#F1EFEF] text-center"
              />
              <button
                type="button"
                onClick={handleSaveDailyLimit}
                className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-xl"
              >
                Update Throttle
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-[#111111]">
                Data Retention & Auto-Archival
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Under Irish and Maltese data protection standards, non-responsive B2B prospects must not be kept indefinitely in active views.
              </p>
            </div>

            <label className="flex items-center gap-3 text-xs text-[#111111] cursor-pointer">
              <input
                type="checkbox"
                checked={autoArchiveLost}
                onChange={() => setAutoArchiveLost(!autoArchiveLost)}
                className="w-4 h-4 rounded accent-[#D92D50]"
              />
              <span className="font-semibold">
                Auto-archive Lost leads after 12 months (UI Policy)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* SUBTAB 4: BACKUP & STORAGE */}
      {subTab === 'backup' && (
        <div className="space-y-6">
          {/* Stopgap Alert Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-5 flex items-start gap-3.5 shadow-2xs">
            <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-amber-900">
                Browser Storage Stopgap Policy
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Browser storage is a temporary stopgap. It is not a backup and not secure. Export regularly until the database arrives.
              </p>
              <p className="text-[11px] text-amber-700">
                Data is saved in this browser&apos;s localStorage under schema version 3. Clearing browser cookies or cache will reset unexported data.
              </p>
            </div>
          </div>

          {importStatus && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-[#FCE9ED] border border-[#D92D50]/20 text-[#D92D50]'
              }`}
            >
              {importStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Export & Import Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Export Card */}
            <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center mb-2">
                  <Download size={20} />
                </div>
                <h3 className="font-bold text-base text-[#111111]">Export All Data (JSON)</h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Generates an uncompressed snapshot of all leads, clients, delivery stages, requests, files, meetings, tickets, payments, and outreach logs.
                </p>
              </div>

              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-[11px] text-[#A8A5A5]">JSON format · Includes audit records</span>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102"
                >
                  <Download size={14} />
                  <span>Download Backup</span>
                </button>
              </div>
            </div>

            {/* Import Card */}
            <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Upload size={20} />
                </div>
                <h3 className="font-bold text-base text-[#111111]">Import Data (JSON)</h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Safely restores or merges records from an exported backup file. Existing records with matching IDs are safely updated and new IDs are appended.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />

              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-[11px] text-[#A8A5A5]">Safe merge · Non-destructive</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full bg-white border border-black/15 hover:border-black/30 text-[#111111] text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102"
                >
                  <Upload size={14} />
                  <span>Choose JSON File</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import Preview Modal / Confirmation Panel */}
          {importPreview && (
            <div className="bg-white rounded-[24px] p-6 border-2 border-[#D92D50]/20 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="text-[#D92D50]" size={18} />
                    <h4 className="font-bold text-sm text-[#111111]">
                      Backup Verification & Merge Preview
                    </h4>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-1">
                    The following record collections were detected in the JSON file. Confirm to merge these into browser storage.
                  </p>
                </div>

                <span className="px-2.5 py-1 bg-[#FCE9ED] text-[#D92D50] text-xs font-bold rounded-full">
                  Ready to Merge
                </span>
              </div>

              {/* Record Count Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {Object.entries(importPreview.counts).map(([k, v]) => (
                  <div key={k} className="p-2.5 rounded-xl bg-[#F8F7F7] border border-black/5 flex items-center justify-between text-xs">
                    <span className="capitalize text-[#6B6B6B] font-medium">{k}</span>
                    <span className="font-bold text-[#111111] tabular-nums bg-white px-2 py-0.5 rounded-md border border-black/5 shadow-2xs">
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-[#6B6B6B]">
                <strong>Merge Policy:</strong> Import will MERGE by ID, never silently wipe. Non-matching records already in storage will remain completely intact.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-all cursor-pointer shadow-xs"
                >
                  Confirm & Merge Records
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: UNIT TESTS & VALIDATION (Only in DEV) */}
      {subTab === 'tests' && isDevMode && (
        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111111]">
                Automated Logic Unit Test Suite
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Unit tests covering the 7-criteria lead scoring algorithm, disqualifiers, domain-level suppression matching, and stage transition restrictions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTestResults(runUnitTests())}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-black cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Rerun Tests</span>
            </button>
          </div>

          <div className="divide-y divide-black/5 text-xs">
            {testResults.map((t, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    className={t.passed ? 'text-emerald-600' : 'text-[#D92D50]'}
                  />
                  <span className="font-semibold text-[#111111]">{t.test}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    t.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-[#FCE9ED] text-[#D92D50]'
                  }`}
                >
                  {t.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
