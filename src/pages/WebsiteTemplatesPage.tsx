import React, { useState, useEffect, useRef } from 'react';
import {
  WebsiteTemplate,
  TemplateSource,
  DemoSiteDetails,
  DemoSiteBrand,
} from '../types/index.ts';
import {
  getWebsiteTemplates,
  duplicateWebsiteTemplate,
  archiveWebsiteTemplate,
  updateWebsiteTemplateMetadata,
  getTemplateSources,
  saveTemplateSource,
  archiveTemplateSource,
  importTemplatesFromGitHub,
} from '../data/repo.ts';
import { renderWebsiteTemplate } from '../lib/templateEngine.ts';
import {
  parseGitHubRepoInput,
  scanGitHubTemplateSource,
  fetchGitHubRepoDetails,
  ScannedTemplateItem,
  GitHubScanResult,
} from '../lib/githubSync.ts';
import { extractDefaultConfig } from '../lib/reactTemplateManifest.ts';
import { ReactTemplatePreview } from '../components/website/ReactTemplatePreview.tsx';
import {
  Plus,
  Search,
  Eye,
  Copy,
  Edit2,
  Trash2,
  Layout,
  Smartphone,
  Tablet,
  Monitor,
  AlertCircle,
  CheckCircle2,
  X,
  Tag,
  Info,
  Layers,
  Check,
  RefreshCw,
  GitBranch,
  FolderGit2,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileCode,
  Sparkles,
  Activity,
  CheckCircle,
} from 'lucide-react';

const DUMMY_DETAILS: DemoSiteDetails = {
  businessName: 'Fitzwilliam Practice',
  tagline: 'Specialist consultation and modern health services',
  about: 'Providing personalized, evidence-based care with modern facilities and dedicated clinicians.',
  services: [
    { title: 'Comprehensive Consultation', text: 'Detailed diagnostic assessment and tailored treatment planning.' },
    { title: 'Routine Assessments', text: 'Health monitoring and personalized guidance.' },
    { title: 'Specialist Procedures', text: 'Advanced clinical care delivered by accredited specialists.' },
  ],
  phone: '+353 1 234 5678',
  email: 'hello@fitzwilliam.example',
  address: '22 Fitzwilliam Square, Dublin 2, Ireland',
  openingHours: 'Mon - Fri: 08:30 - 18:00',
  ctaText: 'Book an Appointment',
  ctaLink: 'https://fitzwilliam.example/booking',
};

const DUMMY_BRAND: DemoSiteBrand = {
  primaryColor: '#D92D50',
  secondaryColor: '#101828',
  fontStack: 'system-ui, -apple-system, sans-serif',
};

export const WebsiteTemplatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'sources'>('templates');

  // Templates list
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [sources, setSources] = useState<TemplateSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<WebsiteTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Metadata Edit Modal (NO HTML editing - source is frozen and strictly non-editable)
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WebsiteTemplate | null>(null);
  const [metaName, setMetaName] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaTags, setMetaTags] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // GitHub Source Modal state
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);
  const [sourceRepoInput, setSourceRepoInput] = useState('');
  const [sourceBranch, setSourceBranch] = useState('main');
  const [sourceFolder, setSourceFolder] = useState('');
  const [savingSource, setSavingSource] = useState(false);
  const [detectingBranch, setDetectingBranch] = useState(false);
  const [sourceFormError, setSourceFormError] = useState<string | null>(null);

  // Scan & Import state
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<GitHubScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [confirmedDomains, setConfirmedDomains] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Health check probe state
  const [testingHealthId, setTestingHealthId] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<
    Record<string, { status: 'testing' | 'healthy' | 'timeout'; message: string }>
  >({});
  const healthTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Syntax & layout guide toggles
  const [showGuide, setShowGuide] = useState(false);
  const [showRepoHelp, setShowRepoHelp] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastLink, setToastLink] = useState<{ label: string; action: () => void } | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastLink(null);
    setTimeout(() => {
      setToastMessage(null);
      setToastLink(null);
    }, 3500);
  };
  const showToastWithLink = (msg: string, linkText: string, onLinkClick: () => void) => {
    setToastMessage(msg);
    setToastLink({ label: linkText, action: onLinkClick });
    setTimeout(() => {
      setToastMessage(null);
      setToastLink(null);
    }, 5500);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tplList, srcList] = await Promise.all([
        getWebsiteTemplates(),
        getTemplateSources(),
      ]);
      setTemplates(tplList);
      setSources(srcList);
      if (srcList.length > 0 && !selectedSourceId) {
        setSelectedSourceId(srcList[0].id);
      }
    } catch (err) {
      console.error('Failed to load templates or sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allTags = Array.from(
    new Set(templates.flatMap((t) => t.nicheTags || []))
  );

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nicheTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag === 'all' || t.nicheTags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Open Edit Metadata modal (Name, description, tags only - HTML source is non-editable)
  const handleOpenEditMetadata = (t: WebsiteTemplate) => {
    setEditingTemplate(t);
    setMetaName(t.name);
    setMetaDescription(t.description || '');
    setMetaTags((t.nicheTags || []).join(', '));
    setMetaError(null);
    setMetadataModalOpen(true);
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    if (!metaName.trim()) {
      setMetaError('Template name is required.');
      return;
    }

    setSavingMeta(true);
    setMetaError(null);
    try {
      const tags = metaTags
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await updateWebsiteTemplateMetadata(editingTemplate.id, {
        name: metaName.trim(),
        description: metaDescription.trim(),
        nicheTags: tags,
      });

      showToast(`Updated metadata for "${metaName}".`);
      setMetadataModalOpen(false);
      loadData();
    } catch (err: any) {
      setMetaError(err.message || 'Failed to save metadata.');
    } finally {
      setSavingMeta(false);
    }
  };

  // Duplicate metadata
  const handleDuplicate = async (t: WebsiteTemplate) => {
    if (templates.length >= 30) {
      showToast('Maximum limit of 30 templates reached. Please archive unused templates.');
      return;
    }
    try {
      await duplicateWebsiteTemplate(t.id);
      showToast(`Duplicated "${t.name}" metadata successfully.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to duplicate template.');
    }
  };

  // Archive template
  const handleArchive = async (t: WebsiteTemplate) => {
    if (!window.confirm(`Are you sure you want to archive "${t.name}"? It will no longer appear in the Website Studio.`)) {
      return;
    }
    try {
      await archiveWebsiteTemplate(t.id);
      showToast(`Archived "${t.name}".`);
      loadData();
      if (previewTemplate?.id === t.id) {
        setPreviewTemplate(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to archive template.');
    }
  };

  // Window message listener for template health check probe
  useEffect(() => {
    const handleProbeMessage = (event: MessageEvent) => {
      if (!testingHealthId) return;
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'OH_READY' &&
        event.data.version === 1
      ) {
        if (healthTimerRef.current) clearTimeout(healthTimerRef.current);
        setHealthResults((prev) => ({
          ...prev,
          [testingHealthId]: {
            status: 'healthy',
            message: 'Template listens for config',
          },
        }));
        setTestingHealthId(null);
      }
    };

    window.addEventListener('message', handleProbeMessage);
    return () => {
      window.removeEventListener('message', handleProbeMessage);
      if (healthTimerRef.current) clearTimeout(healthTimerRef.current);
    };
  }, [testingHealthId]);

  // One-click health check runner
  const handleCheckHealth = (t: WebsiteTemplate) => {
    if (!t.previewUrl) return;
    if (healthTimerRef.current) clearTimeout(healthTimerRef.current);

    setTestingHealthId(t.id);
    setHealthResults((prev) => ({
      ...prev,
      [t.id]: { status: 'testing', message: 'Testing iframe OH_READY handshake (<=8s)...' },
    }));

    healthTimerRef.current = setTimeout(() => {
      setHealthResults((prev) => ({
        ...prev,
        [t.id]: {
          status: 'timeout',
          message: 'No response: the template did not answer. Check the preview URL and message listener.',
        },
      }));
      setTestingHealthId(null);
    }, 8000);
  };

  // Detect branch from GitHub
  const handleDetectBranch = async (repoInputToUse?: string) => {
    const input = repoInputToUse || sourceRepoInput;
    const parsed = parseGitHubRepoInput(input, sourceBranch, sourceFolder);
    if (!parsed.valid || !parsed.owner || !parsed.repo) {
      return;
    }
    setDetectingBranch(true);
    setSourceFormError(null);
    try {
      const details = await fetchGitHubRepoDetails(parsed.owner, parsed.repo);
      if (details.defaultBranch) {
        setSourceBranch(details.defaultBranch);
      }
    } catch (err: any) {
      setSourceFormError(err.message || 'Failed to detect branch from repository.');
    } finally {
      setDetectingBranch(false);
    }
  };

  // Handle adding new GitHub source
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceFormError(null);

    const parsed = parseGitHubRepoInput(sourceRepoInput, sourceBranch, sourceFolder);
    if (!parsed.valid || !parsed.owner || !parsed.repo) {
      setSourceFormError(parsed.error || 'Invalid repository format.');
      return;
    }

    setSavingSource(true);
    try {
      // Verify repository exists and detect default branch via GET /repos/{owner}/{repo}
      const details = await fetchGitHubRepoDetails(parsed.owner, parsed.repo);
      const effectiveBranch = sourceBranch.trim() || details.defaultBranch || 'main';

      const created = await saveTemplateSource({
        owner: parsed.owner,
        repo: parsed.repo,
        branch: effectiveBranch,
        folder: parsed.folder || '',
      });

      showToast(`Added GitHub source ${created.owner}/${created.repo}.`);
      setAddSourceModalOpen(false);
      setSourceRepoInput('');
      setSourceBranch('main');
      setSourceFolder('');
      await loadData();
      setSelectedSourceId(created.id);
      // Auto-trigger scan for the newly added source
      runScan(created);
    } catch (err: any) {
      setSourceFormError(err.message || 'Failed to save GitHub source.');
    } finally {
      setSavingSource(false);
    }
  };

  // Run scan for a source
  const runScan = async (sourceToScan?: TemplateSource) => {
    const targetSource =
      sourceToScan || sources.find((s) => s.id === selectedSourceId);
    if (!targetSource) {
      showToast('No GitHub source selected to scan.');
      return;
    }

    setScanning(true);
    setScanError(null);
    setScanResult(null);
    setSelectedPaths(new Set());
    setConfirmedDomains(new Set());

    try {
      const result = await scanGitHubTemplateSource(targetSource, templates);
      setScanResult(result);

      // Pre-select items that are New or have Update available
      const preselected = new Set<string>();
      result.items.forEach((item) => {
        if (item.status === 'New' || item.status === 'Update available') {
          preselected.add(item.path);
        }
      });
      setSelectedPaths(preselected);

      if (result.items.length === 0) {
        showToast(`Scan complete: No templates found. See diagnostics below.`);
      } else {
        showToast(`Scan complete: Found ${result.items.length} templates (${result.validCount} valid).`);
      }
    } catch (err: any) {
      setScanError(err.message || 'Scan failed.');
    } finally {
      setScanning(false);
    }
  };

  // Archive a source
  const handleArchiveSource = async (srcId: string) => {
    const src = sources.find((s) => s.id === srcId);
    if (!src) return;
    if (!window.confirm(`Remove GitHub source "${src.owner}/${src.repo}"? Existing imported templates will be kept.`)) {
      return;
    }
    try {
      await archiveTemplateSource(srcId);
      showToast(`Removed source "${src.owner}/${src.repo}".`);
      if (selectedSourceId === srcId) {
        setSelectedSourceId(null);
        setScanResult(null);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove source.');
    }
  };

  // Toggle selection for import
  const togglePathSelection = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedPaths(next);
  };

  // Select all valid items
  const toggleSelectAllValid = () => {
    if (!scanResult) return;
    const validItems = scanResult.items.filter(
      (i) => i.status === 'New' || i.status === 'Update available' || i.status === 'Unchanged'
    );
    if (selectedPaths.size === validItems.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(validItems.map((i) => i.path)));
    }
  };

  // Import selected files
  const handleImportSelected = async () => {
    const activeSource = sources.find((s) => s.id === selectedSourceId);
    if (!activeSource || !scanResult) return;

    const itemsToImport = scanResult.items.filter(
      (item) =>
        selectedPaths.has(item.path) &&
        (item.status === 'New' || item.status === 'Update available' || item.status === 'Unchanged') &&
        (item.templateType === 'react' ? !!item.manifest : !!item.html)
    );

    if (itemsToImport.length === 0) {
      showToast('No valid templates selected for import.');
      return;
    }

    // Verify external domain confirmation for React templates
    const unconfirmed = itemsToImport.find(
      (item) => item.requiresDomainConfirmation && !confirmedDomains.has(item.path)
    );
    if (unconfirmed) {
      showToast(
        `Please confirm external preview host "${unconfirmed.previewHost || 'external'}" before importing.`
      );
      return;
    }

    setImporting(true);
    try {
      const payload = itemsToImport.map((i) => ({
        path: i.path,
        name: i.name,
        description: i.description,
        nicheTags: i.nicheTags,
        html: i.html || '',
        blobSha: i.blobSha || 'blob',
        commitSha: i.commitSha || scanResult.headSha,
        thumbnailDataUrl: i.thumbnailDataUrl,
        templateType: i.templateType || 'html',
        manifest: i.manifest,
        previewUrl: i.previewUrl,
      }));

      const res = await importTemplatesFromGitHub(activeSource.id, payload);

      // Refresh data so it appears in Templates list and builder immediately
      await loadData();

      // Show success toast with clickable link to view the templates
      showToastWithLink(
        `Imported ${res.imported} new template${res.imported === 1 ? '' : 's'}, updated ${res.updated}.`,
        'View in Templates',
        () => setActiveTab('templates')
      );

      // Re-run scan to update status badges to 'Unchanged'
      runScan(activeSource);
    } catch (err: any) {
      showToast(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const activeSource = sources.find((s) => s.id === selectedSourceId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A0A0A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={15} className="text-[#12B76A]" />
          <span>{toastMessage}</span>
          {toastLink && (
            <button
              type="button"
              onClick={toastLink.action}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] underline cursor-pointer"
            >
              {toastLink.label}
            </button>
          )}
        </div>
      )}

      {/* Hidden health probe iframe for live OH_READY handshake testing */}
      {testingHealthId && (
        <iframe
          key={testingHealthId}
          src={templates.find((t) => t.id === testingHealthId)?.previewUrl}
          sandbox="allow-scripts allow-same-origin"
          className="w-0 h-0 opacity-0 pointer-events-none absolute"
          title="Health Check Probe"
        />
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[#0A0A0A]">Website Templates</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 text-[#475467]">
              {templates.length}/30 Active
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Single-file HTML designs synced directly from verified public GitHub repositories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-Tabs Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#E9E9EC] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-white text-[#0A0A0A] shadow-xs'
                  : 'text-[#667085] hover:text-[#0A0A0A]'
              }`}
            >
              Templates ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sources'
                  ? 'bg-white text-[#0A0A0A] shadow-xs'
                  : 'text-[#667085] hover:text-[#0A0A0A]'
              }`}
            >
              <FolderGit2 size={13} className="text-[#D92D50]" />
              <span>GitHub Sync</span>
            </button>
          </div>

          {activeTab === 'sources' ? (
            <button
              type="button"
              onClick={() => {
                setSourceFormError(null);
                setAddSourceModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add GitHub Source</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('sources')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FolderGit2 size={14} />
              <span>Sync from GitHub</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: TEMPLATES BROWSER & CARDS                               */}
      {/* ============================================================== */}
      {activeTab === 'templates' && (
        <div className="space-y-5">
          {/* Search & Tag Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-black/5 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search templates by name, niche, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedTag === 'all'
                    ? 'bg-[#101828] text-white'
                    : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#EAECF0]'
                }`}
              >
                All ({templates.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
                    selectedTag === tag
                      ? 'bg-[#101828] text-white'
                      : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#EAECF0]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#667085] bg-white rounded-2xl border border-black/5">
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-black/5 space-y-3">
              <Layout size={32} className="mx-auto text-[#667085]" />
              <div className="text-sm font-bold text-[#101828]">No templates found</div>
              <p className="text-xs text-[#667085] max-w-sm mx-auto">
                {searchQuery || selectedTag !== 'all'
                  ? 'No templates match the current filter criteria.'
                  : 'Connect a public GitHub repository under "GitHub Sync" to scan and import templates.'}
              </p>
              {searchQuery || selectedTag !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag('all');
                  }}
                  className="text-xs font-bold text-[#D92D50] hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('sources')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D92D50] text-white text-xs font-bold cursor-pointer"
                >
                  <FolderGit2 size={13} />
                  <span>Configure GitHub Sync</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.map((t) => {
                const sections = t.sections || [];
                const variants = t.variants || [];
                const source = t.source;

                return (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header & Provenance */}
                      <div className="p-4 border-b border-black/5 flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#0A0A0A]">{t.name}</span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-black/5 text-[#475467]">
                              v{t.version}
                            </span>
                            {t.templateType === 'react' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                                <FileCode size={11} />
                                <span>React</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/5 text-[#475467]">
                                <span>HTML</span>
                              </span>
                            )}
                          </div>

                          {/* Provenance Badge */}
                          <div>
                            {source ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF2F6] text-[#344054] text-[10px] font-medium border border-black/5">
                                <FolderGit2 size={10} className="text-[#D92D50]" />
                                <span>
                                  GitHub: {source.path.split('/').pop()} @ {source.commitSha ? source.commitSha.slice(0, 7) : 'head'}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3F3F5] text-[#667085] text-[10px] font-medium border border-black/5">
                                <span>Local (legacy)</span>
                              </span>
                            )}
                          </div>

                          {/* React Template Health Check Probe */}
                          {t.templateType === 'react' && t.previewUrl && (
                            <div className="pt-1 flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                disabled={healthResults[t.id]?.status === 'testing'}
                                onClick={() => handleCheckHealth(t)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-black/10 hover:border-black/20 text-[#344054] cursor-pointer disabled:opacity-50 transition-all"
                                title="Check OH_READY handshake in sandboxed iframe"
                              >
                                <Activity
                                  size={10}
                                  className={healthResults[t.id]?.status === 'testing' ? 'animate-spin text-[#D92D50]' : 'text-[#667085]'}
                                />
                                <span>{healthResults[t.id]?.status === 'testing' ? 'Checking health...' : 'Check health'}</span>
                              </button>
                              {healthResults[t.id] && (
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    healthResults[t.id].status === 'healthy'
                                      ? 'bg-[#E7F8EF] text-[#12B76A] border-[#A6F4C5]'
                                      : healthResults[t.id].status === 'testing'
                                      ? 'bg-[#FEF0C7] text-[#B54708] border-[#FEDF89]'
                                      : 'bg-[#FEECEB] text-[#D92D50] border-[#FECDCA]'
                                  }`}
                                >
                                  {healthResults[t.id].status === 'healthy' && <CheckCircle size={10} />}
                                  <span>{healthResults[t.id].message}</span>
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed pt-0.5">
                            {t.description || 'No description provided.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewTemplate(t)}
                          className="p-1.5 rounded-lg border border-black/10 text-[#475467] hover:bg-black/5 hover:text-[#0A0A0A] transition-all cursor-pointer shrink-0"
                          title="Preview Template"
                        >
                          <Eye size={15} />
                        </button>
                      </div>

                      {/* Niche Tags & Detected Sections */}
                      <div className="p-4 space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(t.nicheTags || []).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F2F4F7] text-[#344054]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#667085] pt-1">
                          <span className="flex items-center gap-1">
                            <Layers size={13} className="text-[#667085]" />
                            <span>{sections.length > 0 ? `${sections.length} Sections` : 'Standard Layout'}</span>
                          </span>
                          {variants.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Sparkles size={13} className="text-[#D92D50]" />
                              <span>{variants.length} Variant Group{variants.length > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions: Preview, Duplicate Metadata, Edit Metadata, Archive */}
                    <div className="p-3 bg-[#FAFBFD] border-t border-black/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMetadata(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-black/10 text-[#344054] hover:text-[#0A0A0A] hover:border-black/20 font-semibold transition-all cursor-pointer"
                          title="Edit Template Metadata (name, description, tags)"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-black/10 text-[#344054] hover:text-[#0A0A0A] hover:border-black/20 font-semibold transition-all cursor-pointer"
                          title="Duplicate Metadata"
                        >
                          <Copy size={12} />
                          <span>Duplicate</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleArchive(t)}
                        className="p-1.5 rounded text-[#98A2B3] hover:text-[#D92D50] hover:bg-[#FEECEB] transition-all cursor-pointer"
                        title="Archive Template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GITHUB SYNC (SOURCES, SCAN & IMPORT)                    */}
      {/* ============================================================== */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Sources Selector & Actions */}
          <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0A0A0A] flex items-center gap-2">
                  <FolderGit2 size={16} className="text-[#D92D50]" />
                  <span>Configured GitHub Repositories</span>
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Public repositories containing single-file HTML templates under the configured directory.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSourceFormError(null);
                  setAddSourceModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[#0A0A0A] text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Add Source</span>
              </button>
            </div>

            {sources.length === 0 ? (
              <div className="p-6 text-center bg-[#FAFBFD] rounded-xl border border-dashed border-black/15 space-y-2">
                <FolderGit2 size={24} className="mx-auto text-[#667085]" />
                <div className="text-xs font-bold text-[#101828]">No GitHub sources configured</div>
                <p className="text-xs text-[#667085] max-w-sm mx-auto">
                  Click "Add Source" to connect a public GitHub repository (e.g. <code>owner/repo</code>).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sources.map((src) => {
                    const isSelected = src.id === selectedSourceId;
                    return (
                      <div
                        key={src.id}
                        onClick={() => setSelectedSourceId(src.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-white border-[#D92D50] ring-1 ring-[#D92D50] shadow-xs'
                            : 'bg-[#FAFBFD] border-black/10 hover:border-black/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-[#0A0A0A] truncate">
                              {src.owner}/{src.repo}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-[#475467]">
                              {src.branch}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#667085] flex items-center gap-1.5">
                            <GitBranch size={11} />
                            <span>Folder: <code>{src.folder || 'templates'}</code></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[10px] text-[#667085]">
                          <span>
                            {src.lastScanAt
                              ? `Scanned ${new Date(src.lastScanAt).toLocaleDateString()}`
                              : 'Not yet scanned'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveSource(src.id);
                            }}
                            className="text-[#98A2B3] hover:text-[#D92D50] cursor-pointer"
                            title="Remove source"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scan Action Bar */}
                {activeSource && (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-black/5">
                    <div className="text-xs text-[#475467]">
                      Active source: <strong>{activeSource.owner}/{activeSource.repo}</strong> (branch: <code>{activeSource.branch}</code>, folder: <code>{activeSource.folder || 'templates'}</code>)
                    </div>

                    <button
                      type="button"
                      disabled={scanning}
                      onClick={() => runScan(activeSource)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                      <span>{scanning ? 'Scanning Repository...' : 'Scan Repository'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scan Errors */}
          {scanError && (
            <div className="p-4 rounded-xl bg-[#FEECEB] border border-[#FECDCA] text-[#D92D50] text-xs flex items-start gap-2.5">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Scan Failed</div>
                <div className="mt-0.5 text-xs text-[#912018]">{scanError}</div>
              </div>
            </div>
          )}

          {/* Scan Results Table */}
          {scanResult && (
            <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-2xs space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5">
                <div>
                  <h3 className="text-sm font-bold text-[#0A0A0A] flex items-center gap-2">
                    <span>Scan Results</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 text-[#475467]">
                      Head: {scanResult.headSha.slice(0, 7)}
                    </span>
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    {scanResult.items.length} files found. Nothing is imported until you click "Import selected".
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllValid}
                    className="px-3 py-1.5 rounded-lg border border-black/10 text-xs font-semibold text-[#344054] hover:bg-black/5 transition-all cursor-pointer"
                  >
                    Select All Valid
                  </button>

                  <button
                    type="button"
                    disabled={importing || selectedPaths.size === 0}
                    onClick={handleImportSelected}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <span>{importing ? 'Importing...' : `Import selected (${selectedPaths.size})`}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {scanResult.items.length === 0 ? (
                <div className="p-6 bg-[#FAFBFD] rounded-xl border border-black/10 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={20} className="text-[#B54708] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-[#101828]">No templates found in repository scan</h4>
                      <p className="text-xs text-[#667085]">
                        Scan inspected repository branch and folder paths, but did not find any valid HTML templates or React template manifest.
                      </p>
                    </div>
                  </div>

                  {/* DIAGNOSTIC PANEL */}
                  {scanResult.diagnostics && (
                    <div className="p-4 bg-white rounded-xl border border-black/10 space-y-3">
                      <div className="text-[11px] font-bold text-[#101828] uppercase tracking-wider">
                        Scan Diagnostic Details
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-black/5">
                          <span className="text-[10px] text-[#667085] block">Branch</span>
                          <span className="font-mono font-semibold text-[#101828]">{scanResult.diagnostics.branch}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-black/5">
                          <span className="text-[10px] text-[#667085] block">Folder Inspected</span>
                          <span className="font-mono font-semibold text-[#101828]">
                            {scanResult.diagnostics.folder || '(repo root)'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-black/5">
                          <span className="text-[10px] text-[#667085] block">Files in Tree</span>
                          <span className="font-mono font-semibold text-[#101828]">{scanResult.diagnostics.totalTreeFiles}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-black/5">
                          <span className="text-[10px] text-[#667085] block">package.json</span>
                          <span className={`font-semibold ${scanResult.diagnostics.hasPackageJson ? 'text-[#12B76A]' : 'text-[#667085]'}`}>
                            {scanResult.diagnostics.hasPackageJson ? 'Found' : 'Not found'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FEF0C7] border border-[#FEDF89] text-xs text-[#B54708] flex items-start gap-2">
                        <Info size={15} className="shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-bold">Scan Diagnostics &amp; Hint:</div>
                          <p className="text-[11px] leading-relaxed">{scanResult.diagnostics.hint}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-black/10 text-[#667085] text-[11px] uppercase tracking-wider bg-[#FAFBFD]">
                        <th className="py-2.5 px-3 w-10 text-center">Select</th>
                        <th className="py-2.5 px-3 w-20">Type</th>
                        <th className="py-2.5 px-3">File / Template</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Detected Name &amp; Tags</th>
                        <th className="py-2.5 px-3">Status &amp; Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {scanResult.items.map((item) => {
                        const isSelectable =
                          item.status === 'New' ||
                          item.status === 'Update available' ||
                          item.status === 'Unchanged';
                        const isChecked = selectedPaths.has(item.path);

                        let statusBadge = null;
                        if (item.status === 'New') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F8EF] text-[#12B76A] font-semibold border border-[#A6F4C5] text-[10px]">
                              New
                            </span>
                          );
                        } else if (item.status === 'Update available') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF0C7] text-[#B54708] font-semibold border border-[#FEDF89] text-[10px]">
                              Update available (v{item.existingVersion} → v{(item.existingVersion || 1) + 1})
                            </span>
                          );
                        } else if (item.status === 'Unchanged') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#475467] font-medium border border-black/5 text-[10px]">
                              Unchanged (v{item.existingVersion})
                            </span>
                          );
                        } else if (item.status === 'Missing in repo') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F8F9FA] text-[#475467] font-medium border border-black/10 text-[10px]">
                              Missing in repo
                            </span>
                          );
                        } else if (item.status === 'Invalid') {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEECEB] text-[#D92D50] font-semibold border border-[#FECDCA] text-[10px]">
                              Invalid
                            </span>
                          );
                        }

                        return (
                          <tr
                            key={item.path}
                            className={`hover:bg-[#FAFBFD] transition-colors ${
                              isChecked ? 'bg-[#FAFBFD]' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!isSelectable}
                                checked={isChecked}
                                onChange={() => togglePathSelection(item.path)}
                                className="rounded text-[#D92D50] focus:ring-[#D92D50] cursor-pointer disabled:opacity-30"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              {item.templateType === 'react' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                                  <FileCode size={11} />
                                  <span>React</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/5 text-[#475467]">
                                  <span>HTML</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono text-[11px] font-semibold text-[#101828]">
                                {item.path}
                              </div>
                              <div className="text-[10px] text-[#667085]">
                                {item.blobSha ? `blob ${item.blobSha.slice(0, 7)}` : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#667085] whitespace-nowrap">
                              {item.sizeBytes > 0
                                ? `${(item.sizeBytes / 1024).toFixed(1)} KB`
                                : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-[#101828]">{item.name}</div>
                              {item.nicheTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {item.nicheTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-[9px] px-1.5 py-0.2 rounded bg-black/5 text-[#475467]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                {statusBadge}
                                {item.validatorReason && (
                                  <div className="text-[10px] text-[#D92D50] leading-snug">
                                    {item.validatorReason}
                                  </div>
                                )}
                                {item.requiresDomainConfirmation && item.previewHost && (
                                  <label className="flex items-center gap-1.5 text-[10px] text-[#B54708] bg-[#FEF0C7] p-1.5 rounded border border-[#FEDF89] mt-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={confirmedDomains.has(item.path)}
                                      onChange={() => {
                                        const next = new Set(confirmedDomains);
                                        if (next.has(item.path)) next.delete(item.path);
                                        else next.add(item.path);
                                        setConfirmedDomains(next);
                                      }}
                                      className="rounded text-[#D92D50] focus:ring-[#D92D50] cursor-pointer"
                                    />
                                    <span>Confirm external preview host: <strong>{item.previewHost}</strong></span>
                                  </label>
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
          )}

          {/* Help Panel: Expected Layout & Manifest Example */}
          <div className="bg-[#FAFBFD] border border-black/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
                <Info size={14} className="text-[#D92D50]" />
                <span>GitHub Template Requirements</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* React Layout */}
              <div className="bg-white p-4 rounded-xl border border-black/10 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#101828]">
                  <FileCode size={14} className="text-[#16A34A]" />
                  <span>React Template Layout (Repo Root)</span>
                </div>
                <pre className="p-2.5 bg-[#FAFBFD] rounded-lg border border-black/5 font-mono text-[11px] text-[#344054] overflow-x-auto leading-relaxed">
{`your-react-template/
├── oh-template.json       (Required: schemaVersion: 1)
├── public/
│   └── site.config.json   (Default site config)
├── src/
│   ├── siteConfig.ts      (Config schema & postMessage)
│   └── App.tsx            (Listens for OH_CONFIG)
└── package.json`}
                </pre>
                <p className="text-[11px] text-[#667085]">
                  React templates must have <code>oh-template.json</code> at root. The preview URL must respond with <code>OH_READY</code> via postMessage.
                </p>
              </div>

              {/* HTML Layout */}
              <div className="bg-white p-4 rounded-xl border border-black/10 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#101828]">
                  <Layout size={14} className="text-[#D92D50]" />
                  <span>HTML Template Layout (Folder)</span>
                </div>
                <pre className="p-2.5 bg-[#FAFBFD] rounded-lg border border-black/5 font-mono text-[11px] text-[#344054] overflow-x-auto leading-relaxed">
{`your-html-repo/
└── templates/
    ├── clinic-modern.html (Required: single-file HTML)
    ├── clinic-modern.json (Optional sidecar metadata)
    └── clinic-modern.png  (Optional thumbnail)`}
                </pre>
                <p className="text-[11px] text-[#667085]">
                  Place single-file HTML templates inside a folder (e.g. <code>templates</code>) with CSS in <code>&lt;style&gt;</code> tags.
                </p>
              </div>
            </div>

            {/* Example Manifest */}
            <div className="bg-white p-4 rounded-xl border border-black/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#101828]">
                  Example <code>oh-template.json</code> Manifest
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = JSON.stringify(
                      {
                        schemaVersion: 1,
                        name: 'Modern Clinic Pro',
                        description: 'Clean medical and healthcare landing page with dynamic theme controls.',
                        category: 'Medical',
                        nicheTags: ['medical', 'clinic', 'dentist'],
                        previewUrl: 'https://preview-clinic.pages.dev',
                        fields: [
                          {
                            key: 'businessName',
                            label: 'Clinic Name',
                            type: 'text',
                            section: 'General',
                            defaultValue: 'Fitzwilliam Practice',
                            required: true,
                          },
                          {
                            key: 'primaryColor',
                            label: 'Primary Accent Color',
                            type: 'color',
                            section: 'Theme',
                            defaultValue: '#D92D50',
                          },
                          {
                            key: 'enableOnlineBooking',
                            label: 'Enable Online Booking',
                            type: 'boolean',
                            section: 'Features',
                            defaultValue: true,
                          },
                        ],
                      },
                      null,
                      2
                    );
                    navigator.clipboard.writeText(sample);
                    setCopiedKey('sample-manifest');
                    setTimeout(() => setCopiedKey(null), 2500);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FAFBFD] hover:bg-black/5 text-[#344054] text-[11px] font-semibold border border-black/10 cursor-pointer"
                >
                  {copiedKey === 'sample-manifest' ? (
                    <>
                      <Check size={12} className="text-[#12B76A]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Manifest JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-[#FAFBFD] rounded-lg border border-black/5 font-mono text-[11px] text-[#344054] overflow-x-auto leading-relaxed max-h-48">
{`{
  "schemaVersion": 1,
  "name": "Modern Clinic Pro",
  "description": "Clean medical and healthcare landing page with dynamic theme controls.",
  "category": "Medical",
  "nicheTags": ["medical", "clinic", "dentist"],
  "previewUrl": "https://preview-clinic.pages.dev",
  "fields": [
    {
      "key": "businessName",
      "label": "Clinic Name",
      "type": "text",
      "section": "General",
      "defaultValue": "Fitzwilliam Practice",
      "required": true
    },
    {
      "key": "primaryColor",
      "label": "Primary Accent Color",
      "type": "color",
      "section": "Theme",
      "defaultValue": "#D92D50"
    },
    {
      "key": "enableOnlineBooking",
      "label": "Enable Online Booking",
      "type": "boolean",
      "section": "Features",
      "defaultValue": true
    }
  ]
}`}
              </pre>
            </div>

            <div className="p-3 rounded-xl bg-white border border-black/5 text-xs text-[#344054] space-y-1">
              <div className="font-bold text-[#0A0A0A]">Important Policy:</div>
              <p className="text-[11px] text-[#475467]">
                Do not put client data in this repo. The app only reads from GitHub; it never writes to it.
              </p>
              <p className="text-[11px] text-[#667085] pt-0.5">
                Public repositories only. GitHub API rate limits (60 unauthenticated requests/hour) apply.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD GITHUB SOURCE                                       */}
      {/* ============================================================== */}
      {addSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-black/10">
            <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between bg-[#FAFBFD]">
              <div>
                <h3 className="text-sm font-bold text-[#101828]">Add GitHub Template Source</h3>
                <span className="text-xs text-[#667085]">
                  Public repositories only. Tokens are never stored.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAddSourceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#667085] hover:text-[#101828] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="p-6 space-y-4 text-xs">
              {sourceFormError && (
                <div className="p-3 rounded-xl bg-[#FEECEB] border border-[#FECDCA] text-[#D92D50] text-xs">
                  {sourceFormError}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#101828]">Repository *</label>
                  {detectingBranch && (
                    <span className="text-[10px] text-[#D92D50] flex items-center gap-1 font-medium">
                      <RefreshCw size={10} className="animate-spin" /> Detecting default branch...
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. openhours/templates or https://github.com/owner/repo"
                    value={sourceRepoInput}
                    onBlur={() => {
                      if (sourceRepoInput.trim()) {
                        handleDetectBranch(sourceRepoInput);
                      }
                    }}
                    onChange={(e) => setSourceRepoInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={detectingBranch || !sourceRepoInput.trim()}
                    onClick={() => handleDetectBranch(sourceRepoInput)}
                    className="px-2.5 py-1.5 rounded-lg border border-black/10 hover:bg-black/5 text-xs text-[#344054] font-medium disabled:opacity-40 cursor-pointer shrink-0"
                    title="Detect default branch"
                  >
                    Detect
                  </button>
                </div>
                <span className="text-[10px] text-[#667085] block">
                  Format: <code>owner/repo</code> or full github.com URL. Must be a public repository.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#101828]">Branch</label>
                  <input
                    type="text"
                    required
                    placeholder="main"
                    value={sourceBranch}
                    onChange={(e) => setSourceBranch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#101828]">Folder Path</label>
                  <input
                    type="text"
                    placeholder="Leave empty for React (manifest at root)"
                    value={sourceFolder}
                    onChange={(e) => setSourceFolder(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-[#667085] block leading-tight">
                    Leave empty for React templates (manifest at repo root). Use a folder only for HTML templates.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#FAFBFD] rounded-xl border border-black/5 text-[11px] text-[#667085]">
                Note: Branch and folder reject <code>..</code> path traversals and leading slashes.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setAddSourceModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#475467] hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSource}
                  className="px-4 py-2 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingSource ? 'Connecting...' : 'Connect Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT METADATA ONLY (SOURCE NOT EDITABLE)                */}
      {/* ============================================================== */}
      {metadataModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-black/10">
            <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between bg-[#FAFBFD]">
              <div>
                <h3 className="text-sm font-bold text-[#101828]">Edit Template Metadata</h3>
                <span className="text-xs text-[#667085]">
                  Source code is immutable. Only presentation metadata can be updated.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMetadataModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#667085] hover:text-[#101828] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="p-6 space-y-4 text-xs">
              {metaError && (
                <div className="p-3 rounded-xl bg-[#FEECEB] border border-[#FECDCA] text-[#D92D50] text-xs">
                  {metaError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-[#101828]">Template Name *</label>
                <input
                  type="text"
                  required
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#101828]">Description</label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Summary of layout, ideal use case..."
                  className="w-full p-2.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#101828]">Niche Tags (comma-separated)</label>
                <input
                  type="text"
                  value={metaTags}
                  onChange={(e) => setMetaTags(e.target.value)}
                  placeholder="Medical, Dental, Single-Page"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#FAFBFD] rounded-xl border border-black/5 text-[11px] text-[#667085] space-y-1">
                <div className="font-bold text-[#101828]">Template Provenance:</div>
                <div>
                  {editingTemplate.source ? (
                    <span>GitHub: {editingTemplate.source.path} @ {editingTemplate.source.commitSha.slice(0, 7)}</span>
                  ) : (
                    <span>Local (legacy) template</span>
                  )}
                </div>
                <div className="text-[10px] text-[#475467]">
                  To update template HTML, push the new code to GitHub and run "Scan Repository".
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setMetadataModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#475467] hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMeta}
                  className="px-4 py-2 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingMeta ? 'Saving...' : 'Update Metadata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SANDBOXED IFRAME PREVIEW                                */}
      {/* ============================================================== */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-black/10">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-black/10 flex items-center justify-between bg-[#FAFBFD]">
              <div className="flex items-center gap-3">
                <Layout size={18} className="text-[#D92D50]" />
                <div>
                  <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2">
                    <span>{previewTemplate.name}</span>
                    <span className="text-[10px] font-normal text-[#667085]">
                      (Rendered in sandboxed iframe with sample data)
                    </span>
                  </h3>
                </div>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-black/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                  }`}
                  title="Desktop (100%)"
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    previewDevice === 'tablet' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                  }`}
                  title="Tablet (768px)"
                >
                  <Tablet size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                  }`}
                  title="Mobile (375px)"
                >
                  <Smartphone size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#667085] hover:text-[#101828] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sandboxed iframe container */}
            <div className="flex-1 bg-[#EEF2F6] flex items-center justify-center p-4 overflow-auto">
              <div
                className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-200 border border-black/10 flex flex-col ${
                  previewDevice === 'desktop'
                    ? 'w-full h-full'
                    : previewDevice === 'tablet'
                    ? 'w-[768px] h-full max-h-[800px]'
                    : 'w-[375px] h-full max-h-[720px]'
                }`}
              >
                {previewTemplate.templateType === 'react' && previewTemplate.previewUrl ? (
                  <ReactTemplatePreview
                    previewUrl={previewTemplate.previewUrl}
                    config={previewTemplate.manifest ? extractDefaultConfig(previewTemplate.manifest) : {}}
                    devicePreset={previewDevice}
                    onDevicePresetChange={setPreviewDevice}
                  />
                ) : (
                  <iframe
                    title="Template Preview"
                    srcDoc={renderWebsiteTemplate(previewTemplate.html, DUMMY_DETAILS, DUMMY_BRAND, { withRibbon: true })}
                    sandbox=""
                    className="w-full h-full border-none"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
