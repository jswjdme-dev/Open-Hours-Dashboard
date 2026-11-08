import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  WebsiteProject,
  WebsiteProjectStatus,
  WebsiteProjectBrand,
  WebsiteProjectVariation,
  WebsiteTemplate,
  Client,
  DemoSiteService,
  DemoSiteTestimonial,
  DemoSiteImage,
  DemoSiteSocialLink,
  DemoSiteDetails,
  Partner,
  ProjectRevealConfig,
  RevealStyle,
  ProjectRevealToken,
} from '../types/index.ts';
import {
  getWebsiteProjects,
  getWebsiteProjectById,
  saveWebsiteProject,
  duplicateWebsiteProject,
  archiveWebsiteProject,
  shareWebsiteProjectToClient,
  exportWebsiteProject,
  getWebsiteTemplates,
  getClients,
  getPartners,
  updateProjectRevealConfig,
  getProjectRevealTokens,
  generateProjectRevealToken,
  revokeProjectRevealToken,
  contentGuardCheck,
  reRenderProjectWithLatestTemplate,
  updateWebsiteProjectMode,
  extendWebsiteProjectExpiry,
  regenerateWebsiteProjectExpiry,
  toggleKeepPermanently,
  assignWebsiteProjectToPartner,
} from '../data/repo.ts';
import { PitchProposalBuilder } from '../components/pitch/PitchProposalBuilder.tsx';
import { RevealLinkModal } from '../components/preview/RevealLinkModal.tsx';
import { DemoPreviewWithFeedback } from '../components/preview/DemoPreviewWithFeedback.tsx';
import { RevealSequenceOverlay } from '../components/preview/RevealSequenceOverlay.tsx';
import { CustomProjectManager } from '../components/website/CustomProjectManager.tsx';
import { ReactSchemaForm } from '../components/website/ReactSchemaForm.tsx';
import { ReactTemplatePreview } from '../components/website/ReactTemplatePreview.tsx';
import { generateReactConfigPack } from '../lib/reactExportPack.ts';
import { extractDefaultConfig } from '../lib/reactTemplateManifest.ts';
import {
  renderWebsiteTemplate,
  isContrastAccessible,
  calculateContrastRatio,
  getContrastColor,
  getBrandTint,
  extractColorsFromLogo,
  calculateVariationSimilarity,
  sanitizeUrl,
  escapeHtml,
} from '../lib/templateEngine.ts';
import { downloadZip, dataUrlToUint8Array } from '../lib/zipWriter.ts';
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Share2,
  Download,
  FolderArchive,
  Globe,
  Layout,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  Shuffle,
  Undo2,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  Upload,
  X,
  FileCode,
  Tag,
  Building2,
  ExternalLink,
  MessageSquare,
  History,
  Check,
  RotateCcw,
  Link as LinkIcon,
  Play,
  ShieldAlert,
  Ban,
} from 'lucide-react';

interface WebsiteProjectsPageProps {
  initialProjectId?: string | null;
  initialClientId?: string | null;
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

const WEB_SAFE_FONTS = [
  { label: 'System Sans (Modern & Clean)', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'Inter / UI Neutral', value: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' },
  { label: 'Trebuchet / Geometric Sans', value: '"Trebuchet MS", "Lucida Grande", sans-serif' },
  { label: 'Georgia / Editorial Serif', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'Garamond / Elegant Serif', value: 'Garamond, "Baskerville", serif' },
  { label: 'Clean Monospace', value: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
];

export const WebsiteProjectsPage: React.FC<WebsiteProjectsPageProps> = ({
  initialProjectId,
  initialClientId,
  onOpenClientWorkspace,
}) => {
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>(initialClientId || 'all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'client' | 'pitch'>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [showPitchBuilder, setShowPitchBuilder] = useState(false);

  // Builder Modal / Workspace State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<WebsiteProject | null>(null);
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [revealModalProject, setRevealModalProject] = useState<WebsiteProject | null>(null);
  const [previewMode, setPreviewMode] = useState<'render' | 'feedback'>('render');

  // Step 5: Reveal State
  const [revealEnabled, setRevealEnabled] = useState<boolean>(true);
  const [revealStyle, setRevealStyle] = useState<RevealStyle>('Blur fade');
  const [revealWelcomeLine, setRevealWelcomeLine] = useState<string>('');
  const [revealTokens, setRevealTokens] = useState<ProjectRevealToken[]>([]);
  const [loadingRevealTokens, setLoadingRevealTokens] = useState<boolean>(false);
  const [revealExpiryDays, setRevealExpiryDays] = useState<number>(30);
  const [testRevealActive, setTestRevealActive] = useState<boolean>(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Template Re-render Modal state (Before/After comparison)
  const [rerenderModalProject, setRerenderModalProject] = useState<{
    project: WebsiteProject;
    template: WebsiteTemplate;
  } | null>(null);
  const [rerendering, setRerendering] = useState(false);

  // Builder Form State
  const [formTitle, setFormTitle] = useState('');
  const [formClientId, setFormClientId] = useState<string>('');
  const [formPartnerId, setFormPartnerId] = useState<string>('');
  const [formTemplateId, setFormTemplateId] = useState<string>('');
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(14);
  const [extendReason, setExtendReason] = useState('');
  const [extending, setExtending] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [ctaText, setCtaText] = useState('Book Consultation');
  const [ctaLink, setCtaLink] = useState('');
  const [services, setServices] = useState<DemoSiteService[]>([]);
  const [testimonials, setTestimonials] = useState<DemoSiteTestimonial[]>([]);
  const [images, setImages] = useState<DemoSiteImage[]>([]);
  const [socialLinks, setSocialLinks] = useState<DemoSiteSocialLink[]>([]);
  const [reactConfig, setReactConfig] = useState<Record<string, any>>({});
  const [includePublicContactReactExport, setIncludePublicContactReactExport] = useState<boolean>(false);

  // Brand State
  const [primaryColor, setPrimaryColor] = useState('#D92D50');
  const [secondaryColor, setSecondaryColor] = useState('#101828');
  const [fontStack, setFontStack] = useState(WEB_SAFE_FONTS[0].value);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [radius, setRadius] = useState<number>(12);
  const [density, setDensity] = useState<'compact' | 'normal' | 'airy'>('normal');

  // Variation State
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [sectionsOn, setSectionsOn] = useState<Record<string, boolean>>({});
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState<number>(42);

  // Shuffle Lock State & History for Undo
  const [lockedBrand, setLockedBrand] = useState(false);
  const [lockedSections, setLockedSections] = useState(false);
  const [lockedVariants, setLockedVariants] = useState(false);
  const [shuffleHistory, setShuffleHistory] = useState<Array<{
    primaryColor: string;
    secondaryColor: string;
    fontStack: string;
    radius: number;
    density: 'compact' | 'normal' | 'airy';
    sectionOrder: string[];
    variants: Record<string, string>;
  }>>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, tplList, clList, partList] = await Promise.all([
        getWebsiteProjects(),
        getWebsiteTemplates(),
        getClients(),
        getPartners(),
      ]);
      setProjects(projList);
      setTemplates(tplList);
      setClients(clList);
      setPartners(partList);

      if (initialProjectId) {
        const found = projList.find((p) => p.id === initialProjectId);
        if (found) {
          openProjectInBuilder(found);
        }
      } else if (initialClientId) {
        const clientProjs = projList.filter((p) => p.clientId === initialClientId);
        if (clientProjs.length > 0) {
          openProjectInBuilder(clientProjs[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialProjectId, initialClientId]);

  // Selected Template Object
  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === formTemplateId) || templates[0] || null;
  }, [templates, formTemplateId]);

  // Template usage counts
  const templateUsageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p) => {
      map[p.templateId] = (map[p.templateId] || 0) + 1;
    });
    return map;
  }, [projects]);

  // Open Project in Builder
  const openProjectInBuilder = (project: WebsiteProject) => {
    setActiveProject(project);
    setFormTitle(project.title);
    setFormClientId(project.clientId || '');
    setFormPartnerId(project.partnerId || '');
    setFormTemplateId(project.templateId);

    // Details
    const d = project.details;
    setBusinessName(d.businessName || '');
    setTagline(d.tagline || '');
    setAbout(d.about || '');
    setPhone(d.phone || '');
    setEmail(d.email || '');
    setAddress(d.address || '');
    setOpeningHours(d.openingHours || '');
    setCtaText(d.ctaText || 'Get in Touch');
    setCtaLink(d.ctaLink || '');
    setServices(d.services || []);
    setTestimonials(d.testimonials || []);
    setImages(d.images || []);
    setSocialLinks(d.socialLinks || []);

    // Brand
    const b = project.brand;
    setPrimaryColor(b.primaryColor || '#D92D50');
    setSecondaryColor(b.secondaryColor || '#101828');
    setFontStack(b.fontStack || WEB_SAFE_FONTS[0].value);
    setLogoDataUrl(b.logoDataUrl);
    setRadius(b.radius !== undefined ? b.radius : 12);
    setDensity(b.density || 'normal');

    // Variation
    const v = project.variation;
    setSectionOrder(v.sectionOrder || ['hero', 'about', 'services', 'testimonials', 'contact']);
    setSectionsOn(v.sectionsOn || { hero: true, about: true, services: true, testimonials: true, contact: true });
    setVariants(v.variants || {});
    setSeed(typeof v.seed === 'number' ? v.seed : parseInt(String(v.seed || 42), 10) || 42);
    setShuffleHistory([]);

    // Reveal Configuration
    setRevealEnabled(project.revealConfig?.enabled ?? true);
    setRevealStyle(project.revealConfig?.style ?? 'Blur fade');
    setRevealWelcomeLine(project.revealConfig?.welcomeLine || '');
    if (project.id) {
      loadRevealTokensForProject(project.id);
    } else {
      setRevealTokens([]);
    }

    // React Config initialization
    const projectTpl = templates.find((t) => t.id === project.templateId);
    if (project.reactConfig && Object.keys(project.reactConfig).length > 0) {
      setReactConfig(project.reactConfig);
    } else if (projectTpl?.templateType === 'react' && projectTpl.manifest) {
      setReactConfig(extractDefaultConfig(projectTpl.manifest));
    } else {
      setReactConfig({});
    }

    setBuilderStep(1);
    setBuilderOpen(true);
  };

  const loadRevealTokensForProject = async (projId: string) => {
    try {
      setLoadingRevealTokens(true);
      const list = await getProjectRevealTokens(projId);
      setRevealTokens(list);
    } catch {
      // Safe fallback
    } finally {
      setLoadingRevealTokens(false);
    }
  };

  useEffect(() => {
    if (activeProject?.id && builderStep === 5) {
      loadRevealTokensForProject(activeProject.id);
    }
  }, [activeProject?.id, builderStep]);

  // Open Blank New Project
  const handleOpenNewProject = (forClientId?: string, forPartnerId?: string) => {
    setActiveProject(null);
    const client = clients.find((c) => c.id === forClientId);
    setFormTitle(client ? `${client.businessName} Website` : 'New Website Concept');
    setFormClientId(forClientId || '');
    setFormPartnerId(forPartnerId || '');
    const defaultTpl = templates[0];
    setFormTemplateId(defaultTpl?.id || 'tpl_sample_01');

    // Reveal defaults
    setRevealEnabled(true);
    setRevealStyle('Curtain split');
    setRevealWelcomeLine('');
    setRevealTokens([]);

    if (client) {
      setBusinessName(client.businessName || '');
      const clientNiche = (client as any).niche || (client as any).targetNiche || 'Professional Services';
      setTagline(`Specialist ${clientNiche} studio based in ${client.city || 'Dublin'}`);
      setAbout(`${client.businessName} provides high standard professional services with modern facilities and experienced specialists.`);
      setPhone(client.phone || '+353 1 234 5678');
      setEmail(client.portalUserEmail || 'hello@example.com');
      setAddress((client as any).address || `${client.city || 'Dublin'}, Ireland`);
      setOpeningHours('Mon - Fri: 08:30 - 18:00');
      setCtaText('Book Consultation');
      setCtaLink(`https://${client.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.ie/book`);
      setServices([
        { title: 'Initial Consultation', text: 'Full strategic evaluation and detailed execution plan.' },
        { title: 'Specialist Assessment', text: 'Targeted assessment by certified professionals.' },
        { title: 'Follow-Up & Support', text: 'Structured monitoring and scheduled progress reviews.' },
      ]);
    } else {
      setBusinessName('Apex Studio Solutions');
      setTagline('Modern strategic consulting and bespoke digital solutions');
      setAbout('Delivering high standard consulting and design services with experienced specialists and modern infrastructure.');
      setPhone('+353 1 450 9988');
      setEmail('hello@apexstudio.ie');
      setAddress('Sandyford Business District, Dublin 18, Ireland');
      setOpeningHours('Mon - Fri: 08:00 - 18:30');
      setCtaText('Book Initial Consultation');
      setCtaLink('https://apexstudio.ie/booking');
      setServices([
        { title: 'Comprehensive Consultation', text: 'Thorough strategic assessment and customized plans.' },
        { title: 'Strategic Advisory', text: 'Expert advisory and professional performance metrics.' },
        { title: 'Ongoing Execution', text: 'Continuous dedicated support for sustainable growth.' },
      ]);
    }

    setTestimonials([]);
    setImages([]);
    setSocialLinks([]);

    setPrimaryColor('#D92D50');
    setSecondaryColor('#101828');
    setFontStack(WEB_SAFE_FONTS[0].value);
    setLogoDataUrl(undefined);
    setRadius(12);
    setDensity('normal');

    const defaultSections = defaultTpl?.sections?.map((s) => s.id) || ['hero', 'about', 'services', 'testimonials', 'contact'];
    setSectionOrder(defaultSections);
    const secOnMap: Record<string, boolean> = {};
    defaultSections.forEach((s) => (secOnMap[s] = true));
    setSectionsOn(secOnMap);

    const defaultVariantsMap: Record<string, string> = {};
    defaultTpl?.variants?.forEach((vg) => {
      if (vg.options.length > 0) defaultVariantsMap[vg.group] = vg.options[0];
    });
    setVariants(defaultVariantsMap);
    setSeed(Date.now() % 10000);
    setShuffleHistory([]);

    if (defaultTpl?.templateType === 'react' && defaultTpl.manifest) {
      setReactConfig(extractDefaultConfig(defaultTpl.manifest));
    } else {
      setReactConfig({});
    }

    setBuilderStep(1);
    setBuilderOpen(true);
  };

  // Pre-fill / Copy Details from Client Record
  const handleCopyFromClient = (cId: string) => {
    const client = clients.find((c) => c.id === cId);
    if (!client) return;
    setBusinessName(client.businessName || '');
    const clientNiche = (client as any).niche || (client as any).targetNiche || 'Professional Services';
    setTagline(`Specialist ${clientNiche} studio based in ${client.city || 'Dublin'}`);
    setAbout(`${client.businessName} provides high-quality professional services with state-of-the-art facilities and dedicated specialists.`);
    if (client.phone) setPhone(client.phone);
    if (client.portalUserEmail) setEmail(client.portalUserEmail);
    if ((client as any).address || client.city) {
      setAddress((client as any).address ? `${(client as any).address}, ${client.city || ''}` : `${client.city}, Ireland`);
    }
    showToast(`Copied details from "${client.businessName}".`);
  };

  // Admin Expiry Actions
  const handleExtendExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!extendReason.trim()) {
      showToast('A reason is required to extend project expiry.');
      return;
    }
    setExtending(true);
    try {
      const updated = await extendWebsiteProjectExpiry(
        activeProject.id,
        extendDays,
        extendReason.trim(),
        'Admin'
      );
      setActiveProject(updated);
      setExtendModalOpen(false);
      setExtendReason('');
      showToast(`Expiry extended by +${extendDays} days.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to extend expiry.');
    } finally {
      setExtending(false);
    }
  };

  const handleRegenerateExpiry = async (projectToRegen?: WebsiteProject) => {
    const target = projectToRegen || activeProject;
    if (!target?.id) return;
    try {
      const updated = await regenerateWebsiteProjectExpiry(target.id, 'Admin');
      if (activeProject?.id === target.id) {
        setActiveProject(updated);
      }
      showToast('Project regenerated with fresh 60-day demo lifetime.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate expiry.');
    }
  };

  const handleToggleKeepPermanently = async (projectToToggle?: WebsiteProject) => {
    const target = projectToToggle || activeProject;
    if (!target?.id) return;
    try {
      const nextKeep = !target.keepPermanently;
      const updated = await toggleKeepPermanently(target.id, nextKeep, 'Admin');
      if (activeProject?.id === target.id) {
        setActiveProject(updated);
      }
      showToast(`Permanent retention ${nextKeep ? 'enabled' : 'disabled'}.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle permanent retention.');
    }
  };

  // Image Upload with Auto-Resize to max 1600px
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 6) {
      showToast('Maximum 6 images allowed per website project.');
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 1024 * 1024) {
        showToast(`Image "${file.name}" exceeds 1 MB limit before resize.`);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setImages((prev) => [
              ...prev,
              {
                id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                url: resizedDataUrl,
                caption: file.name.replace(/\.[^/.]+$/, ''),
              },
            ]);
            showToast(`Uploaded & optimized image (${width}x${height}px).`);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Logo Upload (PNG/JPG/WebP/SVG max 1 MB, SVG used only via <img>, never inlined)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showToast('Logo file exceeds 1 MB maximum size.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLogoDataUrl(dataUrl);
      showToast('Logo uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  // Color extraction from logo using canvas
  const handlePickColorsFromLogo = async () => {
    if (!logoDataUrl) {
      showToast('Please upload a logo image first.');
      return;
    }
    try {
      const extracted = await extractColorsFromLogo(logoDataUrl);
      if (extracted) {
        setPrimaryColor(extracted.primaryColor);
        setSecondaryColor(extracted.secondaryColor);
        showToast('Extracted brand colours from logo.');
      } else {
        showToast('Could not extract dominant colour from logo.');
      }
    } catch (err) {
      showToast('Error analyzing logo colours.');
    }
  };

  // Section Order Up/Down helpers
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setSectionOrder(newOrder);
  };

  // Shuffle Function
  const handleShuffle = () => {
    // Record undo state
    setShuffleHistory((prev) => [
      ...prev,
      {
        primaryColor,
        secondaryColor,
        fontStack,
        radius,
        density,
        sectionOrder: [...sectionOrder],
        variants: { ...variants },
      },
    ]);

    const randomPalettes = [
      { p: '#D92D50', s: '#101828' },
      { p: '#0E7090', s: '#0F172A' },
      { p: '#15803D', s: '#1C1917' },
      { p: '#6366F1', s: '#09090B' },
      { p: '#B45309', s: '#18181B' },
      { p: '#2563EB', s: '#0F172A' },
      { p: '#7C3AED', s: '#1E1B4B' },
    ];

    if (!lockedBrand) {
      const pick = randomPalettes[Math.floor(Math.random() * randomPalettes.length)];
      setPrimaryColor(pick.p);
      setSecondaryColor(pick.s);
      setFontStack(WEB_SAFE_FONTS[Math.floor(Math.random() * WEB_SAFE_FONTS.length)].value);
      setRadius(Math.floor(Math.random() * 5) * 6); // 0, 6, 12, 18, 24
      const densities: Array<'compact' | 'normal' | 'airy'> = ['compact', 'normal', 'airy'];
      setDensity(densities[Math.floor(Math.random() * densities.length)]);
    }

    if (!lockedSections && sectionOrder.length > 2) {
      // Keep hero first for logical UX, shuffle the middle sections
      const hero = sectionOrder[0];
      const rest = sectionOrder.slice(1);
      const shuffledRest = [...rest].sort(() => Math.random() - 0.5);
      setSectionOrder([hero, ...shuffledRest]);
    }

    if (!lockedVariants && selectedTemplate?.variants) {
      const newVars: Record<string, string> = {};
      selectedTemplate.variants.forEach((vg) => {
        if (vg.options.length > 0) {
          newVars[vg.group] = vg.options[Math.floor(Math.random() * vg.options.length)];
        }
      });
      setVariants(newVars);
    }

    setSeed((s) => (s + 17) % 10000);
    showToast('Applied creative shuffle variation.');
  };

  const handleUndoShuffle = () => {
    if (shuffleHistory.length === 0) return;
    const prev = shuffleHistory[shuffleHistory.length - 1];
    setPrimaryColor(prev.primaryColor);
    setSecondaryColor(prev.secondaryColor);
    setFontStack(prev.fontStack);
    setRadius(prev.radius);
    setDensity(prev.density);
    setSectionOrder(prev.sectionOrder);
    setVariants(prev.variants);
    setShuffleHistory((h) => h.slice(0, -1));
    showToast('Reverted shuffle to previous setting.');
  };

  // Compile Current Project Details for Rendering & Comparison
  const currentDetails: DemoSiteDetails = useMemo(() => {
    return {
      businessName,
      tagline,
      about,
      phone,
      email,
      address,
      openingHours,
      ctaText,
      ctaLink: sanitizeUrl(ctaLink),
      services,
      testimonials,
      images,
      socialLinks,
    };
  }, [
    businessName,
    tagline,
    about,
    phone,
    email,
    address,
    openingHours,
    ctaText,
    ctaLink,
    services,
    testimonials,
    images,
    socialLinks,
  ]);

  const currentBrand: WebsiteProjectBrand = useMemo(() => {
    return {
      primaryColor,
      secondaryColor,
      fontStack,
      logoDataUrl,
      radius,
      density,
    };
  }, [primaryColor, secondaryColor, fontStack, logoDataUrl, radius, density]);

  const currentVariation: WebsiteProjectVariation = useMemo(() => {
    return {
      sectionOrder,
      sectionsOn,
      variants,
      seed,
    };
  }, [sectionOrder, sectionsOn, variants, seed]);

  // Live Rendered HTML for Iframe Preview
  const liveRenderedHtml = useMemo(() => {
    if (!selectedTemplate) return '<div>No template selected</div>';
    return renderWebsiteTemplate(
      selectedTemplate.html,
      currentDetails,
      currentBrand,
      {
        withRibbon: true,
        variation: currentVariation,
      }
    );
  }, [selectedTemplate, currentDetails, currentBrand, currentVariation]);

  // Contrast Checking
  const contrastRatio = useMemo(() => {
    return calculateContrastRatio(primaryColor, '#FFFFFF');
  }, [primaryColor]);
  const isContrastSufficient = contrastRatio >= 4.5;

  // Similarity Warning Checking (compares current to every other non-archived project)
  const similarityWarning = useMemo(() => {
    if (!formTemplateId) return null;
    for (const p of projects) {
      if (activeProject && p.id === activeProject.id) continue;
      if (p.archivedAt) continue;

      const sim = calculateVariationSimilarity(
        {
          templateId: formTemplateId,
          brand: currentBrand,
          variation: currentVariation,
        },
        p
      );

      if (sim.percentage >= 80) {
        return {
          otherProject: p,
          percentage: sim.percentage,
          reasons: sim.reasons,
        };
      }
    }
    return null;
  }, [formTemplateId, currentBrand, currentVariation, projects, activeProject]);

  // Action: Save Draft
  const handleSaveDraft = async () => {
    const isReact = selectedTemplate?.templateType === 'react';
    const effectiveBusinessName = isReact
      ? (reactConfig?.details?.businessName || reactConfig?.businessName || businessName || formTitle || 'Website Concept')
      : businessName;

    if (!effectiveBusinessName.trim()) {
      showToast('Please enter a business name in Step 1.');
      setBuilderStep(1);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveWebsiteProject({
        id: activeProject?.id,
        clientId: formClientId ? formClientId : undefined,
        partnerId: formPartnerId ? formPartnerId : undefined,
        title: formTitle.trim() || `${effectiveBusinessName} Website`,
        templateId: formTemplateId || 'tpl_sample_01',
        templateVersion: selectedTemplate?.version || 1,
        templateType: selectedTemplate?.templateType || 'html',
        reactConfig: isReact ? reactConfig : undefined,
        details: currentDetails,
        brand: currentBrand,
        variation: currentVariation,
        status: activeProject?.status === 'Exported' ? 'Exported' : 'Draft',
        revealConfig: {
          enabled: revealEnabled,
          style: revealStyle,
          welcomeLine: revealWelcomeLine.trim() || undefined,
        },
      });
      setActiveProject(saved);
      showToast('Project saved as Draft.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  // Action: Share to Client Portal
  const handleShareToClient = async () => {
    if (!formClientId) {
      showToast('Please link this project to a client before sharing to the client portal.');
      setBuilderStep(1);
      return;
    }
    const isReact = selectedTemplate?.templateType === 'react';
    const effectiveBusinessName = isReact
      ? (reactConfig?.details?.businessName || reactConfig?.businessName || businessName || formTitle || 'Website Concept')
      : businessName;

    setSaving(true);
    try {
      // Save latest state first
      const saved = await saveWebsiteProject({
        id: activeProject?.id,
        clientId: formClientId,
        partnerId: formPartnerId ? formPartnerId : undefined,
        title: formTitle.trim() || `${effectiveBusinessName} Website`,
        templateId: formTemplateId || 'tpl_sample_01',
        templateVersion: selectedTemplate?.version || 1,
        templateType: selectedTemplate?.templateType || 'html',
        reactConfig: isReact ? reactConfig : undefined,
        details: currentDetails,
        brand: currentBrand,
        variation: currentVariation,
        status: 'Draft',
        revealConfig: {
          enabled: revealEnabled,
          style: revealStyle,
          welcomeLine: revealWelcomeLine.trim() || undefined,
        },
      });

      // Now share
      const shared = await shareWebsiteProjectToClient(saved.id);
      setActiveProject(shared);
      showToast(`Website project (v${shared.version}) shared to client portal!`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to share to client portal.');
    } finally {
      setSaving(false);
    }
  };

  // Step 5: Save Reveal Configuration Directly
  const handleSaveRevealConfig = async () => {
    if (!activeProject?.id) {
      await handleSaveDraft();
      return;
    }
    try {
      setSaving(true);
      const updated = await updateProjectRevealConfig(
        activeProject.id,
        {
          enabled: revealEnabled,
          style: revealStyle,
          welcomeLine: revealWelcomeLine.trim() || undefined,
        },
        'Admin'
      );
      setActiveProject(updated);
      showToast('Reveal settings saved successfully.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update reveal configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Step 5: Generate Reveal Link Token
  const handleGenerateRevealToken = async () => {
    let targetProjectId = activeProject?.id;
    if (!targetProjectId) {
      const isReact = selectedTemplate?.templateType === 'react';
      const effectiveBusinessName = isReact
        ? (reactConfig?.details?.businessName || reactConfig?.businessName || businessName || formTitle || 'Website Concept')
        : businessName;

      if (!effectiveBusinessName.trim()) {
        showToast('Please enter a business name in Step 1 first.');
        setBuilderStep(1);
        return;
      }
      // Save draft first
      setSaving(true);
      try {
        const saved = await saveWebsiteProject({
          clientId: formClientId || undefined,
          partnerId: formPartnerId ? formPartnerId : undefined,
          title: formTitle.trim() || `${effectiveBusinessName} Website`,
          templateId: formTemplateId || 'tpl_sample_01',
          templateVersion: selectedTemplate?.version || 1,
          templateType: selectedTemplate?.templateType || 'html',
          reactConfig: isReact ? reactConfig : undefined,
          details: currentDetails,
          brand: currentBrand,
          variation: currentVariation,
          status: 'Draft',
          revealConfig: {
            enabled: revealEnabled,
            style: revealStyle,
            welcomeLine: revealWelcomeLine.trim() || undefined,
          },
        });
        setActiveProject(saved);
        targetProjectId = saved.id;
        loadData();
      } catch (err: any) {
        showToast(err.message || 'Failed to create project draft before token generation.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    try {
      setLoadingRevealTokens(true);
      await generateProjectRevealToken(targetProjectId, revealExpiryDays, 'Admin');
      const list = await getProjectRevealTokens(targetProjectId);
      setRevealTokens(list);
      showToast(`Generated reveal link with ${revealExpiryDays === 0 ? 'no' : `${revealExpiryDays} days`} expiry.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate reveal link.');
    } finally {
      setLoadingRevealTokens(false);
    }
  };

  // Step 5: Revoke Token
  const handleRevokeRevealToken = async (tokenId: string) => {
    if (!window.confirm('Are you sure you want to revoke this reveal preview link? The recipient will no longer be able to view the concept.')) {
      return;
    }
    try {
      setLoadingRevealTokens(true);
      await revokeProjectRevealToken(tokenId, 'Admin');
      if (activeProject?.id) {
        const list = await getProjectRevealTokens(activeProject.id);
        setRevealTokens(list);
      }
      showToast('Reveal link revoked.');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke reveal link.');
    } finally {
      setLoadingRevealTokens(false);
    }
  };

  // Step 5: Copy Token Link
  const handleCopyRevealLink = async (tokenStr: string, tokenId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/preview/${tokenStr}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedTokenId(tokenId);
      setTimeout(() => setCopiedTokenId(null), 2500);
      showToast('Copied reveal link to clipboard.');
    } catch {
      showToast(`Could not copy automatically. URL: ${fullUrl}`);
    }
  };

  // Action: Download Single-File HTML Demo
  const handleDownloadHtml = () => {
    const cleanFilename = `${(businessName || 'website').toLowerCase().replace(/[^a-z0-9]/g, '-')}-demo.html`;
    const blob = new Blob([liveRenderedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${cleanFilename}`);
  };

  // Action: Export ZIP (Clean production files without ribbon, assets/ folder, readme.txt)
  const handleExportZip = async () => {
    setSaving(true);
    try {
      // 1. Render clean HTML without ribbon
      const productionHtml = renderWebsiteTemplate(
        selectedTemplate?.html || '',
        currentDetails,
        currentBrand,
        {
          withRibbon: false,
          variation: currentVariation,
        }
      );

      // 2. Prepare files array
      const zipFiles: Array<{ name: string; content: string | Uint8Array }> = [];

      // index.html
      zipFiles.push({
        name: 'index.html',
        content: productionHtml,
      });

      // assets/logo
      if (logoDataUrl) {
        try {
          const { bytes, extension } = dataUrlToUint8Array(logoDataUrl);
          zipFiles.push({
            name: `assets/logo.${extension}`,
            content: bytes,
          });
        } catch {
          // ignore logo binary extraction failure
        }
      }

      // assets/images
      images.forEach((img, idx) => {
        if (img.url && img.url.startsWith('data:')) {
          try {
            const { bytes, extension } = dataUrlToUint8Array(img.url);
            zipFiles.push({
              name: `assets/image_${idx + 1}.${extension}`,
              content: bytes,
            });
          } catch {
            // ignore image binary failure
          }
        }
      });

      // readme.txt
      const readmeContent = `=====================================================
WEBSITE STUDIO PRODUCTION EXPORT
Project: ${formTitle || businessName}
Exported: ${new Date().toISOString()}
Template: ${selectedTemplate?.name || 'Standard'} (v${selectedTemplate?.version || 1})
=====================================================

Contents:
- index.html: Clean, self-contained responsive website code.
  Free of demo banners, debug ribbons, and tracking scripts.
- assets/: Extracted logos and visual imagery (if supplied).

Quick Deployment Instructions:
1. Static Web Hosting:
   Upload "index.html" and the "assets/" folder directly to
   Cloudflare Pages, Vercel, Netlify, AWS S3, or Firebase Hosting.

2. Apache / Nginx / Traditional cPanel:
   Drop all files into your "public_html" or "www" root directory.

Security & Integrity:
All form inputs are sanitized, inline CSS is scoped with CSS variables,
and external script injection has been eliminated.
`;
      zipFiles.push({
        name: 'readme.txt',
        content: readmeContent,
      });

      const zipFilename = `${(businessName || 'website').toLowerCase().replace(/[^a-z0-9]/g, '-')}-production-export.zip`;
      downloadZip(zipFilename, zipFiles);

      if (activeProject) {
        await exportWebsiteProject(activeProject.id, 'zip', true);
        loadData();
      }

      showToast(`Exported production ZIP "${zipFilename}"!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate ZIP package.');
    } finally {
      setSaving(false);
    }
  };

  // Action: Download React Config Pack (.zip)
  const handleDownloadReactConfigPack = async () => {
    setSaving(true);
    try {
      const projTitle = formTitle.trim() || `${businessName || 'Project'} Website`;
      const pack = generateReactConfigPack({
        projectTitle: projTitle,
        templateName: selectedTemplate?.name || 'React Template',
        config: reactConfig,
        includePublicContactDetails: includePublicContactReactExport,
      });

      const blob = new Blob([pack.zipBytes as any], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pack.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (activeProject) {
        await exportWebsiteProject(activeProject.id, 'zip', true);
        loadData();
      }

      showToast(`Exported config pack "${pack.filename}"!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate config pack.');
    } finally {
      setSaving(false);
    }
  };

  // Action: Duplicate Project
  const handleDuplicate = async (p: WebsiteProject) => {
    try {
      await duplicateWebsiteProject(p.id);
      showToast(`Duplicated "${p.title}".`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to duplicate project.');
    }
  };

  // Action: Archive Project
  const handleArchive = async (p: WebsiteProject) => {
    if (!window.confirm(`Are you sure you want to archive "${p.title}"?`)) return;
    try {
      await archiveWebsiteProject(p.id);
      showToast(`Archived "${p.title}".`);
      loadData();
      if (activeProject?.id === p.id) {
        setBuilderOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to archive project.');
    }
  };

  // Action: Confirm Re-render with latest template version
  const handleConfirmRerender = async () => {
    if (!rerenderModalProject) return;
    setRerendering(true);
    try {
      const updated = await reRenderProjectWithLatestTemplate(rerenderModalProject.project.id);
      showToast(`Re-rendered "${updated.title}" with template v${updated.templateVersion}.`);
      setRerenderModalProject(null);
      if (activeProject?.id === updated.id) {
        setActiveProject(updated);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to re-render project.');
    } finally {
      setRerendering(false);
    }
  };

  // Action: Switch to Custom Mode
  const handleSwitchToCustom = async () => {
    if (activeProject) {
      try {
        const updated = await updateWebsiteProjectMode(activeProject.id, 'custom');
        setActiveProject(updated);
        loadData();
        showToast('Switched to Custom (AI Studio + GitHub) mode.');
      } catch (err: any) {
        showToast(err?.message || 'Failed to switch mode.');
      }
    } else {
      showToast('Save project details first to enable Custom mode.');
    }
  };

  // Filtered Projects List
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.details.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.prospectName && p.prospectName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesKind =
      kindFilter === 'all'
        ? true
        : kindFilter === 'pitch'
        ? p.kind === 'pitch'
        : p.kind !== 'pitch';
    const matchesPartner =
      partnerFilter === 'all'
        ? true
        : p.partnerId === partnerFilter;
    const matchesClient =
      clientFilter === 'all'
        ? true
        : clientFilter === 'prospects'
        ? !p.clientId
        : p.clientId === clientFilter;
    const matchesTemplate = templateFilter === 'all' || p.templateId === templateFilter;
    return matchesSearch && matchesStatus && matchesKind && matchesPartner && matchesClient && matchesTemplate;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#101828] text-white text-xs font-semibold shadow-xl border border-white/10 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={15} className="text-[#12B76A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#101828] flex items-center gap-2">
              <Globe size={22} className="text-[#D92D50]" />
              <span>Website Studio Projects</span>
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#475467]">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1 max-w-xl">
            Interactive multi-variation website builder. Create tailored demos for prospects, share to client portals, and export production-ready ZIPs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPitchBuilder(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#101828] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            title="Create a new client website pitch and proposal"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>New Pitch Proposal</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewProject()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>New Website</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white p-3.5 rounded-xl border border-black/5 shadow-2xs">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            placeholder="Search by title, business or prospect..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
          />
        </div>

        {/* Kind Filter */}
        <div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as any)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
          >
            <option value="all">All Project Types</option>
            <option value="client">Client Websites</option>
            <option value="pitch">Pitches &amp; Proposals</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Shared">Shared</option>
            <option value="Changes requested">Changes requested</option>
            <option value="Approved">Approved</option>
            <option value="Exported">Exported</option>
          </select>
        </div>

        {/* Partner Filter */}
        <div>
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
          >
            <option value="all">All Partners</option>
            {partners.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Template Filter */}
        <div>
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
          >
            <option value="all">All Templates</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#667085]">Loading website projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-black/10 space-y-3">
          <Globe size={36} className="mx-auto text-[#98A2B3]" />
          <div className="font-bold text-sm text-[#101828]">No website projects found</div>
          <p className="text-xs text-[#667085] max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || clientFilter !== 'all' || templateFilter !== 'all' || kindFilter !== 'all' || partnerFilter !== 'all'
              ? 'No projects match your current filters. Try resetting search or filter criteria.'
              : 'You have not created any website projects yet. Draft your first concept for a client or prospect.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowPitchBuilder(true)}
              className="px-3 py-1.5 bg-[#101828] text-white text-xs font-semibold rounded-lg hover:bg-black cursor-pointer inline-flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>New Pitch Proposal</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenNewProject()}
              className="px-3 py-1.5 bg-[#D92D50] text-white text-xs font-semibold rounded-lg hover:bg-[#C42447] cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create First Website</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const client = clients.find((c) => c.id === p.clientId);
            const template = templates.find((t) => t.id === p.templateId);

            const statusColor =
              p.status === 'Approved'
                ? 'bg-[#E7F8EF] text-[#12B76A] border-[#A6F4C5]'
                : p.status === 'Shared'
                ? 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]'
                : p.status === 'Changes requested'
                ? 'bg-[#FEF6EE] text-[#F79009] border-[#FEE4E2]'
                : p.status === 'Exported'
                ? 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]'
                : 'bg-[#F2F4F7] text-[#475467] border-[#EAECF0]';

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header & Status */}
                  <div className="p-4 border-b border-black/5 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#101828] line-clamp-1">{p.title}</span>
                        {p.kind === 'pitch' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Pitch Mockup
                          </span>
                        )}
                        {p.mode === 'custom' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#101828] text-white">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#475467]">
                        <Building2 size={13} className="text-[#667085]" />
                        {client ? (
                          <span className="font-semibold text-[#101828]">{client.businessName}</span>
                        ) : p.prospectName ? (
                          <span className="text-[#101828] font-medium">Prospect: {p.prospectName}</span>
                        ) : (
                          <span className="text-[#667085] italic">Prospect / Unlinked</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {p.keepPermanently || p.status === 'Approved' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          Permanent
                        </span>
                      ) : p.status === 'Expired' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                          Expired
                        </span>
                      ) : p.expiresAt ? (
                        (() => {
                          const days = Math.ceil(
                            (new Date(p.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                          );
                          return (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                days <= 7
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {days <= 0 ? 'Expires today' : `${days} days left`}
                            </span>
                          );
                        })()
                      ) : null}

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor} shrink-0`}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Body & Specs */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-[#667085]">
                      <span>Template:</span>
                      <span className="font-semibold text-[#101828]">
                        {template?.name || 'Custom'} (v{p.templateVersion})
                      </span>
                    </div>

                    {/* Template Update Available Alert */}
                    {template && template.version > p.templateVersion && (
                      <div className="p-2 rounded-xl bg-[#FEF0C7] border border-[#FEDF89] text-[#B54708] text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 font-semibold text-[10px]">
                          <RefreshCw size={11} className="text-[#B54708] shrink-0" />
                          <span>v{template.version} update available</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRerenderModalProject({ project: p, template })}
                          className="px-2 py-0.5 rounded bg-[#B54708] hover:bg-[#93370D] text-white text-[10px] font-bold cursor-pointer transition-all shrink-0 shadow-2xs"
                        >
                          Re-render
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[#667085]">
                      <span>Project Version:</span>
                      <span className="font-mono text-[#101828]">v{p.version}</span>
                    </div>

                    <div className="flex items-center justify-between text-[#667085]">
                      <span>Brand Primary:</span>
                      <span className="flex items-center gap-1 font-mono">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: p.brand.primaryColor }}
                        />
                        {p.brand.primaryColor}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#667085]">
                      <span>Partner:</span>
                      <select
                        value={p.partnerId || ''}
                        onChange={async (e) => {
                          const val = e.target.value || null;
                          await assignWebsiteProjectToPartner(p.id, val, 'Admin');
                          await loadData();
                        }}
                        className="text-[11px] font-semibold text-[#101828] bg-transparent border-b border-dashed border-black/20 focus:outline-none cursor-pointer max-w-[140px] truncate"
                        title="Assign to partner"
                      >
                        <option value="">None (Direct)</option>
                        {partners.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Client Feedback Notice if changes requested */}
                    {p.status === 'Changes requested' && p.clientFeedback && (
                      <div className="p-2.5 rounded-xl bg-[#FEF6EE] border border-[#FEE4E2] text-[#B54708] text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <MessageSquare size={12} />
                          <span>Client Feedback:</span>
                        </div>
                        <p className="line-clamp-2 italic">"{p.clientFeedback}"</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-[#FAFBFD] border-t border-black/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openProjectInBuilder(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#D92D50] hover:bg-[#C42447] text-white font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit2 size={12} />
                      <span>Edit &amp; Build</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(p)}
                      className="p-1.5 rounded bg-white border border-black/10 text-[#475467] hover:text-[#101828] cursor-pointer"
                      title="Duplicate Project"
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setRevealModalProject(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-black/15 text-[#344054] hover:text-[#101828] hover:bg-black/5 font-semibold transition-all cursor-pointer shadow-2xs"
                      title="Generate or copy public reveal link"
                    >
                      <LinkIcon size={12} />
                      <span>Reveal link</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {client && onOpenClientWorkspace && (
                      <button
                        type="button"
                        onClick={() => onOpenClientWorkspace(client.id, client.businessName)}
                        className="text-[11px] text-[#667085] hover:text-[#101828] font-semibold cursor-pointer"
                        title="Open Client Detail"
                      >
                        Client Detail &rarr;
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleArchive(p)}
                      className="p-1 rounded text-[#98A2B3] hover:text-[#D92D50] hover:bg-[#FEECEB] transition-all cursor-pointer"
                      title="Archive Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM MODE (AI STUDIO + GITHUB) MODAL */}
      {/* ========================================================================= */}
      {builderOpen && activeProject && activeProject.mode === 'custom' && (
        <CustomProjectManager
          project={activeProject}
          clients={clients}
          otherProjects={projects.filter((p) => p.id !== activeProject.id)}
          onUpdateProject={(updated) => {
            setActiveProject(updated);
            loadData();
          }}
          onSwitchToTemplate={async () => {
            const updated = await updateWebsiteProjectMode(activeProject.id, 'template');
            setActiveProject(updated);
            loadData();
            showToast('Switched back to Template builder.');
          }}
          onClose={() => setBuilderOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* 4-STEP TEMPLATE BUILDER MODAL WITH STICKY LIVE PREVIEW */}
      {/* ========================================================================= */}
      {builderOpen && (!activeProject || activeProject.mode !== 'custom') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-black/10">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-black/10 flex items-center justify-between bg-[#FAFBFD] flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Globe size={18} className="text-[#D92D50]" />
                <div>
                  <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2 flex-wrap">
                    <span>{formTitle || 'Website Project Builder'}</span>
                    {activeProject && (
                      <span className="text-[10px] font-mono text-[#667085]">
                        (v{activeProject.version} &middot; {activeProject.status})
                      </span>
                    )}

                    {/* Expiry Countdown Pill in Header */}
                    {activeProject && (
                      activeProject.keepPermanently || activeProject.status === 'Approved' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Permanent
                        </span>
                      ) : activeProject.status === 'Expired' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                          Expired
                        </span>
                      ) : activeProject.expiresAt ? (
                        (() => {
                          const days = Math.ceil(
                            (new Date(activeProject.expiresAt).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          );
                          return (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                days <= 7
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {days <= 0 ? 'Expires today' : `${days} days left`}
                            </span>
                          );
                        })()
                      ) : null
                    )}
                  </h3>
                </div>

                {/* Quick Client & Partner Assignment in Header */}
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={formClientId}
                    onChange={(e) => {
                      setFormClientId(e.target.value);
                      if (e.target.value) handleCopyFromClient(e.target.value);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
                    title="Assign to client"
                  >
                    <option value="">Assign client: None</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        Client: {c.businessName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={formPartnerId}
                    onChange={(e) => setFormPartnerId(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
                    title="Assign to partner"
                  >
                    <option value="">Assign partner: None</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        Partner: {p.name}
                      </option>
                    ))}
                  </select>

                  {/* Header Expiry Actions */}
                  {activeProject && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExtendModalOpen(true)}
                        className="px-2 py-1 text-[11px] font-bold bg-white border border-black/15 text-[#344054] hover:bg-black/5 rounded-lg cursor-pointer"
                        title="Extend project expiry with reason"
                      >
                        Extend
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRegenerateExpiry()}
                        className="px-2 py-1 text-[11px] font-bold bg-white border border-black/15 text-[#344054] hover:bg-black/5 rounded-lg cursor-pointer"
                        title="Regenerate project with fresh 60-day expiry"
                      >
                        Regenerate
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleKeepPermanently()}
                        className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          activeProject.keepPermanently
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white text-[#667085] border-black/15 hover:text-[#101828]'
                        }`}
                        title="Toggle permanent retention (exempt from expiry)"
                      >
                        {activeProject.keepPermanently ? 'Permanent: ON' : 'Keep permanent'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Switch & Step Navigation Pill */}
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#E4E7EC] text-xs font-semibold">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md bg-white text-[#101828] font-bold shadow-2xs cursor-default"
                  >
                    Template
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToCustom}
                    className="px-3 py-1 rounded-md text-[#475467] hover:text-[#101828] transition-all cursor-pointer"
                    title="Switch to Custom Mode (Google AI Studio + GitHub)"
                  >
                    Custom
                  </button>
                </div>

                {/* Step Navigation Pill */}
                <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-full text-xs font-semibold">
                  {[
                    { s: 1, label: '1. Details' },
                    { s: 2, label: '2. Template' },
                    { s: 3, label: '3. Brand & Variations' },
                    { s: 4, label: '4. Preview & Actions' },
                    { s: 5, label: '5. Reveal' },
                  ].map((item) => (
                    <button
                      key={item.s}
                      type="button"
                      onClick={() => setBuilderStep(item.s as any)}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        builderStep === item.s
                          ? 'bg-[#101828] text-white shadow-2xs'
                          : 'text-[#475467] hover:text-[#101828]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setBuilderOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#667085] hover:text-[#101828] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Builder View: Left Controls / Right Sticky Preview */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT: Step Editor Form */}
              <div className="w-full lg:w-[48%] overflow-y-auto p-6 space-y-6 border-r border-black/10 bg-white">
                {/* STEP 1: DETAILS */}
                {builderStep === 1 && (
                  selectedTemplate?.templateType === 'react' && selectedTemplate.manifest ? (
                    <div className="space-y-5 animate-in fade-in duration-150">
                      <ReactSchemaForm
                        manifest={selectedTemplate.manifest}
                        config={reactConfig}
                        onChange={(newCfg) => setReactConfig(newCfg)}
                        client={clients.find((c) => c.id === formClientId)}
                        onClientSelect={(cId) => setFormClientId(cId)}
                        allClients={clients}
                        projectTitle={formTitle}
                        onProjectTitleChange={setFormTitle}
                        otherProjects={projects.filter((p) => !activeProject || p.id !== activeProject.id)}
                        currentTemplateId={formTemplateId}
                      />
                      <div className="pt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setBuilderStep(2)}
                          className="px-4 py-2 bg-[#101828] text-white text-xs font-bold rounded-lg hover:bg-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>Next: Select Template</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-black/5">
                      <div>
                        <h4 className="text-sm font-bold text-[#101828]">Step 1: Clinical Business Details</h4>
                        <p className="text-xs text-[#667085]">
                          Practice credentials, contact details, services, and optional imagery.
                        </p>
                      </div>
                      {formClientId && (
                        <button
                          type="button"
                          onClick={() => handleCopyFromClient(formClientId)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FAFBFD] border border-black/10 hover:bg-black/5 text-[#344054] cursor-pointer"
                        >
                          Copy from Client Record
                        </button>
                      )}
                    </div>

                    {/* Project Title & Client Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Project Title *</label>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="e.g. Harbour Dental Concept"
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Assign to client</label>
                        <select
                          value={formClientId}
                          onChange={(e) => {
                            setFormClientId(e.target.value);
                            if (e.target.value) handleCopyFromClient(e.target.value);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
                        >
                          <option value="">None (Prospect / Unlinked)</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.businessName} ({c.city || 'Ireland'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Assign to partner</label>
                        <select
                          value={formPartnerId}
                          onChange={(e) => setFormPartnerId(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
                        >
                          <option value="">None (Direct / Internal)</option>
                          {partners.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Business Name & Tagline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Business Name *</label>
                        <input
                          type="text"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Acme Studio"
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Tagline</label>
                        <input
                          type="text"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          placeholder="Specialist digital and strategic consulting..."
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* About Description */}
                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-[#101828]">About Business</label>
                      <textarea
                        rows={3}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder="Providing personalized healthcare with modern facilities..."
                        className="w-full p-2.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none"
                      />
                    </div>

                    {/* Phone, Email, Address, Hours */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Direct Phone</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+353 1 234 5678"
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Direct Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="reception@clinic.ie"
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Physical Address</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="22 Fitzwilliam Square, Dublin 2"
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Opening Hours</label>
                        <input
                          type="text"
                          value={openingHours}
                          onChange={(e) => setOpeningHours(e.target.value)}
                          placeholder="Mon - Fri: 08:30 - 18:00"
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* CTA Text & Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">CTA Button Text</label>
                        <input
                          type="text"
                          value={ctaText}
                          onChange={(e) => setCtaText(e.target.value)}
                          placeholder="Book an Appointment"
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">CTA Link (https, tel, or mailto)</label>
                        <input
                          type="text"
                          value={ctaLink}
                          onChange={(e) => setCtaLink(e.target.value)}
                          placeholder="https://clinic.ie/booking or tel:+353..."
                          className="w-full px-3 py-1.5 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Services (up to 8) */}
                    <div className="space-y-3 pt-2 border-t border-black/5 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#101828]">Clinical Services (Up to 8)</label>
                        {services.length < 8 && (
                          <button
                            type="button"
                            onClick={() =>
                              setServices((s) => [
                                ...s,
                                { title: 'New Service', text: 'Service description...' },
                              ])
                            }
                            className="text-[#D92D50] hover:text-[#C42447] font-semibold cursor-pointer"
                          >
                            + Add Service
                          </button>
                        )}
                      </div>

                      {services.map((srv, idx) => (
                        <div key={idx} className="p-3 bg-[#FAFBFD] rounded-xl border border-black/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-[#475467]">Service #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setServices((s) => s.filter((_, i) => i !== idx))}
                              className="text-[#98A2B3] hover:text-[#D92D50] cursor-pointer"
                            >
                              ✕ Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            value={srv.title}
                            onChange={(e) => {
                              const updated = [...services];
                              updated[idx].title = e.target.value;
                              setServices(updated);
                            }}
                            placeholder="Service Title"
                            className="w-full px-2.5 py-1 text-xs rounded border border-black/10 bg-white"
                          />
                          <input
                            type="text"
                            value={srv.text}
                            onChange={(e) => {
                              const updated = [...services];
                              updated[idx].text = e.target.value;
                              setServices(updated);
                            }}
                            placeholder="Short description..."
                            className="w-full px-2.5 py-1 text-xs rounded border border-black/10 bg-white"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Testimonials (Strictly ONLY if client supplied) */}
                    <div className="space-y-3 pt-2 border-t border-black/5 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-bold text-[#101828]">Patient Testimonials</label>
                          <span className="text-[10px] text-[#D92D50] block">
                            ONLY add if client supplied them. Never fabricate reviews.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTestimonials((t) => [
                              ...t,
                              { quote: 'Provided exceptional clinical care.', author: 'Verified Patient', role: 'Dublin' },
                            ])
                          }
                          className="text-[#D92D50] hover:text-[#C42447] font-semibold cursor-pointer"
                        >
                          + Add Supplied Review
                        </button>
                      </div>

                      {testimonials.map((tst, idx) => (
                        <div key={idx} className="p-3 bg-[#FAFBFD] rounded-xl border border-black/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-[#475467]">Review #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setTestimonials((t) => t.filter((_, i) => i !== idx))}
                              className="text-[#98A2B3] hover:text-[#D92D50] cursor-pointer"
                            >
                              ✕ Remove
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={tst.quote}
                            onChange={(e) => {
                              const updated = [...testimonials];
                              updated[idx].quote = e.target.value;
                              setTestimonials(updated);
                            }}
                            placeholder="Client quote..."
                            className="w-full p-2 text-xs rounded border border-black/10 bg-white resize-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={tst.author}
                              onChange={(e) => {
                                const updated = [...testimonials];
                                updated[idx].author = e.target.value;
                                setTestimonials(updated);
                              }}
                              placeholder="Author name"
                              className="px-2 py-1 text-xs rounded border border-black/10 bg-white"
                            />
                            <input
                              type="text"
                              value={tst.role || ''}
                              onChange={(e) => {
                                const updated = [...testimonials];
                                updated[idx].role = e.target.value;
                                setTestimonials(updated);
                              }}
                              placeholder="Role or location"
                              className="px-2 py-1 text-xs rounded border border-black/10 bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Logo & Imagery */}
                    <div className="space-y-4 pt-2 border-t border-black/5 text-xs">
                      <div className="space-y-2">
                        <label className="font-bold text-[#101828]">Clinic Logo (PNG/JPG/WebP/SVG, max 1 MB)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleLogoUpload}
                            className="text-xs text-[#667085]"
                          />
                          {logoDataUrl && (
                            <button
                              type="button"
                              onClick={() => setLogoDataUrl(undefined)}
                              className="text-[#D92D50] hover:text-[#C42447] font-semibold cursor-pointer"
                            >
                              Remove Logo
                            </button>
                          )}
                        </div>
                        {logoDataUrl && (
                          <div className="p-2 bg-[#FAFBFD] rounded-xl border border-black/5 flex items-center gap-3">
                            <img
                              src={logoDataUrl}
                              alt="Clinic Logo Preview"
                              className="h-10 max-w-[120px] object-contain rounded"
                            />
                            <button
                              type="button"
                              onClick={handlePickColorsFromLogo}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-black/10 rounded-lg text-[#101828] hover:bg-black/5 cursor-pointer"
                            >
                              Pick colours from logo
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Photo Uploads (up to 6) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-[#101828]">
                            Clinic Photos ({images.length} / 6, max 1 MB each, auto-resized to 1600px)
                          </label>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageUpload}
                          disabled={images.length >= 6}
                          className="text-xs text-[#667085]"
                        />
                        {images.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {images.map((img, i) => (
                              <div key={i} className="relative group rounded-lg overflow-hidden border border-black/10">
                                <img src={img.url} alt={img.caption || ''} className="w-full h-16 object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setBuilderStep(2)}
                        className="px-4 py-2 bg-[#101828] text-white text-xs font-bold rounded-lg hover:bg-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>Next: Select Template</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              )}

                {/* STEP 2: TEMPLATE */}
                {builderStep === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="pb-2 border-b border-black/5">
                      <h4 className="text-sm font-bold text-[#101828]">Step 2: Choose Template</h4>
                      <p className="text-xs text-[#667085]">
                        Select a base HTML template. Content and brand values carry over seamlessly.
                      </p>
                    </div>

                    {/* Template Upgrade Notice */}
                    {(() => {
                      const curTpl = templates.find((t) => t.id === (formTemplateId || activeProject?.templateId));
                      if (!activeProject || !curTpl || curTpl.version <= activeProject.templateVersion) return null;
                      return (
                        <div className="p-3 bg-[#FEF0C7] rounded-xl border border-[#FEDF89] text-[#B54708] text-xs flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="font-bold flex items-center gap-1.5">
                              <RefreshCw size={13} className="text-[#B54708]" />
                              <span>Template Update Available</span>
                            </div>
                            <p className="text-[11px] text-[#93370D]">
                              Template "{curTpl.name}" has been updated to v{curTpl.version} (project is currently on v{activeProject.templateVersion}).
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRerenderModalProject({ project: activeProject, template: curTpl })}
                            className="px-3 py-1.5 rounded-lg bg-[#B54708] hover:bg-[#93370D] text-white text-xs font-bold cursor-pointer whitespace-nowrap shadow-2xs"
                          >
                            Re-render Preview
                          </button>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {templates.map((tpl) => {
                        const isSelected = formTemplateId === tpl.id;
                        const usedCount = templateUsageCounts[tpl.id] || 0;

                        return (
                          <div
                            key={tpl.id}
                            onClick={() => {
                              setFormTemplateId(tpl.id);
                              if (tpl.templateType === 'react' && tpl.manifest) {
                                if (!reactConfig || Object.keys(reactConfig).length === 0) {
                                  setReactConfig(extractDefaultConfig(tpl.manifest));
                                }
                              }
                              // Auto-detect template sections & variants
                              if (tpl.sections && tpl.sections.length > 0) {
                                const newOrder = tpl.sections.map((s) => s.id);
                                setSectionOrder(newOrder);
                                const onMap: Record<string, boolean> = {};
                                newOrder.forEach((s) => (onMap[s] = true));
                                setSectionsOn(onMap);
                              }
                              if (tpl.variants && tpl.variants.length > 0) {
                                const varMap: Record<string, string> = {};
                                tpl.variants.forEach((vg) => {
                                  if (vg.options.length > 0) varMap[vg.group] = vg.options[0];
                                });
                                setVariants(varMap);
                              }
                            }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#D92D50] bg-[#FFF5F6] shadow-xs ring-1 ring-[#D92D50]'
                                : 'border-black/10 bg-white hover:border-black/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  tpl.templateType === 'react'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-zinc-100 text-zinc-700'
                                }`}>
                                  {tpl.templateType === 'react' ? 'React' : 'HTML'}
                                </span>
                                <span className="font-bold text-xs text-[#101828]">{tpl.name}</span>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#475467]">
                                Used {usedCount}x
                              </span>
                            </div>

                            <p className="text-xs text-[#667085] line-clamp-2 mb-3">
                              {tpl.description || 'Clean responsive layout.'}
                            </p>

                            <div className="flex flex-wrap gap-1">
                              {tpl.nicheTags.map((t) => (
                                <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/5 text-[#344054]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setBuilderStep(1)}
                        className="px-3.5 py-1.5 border border-black/10 text-xs font-semibold rounded-lg hover:bg-black/5 cursor-pointer"
                      >
                        &larr; Back to Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setBuilderStep(3)}
                        className="px-4 py-2 bg-[#101828] text-white text-xs font-bold rounded-lg hover:bg-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>Next: Brand &amp; Variations</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: BRAND AND VARIATION */}
                {builderStep === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-black/5">
                      <div>
                        <h4 className="text-sm font-bold text-[#101828]">Step 3: Brand, Sections &amp; Variation</h4>
                        <p className="text-xs text-[#667085]">
                          Fine-tune colours, contrast, fonts, section order, and variant layouts.
                        </p>
                      </div>

                      {/* Shuffle & Undo Buttons */}
                      <div className="flex items-center gap-1.5">
                        {shuffleHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={handleUndoShuffle}
                            className="p-1.5 rounded-lg border border-black/10 text-[#475467] hover:bg-black/5 cursor-pointer"
                            title="Undo Shuffle"
                          >
                            <Undo2 size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleShuffle}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAFBFD] border border-black/15 text-[#101828] text-xs font-bold hover:bg-black/5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Shuffle size={13} className="text-[#D92D50]" />
                          <span>Shuffle</span>
                        </button>
                      </div>
                    </div>

                    {/* Similarity Notice Banner */}
                    {similarityWarning && (
                      <div className="p-3 rounded-xl bg-[#FEF6EE] border border-[#FEE4E2] text-[#B54708] text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle size={15} />
                          <span>Similarity Notice ({similarityWarning.percentage.toFixed(0)}% identical)</span>
                        </div>
                        <p>
                          This project's variation closely resembles <strong>"{similarityWarning.otherProject.title}"</strong>.
                          {similarityWarning.reasons.length > 0 && ` (${similarityWarning.reasons.join(', ')})`}.
                          Consider using Shuffle or adjusting colors to give each clinic distinct presence.
                        </p>
                      </div>
                    )}

                    {/* Shuffle Lock Controls */}
                    <div className="flex items-center justify-between p-2.5 bg-[#FAFBFD] rounded-xl border border-black/5 text-xs">
                      <span className="font-bold text-[#475467]">Lock before Shuffle:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLockedBrand(!lockedBrand)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            lockedBrand ? 'bg-[#101828] text-white' : 'bg-black/5 text-[#475467]'
                          }`}
                        >
                          {lockedBrand ? <Lock size={10} /> : <Unlock size={10} />}
                          <span>Brand</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLockedSections(!lockedSections)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            lockedSections ? 'bg-[#101828] text-white' : 'bg-black/5 text-[#475467]'
                          }`}
                        >
                          {lockedSections ? <Lock size={10} /> : <Unlock size={10} />}
                          <span>Sections</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLockedVariants(!lockedVariants)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                            lockedVariants ? 'bg-[#101828] text-white' : 'bg-black/5 text-[#475467]'
                          }`}
                        >
                          {lockedVariants ? <Lock size={10} /> : <Unlock size={10} />}
                          <span>Variants</span>
                        </button>
                      </div>
                    </div>

                    {/* Brand Colours & Contrast */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-[#101828] block">Brand Colours &amp; Contrast</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {/* Primary Color Picker */}
                        <div className="p-3 bg-[#FAFBFD] rounded-xl border border-black/5 space-y-1.5">
                          <span className="font-semibold text-[#475467] block">Primary Accent</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-8 h-8 rounded border-none cursor-pointer"
                            />
                            <input
                              type="text"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-24 px-2 py-1 font-mono text-xs rounded border border-black/10 bg-white"
                            />
                          </div>
                        </div>

                        {/* Secondary Color Picker */}
                        <div className="p-3 bg-[#FAFBFD] rounded-xl border border-black/5 space-y-1.5">
                          <span className="font-semibold text-[#475467] block">Secondary / Heading</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="w-8 h-8 rounded border-none cursor-pointer"
                            />
                            <input
                              type="text"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="w-24 px-2 py-1 font-mono text-xs rounded border border-black/10 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Contrast WCAG Status */}
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isContrastSufficient
                            ? 'bg-[#E7F8EF] border-[#A6F4C5] text-[#12B76A]'
                            : 'bg-[#FEF6EE] border-[#FECDCA] text-[#D92D50]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isContrastSufficient ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                          <span className="font-bold">
                            WCAG 4.5:1 Contrast Ratio: {contrastRatio.toFixed(2)}:1
                          </span>
                        </div>
                        {!isContrastSufficient && (
                          <span className="text-[11px] font-semibold">
                            (Auto-adjusted for readability)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Typography Font Stack */}
                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-[#101828]">Font Family (Web-Safe)</label>
                      <select
                        value={fontStack}
                        onChange={(e) => setFontStack(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:outline-none"
                      >
                        {WEB_SAFE_FONTS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Radius and Density */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="font-bold text-[#101828]">Corner Radius: {radius}px</label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="28"
                          step="2"
                          value={radius}
                          onChange={(e) => setRadius(parseInt(e.target.value))}
                          className="w-full accent-[#D92D50]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-[#101828]">Spacing Density</label>
                        <div className="grid grid-cols-3 gap-1 bg-[#F2F4F7] p-1 rounded-lg">
                          {(['compact', 'normal', 'airy'] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDensity(d)}
                              className={`py-1 text-xs font-semibold rounded capitalize transition-all cursor-pointer ${
                                density === d ? 'bg-white text-[#101828] shadow-2xs' : 'text-[#667085]'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section Ordering & Toggles */}
                    {sectionOrder.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-black/5 text-xs">
                        <label className="font-bold text-[#101828]">Section Visibility &amp; Ordering</label>
                        <div className="space-y-1.5">
                          {sectionOrder.map((secId, idx) => {
                            const isOn = sectionsOn[secId] !== false;
                            return (
                              <div
                                key={secId}
                                className="p-2.5 bg-[#FAFBFD] rounded-xl border border-black/5 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isOn}
                                    onChange={(e) =>
                                      setSectionsOn((prev) => ({ ...prev, [secId]: e.target.checked }))
                                    }
                                    className="accent-[#D92D50] rounded"
                                  />
                                  <span className={`font-semibold capitalize ${isOn ? 'text-[#101828]' : 'text-[#98A2B3] line-through'}`}>
                                    {secId}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSection(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 rounded hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                                  >
                                    <ChevronUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSection(idx, 'down')}
                                    disabled={idx === sectionOrder.length - 1}
                                    className="p-1 rounded hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                                  >
                                    <ChevronDown size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Variant Group Selectors */}
                    {selectedTemplate?.variants && selectedTemplate.variants.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-black/5 text-xs">
                        <label className="font-bold text-[#101828]">Template Variant Styles</label>
                        {selectedTemplate.variants.map((vg) => (
                          <div key={vg.group} className="space-y-1">
                            <span className="font-semibold text-[#475467] capitalize">{vg.group}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {vg.options.map((opt) => {
                                const isCurrent = (variants[vg.group] || vg.options[0]) === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() =>
                                      setVariants((prev) => ({ ...prev, [vg.group]: opt }))
                                    }
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                                      isCurrent
                                        ? 'bg-[#101828] text-white border-[#101828]'
                                        : 'bg-white border-black/10 text-[#475467] hover:border-black/20'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setBuilderStep(2)}
                        className="px-3.5 py-1.5 border border-black/10 text-xs font-semibold rounded-lg hover:bg-black/5 cursor-pointer"
                      >
                        &larr; Back to Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setBuilderStep(4)}
                        className="px-4 py-2 bg-[#101828] text-white text-xs font-bold rounded-lg hover:bg-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>Next: Preview &amp; Publish</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: PREVIEW AND ACTIONS */}
                {builderStep === 4 && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="pb-2 border-b border-black/5">
                      <h4 className="text-sm font-bold text-[#101828]">Step 4: Review, Share &amp; Export</h4>
                      <p className="text-xs text-[#667085]">
                        Inspect the rendered concept, share directly to the client portal, or export clean production assets.
                      </p>
                    </div>

                    {/* Status & Feedback Card */}
                    <div className="p-4 bg-[#FAFBFD] rounded-xl border border-black/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#667085]">Current Status:</span>
                        <span className="font-bold text-[#101828]">{activeProject?.status || 'Draft (Unsaved)'}</span>
                      </div>

                      {activeProject?.clientFeedback && (
                        <div className="p-2.5 rounded-lg bg-[#FEF6EE] border border-[#FEE4E2] text-[#B54708]">
                          <strong className="block mb-1">Client Feedback:</strong>
                          <p className="italic">"{activeProject.clientFeedback}"</p>
                        </div>
                      )}
                    </div>

                    {/* Primary Actions Grid */}
                    <div className="space-y-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={saving}
                        className="w-full py-2.5 px-4 rounded-xl bg-white border border-black/15 text-[#101828] text-xs font-bold hover:bg-black/5 transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                      >
                        <FileCode size={15} />
                        <span>Save as Draft</span>
                      </button>

                      {/* Share button disabled with reason "Assign a client first" when none; warn if portal feature is Off */}
                      {(() => {
                        const assignedClient = clients.find((c) => c.id === formClientId);
                        const isPortalFeatureOff =
                          assignedClient &&
                          (assignedClient.portalPresetId === 'starter' ||
                            assignedClient.portalFeatureOverrides?.websitePreview === 'off');

                        return (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={handleShareToClient}
                              disabled={saving || !formClientId}
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                                !formClientId
                                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                  : 'bg-[#D92D50] hover:bg-[#C42447] text-white cursor-pointer disabled:opacity-50'
                              }`}
                              title={!formClientId ? 'Assign a client first' : 'Publish & share to client portal'}
                            >
                              <Share2 size={15} />
                              <span>{formClientId ? 'Publish & Share to Client Portal' : 'Assign a client first'}</span>
                            </button>

                            {formClientId && isPortalFeatureOff && (
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  Warning: This client's portal has "Website preview" disabled in their portal settings. Enable it in Clients &gt; Portal Settings to make this visible in their portal.
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {selectedTemplate?.templateType === 'react' ? (
                        <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-black/10 space-y-3">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              id="includePublicContactReactExport"
                              checked={includePublicContactReactExport}
                              onChange={(e) => setIncludePublicContactReactExport(e.target.checked)}
                              className="mt-0.5 accent-[#D92D50] rounded cursor-pointer"
                            />
                            <label htmlFor="includePublicContactReactExport" className="text-xs text-[#344054] cursor-pointer">
                              <span className="font-bold text-[#101828] block">Include real public contact details in site.config.json</span>
                              <span className="text-[11px] text-[#667085] block">
                                Default OFF (safe placeholders used). Check only if client has approved publishing public phone, email, and address in config pack.
                              </span>
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={handleDownloadReactConfigPack}
                            disabled={saving}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#101828] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                          >
                            <FolderArchive size={15} />
                            <span>Download config pack (.zip)</span>
                          </button>
                          <p className="text-[10px] text-[#667085] text-center">
                            Includes site.config.json, assets/, README.md with 3 steps, and PROMPT.md for AI Studio.
                          </p>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadHtml}
                            className="w-full py-2.5 px-4 rounded-xl bg-white border border-black/15 text-[#101828] text-xs font-bold hover:bg-black/5 transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Download size={15} />
                            <span>Download Single-File HTML (with Demo Ribbon)</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleExportZip}
                            disabled={saving}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#101828] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                          >
                            <FolderArchive size={15} />
                            <span>Export Production ZIP (Clean index.html &amp; assets/)</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="pt-3 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setBuilderStep(3)}
                        className="px-3.5 py-1.5 border border-black/10 text-xs font-semibold rounded-lg hover:bg-black/5 cursor-pointer"
                      >
                        &larr; Back to Variations
                      </button>

                      <button
                        type="button"
                        onClick={() => setBuilderStep(5)}
                        className="px-3.5 py-1.5 bg-[#101828] text-white text-xs font-semibold rounded-lg hover:bg-black cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Next: Reveal &amp; Links &rarr;</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: REVEAL SEQUENCE & ACCESS LINKS */}
                {builderStep === 5 && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-black/5">
                      <div>
                        <h4 className="text-sm font-bold text-[#101828]">Step 5: Concept Reveal Sequence &amp; Access Links</h4>
                        <p className="text-xs text-[#667085]">
                          Configure the 2-second entrance animation for client and prospect presentations.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveRevealConfig}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-[#101828] hover:bg-black text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        {saving ? 'Saving...' : 'Save Reveal Settings'}
                      </button>
                    </div>

                    {/* Reveal Animation On/Off Switch */}
                    <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-black/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[#101828] block">
                          Enable Reveal Sequence Animation
                        </span>
                        <span className="text-[11px] text-[#667085] block">
                          Plays a 2-second entrance animation on first view per recipient device.
                        </span>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={revealEnabled}
                          onChange={(e) => setRevealEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A0A0A]"></div>
                      </label>
                    </div>

                    {/* Style Selector: Blur fade (default) vs Curtain split */}
                    <div className="space-y-2 text-xs">
                      <label className="font-bold text-[#101828]">Reveal Transition Style</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRevealStyle('Blur fade')}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            revealStyle === 'Blur fade'
                              ? 'border-[#0A0A0A] bg-black/5 ring-1 ring-[#0A0A0A]'
                              : 'border-black/10 bg-white hover:border-black/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[#101828]">Blur fade</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 text-[#475467]">
                              Default
                            </span>
                          </div>
                          <p className="text-[11px] text-[#667085] leading-relaxed">
                            Dark glass backdrop fading out with smooth blur dissipation over the site concept.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRevealStyle('Curtain split')}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            revealStyle === 'Curtain split'
                              ? 'border-[#0A0A0A] bg-black/5 ring-1 ring-[#0A0A0A]'
                              : 'border-black/10 bg-white hover:border-black/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[#101828]">Curtain split</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 text-[#475467]">
                              Dramatic
                            </span>
                          </div>
                          <p className="text-[11px] text-[#667085] leading-relaxed">
                            Two high-contrast panels slide apart horizontally (vertical split on narrow screens).
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Custom Welcome Line with Wording Guard */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#101828]">Custom Welcome Line (Optional)</label>
                        <span className="text-[10px] text-[#667085]">Default: "Welcome, {businessName || 'Business'}"</span>
                      </div>
                      <input
                        type="text"
                        value={revealWelcomeLine}
                        onChange={(e) => setRevealWelcomeLine(e.target.value)}
                        placeholder={`Welcome, ${businessName || 'Client'}`}
                        className="w-full px-3 py-2 rounded-lg border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                      />

                      {/* Wording Guard check for custom text */}
                      {(() => {
                        if (!revealWelcomeLine.trim()) return null;
                        const check = contentGuardCheck('Welcome Line', revealWelcomeLine);
                        if (!check.hasWarning) return null;
                        return (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <ShieldAlert size={14} className="text-amber-700" />
                              <span>Wording Guard Notice:</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                              {check.flaggedWords.map((w, idx) => (
                                <li key={idx}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>

                    {/* In-Studio Preview Trigger */}
                    <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-[#101828] block">Interactive Studio Preview</span>
                          <span className="text-[11px] text-[#667085] block">
                            Test the entrance sequence live right over this design.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTestRevealActive(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#101828] hover:bg-black text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <Play size={13} />
                          <span>Preview the reveal</span>
                        </button>
                      </div>
                    </div>

                    {/* Public Link Generator & Active Tokens */}
                    <div className="pt-2 border-t border-black/5 space-y-4">
                      <div>
                        <h5 className="text-xs font-bold text-[#101828]">Public Reveal Links (/preview/&lt;token&gt;)</h5>
                        <p className="text-[11px] text-[#667085]">
                          Generate private, sandboxed links to share concepts with clients or prospects.
                        </p>
                      </div>

                      {/* Generator Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={revealExpiryDays}
                          onChange={(e) => setRevealExpiryDays(parseInt(e.target.value, 10))}
                          className="px-3 py-1.5 text-xs rounded-lg border border-black/10 bg-white text-[#101828] focus:outline-none"
                        >
                          <option value={7}>Expires in 7 days</option>
                          <option value={14}>Expires in 14 days</option>
                          <option value={30}>Expires in 30 days (Default)</option>
                          <option value={60}>Expires in 60 days</option>
                          <option value={0}>No expiry</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleGenerateRevealToken}
                          disabled={loadingRevealTokens}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Generate Link</span>
                        </button>
                      </div>

                      {/* Mandatory Compliance / GDPR notice banner */}
                      <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-950 space-y-1">
                        <div className="flex items-start gap-2 font-medium">
                          <ShieldAlert size={15} className="text-amber-700 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            Works across devices only after Supabase intake is connected. Test mode: the link
                            opens only in this browser. Check ePrivacy/GDPR rules before sending unsolicited
                            links.
                          </div>
                        </div>
                        <div className="text-[10px] text-amber-800 italic pt-0.5">
                          Note: The app never sends emails or messages itself.
                        </div>
                      </div>

                      {/* Tokens List */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                          Active Tokens ({revealTokens.length})
                        </span>

                        {revealTokens.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-black/5 text-center text-xs text-[#667085]">
                            No reveal links generated yet. Click "Generate Link" above to create one.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {revealTokens.map((t) => {
                              const isRev = !!t.revokedAt;
                              const isExp = !!t.expiresAt && new Date(t.expiresAt) < new Date();
                              const isCopied = copiedTokenId === t.id;

                              return (
                                <div
                                  key={t.id}
                                  className="p-3 rounded-xl bg-[#FAFAFA] border border-black/10 flex items-center justify-between gap-3 flex-wrap"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-semibold text-[#101828]">
                                        /preview/{t.token.slice(0, 10)}...{t.token.slice(-6)}
                                      </span>
                                      {isRev ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                                          Revoked
                                        </span>
                                      ) : isExp ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                          Expired
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                          Active (v{t.projectVersion})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[#667085] flex items-center gap-2">
                                      <span>Created {new Date(t.createdAt).toLocaleDateString()}</span>
                                      <span>&middot;</span>
                                      <span>{t.expiresAt ? `Expires ${new Date(t.expiresAt).toLocaleDateString()}` : 'Never expires'}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyRevealLink(t.token, t.id)}
                                      disabled={isRev}
                                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                                        isCopied
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                          : 'bg-white text-[#344054] border-black/10 hover:bg-black/5'
                                      }`}
                                    >
                                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                      <span>{isCopied ? 'Copied' : 'Copy link'}</span>
                                    </button>

                                    {!isRev && (
                                      <button
                                        type="button"
                                        onClick={() => handleRevokeRevealToken(t.id)}
                                        className="p-1 rounded text-[#667085] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                        title="Revoke link access"
                                      >
                                        <Ban size={13} />
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

                    <div className="pt-3 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setBuilderStep(4)}
                        className="px-3.5 py-1.5 border border-black/10 text-xs font-semibold rounded-lg hover:bg-black/5 cursor-pointer"
                      >
                        &larr; Back to Preview &amp; Actions
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Sticky Live Sandboxed Iframe Preview / Feedback */}
              <div className="w-full lg:w-[52%] bg-[#EEF2F6] flex flex-col overflow-hidden">
                {/* Header Switcher Bar */}
                <div className="px-4 py-2.5 bg-white border-b border-black/10 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#F2F4F7] p-1 rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('render')}
                        className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                          previewMode === 'render'
                            ? 'bg-white text-[#101828] shadow-2xs font-bold'
                            : 'text-[#667085] hover:text-[#101828]'
                        }`}
                      >
                        Live Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('feedback')}
                        disabled={!activeProject}
                        className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                          previewMode === 'feedback'
                            ? 'bg-white text-[#101828] shadow-2xs font-bold'
                            : activeProject
                            ? 'text-[#667085] hover:text-[#101828]'
                            : 'text-[#999999] opacity-50 cursor-not-allowed'
                        }`}
                        title={activeProject ? 'View and add pinned feedback' : 'Save project first to use pin feedback'}
                      >
                        Pin Feedback
                      </button>
                    </div>

                    {activeProject && (
                      <button
                        type="button"
                        onClick={() => setRevealModalProject(activeProject)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F8F9FA] border border-black/15 text-[#344054] hover:text-[#101828] text-xs font-semibold cursor-pointer"
                        title="Open reveal link manager"
                      >
                        <LinkIcon size={12} />
                        <span>Reveal link</span>
                      </button>
                    )}
                  </div>

                  {previewMode === 'render' && (
                    <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1 rounded cursor-pointer transition-all ${
                          previewDevice === 'desktop' ? 'bg-white text-[#101828] shadow-2xs' : 'text-[#667085]'
                        }`}
                        title="Desktop"
                      >
                        <Monitor size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('tablet')}
                        className={`p-1 rounded cursor-pointer transition-all ${
                          previewDevice === 'tablet' ? 'bg-white text-[#101828] shadow-2xs' : 'text-[#667085]'
                        }`}
                        title="Tablet (768px)"
                      >
                        <Tablet size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1 rounded cursor-pointer transition-all ${
                          previewDevice === 'mobile' ? 'bg-white text-[#101828] shadow-2xs' : 'text-[#667085]'
                        }`}
                        title="Mobile (375px)"
                      >
                        <Smartphone size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content: Either Live Render or Pin Feedback */}
                {previewMode === 'feedback' && activeProject ? (
                  selectedTemplate?.templateType === 'react' ? (
                    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-white">
                      <div className="max-w-md p-6 bg-[#FAFBFD] rounded-2xl border border-black/10 space-y-2">
                        <span className="text-xs font-bold text-[#101828]">Interactive React Concept</span>
                        <p className="text-xs text-[#667085]">
                          Visual pin coordinates are tailored for static HTML layouts. For React templates, feedback and change requests are submitted via the comment feed in the client portal or Step 4.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 p-3 overflow-auto">
                      <DemoPreviewWithFeedback
                        projectId={activeProject.id}
                        projectTitle={formTitle || activeProject.title}
                        version={activeProject.version}
                        renderedHtml={liveRenderedHtml || activeProject.renderedHtml}
                        isClientView={false}
                        canAddPins={true}
                        clientName="Admin"
                        onRefresh={loadData}
                      />
                    </div>
                  )
                ) : (
                  /* Sandboxed iframe container */
                  selectedTemplate?.templateType === 'react' && selectedTemplate.previewUrl ? (
                    <div className="flex-1 p-4 flex flex-col overflow-auto">
                      <ReactTemplatePreview
                        previewUrl={selectedTemplate.previewUrl}
                        config={reactConfig}
                        withRibbon={true}
                        ribbonText="Demo Concept"
                        devicePreset={previewDevice}
                        onDevicePresetChange={setPreviewDevice}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 p-4 flex items-center justify-center overflow-auto relative">
                      {testRevealActive && (
                        <RevealSequenceOverlay
                          businessName={businessName || 'Business Name'}
                          logoDataUrl={logoDataUrl}
                          welcomeLine={revealWelcomeLine}
                          style={revealStyle}
                          iframeLoaded={true}
                          onComplete={() => setTestRevealActive(false)}
                        />
                      )}
                      <div
                        className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 border border-black/10 flex flex-col ${
                          previewDevice === 'desktop'
                            ? 'w-full h-full'
                            : previewDevice === 'tablet'
                            ? 'w-[768px] h-full max-h-[780px]'
                            : 'w-[375px] h-full max-h-[700px]'
                        }`}
                      >
                        <iframe
                          title="Live Website Preview"
                          srcDoc={liveRenderedHtml}
                          sandbox="allow-same-origin"
                          className="w-full h-full border-none select-none"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pitch Proposal Builder Modal */}
      {showPitchBuilder && (
        <PitchProposalBuilder
          isAdmin={true}
          onClose={() => setShowPitchBuilder(false)}
          onProposalSaved={() => {
            setShowPitchBuilder(false);
            loadData();
          }}
        />
      )}

      {/* Project Reveal Link Modal */}
      {revealModalProject && (
        <RevealLinkModal
          projectId={revealModalProject.id}
          projectTitle={revealModalProject.title}
          onClose={() => setRevealModalProject(null)}
        />
      )}

      {/* Extend Expiry Modal */}
      {extendModalOpen && activeProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-black/10 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#101828]">Extend Project Expiry</h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Grant additional active days before this demo concept expires.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExtendModalOpen(false)}
                className="p-1 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleExtendExpiry} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#101828]">
                  Additional Days
                </label>
                <div className="flex items-center gap-2">
                  {[7, 14, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                        extendDays === d
                          ? 'bg-[#101828] text-white border-[#101828]'
                          : 'bg-white text-[#344054] border-black/10 hover:bg-black/5'
                      }`}
                    >
                      +{d}d
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={extendDays}
                    onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 1)}
                    className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-black/10 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#101828]">
                  Reason for Extension *
                </label>
                <textarea
                  rows={2}
                  required
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="e.g. Client requested 2 extra weeks to finalize internal stakeholder sign-off..."
                  className="w-full p-2.5 text-xs rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none"
                />
                <span className="text-[11px] text-[#73737A]">
                  Recorded in project audit history and timeline.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setExtendModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-black/10 text-[#344054] hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extending || !extendReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white cursor-pointer disabled:opacity-50"
                >
                  {extending ? 'Extending...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Upgrade Re-render Before/After Comparison Modal */}
      {rerenderModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-black/10">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between bg-[#FAFBFD]">
              <div>
                <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2">
                  <RefreshCw size={15} className="text-[#D92D50]" />
                  <span>Re-render Project with Template v{rerenderModalProject.template.version}</span>
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Compare current rendering (v{rerenderModalProject.project.templateVersion}) against latest template code from GitHub (v{rerenderModalProject.template.version}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRerenderModalProject(null)}
                className="p-1 rounded-lg hover:bg-black/5 text-[#667085] hover:text-[#101828] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Side-by-side Before / After Frames */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/10 overflow-hidden bg-[#EEF2F6]">
              {/* Left: Current Version */}
              <div className="flex flex-col h-full overflow-hidden p-3 space-y-2">
                <div className="flex items-center justify-between px-2 text-xs font-semibold text-[#475467]">
                  <span>Current (Template v{rerenderModalProject.project.templateVersion})</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5">Project v{rerenderModalProject.project.version}</span>
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-xs overflow-hidden border border-black/10">
                  <iframe
                    title="Current Rendering"
                    srcDoc={rerenderModalProject.project.renderedHtml}
                    sandbox="allow-same-origin"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>

              {/* Right: Latest Template Version */}
              <div className="flex flex-col h-full overflow-hidden p-3 space-y-2">
                <div className="flex items-center justify-between px-2 text-xs font-semibold text-[#101828]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#D92D50]" />
                    <span>Latest (Template v{rerenderModalProject.template.version})</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E7F8EF] text-[#12B76A] border border-[#A6F4C5]">
                    Ready to Apply
                  </span>
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-xs overflow-hidden border border-black/10">
                  <iframe
                    title="Latest Rendering"
                    srcDoc={renderWebsiteTemplate(
                      rerenderModalProject.template.html,
                      rerenderModalProject.project.details,
                      rerenderModalProject.project.brand,
                      {
                        withRibbon: true,
                        variation: rerenderModalProject.project.variation,
                      }
                    )}
                    sandbox="allow-same-origin"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-black/10 bg-[#FAFBFD] flex items-center justify-between text-xs">
              <span className="text-[#667085]">
                Existing project content, branding, and history are preserved.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRerenderModalProject(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#475467] hover:bg-black/5 cursor-pointer"
                >
                  Keep Current
                </button>
                <button
                  type="button"
                  disabled={rerendering}
                  onClick={handleConfirmRerender}
                  className="px-4 py-2 rounded-lg bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={rerendering ? 'animate-spin' : ''} />
                  <span>{rerendering ? 'Applying Re-render...' : `Re-render with v${rerenderModalProject.template.version}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
