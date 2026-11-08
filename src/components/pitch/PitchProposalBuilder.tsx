import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Printer,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Shuffle,
  Undo2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Globe,
  FileText,
  DollarSign,
  Palette,
  ShieldCheck,
  Building,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  WebsiteProject,
  WebsiteTemplate,
  DemoSiteDetails,
  DemoSiteService,
  WebsiteProjectBrand,
  WebsiteProjectVariation,
  Proposal,
  ProposalItem,
  ProposalStatus,
  PackagesSettings,
  PackageTierConfig,
  Partner,
} from '../../types/index.ts';
import {
  getWebsiteTemplates,
  getPackagesSettings,
  saveWebsiteProject,
  saveProposal,
  updateProposalStatus,
  getPartners,
  contentGuardCheck,
} from '../../data/repo.ts';
import {
  renderWebsiteTemplate,
  extractColorsFromLogo,
  escapeHtml,
} from '../../lib/templateEngine.ts';

interface PitchProposalBuilderProps {
  initialData?: {
    prospectName?: string;
    websiteUrl?: string;
    niche?: string;
    phone?: string;
    email?: string;
    leadId?: string;
    partnerId?: string;
    projectId?: string;
    proposalId?: string;
  };
  partnerId?: string; // If in partner context
  partnerBranding?: {
    brandName?: string;
    logoUrl?: string;
    accentColor?: string;
    poweredByOpenHours?: boolean;
    isBranded?: boolean;
  };
  onClose: () => void;
  onProposalSaved?: (proposal: Proposal, project: WebsiteProject) => void;
  onProposalWon?: (proposal: Proposal, project: WebsiteProject) => void;
  isAdmin?: boolean;
}

export const PitchProposalBuilder: React.FC<PitchProposalBuilderProps> = ({
  initialData,
  partnerId,
  partnerBranding,
  onClose,
  onProposalSaved,
  onProposalWon,
  isAdmin = false,
}) => {
  // Step navigation: 1: Prospect & Brand, 2: Template & Mockup, 3: Proposal Terms, 4: Preview & Print
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Available Data
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [packagesSettings, setPackagesSettings] = useState<PackagesSettings | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  // Step 1: Prospect Profile & Brand
  const [prospectName, setProspectName] = useState(initialData?.prospectName || '');
  const [prospectWebsiteUrl, setProspectWebsiteUrl] = useState(initialData?.websiteUrl || '');
  const [niche, setNiche] = useState(initialData?.niche || 'Professional Services');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [services, setServices] = useState<DemoSiteService[]>([
    { title: 'Core Consultation', text: 'Tailored initial assessment and strategic roadmap.' },
    { title: 'Implementation & Delivery', text: 'End-to-end operational execution with defined SLAs.' },
  ]);

  // Brand Styling
  const [primaryColor, setPrimaryColor] = useState(
    partnerBranding?.accentColor || '#D92D50'
  );
  const [secondaryColor, setSecondaryColor] = useState('#101828');
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(
    partnerBranding?.logoUrl || undefined
  );
  const [extractingColors, setExtractingColors] = useState(false);

  // Step 2: Template & Mockup
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [variation, setVariation] = useState<WebsiteProjectVariation>({
    sectionOrder: ['hero', 'about', 'services', 'testimonials', 'contact'],
    sectionsOn: { hero: true, about: true, services: true, testimonials: true, contact: true },
    variants: {},
    seed: 42,
  });

  // Step 3: Proposal Pricing & Terms
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(['regular']);
  const [customItems, setCustomItems] = useState<Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
  }>>([]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [introText, setIntroText] = useState(
    'Thank you for discussing your digital presence goals. Below is our recommended system configuration and proposal tailored to your business.'
  );
  const [wordingWarning, setWordingWarning] = useState<string[]>([]);
  const [wordingConfirmed, setWordingConfirmed] = useState(false);

  // Status & Saved IDs
  const [savedProjectId, setSavedProjectId] = useState<string | null>(initialData?.projectId || null);
  const [savedProposalId, setSavedProposalId] = useState<string | null>(initialData?.proposalId || null);
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('Draft');
  const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false);
  const [lostReasonInput, setLostReasonInput] = useState('');

  // Selected Partner for Admin
  const [assignedPartnerId, setAssignedPartnerId] = useState<string>(
    partnerId || initialData?.partnerId || ''
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load Templates & Packages on Mount
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const [tpls, pkgs, pts] = await Promise.all([
          getWebsiteTemplates(),
          getPackagesSettings(),
          getPartners(),
        ]);
        const activeTpls = tpls.filter((t) => !t.archivedAt);
        setTemplates(activeTpls);
        if (activeTpls.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(activeTpls[0].id);
        }
        setPackagesSettings(pkgs);
        setPartners(pts);
      } catch (err: any) {
        console.error('Failed to load pitch dependencies:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Wording guard check for intro text
  const checkIntroWording = (text: string) => {
    const check = contentGuardCheck('Proposal Intro', text);
    if (check.hasWarning) {
      setWordingWarning(check.flaggedWords);
    } else {
      setWordingWarning([]);
      setWordingConfirmed(false);
    }
  };

  // Service Management
  const handleAddService = () => {
    setServices([...services, { title: 'New Service', text: 'Service scope and key deliverables description.' }]);
  };

  const handleUpdateService = (idx: number, field: 'title' | 'text', val: string) => {
    const updated = [...services];
    updated[idx] = { ...updated[idx], [field]: val };
    setServices(updated);
  };

  const handleRemoveService = (idx: number) => {
    setServices(services.filter((_, i) => i !== idx));
  };

  // Custom Items Management
  const handleAddCustomItem = () => {
    setCustomItems([
      ...customItems,
      {
        id: `custom_${Date.now()}`,
        title: 'Custom Service Scope',
        description: 'Bespoke implementation or supplementary digital services.',
        price: 500,
        currency: 'EUR',
      },
    ]);
  };

  const handleUpdateCustomItem = (
    idx: number,
    field: 'title' | 'description' | 'price' | 'currency',
    val: any
  ) => {
    const updated = [...customItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setCustomItems(updated);
  };

  const handleRemoveCustomItem = (idx: number) => {
    setCustomItems(customItems.filter((_, i) => i !== idx));
  };

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoDataUrl(reader.result);
        showToast('Logo uploaded. You can now extract brand colours.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Pick colours from logo
  const handlePickColorsFromLogo = async () => {
    if (!logoDataUrl) {
      showToast('Please upload a logo image first.');
      return;
    }
    try {
      setExtractingColors(true);
      const extracted = await extractColorsFromLogo(logoDataUrl);
      if (extracted) {
        setPrimaryColor(extracted.primaryColor);
        setSecondaryColor(extracted.secondaryColor);
        showToast('Extracted brand colours from logo.');
      } else {
        showToast('Could not extract colours. Please select colours manually.');
      }
    } catch {
      showToast('Failed to analyze logo colours.');
    } finally {
      setExtractingColors(false);
    }
  };

  // Shuffle variation (Step 2)
  const handleShuffleVariation = () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const newSeed = Math.floor(Math.random() * 10000);
    const newVariants: Record<string, string> = {};
    tpl.variants.forEach((vg) => {
      if (vg.options.length > 0) {
        const randOpt = vg.options[Math.floor(Math.random() * vg.options.length)];
        newVariants[vg.group] = randOpt;
      }
    });
    setVariation({
      ...variation,
      variants: newVariants,
      seed: newSeed,
    });
    showToast('Variation shuffled.');
  };

  // Rendered HTML computation with Ribbon: "Concept mockup - not a live website"
  const renderedHtml = useMemo(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return '';

    const details: DemoSiteDetails = {
      businessName: prospectName.trim() || 'Your Business Name',
      tagline: tagline.trim() || `Modern digital presence for ${prospectName || 'your business'}`,
      about: about.trim() || `${prospectName || 'Our practice'} delivers specialized services with dedicated attention to client outcomes and quality standards.`,
      services: services.map((s) => ({ ...s })),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      openingHours: openingHours.trim() || undefined,
      ctaText: 'Request Consultation',
      ctaLink: '#',
    };

    const brand: WebsiteProjectBrand = {
      primaryColor,
      secondaryColor,
      fontStack: 'system-ui, -apple-system, sans-serif',
      logoDataUrl,
      radius: 12,
      density: 'normal',
    };

    return renderWebsiteTemplate(tpl.html, details, brand, {
      withRibbon: true,
      ribbonText: 'Concept mockup — not a live website',
      variation,
    });
  }, [
    templates,
    selectedTemplateId,
    prospectName,
    tagline,
    about,
    services,
    phone,
    email,
    address,
    openingHours,
    primaryColor,
    secondaryColor,
    logoDataUrl,
    variation,
  ]);

  // Pricing items generation
  const proposalItems: ProposalItem[] = useMemo(() => {
    const items: ProposalItem[] = [];

    // Package selections from Settings > Packages
    if (packagesSettings) {
      packagesSettings.packages.forEach((pkg) => {
        if (selectedPackageIds.includes(pkg.id)) {
          items.push({
            id: `pkg_${pkg.id}`,
            type: 'package',
            packageId: pkg.id,
            title: pkg.name,
            description: `Standard service package with managed ongoing support.`,
            price: pkg.startingPriceEUR,
            currency: 'EUR',
            isStartingFrom: true,
            features: [...pkg.featureList],
          });
        }
      });
    }

    // Custom items
    customItems.forEach((ci) => {
      items.push({
        id: ci.id,
        type: 'custom',
        title: ci.title,
        description: ci.description,
        price: ci.price,
        currency: ci.currency,
        isStartingFrom: false,
        claimedByPartner: !isAdmin,
      });
    });

    return items;
  }, [packagesSettings, selectedPackageIds, customItems, isAdmin]);

  // Save current project and proposal
  const handleSaveAll = async (targetStatus?: ProposalStatus): Promise<{ project: WebsiteProject; proposal: Proposal }> => {
    if (!prospectName.trim()) {
      throw new Error('Prospect business name is required.');
    }

    const tpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (!tpl) throw new Error('No template selected.');

    const activePartner = assignedPartnerId ? partners.find((p) => p.id === assignedPartnerId) : undefined;
    const actorName = partnerBranding?.brandName || (isAdmin ? 'Admin' : 'Partner User');

    // 1. Save WebsiteProject (kind: 'pitch')
    const savedProj = await saveWebsiteProject(
      {
        id: savedProjectId || undefined,
        title: `${prospectName.trim()} - Pitch Concept`,
        templateId: tpl.id,
        templateVersion: tpl.version || 1,
        details: {
          businessName: prospectName.trim(),
          tagline: tagline.trim(),
          about: about.trim(),
          services,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          openingHours: openingHours.trim() || undefined,
          ctaText: 'Request Consultation',
          ctaLink: '#',
        },
        brand: {
          primaryColor,
          secondaryColor,
          fontStack: 'system-ui, -apple-system, sans-serif',
          logoDataUrl,
          radius: 12,
          density: 'normal',
        },
        variation,
        status: targetStatus === 'Shared' ? 'Shared' : 'Draft',
        kind: 'pitch',
        partnerId: assignedPartnerId || undefined,
        prospectName: prospectName.trim(),
        leadId: initialData?.leadId || undefined,
        prospectWebsiteUrl: prospectWebsiteUrl.trim() || undefined,
        isDemo: true,
      },
      actorName
    );

    setSavedProjectId(savedProj.id);

    // 2. Save Proposal
    const finalStatus = targetStatus || proposalStatus;
    const savedProp = await saveProposal(
      {
        id: savedProposalId || undefined,
        partnerId: assignedPartnerId || undefined,
        partnerName: activePartner?.organisation || partnerBranding?.brandName || undefined,
        leadId: initialData?.leadId || undefined,
        prospectName: prospectName.trim(),
        prospectWebsiteUrl: prospectWebsiteUrl.trim() || undefined,
        projectId: savedProj.id,
        items: proposalItems,
        validUntil,
        introText,
        status: finalStatus,
        isDemo: true,
      },
      actorName
    );

    setSavedProposalId(savedProp.id);
    setProposalStatus(savedProp.status);

    if (onProposalSaved) {
      onProposalSaved(savedProp, savedProj);
    }

    return { project: savedProj, proposal: savedProp };
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!prospectName.trim()) {
        showToast('Please enter the prospect business name.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (proposalItems.length === 0) {
        showToast('Please select at least one package or add a custom service line.');
        return;
      }
      // Check wording guard
      const check = contentGuardCheck('Proposal Intro', introText);
      if (check.hasWarning && !wordingConfirmed) {
        setWordingWarning(check.flaggedWords);
        showToast('Please review flagged terms and check the confirmation box.');
        return;
      }

      try {
        setSaving(true);
        await handleSaveAll('Draft');
        setCurrentStep(4);
      } catch (err: any) {
        showToast(err?.message || 'Error saving pitch proposal.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    if (newStatus === 'Lost') {
      setLostReasonModalOpen(true);
      return;
    }

    try {
      setSaving(true);
      const { proposal, project } = await handleSaveAll(newStatus);
      await updateProposalStatus(
        proposal.id,
        newStatus,
        { sharedAt: newStatus === 'Shared' ? new Date().toISOString() : undefined },
        isAdmin ? 'Admin' : 'Partner User'
      );
      setProposalStatus(newStatus);
      showToast(`Proposal status marked as ${newStatus}.`);

      if (newStatus === 'Won' && onProposalWon) {
        onProposalWon(proposal, project);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update proposal status.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmLost = async () => {
    if (!savedProposalId) return;
    try {
      setSaving(true);
      await updateProposalStatus(
        savedProposalId,
        'Lost',
        { lostReason: lostReasonInput.trim() || 'Budget / Timing' },
        isAdmin ? 'Admin' : 'Partner User'
      );
      setProposalStatus('Lost');
      setLostReasonModalOpen(false);
      showToast('Proposal marked as Lost.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  // Print proposal handler (clean print stylesheet)
  const handlePrint = () => {
    window.print();
  };

  const activeBrandingName =
    partnerBranding?.brandName || (isAdmin ? 'Open Hours' : 'Open Hours');
  const activeLogo = partnerBranding?.logoUrl;
  const isBrandedPartner = partnerBranding?.isBranded;

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F2F2] flex flex-col overflow-hidden animate-in fade-in">
      {/* Top Bar */}
      <header className="bg-white border-b border-black/5 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-2xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#111111] transition-colors cursor-pointer"
            title="Close pitch builder"
          >
            <X size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#111111]">
                {prospectName.trim() ? `${prospectName.trim()} Pitch Proposal` : 'New Pitch Proposal'}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  proposalStatus === 'Won'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : proposalStatus === 'Shared'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : proposalStatus === 'Lost'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {proposalStatus}
              </span>
            </div>
            <p className="text-[11px] text-[#6B6B6B]">
              Step {currentStep} of 4: {currentStep === 1 ? 'Prospect & Brand' : currentStep === 2 ? 'Concept Mockup' : currentStep === 3 ? 'Proposal Scope & Terms' : 'Proposal Review & Print'}
            </p>
          </div>
        </div>

        {/* Wizard Steps Navigation */}
        <div className="hidden md:flex items-center gap-1 bg-[#F4F2F2] p-1 rounded-full border border-black/5">
          {[
            { step: 1, label: '1. Profile & Brand' },
            { step: 2, label: '2. Concept Mockup' },
            { step: 3, label: '3. Proposal Terms' },
            { step: 4, label: '4. Print & Export' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => {
                if (item.step <= currentStep || prospectName.trim()) {
                  setCurrentStep(item.step as any);
                }
              }}
              className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                currentStep === item.step
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-3.5 py-1.5 text-xs font-bold text-[#6B6B6B] hover:text-[#111111] bg-white border border-black/10 rounded-full transition-colors cursor-pointer"
            >
              Back
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Continue</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSaveAll()}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check size={13} />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111111] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-2 duration-200 print:hidden">
          <Info size={16} className="text-[#D92D50] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* ========================================================================= */}
        {/* STEP 1: PROSPECT PROFILE & BRANDING */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
            {/* Small note required by spec */}
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Content & Intellectual Property Guidance</strong>
                <span>
                  Use only information you are allowed to use. Do not copy a third party&rsquo;s text or images.
                </span>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-black/5 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-[#111111]">Prospect Business Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Prospect Business Name <span className="text-[#D92D50]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dublin Dental Care, Apex Consulting"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Optional Reference Website URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://currentsite.ie"
                    value={prospectWebsiteUrl}
                    onChange={(e) => setProspectWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <span className="text-[10px] text-[#A8A5A5] mt-1 block">
                    Stored as a plain text reference only. Never fetched or scraped.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Niche / Industry
                  </label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  >
                    <option value="Professional Services">Professional Services</option>
                    <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                    <option value="Dental">Dental</option>
                    <option value="Physiotherapy">Physiotherapy</option>
                    <option value="Legal & Finance">Legal & Finance</option>
                    <option value="Engineering & Architecture">Engineering & Architecture</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Tagline / Positioning Statement
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Modern, high-converting digital systems"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>
              </div>

              {/* Contact Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-black/5">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Direct Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+353 1 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Direct Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="contact@prospect.ie"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>
              </div>

              {/* Admin Partner Assignment if multiple partners exist */}
              {isAdmin && (
                <div className="pt-2 border-t border-black/5">
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Assign to Partner (Optional)
                  </label>
                  <select
                    value={assignedPartnerId}
                    onChange={(e) => setAssignedPartnerId(e.target.value)}
                    className="w-full sm:w-1/2 px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  >
                    <option value="">Direct (Open Hours Internal Pitch)</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.organisation} ({p.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Brand & Colours */}
            <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-black/5 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#111111]">Brand Colours & Logo</h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Upload a logo file or pick brand accent colours for the concept mockup.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                {/* Logo Upload */}
                <div className="p-4 bg-[#FAFAFA] border border-black/5 rounded-2xl flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white border border-black/10 flex items-center justify-center overflow-hidden shrink-0">
                    {logoDataUrl ? (
                      <img src={logoDataUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Upload size={20} className="text-[#A8A5A5]" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="px-3 py-1.5 text-xs font-bold bg-white border border-black/10 hover:border-black/20 text-[#111111] rounded-lg cursor-pointer transition-colors inline-block">
                      <span>Choose Logo Image</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="sr-only"
                      />
                    </label>
                    {logoDataUrl && (
                      <button
                        type="button"
                        onClick={handlePickColorsFromLogo}
                        disabled={extractingColors}
                        className="block text-[11px] font-bold text-[#D92D50] hover:underline cursor-pointer"
                      >
                        {extractingColors ? 'Extracting...' : 'Pick from logo colours'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Colour Pickers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">
                      Primary Accent
                    </label>
                    <div className="flex items-center gap-2 bg-[#F8F7F7] p-2 rounded-xl border border-black/10">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-20 text-xs font-mono font-bold bg-transparent border-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">
                      Secondary Tone
                    </label>
                    <div className="flex items-center gap-2 bg-[#F8F7F7] p-2 rounded-xl border border-black/10">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-20 text-xs font-mono font-bold bg-transparent border-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Typed by User */}
            <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-black/5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#111111]">Services & Key Offerings</h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Everything is typed by you. Do not fabricate claims or copy third-party copy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddService}
                  className="px-3 py-1.5 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Add Service</span>
                </button>
              </div>

              <div className="space-y-3">
                {services.map((srv, idx) => (
                  <div key={idx} className="p-4 bg-[#FAFAFA] border border-black/5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Service Title"
                        value={srv.title}
                        onChange={(e) => handleUpdateService(idx, 'title', e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-bold bg-white border border-black/10 rounded-lg focus:outline-none focus:border-[#D92D50]"
                      />
                      {services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveService(idx)}
                          className="text-[#A8A5A5] hover:text-[#D92D50] p-1.5 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Service details and scope description..."
                      value={srv.text}
                      onChange={(e) => handleUpdateService(idx, 'text', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-[#D92D50] resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: TEMPLATE SELECTION & LIVE BUILDER PREVIEW */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="h-full flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Controls */}
            <div className="w-full md:w-80 bg-white border-r border-black/5 p-5 space-y-5 overflow-y-auto shrink-0 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-[#111111] mb-1">Choose Template</h3>
                <p className="text-xs text-[#6B6B6B]">
                  Select from Website Studio library templates.
                </p>
              </div>

              <div className="space-y-2.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedTemplateId === tpl.id
                        ? 'border-[#D92D50] bg-[#FFF5F6] shadow-xs'
                        : 'border-black/5 hover:border-black/15 bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#111111]">{tpl.name}</div>
                    <p className="text-[11px] text-[#6B6B6B] line-clamp-2 mt-0.5">{tpl.description}</p>
                  </button>
                ))}
              </div>

              {/* Shuffle Variation */}
              <div className="pt-4 border-t border-black/5 space-y-2">
                <button
                  type="button"
                  onClick={handleShuffleVariation}
                  className="w-full py-2.5 px-4 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Shuffle size={14} />
                  <span>Shuffle Variation</span>
                </button>
                <p className="text-[10px] text-[#A8A5A5] text-center">
                  Changes layout variations and section styling randomly.
                </p>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 bg-[#222222] flex flex-col overflow-hidden">
              {/* Device Toolbar */}
              <div className="bg-[#181818] px-4 py-2 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                    Mockup Preview
                  </span>
                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-semibold">
                    Concept mockup &mdash; not a live website
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                      previewDevice === 'desktop' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                    }`}
                    title="Desktop (100%)"
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('tablet')}
                    className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                      previewDevice === 'tablet' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                    }`}
                    title="Tablet (768px)"
                  >
                    <Tablet size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                      previewDevice === 'mobile' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                    }`}
                    title="Mobile (375px)"
                  >
                    <Smartphone size={14} />
                  </button>
                </div>
              </div>

              {/* Sandboxed Iframe Container */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                <div
                  className="bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 h-full flex flex-col"
                  style={{
                    width:
                      previewDevice === 'desktop'
                        ? '100%'
                        : previewDevice === 'tablet'
                        ? '768px'
                        : '375px',
                    maxWidth: '100%',
                  }}
                >
                  <iframe
                    title="Concept Mockup Preview"
                    sandbox="allow-scripts"
                    srcDoc={renderedHtml}
                    className="w-full flex-1 border-0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: PROPOSAL PACKAGES & TERMS */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
            <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-black/5 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#111111]">Package Selection & Starting Prices</h2>
                <p className="text-xs text-[#6B6B6B]">
                  Prices are loaded from Settings &gt; Packages and clearly labelled as &ldquo;starting from&rdquo;.
                </p>
              </div>

              {/* Package Tiers from Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {packagesSettings?.packages.map((pkg) => {
                  const isSelected = selectedPackageIds.includes(pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPackageIds(selectedPackageIds.filter((id) => id !== pkg.id));
                        } else {
                          setSelectedPackageIds([...selectedPackageIds, pkg.id]);
                        }
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#D92D50] bg-[#FFF5F6] shadow-2xs'
                          : 'border-black/10 bg-[#FAFAFA] hover:border-black/20'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50]">
                            {pkg.id}
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-[#D92D50] focus:ring-[#D92D50]"
                          />
                        </div>

                        <div className="font-bold text-sm text-[#111111]">{pkg.name}</div>
                        <div className="text-base font-bold text-[#111111]">
                          <span className="text-[11px] font-normal text-[#6B6B6B] block">Starting from</span>
                          €{pkg.startingPriceEUR.toLocaleString()}
                        </div>

                        <ul className="space-y-1.5 pt-2 border-t border-black/5 text-xs text-[#6B6B6B]">
                          {pkg.featureList.map((f, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-1.5">
                              <Check size={13} className="text-[#D92D50] shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Line Items */}
              <div className="pt-4 border-t border-black/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                      Custom Line Items (Optional)
                    </h3>
                    <p className="text-xs text-[#6B6B6B]">
                      {isAdmin
                        ? 'Add custom services with manual price and currency.'
                        : 'Partner custom prices stay marked as "claimed" and do not leak internal margins.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="px-3 py-1.5 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus size={13} />
                    <span>Add Custom Line</span>
                  </button>
                </div>

                {customItems.map((ci, idx) => (
                  <div key={ci.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-black/5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Service / Scope Title"
                        value={ci.title}
                        onChange={(e) => handleUpdateCustomItem(idx, 'title', e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-bold bg-white border border-black/10 rounded-lg focus:outline-none focus:border-[#D92D50]"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={ci.currency}
                          onChange={(e) => handleUpdateCustomItem(idx, 'currency', e.target.value)}
                          className="px-2 py-1.5 text-xs bg-white border border-black/10 rounded-lg font-mono font-bold"
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Price"
                          value={ci.price}
                          onChange={(e) =>
                            handleUpdateCustomItem(idx, 'price', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-24 px-2 py-1.5 text-xs bg-white border border-black/10 rounded-lg font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomItem(idx)}
                          className="text-[#A8A5A5] hover:text-[#D92D50] p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Custom scope description..."
                      value={ci.description}
                      onChange={(e) => handleUpdateCustomItem(idx, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-[#D92D50] resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Proposal Terms & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/5">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Proposal Validity Date
                  </label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <span className="text-[10px] text-[#A8A5A5] mt-1 block">
                    Valid for acceptance until this date.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Branding Applied
                  </label>
                  <div className="p-3 bg-[#F8F7F7] rounded-xl border border-black/5 text-xs text-[#111111] flex items-center justify-between">
                    <span className="font-semibold">{activeBrandingName}</span>
                    <span className="text-[10px] text-[#6B6B6B] font-mono">
                      {isBrandedPartner ? 'Branded Partner Portal' : 'Open Hours Direct'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Intro Text with Wording Guard */}
              <div className="space-y-1.5 pt-2 border-t border-black/5">
                <label className="block text-xs font-bold text-[#111111]">
                  Introduction & Message to Prospect
                </label>
                <textarea
                  rows={3}
                  value={introText}
                  onChange={(e) => {
                    setIntroText(e.target.value);
                    checkIntroWording(e.target.value);
                  }}
                  className="w-full p-3 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50] leading-relaxed resize-none"
                />

                {/* Wording Guard Notice */}
                {wordingWarning.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <AlertTriangle size={15} className="text-amber-700" />
                      <span>Wording Guard Notice: Promotional or Guarantee Terms Detected</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      The following terms were flagged: <strong className="text-amber-950">{wordingWarning.join(', ')}</strong>. Client-visible text must remain neutral, avoid guarantees, and provide accurate scope without fabricated prices.
                    </p>
                    <label className="flex items-start gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wordingConfirmed}
                        onChange={(e) => setWordingConfirmed(e.target.checked)}
                        className="rounded text-[#D92D50] focus:ring-[#D92D50] mt-0.5"
                      />
                      <span className="text-[11px] font-semibold text-amber-950">
                        I confirm this copy is compliant, neutral across niches, and accurately describes our proposal scope.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: PROPOSAL REVIEW, STATUS ACTIONS & PRINT PREVIEW */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
            {/* Status Toolbar & Action Bar (Hidden when printing) */}
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-black/5 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#111111]">Proposal Status:</span>
                <div className="flex items-center gap-1.5">
                  {(['Draft', 'Shared', 'Won', 'Lost'] as ProposalStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      disabled={saving}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        proposalStatus === st
                          ? 'bg-[#111111] text-white shadow-2xs'
                          : 'bg-[#F4F2F2] text-[#6B6B6B] hover:text-[#111111]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print &rarr; Save as PDF</span>
                </button>
              </div>
            </div>

            {/* Sandboxed Iframe printing warning note required by spec */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3 print:hidden">
              <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Print &amp; PDF Formatting Notice</strong>
                <span>
                  The print stylesheet formats this document into an A4 print-ready proposal. Use the <strong>Print &rarr; Save as PDF</strong> button above. If the sandboxed preview iframe does not print reliably in some browser sandbox contexts, the document below includes a full visual layout and packages breakdown ready for PDF generation without weakening iframe sandboxes.
                </span>
              </div>
            </div>

            {/* Print-Ready A4 Document Container */}
            <div
              id="print-proposal-document"
              className="bg-white rounded-[24px] border border-black/10 p-8 sm:p-12 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0"
              style={{ minHeight: '800px' }}
            >
              {/* Header with Branding */}
              <div className="flex items-start justify-between pb-6 border-b border-black/10">
                <div className="space-y-1.5">
                  {activeLogo ? (
                    <img src={activeLogo} alt={activeBrandingName} className="h-10 object-contain mb-2" />
                  ) : (
                    <div className="text-lg font-bold text-[#111111]">{activeBrandingName}</div>
                  )}
                  <div className="text-xs text-[#6B6B6B]">
                    Professional Digital Presence &amp; Ongoing Support Services
                  </div>
                  {partnerBranding?.poweredByOpenHours && (
                    <div className="text-[10px] text-[#A8A5A5]">Powered by Open Hours</div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#D92D50] bg-[#FFF5F6] px-2.5 py-1 rounded-md">
                    Formal Service Proposal
                  </span>
                  <div className="text-xs text-[#6B6B6B] mt-1">Date: {new Date().toLocaleDateString()}</div>
                  <div className="text-xs text-[#111111] font-semibold">Valid until: {validUntil}</div>
                </div>
              </div>

              {/* Prospect Recipient Block */}
              <div className="p-4 rounded-xl bg-[#F8F7F7] border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] block">
                    Prepared for
                  </span>
                  <div className="text-base font-bold text-[#111111] mt-0.5">{prospectName}</div>
                  {prospectWebsiteUrl && (
                    <div className="text-xs text-[#6B6B6B] mt-0.5 font-mono">
                      Reference URL: {prospectWebsiteUrl}
                    </div>
                  )}
                </div>

                <div className="text-xs text-[#6B6B6B]">
                  <div>Industry: <strong>{niche}</strong></div>
                  {email && <div>Email: {email}</div>}
                  {phone && <div>Phone: {phone}</div>}
                </div>
              </div>

              {/* Intro Message */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Proposal Introduction
                </h3>
                <p className="text-xs text-[#333333] leading-relaxed whitespace-pre-wrap">
                  {introText}
                </p>
              </div>

              {/* Mockup Preview Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                    Concept Website Mockup
                  </h3>
                  <span className="text-[10px] text-[#6B6B6B] italic">
                    Concept mockup &mdash; not a live website
                  </span>
                </div>

                <div className="rounded-xl border border-black/10 overflow-hidden bg-[#FAFAFA] h-72 relative">
                  <iframe
                    title="Print Proposal Mockup"
                    sandbox="allow-scripts"
                    srcDoc={renderedHtml}
                    className="w-full h-full border-0 pointer-events-none select-none"
                  />
                </div>
              </div>

              {/* Scope & Packages Pricing Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Scope &amp; Investment Overview
                </h3>

                <div className="border border-black/10 rounded-xl overflow-hidden divide-y divide-black/10">
                  <div className="bg-[#F8F7F7] px-4 py-2.5 grid grid-cols-12 text-[11px] font-bold text-[#111111]">
                    <span className="col-span-7">Package / Service Description</span>
                    <span className="col-span-2 text-center">Type</span>
                    <span className="col-span-3 text-right">Investment</span>
                  </div>

                  {proposalItems.map((item) => (
                    <div key={item.id} className="p-4 grid grid-cols-12 text-xs items-center gap-2">
                      <div className="col-span-7 space-y-1">
                        <div className="font-bold text-[#111111]">{item.title}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#6B6B6B]">{item.description}</div>
                        )}
                        {item.features && item.features.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.features.map((f, i) => (
                              <span
                                key={i}
                                className="text-[10px] text-[#444444] bg-black/5 px-2 py-0.5 rounded"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/5 px-2 py-0.5 rounded text-[#444444]">
                          {item.type === 'package' ? 'Standard Tier' : 'Custom Line'}
                        </span>
                      </div>

                      <div className="col-span-3 text-right font-mono font-bold text-sm text-[#111111]">
                        {item.isStartingFrom && (
                          <span className="text-[10px] font-normal text-[#6B6B6B] block">starting from</span>
                        )}
                        {item.currency === 'EUR' ? '€' : item.currency}
                        {item.price.toLocaleString()}
                        {item.claimedByPartner && (
                          <span className="text-[9px] font-sans font-normal text-[#6B6B6B] block">
                            (Partner Claimed)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard Terms & Sign-off Placeholder */}
              <div className="pt-6 border-t border-black/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Terms of Service &amp; Implementation
                </h3>
                <div className="text-[11px] text-[#6B6B6B] space-y-1 leading-relaxed">
                  <p>
                    1. <strong>Concept Mockup Notice:</strong> All digital previews represent conceptual design layouts and workflow recommendations. Content and assets remain subject to final verification.
                  </p>
                  <p>
                    2. <strong>Delivery Timeline:</strong> Initial setup begins upon agreement confirmation. Standard staging environment is typically deployed within 10 to 14 business days.
                  </p>
                  <p>
                    3. <strong>Validity:</strong> The terms and starting investment outlined above remain valid for acceptance through {validUntil}.
                  </p>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-8 text-xs text-[#6B6B6B]">
                  <div className="border-t border-dashed border-black/20 pt-2">
                    <span>Authorized Signature &mdash; {activeBrandingName}</span>
                  </div>
                  <div className="border-t border-dashed border-black/20 pt-2">
                    <span>Client Acceptance Signature &mdash; {prospectName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Mark as Lost Reason */}
      {lostReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-black/10 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#111111]">Mark Proposal as Lost</h3>
            <p className="text-xs text-[#6B6B6B]">
              Please record the reason why {prospectName} did not proceed (optional):
            </p>

            <select
              value={lostReasonInput}
              onChange={(e) => setLostReasonInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
            >
              <option value="Budget / Pricing constraints">Budget / Pricing constraints</option>
              <option value="Timing / Not ready to modernise">Timing / Not ready to modernise</option>
              <option value="Chose alternative agency/provider">Chose alternative agency/provider</option>
              <option value="Internal / No longer pursuing digital overhaul">Internal / No longer pursuing</option>
              <option value="Unresponsive to follow-up">Unresponsive to follow-up</option>
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLostReasonModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLost}
                className="px-4 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#b0223d] text-white rounded-full transition-colors cursor-pointer"
              >
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
