import React, { useState, useEffect } from 'react';
import {
  WebsiteProject,
  CustomProjectSetup,
  CustomVersion,
  Client,
  WebsiteStudioSettings,
} from '../../types/index.ts';
import {
  updateWebsiteProjectMode,
  updateWebsiteProjectCustomSetup,
  getCustomVersions,
  saveCustomVersion,
  shareCustomVersion,
  getWebsiteStudioSettings,
} from '../../data/repo.ts';
import {
  validatePreviewUrl,
  validateChangelog,
  validateCommitSha,
  slugifyClientName,
  DEFAULT_ALLOWED_PREVIEW_DOMAINS,
} from '../../lib/customWebsiteValidation.ts';
import { allowedFetch } from '../../lib/allowedHosts.ts';
import { downloadZip, dataUrlToUint8Array } from '../../lib/zipWriter.ts';
import {
  Globe,
  Github,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Share2,
  Plus,
  Trash2,
  Layers,
  ArrowLeft,
  FileCode,
  Shield,
  HelpCircle,
  Clock,
  Eye,
  GitCommit,
  RotateCw,
} from 'lucide-react';

interface CustomProjectManagerProps {
  project: WebsiteProject;
  clients: Client[];
  otherProjects: WebsiteProject[];
  onUpdateProject: (updated: WebsiteProject) => void;
  onSwitchToTemplate: () => void;
  onClose: () => void;
}

export const CustomProjectManager: React.FC<CustomProjectManagerProps> = ({
  project,
  clients,
  otherProjects,
  onUpdateProject,
  onSwitchToTemplate,
  onClose,
}) => {
  // Tabs: 'setup' | 'versions'
  const [activeTab, setActiveTab] = useState<'setup' | 'versions'>('setup');

  // Studio Settings
  const [studioSettings, setStudioSettings] = useState<WebsiteStudioSettings>({
    templateRepo: '',
    allowedPreviewDomains: DEFAULT_ALLOWED_PREVIEW_DOMAINS,
  });

  // Setup Form State
  const [repoName, setRepoName] = useState(project.customSetup?.repoName || '');
  const [repoOwner, setRepoOwner] = useState(project.customSetup?.repoOwner || '');
  const [branch, setBranch] = useState(project.customSetup?.branch || 'main');
  const [hostingProvider, setHostingProvider] = useState(project.customSetup?.hostingProvider || 'Vercel');
  const [productionUrl, setProductionUrl] = useState(project.customSetup?.productionUrl || '');
  const [notes, setNotes] = useState(project.customSetup?.notes || '');
  const [checklist, setChecklist] = useState({
    repoCreated: project.customSetup?.checklist?.repoCreated ?? false,
    aiStudioConnected: project.customSetup?.checklist?.aiStudioConnected ?? false,
    hostingLinked: project.customSetup?.checklist?.hostingLinked ?? false,
    previewWorking: project.customSetup?.checklist?.previewWorking ?? false,
  });

  // Setup UI State
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupSavedMsg, setSetupSavedMsg] = useState<string | null>(null);

  // Export Handoff Pack state
  const [includeRealContactDetails, setIncludeRealContactDetails] = useState(false);
  const [exportingHandoff, setExportingHandoff] = useState(false);

  // Versions State
  const [versions, setVersions] = useState<CustomVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string>('');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Add Version Form State
  const [formPreviewUrl, setFormPreviewUrl] = useState('');
  const [formCommitSha, setFormCommitSha] = useState('');
  const [changelogBullets, setChangelogBullets] = useState<string[]>(['Initial layout changes in Google AI Studio']);
  const [internalNote, setInternalNote] = useState('');
  const [trustOutsideDomain, setTrustOutsideDomain] = useState(false);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fetchingCommit, setFetchingCommit] = useState(false);
  const [commitFetchMsg, setCommitFetchMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [versionSuccess, setVersionSuccess] = useState<string | null>(null);

  // Client info for helper
  const client = project.clientId ? clients.find((c) => c.id === project.clientId) : null;
  const clientName = client?.businessName || project.title;

  const existingSlugs = otherProjects
    .map((p) => p.customSetup?.repoName)
    .filter(Boolean) as string[];

  const suggestedRepoName = slugifyClientName(clientName, existingSlugs);

  useEffect(() => {
    loadSettingsAndVersions();
  }, [project.id]);

  const loadSettingsAndVersions = async () => {
    try {
      setLoadingVersions(true);
      const [settings, vers] = await Promise.all([
        getWebsiteStudioSettings(),
        getCustomVersions(project.id),
      ]);
      setStudioSettings(settings);
      setVersions(vers);

      // Select latest preview url if available
      if (vers.length > 0 && !selectedPreviewUrl) {
        const activeShared = vers.find((v) => v.status === 'Shared' || v.status === 'Approved' || v.status === 'Changes requested') || vers[0];
        setSelectedPreviewUrl(activeShared.previewUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Live URL validation on version preview input
  useEffect(() => {
    if (!formPreviewUrl.trim()) {
      setUrlError(null);
      setUrlWarning(null);
      return;
    }
    const check = validatePreviewUrl(formPreviewUrl, studioSettings.allowedPreviewDomains);
    if (!check.valid) {
      setUrlError(check.error || 'Invalid URL');
      setUrlWarning(null);
    } else {
      setUrlError(null);
      setUrlWarning(check.domainWarning || null);
    }
  }, [formPreviewUrl, studioSettings.allowedPreviewDomains]);

  // Action: Save Setup Fields
  const handleSaveSetup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSetup(true);
    setSetupSavedMsg(null);
    try {
      const updated = await updateWebsiteProjectCustomSetup(project.id, {
        repoName: repoName.trim(),
        repoOwner: repoOwner.trim() || undefined,
        branch: branch.trim() || 'main',
        hostingProvider: hostingProvider.trim() || 'Vercel',
        productionUrl: productionUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        checklist,
      });
      onUpdateProject(updated);
      setSetupSavedMsg('Custom setup saved.');
      setTimeout(() => setSetupSavedMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save setup.');
    } finally {
      setSavingSetup(false);
    }
  };

  // Action: Copy 5-step instructions
  const fiveStepInstructions = `1. Create a repository on GitHub (optionally generate from template).
2. Open Google AI Studio and connect your GitHub repository.
3. Export handoff pack (or download index.html and PROMPT.md) into your repository.
4. Link your repository to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).
5. Add your generated preview URL to the Versions tab.`;

  const handleCopyInstructions = () => {
    navigator.clipboard.writeText(fiveStepInstructions).then(() => {
      setCopiedInstructions(true);
      setTimeout(() => setCopiedInstructions(false), 2500);
    });
  };

  // Action: Export AI Studio Handoff Pack
  const handleExportHandoffPack = () => {
    try {
      setExportingHandoff(true);

      const effectivePhone = includeRealContactDetails ? (project.details.phone || '+353 1 234 5678') : '+353 1 234 5678';
      const effectiveEmail = includeRealContactDetails ? (project.details.email || 'info@example.com') : 'info@example.com';
      const effectiveAddress = includeRealContactDetails ? (project.details.address || 'Dublin, Ireland') : 'Dublin, Ireland';

      const promptContent = `# AI Studio Custom Website Brief: ${project.title}

## Business Information
- **Business Name**: ${project.details.businessName}
- **Tagline**: ${project.details.tagline || 'Clinical healthcare services'}
- **Phone**: ${effectivePhone}
- **Email**: ${effectiveEmail}
- **Address**: ${effectiveAddress}

## Visual Identity
- **Primary Color**: ${project.brand.primaryColor}
- **Secondary Color**: ${project.brand.secondaryColor}
- **Font Stack**: ${project.brand.fontStack}

## Services
${project.details.services.map((s) => `- **${s.title}**: ${s.text}`).join('\n')}

## AI Studio Engineering Guidelines
After each set of changes, commit with a message that starts with 'v<number>:' followed by a short plain-language summary. Do not add tracking, analytics or external services. Do not invent testimonials, reviews, statistics or prices. Keep all text in one content file.
`;

      const readmeContent = `=====================================================
GOOGLE AI STUDIO + GITHUB HANDOFF PACK
Project: ${project.title}
Generated: ${new Date().toISOString()}
=====================================================

Contents:
- index.html: Base website HTML scaffold
- PROMPT.md: System instructions and clinical business brief for Google AI Studio
- assets/: Extracted logos and imagery (if supplied)

Getting Started with Google AI Studio:
1. Connect your GitHub repository to Google AI Studio.
2. Load PROMPT.md as context for your engineering sessions.
3. Commit all iterations to your branch.
4. Copy preview URLs from your host into Open Hours Console > Versions tab.
`;

      const zipFiles: Array<{ name: string; content: string | Uint8Array }> = [
        { name: 'index.html', content: project.renderedHtml || '<!DOCTYPE html><html><body><h1>Starter Site</h1></body></html>' },
        { name: 'PROMPT.md', content: promptContent },
        { name: 'readme.txt', content: readmeContent },
      ];

      // Logo extraction if available
      if (project.brand.logoDataUrl && project.brand.logoDataUrl.startsWith('data:')) {
        try {
          const { bytes, extension } = dataUrlToUint8Array(project.brand.logoDataUrl);
          zipFiles.push({ name: `assets/logo.${extension}`, content: bytes });
        } catch {
          // ignore binary extraction failure
        }
      }

      const filename = `${(project.details.businessName || 'website').toLowerCase().replace(/[^a-z0-9]/g, '-')}-ai-studio-handoff.zip`;
      downloadZip(filename, zipFiles);
    } catch (err: any) {
      alert(err?.message || 'Failed to generate handoff pack.');
    } finally {
      setExportingHandoff(false);
    }
  };

  // Action: Fetch Latest Commit from GitHub via Network Allow-List
  const handleFetchLatestCommit = async () => {
    const owner = repoOwner.trim() || studioSettings.templateRepo?.split('/')[0];
    const repo = repoName.trim() || studioSettings.templateRepo?.split('/')[1];
    const br = branch.trim() || 'main';

    if (!owner || !repo) {
      setCommitFetchMsg({
        type: 'error',
        text: 'Please set Repo Name and Repo Owner in Setup tab before checking commits.',
      });
      return;
    }

    try {
      setFetchingCommit(true);
      setCommitFetchMsg(null);

      const url = `https://api.github.com/repos/${owner}/${repo}/commits/${br}`;
      const res = await allowedFetch(url, { headers: { Accept: 'application/vnd.github.v3+json' } }, 'github');

      if (res.status === 404) {
        setCommitFetchMsg({
          type: 'error',
          text: `Repository "${owner}/${repo}" or branch "${br}" not found or private. Commit fetching only supports public repositories.`,
        });
        return;
      }

      if (res.status === 403) {
        setCommitFetchMsg({
          type: 'error',
          text: 'GitHub API rate limit exceeded. You can manually enter the commit SHA below.',
        });
        return;
      }

      if (!res.ok) {
        setCommitFetchMsg({
          type: 'error',
          text: `GitHub API error: ${res.status} ${res.statusText}.`,
        });
        return;
      }

      const data = await res.json();
      const sha = data?.sha || '';
      const commitMsg = data?.commit?.message?.split('\n')[0] || '';
      const commitDate = data?.commit?.author?.date || '';

      if (sha) {
        setFormCommitSha(sha);
        setCommitFetchMsg({
          type: 'success',
          text: `Commit ${sha.slice(0, 7)}: "${commitMsg}" (${new Date(commitDate).toLocaleDateString()})`,
        });
      }
    } catch (err: any) {
      setCommitFetchMsg({
        type: 'error',
        text: err?.message || 'Failed to reach GitHub API.',
      });
    } finally {
      setFetchingCommit(false);
    }
  };

  // Action: Add / Remove Changelog Bullets
  const handleAddBullet = () => {
    if (changelogBullets.length >= 10) return;
    setChangelogBullets([...changelogBullets, '']);
  };

  const handleUpdateBullet = (index: number, val: string) => {
    const copy = [...changelogBullets];
    copy[index] = val;
    setChangelogBullets(copy);
  };

  const handleRemoveBullet = (index: number) => {
    if (changelogBullets.length <= 1) return;
    setChangelogBullets(changelogBullets.filter((_, idx) => idx !== index));
  };

  // Action: Save Draft Version
  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVersion(false);
    setVersionError(null);
    setVersionSuccess(null);

    // Domain outside check
    if (urlWarning && !trustOutsideDomain) {
      setVersionError('Please confirm that you trust this preview domain before saving.');
      return;
    }

    try {
      setSavingVersion(true);
      const cleanBullets = changelogBullets.map((b) => b.trim()).filter((b) => b.length > 0);
      if (cleanBullets.length === 0) {
        setVersionError('At least 1 changelog bullet point is required.');
        setSavingVersion(false);
        return;
      }

      const created = await saveCustomVersion(project.id, {
        previewUrl: formPreviewUrl.trim(),
        changelog: cleanBullets,
        commitSha: formCommitSha.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
      });

      setVersionSuccess(`Created Version v${created.versionNumber} (Draft).`);
      setFormPreviewUrl('');
      setFormCommitSha('');
      setInternalNote('');
      setChangelogBullets(['']);
      setTrustOutsideDomain(false);
      setSelectedPreviewUrl(created.previewUrl);

      // Refresh versions
      const updatedList = await getCustomVersions(project.id);
      setVersions(updatedList);
    } catch (err: any) {
      setVersionError(err?.message || 'Failed to save version.');
    } finally {
      setSavingVersion(false);
    }
  };

  // Action: Share Version
  const handleShareVersion = async (versionId: string) => {
    try {
      await shareCustomVersion(versionId);
      const updatedList = await getCustomVersions(project.id);
      setVersions(updatedList);
      alert('Version shared to client portal.');
    } catch (err: any) {
      alert(err?.message || 'Failed to share version.');
    }
  };

  const cleanOwnerRepo = (repoOwner ? `${repoOwner}/${repoName}` : studioSettings.templateRepo || '').trim();
  const generateUrl = cleanOwnerRepo.includes('/') ? `https://github.com/${cleanOwnerRepo}/generate` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-black/10">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-black/10 flex items-center justify-between bg-[#FAFBFD] flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Globe size={18} className="text-[#D92D50]" />
            <div>
              <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2">
                <span>{project.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#101828] text-white">
                  Custom Mode
                </span>
              </h3>
            </div>
          </div>

          {/* Mode Switch Segmented Control */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#E4E7EC] text-xs font-semibold">
              <button
                type="button"
                onClick={onSwitchToTemplate}
                className="px-3 py-1 rounded-md text-[#475467] hover:text-[#101828] transition-all cursor-pointer"
                title="Switch back to Template Builder (all custom versions are preserved)"
              >
                Template
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-md bg-white text-[#101828] font-bold shadow-2xs cursor-default"
              >
                Custom
              </button>
            </div>

            {/* Custom Mode Tabs */}
            <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-full text-xs font-semibold ml-2">
              <button
                type="button"
                onClick={() => setActiveTab('setup')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeTab === 'setup'
                    ? 'bg-[#101828] text-white shadow-2xs'
                    : 'text-[#475467] hover:text-[#101828]'
                }`}
              >
                Setup
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('versions')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'versions'
                    ? 'bg-[#101828] text-white shadow-2xs'
                    : 'text-[#475467] hover:text-[#101828]'
                }`}
              >
                <span>Versions</span>
                {versions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                    {versions.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Right Close & Back */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToTemplate}
              className="text-xs text-[#667085] hover:text-[#101828] underline cursor-pointer mr-2"
            >
              Back to template builder
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 text-[#667085] hover:text-[#101828] cursor-pointer"
              title="Close modal"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Short Help Card */}
        <div className="px-6 py-2.5 bg-[#F8F9FA] border-b border-black/5 flex items-center justify-between text-xs text-[#475467]">
          <div className="flex items-center gap-2">
            <HelpCircle size={14} className="text-[#667085] shrink-0" />
            <span>
              <strong>Mode Guidance:</strong> Template = fast, for content/colour/photo changes; Custom = for design or code changes made in Google AI Studio.
            </span>
          </div>
          <span className="text-[11px] text-[#8C8F97] hidden md:inline">
            All template data is preserved safely.
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* TAB 1: SETUP */}
          {activeTab === 'setup' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Repository & Hosting Details */}
              <div className="w-full lg:w-1/2 overflow-y-auto p-6 space-y-6 border-r border-black/10 bg-white">
                <form onSubmit={handleSaveSetup} className="space-y-5">
                  <div className="pb-2 border-b border-black/5">
                    <h4 className="text-sm font-bold text-[#101828]">Custom Website Setup</h4>
                    <p className="text-xs text-[#667085]">
                      Configure your GitHub repository and deployment host for Google AI Studio builds.
                    </p>
                  </div>

                  {setupSavedMsg && (
                    <div className="p-3 bg-[#E7F8EF] border border-[#A6F4C5] rounded-xl text-xs font-semibold text-[#027A48] flex items-center gap-2">
                      <CheckCircle2 size={15} />
                      <span>{setupSavedMsg}</span>
                    </div>
                  )}

                  {/* Repo Naming Helper */}
                  <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-black/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#344054]">Repo Naming Helper</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRepoName(suggestedRepoName);
                          navigator.clipboard.writeText(suggestedRepoName);
                          setCopiedSlug(true);
                          setTimeout(() => setCopiedSlug(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D92D50] hover:underline cursor-pointer"
                      >
                        {copiedSlug ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedSlug ? 'Copied & Applied' : 'Use Suggested Slug'}</span>
                      </button>
                    </div>
                    <div className="text-xs font-mono text-[#667085] bg-white px-2.5 py-1.5 rounded-lg border border-black/10 select-all">
                      {suggestedRepoName}
                    </div>
                  </div>

                  {/* Field: Repo Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#344054]">
                      Repository Name <span className="text-[#D92D50]">*</span>
                    </label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="e.g. site-apex-care"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                    />
                  </div>

                  {/* Field: Repo Owner */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#344054]">
                      Repository Owner (Organization or Username)
                    </label>
                    <input
                      type="text"
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      placeholder="e.g. openhours or your-github-org"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                    />
                  </div>

                  {/* Row: Branch & Hosting Provider */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#344054]">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#344054]">
                        Hosting Provider
                      </label>
                      <select
                        value={hostingProvider}
                        onChange={(e) => setHostingProvider(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
                      >
                        <option value="Vercel">Vercel</option>
                        <option value="Netlify">Netlify</option>
                        <option value="Cloudflare Pages">Cloudflare Pages</option>
                        <option value="GitHub Pages">GitHub Pages</option>
                        <option value="Firebase Hosting">Firebase Hosting</option>
                        <option value="Other">Other HTTPS Host</option>
                      </select>
                    </div>
                  </div>

                  {/* Production URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#344054]">
                      Production URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={productionUrl}
                      onChange={(e) => setProductionUrl(e.target.value)}
                      placeholder="https://clientdomain.com"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#344054]">
                      Internal Setup Notes
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes on DNS, AI Studio prompts, or custom client requirements..."
                      className="w-full p-2.5 text-xs rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none resize-none"
                    />
                  </div>

                  {/* GitHub Generator Button */}
                  {generateUrl && (
                    <div className="pt-2">
                      <a
                        href={generateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#101828] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Github size={14} />
                        <span>Create repo on GitHub (opens github.com/{cleanOwnerRepo}/generate)</span>
                      </a>
                    </div>
                  )}

                  <div className="pt-3 border-t border-black/5 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSetup}
                      className="px-5 py-2 rounded-xl bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {savingSetup ? 'Saving...' : 'Save Setup'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Checklist, 5-Step Instructions, Export Pack & Notice */}
              <div className="w-full lg:w-1/2 overflow-y-auto p-6 space-y-6 bg-[#FAFBFD]">
                {/* Checklist Card */}
                <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-[#101828]">Setup Progress Checklist</h4>
                  <div className="space-y-2">
                    {[
                      { key: 'repoCreated', label: '1. GitHub repository created' },
                      { key: 'aiStudioConnected', label: '2. Connected in Google AI Studio' },
                      { key: 'hostingLinked', label: '3. Hosting project linked (auto-deploys)' },
                      { key: 'previewWorking', label: '4. Preview URL working and tested' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/5 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={(checklist as any)[item.key]}
                          onChange={(e) => {
                            const updated = { ...checklist, [item.key]: e.target.checked };
                            setChecklist(updated);
                            updateWebsiteProjectCustomSetup(project.id, { checklist: updated });
                          }}
                          className="rounded text-[#D92D50] focus:ring-[#D92D50]"
                        />
                        <span className={(checklist as any)[item.key] ? 'line-through text-[#667085]' : 'font-medium text-[#101828]'}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 5-Step Instructions Card */}
                <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#101828]">Google AI Studio Workflow</h4>
                    <button
                      type="button"
                      onClick={handleCopyInstructions}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D92D50] hover:underline cursor-pointer"
                    >
                      {copiedInstructions ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedInstructions ? 'Copied' : 'Copy 5-Step Instructions'}</span>
                    </button>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#475467] leading-relaxed">
                    <li>Create a repository on GitHub (optionally generate from template).</li>
                    <li>Open Google AI Studio and connect your GitHub repository.</li>
                    <li>Export handoff pack into your repository.</li>
                    <li>Link your repository to your hosting provider (Vercel, Netlify, etc.).</li>
                    <li>Add your generated preview URL to the Versions tab.</li>
                  </ol>
                </div>

                {/* Export Handoff Pack Card */}
                <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-[#101828]">Export AI Studio Handoff Pack</h4>
                  <p className="text-xs text-[#667085]">
                    Package includes <code>index.html</code>, clean <code>readme.txt</code>, and <code>PROMPT.md</code> formatted for Google AI Studio with plain-language commit instructions.
                  </p>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#FAFBFD] border border-black/5 text-xs text-[#344054] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeRealContactDetails}
                      onChange={(e) => setIncludeRealContactDetails(e.target.checked)}
                      className="rounded text-[#D92D50] focus:ring-[#D92D50]"
                    />
                    <span>Include real clinic contact details (default OFF: placeholders used)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleExportHandoffPack}
                    disabled={exportingHandoff}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#101828] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileCode size={14} />
                    <span>{exportingHandoff ? 'Generating Package...' : 'Export AI Studio Handoff Pack (ZIP)'}</span>
                  </button>
                </div>

                {/* Third-Party Notice */}
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <Shield size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Third-Party Policy Notice:</strong> Google AI Studio, GitHub, and the hosting provider are third-party services. Make sure your client agreement allows sharing the client&rsquo;s materials with them.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VERSIONS */}
          {activeTab === 'versions' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Add Version Form + Version History */}
              <div className="w-full lg:w-[45%] overflow-y-auto p-6 space-y-6 border-r border-black/10 bg-white">
                {/* Form: Add Version */}
                <form onSubmit={handleSaveVersion} className="p-5 rounded-2xl bg-[#FAFAFC] border border-black/5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-black/5">
                    <h4 className="text-xs font-bold text-[#101828]">Add New Custom Version</h4>
                    <span className="text-[11px] font-mono text-[#667085]">
                      Next: v{(versions[0]?.versionNumber || 0) + 1}
                    </span>
                  </div>

                  {versionSuccess && (
                    <div className="p-3 bg-[#E7F8EF] border border-[#A6F4C5] rounded-xl text-xs font-semibold text-[#027A48] flex items-center gap-2">
                      <CheckCircle2 size={15} />
                      <span>{versionSuccess}</span>
                    </div>
                  )}

                  {versionError && (
                    <div className="p-3 bg-[#FEECEB] border border-[#FECDCA] rounded-xl text-xs font-semibold text-[#B42318] flex items-center gap-2">
                      <AlertTriangle size={15} />
                      <span>{versionError}</span>
                    </div>
                  )}

                  {/* Preview URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#344054]">
                      Live Preview URL (HTTPS) <span className="text-[#D92D50]">*</span>
                    </label>
                    <input
                      type="url"
                      value={formPreviewUrl}
                      onChange={(e) => setFormPreviewUrl(e.target.value)}
                      placeholder="https://mysite.vercel.app"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                    />
                    {urlError && (
                      <p className="text-[11px] text-[#B42318] mt-0.5">{urlError}</p>
                    )}
                    {urlWarning && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 mt-1 space-y-2">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertTriangle size={14} className="text-amber-600" />
                          <span>{urlWarning}</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-[11px]">
                          <input
                            type="checkbox"
                            checked={trustOutsideDomain}
                            onChange={(e) => setTrustOutsideDomain(e.target.checked)}
                            className="rounded text-[#D92D50] focus:ring-[#D92D50]"
                          />
                          <span>I trust this domain and wish to proceed</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Commit SHA & Latest Commit Fetcher */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#344054]">
                        Git Commit SHA (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleFetchLatestCommit}
                        disabled={fetchingCommit}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D92D50] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw size={11} className={fetchingCommit ? 'animate-spin' : ''} />
                        <span>Latest commit (public repos only)</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formCommitSha}
                      onChange={(e) => setFormCommitSha(e.target.value)}
                      placeholder="e.g. 7c9d12a"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                    />
                    {commitFetchMsg && (
                      <p className={`text-[11px] mt-0.5 ${commitFetchMsg.type === 'error' ? 'text-[#B42318]' : 'text-[#027A48]'}`}>
                        {commitFetchMsg.text}
                      </p>
                    )}
                  </div>

                  {/* Changelog Bullets (1-10 required, max 200 chars) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#344054]">
                        Changelog (1-10 bullet points, max 200 chars each) <span className="text-[#D92D50]">*</span>
                      </label>
                      {changelogBullets.length < 10 && (
                        <button
                          type="button"
                          onClick={handleAddBullet}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D92D50] hover:underline cursor-pointer"
                        >
                          <Plus size={11} />
                          <span>Add Bullet</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {changelogBullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#667085] w-4">{idx + 1}.</span>
                          <input
                            type="text"
                            maxLength={200}
                            value={bullet}
                            onChange={(e) => handleUpdateBullet(idx, e.target.value)}
                            placeholder="e.g. Refactored booking buttons for mobile"
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:outline-none"
                          />
                          <span className="text-[10px] text-[#8C8F97] font-mono w-10 text-right">
                            {bullet.length}/200
                          </span>
                          {changelogBullets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBullet(idx)}
                              className="p-1 hover:text-[#B42318] text-[#98A2B3] cursor-pointer"
                              title="Remove bullet"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Internal Note (Admin only) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#344054]">
                      Internal Note (Not visible to client)
                    </label>
                    <textarea
                      rows={2}
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Internal team observation, testing notes, or benchmark scores..."
                      className="w-full p-2.5 text-xs rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingVersion || !formPreviewUrl.trim() || !!urlError}
                      className="px-5 py-2 rounded-xl bg-[#101828] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {savingVersion ? 'Saving...' : 'Save as Draft'}
                    </button>
                  </div>
                </form>

                {/* Version History List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#101828] flex items-center justify-between">
                    <span>Version History ({versions.length})</span>
                    <span className="text-[11px] font-normal text-[#667085]">Draft &rarr; Shared &rarr; Approved</span>
                  </h4>

                  {versions.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-[#FAFBFD] border border-black/5 text-xs text-[#667085]">
                      No custom versions created yet. Add your first version above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {versions.map((v) => {
                        const isShared = v.status === 'Shared';
                        const isApproved = v.status === 'Approved';
                        const isChanges = v.status === 'Changes requested';
                        const isDraft = v.status === 'Draft';

                        return (
                          <div
                            key={v.id}
                            className="p-4 rounded-xl border border-black/10 bg-white hover:border-black/20 transition-all space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#101828]">
                                  v{v.versionNumber}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    isApproved
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isShared
                                      ? 'bg-blue-100 text-blue-800'
                                      : isChanges
                                      ? 'bg-amber-100 text-amber-800'
                                      : isDraft
                                      ? 'bg-gray-100 text-gray-700'
                                      : 'bg-zinc-100 text-zinc-500'
                                  }`}
                                >
                                  {v.status}
                                </span>
                                {v.commitSha && (
                                  <span className="font-mono text-[10px] bg-black/5 px-2 py-0.5 rounded text-[#475467] flex items-center gap-1">
                                    <GitCommit size={10} />
                                    <span>{v.commitSha.slice(0, 7)}</span>
                                  </span>
                                )}
                              </div>

                              <span className="text-[11px] text-[#667085]">
                                {new Date(v.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Changelog list */}
                            <ul className="list-disc list-inside text-xs text-[#344054] space-y-0.5">
                              {v.changelog.map((c, i) => (
                                <li key={i} className="leading-snug">{c}</li>
                              ))}
                            </ul>

                            {/* Internal Note (Admin only) */}
                            {v.internalNote && (
                              <div className="p-2 rounded bg-amber-50/50 border border-amber-100 text-[11px] text-amber-900">
                                <strong className="font-semibold">Internal:</strong> {v.internalNote}
                              </div>
                            )}

                            {/* Client feedback */}
                            {v.clientFeedback && (
                              <div className="p-2.5 rounded bg-blue-50 border border-blue-100 text-xs text-blue-900">
                                <strong>Client Feedback:</strong> &ldquo;{v.clientFeedback}&rdquo;
                              </div>
                            )}

                            {/* Action Row */}
                            <div className="pt-2 border-t border-black/5 flex items-center justify-between flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedPreviewUrl(v.previewUrl)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#101828] hover:text-[#D92D50] transition-colors cursor-pointer"
                              >
                                <Eye size={13} />
                                <span>Preview this version</span>
                              </button>

                              {isDraft && (
                                <button
                                  type="button"
                                  onClick={() => handleShareVersion(v.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                  title="Share this version with the client portal"
                                >
                                  <Share2 size={13} />
                                  <span>Share to Client</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Sandboxed Iframe Preview */}
              <div className="w-full lg:w-[55%] flex flex-col bg-[#F6F7F9] overflow-hidden">
                {/* Preview Toolbar */}
                <div className="px-5 py-3 border-b border-black/10 flex items-center justify-between bg-white flex-wrap gap-3">
                  {/* Device Toggles */}
                  <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDeviceView('desktop')}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        deviceView === 'desktop' ? 'bg-white shadow-2xs text-[#101828]' : 'text-[#667085]'
                      }`}
                      title="Desktop view"
                    >
                      <Monitor size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceView('tablet')}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        deviceView === 'tablet' ? 'bg-white shadow-2xs text-[#101828]' : 'text-[#667085]'
                      }`}
                      title="Tablet view (768px)"
                    >
                      <Tablet size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceView('mobile')}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        deviceView === 'mobile' ? 'bg-white shadow-2xs text-[#101828]' : 'text-[#667085]'
                      }`}
                      title="Mobile view (375px)"
                    >
                      <Smartphone size={15} />
                    </button>
                  </div>

                  {/* Active Preview URL & Open in New Tab */}
                  <div className="flex items-center gap-2">
                    {selectedPreviewUrl ? (
                      <a
                        href={selectedPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/15 bg-white hover:bg-black/5 text-[#101828] text-xs font-bold transition-all shadow-2xs"
                        title="Open external preview in a new browser tab"
                      >
                        <ExternalLink size={13} />
                        <span>Open in new tab</span>
                      </a>
                    ) : (
                      <span className="text-xs text-[#667085]">No version preview loaded</span>
                    )}
                  </div>
                </div>

                {/* Notice & Hint Bar */}
                <div className="px-5 py-2 bg-[#FAFAFC] border-b border-black/5 text-[11px] text-[#667085] flex items-center justify-between flex-wrap gap-2">
                  <span>If the preview stays blank, the site may block embedding. Use Open in new tab.</span>
                  <span className="text-[#8C8F97]">Sandbox: scripts &amp; forms allowed, origin isolated.</span>
                </div>

                {/* Sandboxed iframe container */}
                <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                  {selectedPreviewUrl ? (
                    <div
                      className="bg-white rounded-xl shadow-md overflow-hidden border border-black/10 transition-all duration-200 h-full flex flex-col"
                      style={{
                        width:
                          deviceView === 'mobile'
                            ? '375px'
                            : deviceView === 'tablet'
                            ? '768px'
                            : '100%',
                      }}
                    >
                      <div className="h-6 bg-[#F2F4F7] px-3 flex items-center gap-1.5 border-b border-black/10">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                        <span className="text-[10px] font-mono text-[#667085] ml-2 truncate">
                          {selectedPreviewUrl}
                        </span>
                      </div>
                      <iframe
                        src={selectedPreviewUrl}
                        sandbox="allow-scripts allow-forms allow-popups"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full flex-1 border-none"
                        title="Custom Website Preview"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-[#667085] space-y-2 max-w-sm">
                      <Globe size={32} className="mx-auto text-[#98A2B3]" />
                      <p className="font-semibold text-[#101828]">No Version Preview Selected</p>
                      <p>Add a new custom version on the left to preview it here inside the sandbox.</p>
                    </div>
                  )}
                </div>

                {/* Bottom Admin Notice */}
                <div className="px-5 py-2.5 bg-white border-t border-black/10 text-[11px] text-[#73737A]">
                  Admin note: The preview link is not private. Anyone with the link can open it. Use dummy content until your host protects previews.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
