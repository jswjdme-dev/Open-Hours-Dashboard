import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Github,
  Globe,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  getWebsiteStudioSettings,
  saveWebsiteStudioSettings,
} from '../../data/repo.ts';
import { DEFAULT_ALLOWED_PREVIEW_DOMAINS } from '../../lib/customWebsiteValidation.ts';

export const WebsiteStudioSettingsManager: React.FC = () => {
  const [templateRepo, setTemplateRepo] = useState('');
  const [allowedDomains, setAllowedDomains] = useState<string[]>(DEFAULT_ALLOWED_PREVIEW_DOMAINS);
  const [demoLifetimeDays, setDemoLifetimeDays] = useState<number>(60);
  const [revealIntroPrefix, setRevealIntroPrefix] = useState<string>('Prepared for');
  const [revealIntroSuffix, setRevealIntroSuffix] = useState<string>('by Open Hours');
  const [newDomainInput, setNewDomainInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await getWebsiteStudioSettings();
      setTemplateRepo(settings.templateRepo || '');
      setAllowedDomains(
        settings.allowedPreviewDomains && settings.allowedPreviewDomains.length > 0
          ? settings.allowedPreviewDomains
          : DEFAULT_ALLOWED_PREVIEW_DOMAINS
      );
      setDemoLifetimeDays(settings.demoLifetimeDays ?? 60);
      setRevealIntroPrefix(settings.revealIntroPrefix ?? 'Prepared for');
      setRevealIntroSuffix(settings.revealIntroSuffix ?? 'by Open Hours');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = () => {
    const trimmed = newDomainInput.trim().toLowerCase();
    if (!trimmed) return;
    if (allowedDomains.includes(trimmed)) {
      setNewDomainInput('');
      return;
    }
    setAllowedDomains([...allowedDomains, trimmed]);
    setNewDomainInput('');
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domainToRemove));
  };

  const handleResetDefaults = () => {
    setAllowedDomains([...DEFAULT_ALLOWED_PREVIEW_DOMAINS]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    setErrorMsg(null);

    try {
      await saveWebsiteStudioSettings({
        templateRepo: templateRepo.trim(),
        allowedPreviewDomains: allowedDomains,
        demoLifetimeDays: Number(demoLifetimeDays) || 60,
        revealIntroPrefix: revealIntroPrefix.trim() || 'Prepared for',
        revealIntroSuffix: revealIntroSuffix.trim() || 'by Open Hours',
      });
      setSavedMsg('Website Studio settings saved successfully.');
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const cleanOwnerRepo = templateRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const isValidOwnerRepo = /^[\w.-]+\/[\w.-]+$/.test(cleanOwnerRepo);
  const generateRepoUrl = isValidOwnerRepo ? `https://github.com/${cleanOwnerRepo}/generate` : null;

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-[24px] border border-black/5 text-xs text-[#73737A]">
        Loading Website Studio configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Overview Card */}
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-2xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Website Studio &amp; Custom Mode Settings</h2>
          <p className="text-xs text-[#667085] mt-1">
            Configure default starter repositories for Google AI Studio workflows and security allow-lists for external preview hosts.
          </p>
        </div>

        {savedMsg && (
          <div className="p-3 bg-[#E7F8EF] border border-[#A6F4C5] rounded-xl text-xs font-semibold text-[#027A48] flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{savedMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#FEECEB] border border-[#FECDCA] rounded-xl text-xs font-semibold text-[#B42318] flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Template Repository */}
          <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-black/5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-bold text-[#101828]">
                Template repository (owner/repo)
              </label>
              <span className="text-[11px] text-[#73737A]">Optional</span>
            </div>
            <p className="text-xs text-[#667085]">
              Specify a GitHub template repository to use as the base for new client websites built with Google AI Studio.
            </p>

            <div className="flex items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <Github size={15} className="absolute left-3 top-2.5 text-[#73737A]" />
                <input
                  type="text"
                  value={templateRepo}
                  onChange={(e) => setTemplateRepo(e.target.value)}
                  placeholder="e.g. openhours/starter-site"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-black/10 bg-white text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
                />
              </div>

              {generateRepoUrl && (
                <a
                  href={generateRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#101828] hover:bg-black text-white transition-colors shrink-0"
                  title="Generate a new repository from this GitHub template"
                >
                  <ExternalLink size={13} />
                  <span>Create repo on GitHub</span>
                </a>
              )}
            </div>

            <div className="text-[11px] text-[#73737A] flex items-center gap-1.5">
              <span>Security rule: This console never writes to or creates GitHub repos directly and never requests a GitHub secret.</span>
            </div>
          </div>

          {/* Card 2: Allowed Preview Domains */}
          <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-black/5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="block text-xs font-bold text-[#101828]">
                  Allowed preview domains
                </label>
                <p className="text-xs text-[#667085] mt-0.5">
                  Domains permitted for client version previews. URLs outside this list will trigger a confirmation requirement before saving.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset to defaults</span>
              </button>
            </div>

            {/* List of current domains */}
            <div className="flex flex-wrap gap-2">
              {allowedDomains.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black/10 text-xs font-mono text-[#101828] shadow-2xs"
                >
                  <Globe size={12} className="text-[#73737A]" />
                  <span>{domain}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                    className="p-0.5 hover:text-[#B42318] text-[#98A2B3] transition-colors cursor-pointer"
                    title={`Remove ${domain}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>

            {/* Add new domain */}
            <div className="flex items-center gap-2 max-w-md pt-2 border-t border-black/5">
              <input
                type="text"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
                placeholder="e.g. *.pages.dev or custom.example.com"
                className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-black/10 bg-white text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
              />
              <button
                type="button"
                onClick={handleAddDomain}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-black/15 text-[#101828] hover:bg-black/5 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Domain</span>
              </button>
            </div>
          </div>

          {/* Card 3: Demo Lifetime Expiry */}
          <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-black/5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#101828]">
                Demo lifetime in days
              </label>
              <p className="text-xs text-[#667085] mt-0.5">
                Every newly created website concept receives an automatic expiry window (default 60 days). Expired concepts are lazily purged on next view unless marked keep permanently.
              </p>
            </div>

            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="number"
                min={1}
                max={365}
                value={demoLifetimeDays}
                onChange={(e) => setDemoLifetimeDays(parseInt(e.target.value, 10) || 60)}
                className="w-28 px-3 py-2 text-xs font-mono rounded-xl border border-black/10 bg-white text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
              />
              <span className="text-xs font-semibold text-[#667085]">days</span>
            </div>
          </div>

          {/* Card 4: Reveal Sequence Captions */}
          <div className="p-5 rounded-2xl bg-[#FAFAFC] border border-black/5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#101828]">
                Reveal Sequence Captions
              </label>
              <p className="text-xs text-[#667085] mt-0.5">
                Customize the subtle gold typography captions displayed during the client mockup reveal intro.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#344054]">
                  Intro Prefix (Top small caption)
                </label>
                <input
                  type="text"
                  value={revealIntroPrefix}
                  onChange={(e) => setRevealIntroPrefix(e.target.value)}
                  placeholder="Prepared for"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 bg-white text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
                />
                <span className="text-[11px] text-[#73737A]">Appears before the business name</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#344054]">
                  Intro Suffix (Bottom small caption)
                </label>
                <input
                  type="text"
                  value={revealIntroSuffix}
                  onChange={(e) => setRevealIntroSuffix(e.target.value)}
                  placeholder="by Open Hours"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 bg-white text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
                />
                <span className="text-[11px] text-[#73737A]">Appears below with soft gold glow</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between border-t border-black/5">
            <span className="text-[11px] text-[#73737A]">
              Settings are saved locally and apply across all Custom mode projects.
            </span>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
