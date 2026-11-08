import React, { useState, useEffect } from 'react';
import {
  Client,
  WebsiteTemplate,
  DemoSite,
  DemoSiteDetails,
  DemoSiteBrand,
  DemoSiteService,
  DemoSiteTestimonial,
  DemoSiteImage,
  DemoSiteSocialLink,
} from '../../types/index.ts';
import {
  getWebsiteTemplates,
  getDemoSitesForClient,
  saveDemoSite,
  shareDemoSiteToClient,
} from '../../data/repo.ts';
import {
  renderWebsiteTemplate,
  isContrastAccessible,
  calculateContrastRatio,
  getContrastColor,
  getBrandTint,
} from '../../lib/templateEngine.ts';
import {
  Layout,
  Plus,
  Save,
  Send,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  Upload,
  Sparkles,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  History,
  Check,
  FileCode,
  Tag,
  Sliders,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';

interface WebsiteDemoManagerProps {
  client: Client;
  onRefreshClient?: () => void;
}

const WEB_SAFE_FONTS = [
  { label: 'System Sans (Modern & Clean)', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'Inter / UI Neutral', value: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' },
  { label: 'Trebuchet / Geometric', value: '"Trebuchet MS", "Lucida Grande", sans-serif' },
  { label: 'Georgia / Editorial Serif', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'Garamond / Elegant Serif', value: 'Garamond, "Baskerville", serif' },
  { label: 'Clean Monospace', value: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
];

export const WebsiteDemoManager: React.FC<WebsiteDemoManagerProps> = ({
  client,
  onRefreshClient,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [demoSites, setDemoSites] = useState<DemoSite[]>([]);
  const [activeDemo, setActiveDemo] = useState<DemoSite | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Details State
  const [businessName, setBusinessName] = useState(client.businessName || '');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState(client.phone || '');
  const [email, setEmail] = useState(client.portalUserEmail || '');
  const [address, setAddress] = useState(client.city ? `${client.city}, ${client.country}` : client.country || '');
  const [openingHours, setOpeningHours] = useState('Mon - Fri: 09:00 - 18:00');
  const [ctaText, setCtaText] = useState('Book Consultation');
  const [ctaLink, setCtaLink] = useState('https://');

  // Services (up to 6)
  const [services, setServices] = useState<DemoSiteService[]>([
    { title: 'Initial Consultation', text: 'Thorough clinical assessment, diagnostics, and customized treatment planning.' },
    { title: 'Specialist Treatment', text: 'Targeted care delivered using modern clinical techniques and certified protocols.' },
  ]);

  // Testimonials (Optional - ONLY if client supplied them)
  const [testimonials, setTestimonials] = useState<DemoSiteTestimonial[]>([]);

  // Images (Optional)
  const [images, setImages] = useState<DemoSiteImage[]>([]);

  // Brand Styling State
  const [primaryColor, setPrimaryColor] = useState('#D92D50');
  const [secondaryColor, setSecondaryColor] = useState('#101828');
  const [fontStack, setFontStack] = useState(WEB_SAFE_FONTS[0].value);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);

  // Preview Settings
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [liveHtml, setLiveHtml] = useState<string>('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [contrastWarning, setContrastWarning] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tpls, demos] = await Promise.all([
        getWebsiteTemplates(),
        getDemoSitesForClient(client.id),
      ]);
      setTemplates(tpls);
      setDemoSites(demos);

      if (demos.length > 0) {
        // Load latest demo
        const latest = demos[0];
        setActiveDemo(latest);
        setSelectedTemplateId(latest.templateId);
        setBusinessName(latest.details.businessName || client.businessName);
        setTagline(latest.details.tagline || '');
        setAbout(latest.details.about || '');
        setPhone(latest.details.phone || client.phone || '');
        setEmail(latest.details.email || client.portalUserEmail || '');
        setAddress(latest.details.address || '');
        setOpeningHours(latest.details.openingHours || 'Mon - Fri: 09:00 - 18:00');
        setCtaText(latest.details.ctaText || 'Book Consultation');
        setCtaLink(latest.details.ctaLink || 'https://');
        setServices(latest.details.services || []);
        setTestimonials(latest.details.testimonials || []);
        setImages(latest.details.images || []);
        setPrimaryColor(latest.brand.primaryColor || '#D92D50');
        setSecondaryColor(latest.brand.secondaryColor || '#101828');
        setFontStack(latest.brand.fontStack || WEB_SAFE_FONTS[0].value);
        setLogoDataUrl(latest.brand.logoDataUrl);
        setStep(3); // Jump straight to Preview and Tweak if a demo exists
      } else if (tpls.length > 0) {
        setSelectedTemplateId(tpls[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [client.id]);

  // Check Contrast Accessibility whenever colors change
  useEffect(() => {
    const contrastRatio = calculateContrastRatio(primaryColor, '#FFFFFF');
    if (contrastRatio < 4.5) {
      setContrastWarning(
        `Low contrast warning: Ratio is ${contrastRatio.toFixed(1)}:1 against white text (WCAG AA requires 4.5:1). Darker primary color recommended.`
      );
    } else {
      setContrastWarning(null);
    }
  }, [primaryColor]);

  // Re-render live preview whenever details or selected template changes
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (!tpl) return;

    const currentDetails: DemoSiteDetails = {
      businessName: businessName.trim() || client.businessName,
      tagline: tagline.trim() || undefined,
      about: about.trim() || undefined,
      services,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      openingHours: openingHours.trim() || undefined,
      ctaText: ctaText.trim() || undefined,
      ctaLink: ctaLink.trim() || undefined,
      testimonials: testimonials.length > 0 ? testimonials : undefined,
      images: images.length > 0 ? images : undefined,
    };

    const currentBrand: DemoSiteBrand = {
      primaryColor,
      secondaryColor,
      fontStack,
      logoDataUrl,
    };

    const html = renderWebsiteTemplate(tpl.html, currentDetails, currentBrand, { withRibbon: true });
    setLiveHtml(html);
  }, [
    selectedTemplateId,
    templates,
    businessName,
    tagline,
    about,
    services,
    phone,
    email,
    address,
    openingHours,
    ctaText,
    ctaLink,
    testimonials,
    images,
    primaryColor,
    secondaryColor,
    fontStack,
    logoDataUrl,
    client.businessName,
  ]);

  // Helper: Copy details from client record
  const handleCopyFromClient = () => {
    setBusinessName(client.businessName || '');
    if (client.phone) setPhone(client.phone);
    if (client.portalUserEmail) setEmail(client.portalUserEmail);
    if (client.city) setAddress(`${client.city}, ${client.country || 'Ireland'}`);
    showToast('Copied business details from client profile.');
  };

  // Helper: Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showToast('Logo file size exceeds 1 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoDataUrl(result);
      showToast('Logo uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  // Helper: Add / Remove Services
  const handleAddService = () => {
    if (services.length >= 6) {
      showToast('A maximum of 6 services can be showcased in the one-page demo.');
      return;
    }
    setServices([...services, { title: 'New Clinical Service', text: 'Description of treatment benefits and procedure.' }]);
  };

  const handleUpdateService = (idx: number, field: 'title' | 'text', val: string) => {
    const updated = [...services];
    updated[idx] = { ...updated[idx], [field]: val };
    setServices(updated);
  };

  const handleRemoveService = (idx: number) => {
    setServices(services.filter((_, i) => i !== idx));
  };

  // Helper: Add / Remove Testimonials (Optional)
  const handleAddTestimonial = () => {
    setTestimonials([...testimonials, { quote: 'Care was exceptional and the staff were wonderful.', author: 'Patient Name', role: 'Verified Patient' }]);
  };

  const handleUpdateTestimonial = (idx: number, field: 'quote' | 'author' | 'role', val: string) => {
    const updated = [...testimonials];
    updated[idx] = { ...updated[idx], [field]: val };
    setTestimonials(updated);
  };

  const handleRemoveTestimonial = (idx: number) => {
    setTestimonials(testimonials.filter((_, i) => i !== idx));
  };

  // Actions
  const handleSaveDraft = async () => {
    if (!selectedTemplateId) {
      showToast('Please select a website template first.');
      return;
    }

    setSaving(true);
    try {
      const currentDetails: DemoSiteDetails = {
        businessName: businessName.trim() || client.businessName,
        tagline: tagline.trim() || undefined,
        about: about.trim() || undefined,
        services,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        ctaText: ctaText.trim() || undefined,
        ctaLink: ctaLink.trim() || undefined,
        testimonials: testimonials.length > 0 ? testimonials : undefined,
        images: images.length > 0 ? images : undefined,
      };

      const currentBrand: DemoSiteBrand = {
        primaryColor,
        secondaryColor,
        fontStack,
        logoDataUrl,
      };

      const saved = await saveDemoSite({
        id: activeDemo?.id,
        clientId: client.id,
        templateId: selectedTemplateId,
        templateVersion: 1,
        details: currentDetails,
        brand: currentBrand,
        status: 'Draft',
        createdBy: 'Admin',
      });

      setActiveDemo(saved);
      showToast(`Saved draft version v${saved.version}.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareToClient = async () => {
    if (!activeDemo) {
      await handleSaveDraft();
    }

    setSaving(true);
    try {
      const demoToShare = activeDemo || (await getDemoSitesForClient(client.id))[0];
      if (!demoToShare) throw new Error('No draft to share. Please save a draft first.');

      const shared = await shareDemoSiteToClient(demoToShare.id, 'Admin');
      setActiveDemo(shared);
      showToast(`Website demo v${shared.version} successfully shared to ${client.businessName}'s client portal!`);
      loadData();
      if (onRefreshClient) onRefreshClient();
    } catch (err: any) {
      showToast(err.message || 'Failed to share demo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!liveHtml) return;
    const blob = new Blob([liveHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_website_demo_v${activeDemo?.version || 1}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded self-contained website demo HTML file.');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7F8EF] text-[#099250] border border-[#A6F4C5] flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved by Client
          </span>
        );
      case 'Changes requested':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEECEB] text-[#D92D50] border border-[#FECDCA] flex items-center gap-1 animate-pulse">
            <AlertTriangle size={12} /> Changes Requested
          </span>
        );
      case 'Shared':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0F9FF] text-[#026AA2] border border-[#B9E6FE] flex items-center gap-1">
            <Send size={12} /> Shared in Portal
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F2F4F7] text-[#475467] border border-[#EAECF0] flex items-center gap-1">
            <Clock size={12} /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#101828] text-white px-4 py-3 rounded-[12px] shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-[#12B76A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layout size={18} className="text-[#D92D50]" />
            <h2 className="text-[17px] font-bold text-[#101828]">Website Demo Builder</h2>
            {activeDemo && getStatusBadge(activeDemo.status)}
            {activeDemo && (
              <span className="text-[11px] font-mono text-[#667085] ml-1">
                Version {activeDemo.version}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] max-w-xl">
            Build and preview tailored single-page website demos for <strong>{client.businessName}</strong>.
            Share to client portal for feedback or download self-contained HTML.
          </p>
        </div>

        {/* Top Right Wizard Steps & History */}
        <div className="flex items-center gap-3">
          {demoSites.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/10 hover:bg-[#F2F4F7] text-[#344054] cursor-pointer"
            >
              <History size={14} />
              <span>Version History ({demoSites.length})</span>
            </button>
          )}

          {/* Stepper Navigation */}
          <div className="flex items-center gap-1 bg-[#F4F2F2] p-1 rounded-full border border-black/5">
            {[
              { num: 1, label: '1. Details' },
              { num: 2, label: '2. Template' },
              { num: 3, label: '3. Preview & Actions' },
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  step === s.num
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER (If client requested changes) */}
      {activeDemo?.status === 'Changes requested' && activeDemo.clientFeedback && (
        <div className="p-4 bg-[#FEECEB] border border-[#FECDCA] rounded-[20px] text-xs text-[#D92D50] flex items-start gap-3 shadow-xs">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold text-sm">
              Client Feedback Received on Version {activeDemo.version}:
            </strong>
            <p className="text-[#B42318] text-[13px] leading-relaxed italic bg-white/60 p-2.5 rounded-xl border border-[#FECDCA]">
              &ldquo;{activeDemo.clientFeedback}&rdquo;
            </p>
            <span className="text-[11px] text-[#D92D50] block pt-0.5">
              Tweak the details below or switch templates, then click &ldquo;Share to client portal&rdquo; to send a new revised version.
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: DETAILS & BRANDING */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#ECEEF2] flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#101828]">Step 1: Practice Details & Branding</h3>
              <p className="text-xs text-[#667085]">
                Enter clinic information. All inputs are HTML-escaped for security.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyFromClient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F8F9FB] hover:bg-[#F2F4F7] text-[#101828] border border-black/10 cursor-pointer shadow-2xs"
            >
              <Sparkles size={13} className="text-[#D92D50]" />
              <span>Copy details from client record</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Practice Name & Tagline */}
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Business / Practice Name <span className="text-[#D92D50]">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Tagline / Practice Sub-headline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Modern cosmetic dentistry in Dublin Docklands"
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            {/* About text */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-[#344054] mb-1">
                About the Practice (1-2 paragraphs)
              </label>
              <textarea
                rows={3}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Brief summary of clinic philosophy, clinician background, or specialty focus..."
                className="w-full p-3 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none"
              />
            </div>

            {/* Contact info: Phone & Email */}
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+353 1 234 5678"
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@clinic.ie"
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            {/* Address & Hours */}
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Practice Address & Location
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 14 Grand Canal Quay, Dublin 2"
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Opening Hours
              </label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="e.g. Mon - Fri: 08:30 - 18:00"
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            {/* CTA Button & Link */}
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Call-to-Action Button Label
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Book Consultation"
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                CTA Link (https, tel, or mailto)
              </label>
              <input
                type="text"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="https://clinic.ie/booking or tel:+3531..."
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
              />
            </div>
          </div>

          {/* Section: Clinical Services (up to 6) */}
          <div className="pt-4 border-t border-[#ECEEF2] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                  Featured Services ({services.length}/6)
                </h4>
                <p className="text-[11px] text-[#667085]">
                  Key treatments to showcase in the service cards grid.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddService}
                disabled={services.length >= 6}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#111111] text-white hover:bg-black cursor-pointer disabled:opacity-50"
              >
                <Plus size={13} />
                <span>Add Service</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((srv, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#667085]">Service #{idx + 1}</span>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveService(idx)}
                        className="text-[#98A2B3] hover:text-[#D92D50]"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={srv.title}
                    onChange={(e) => handleUpdateService(idx, 'title', e.target.value)}
                    placeholder="Service Title"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-bold text-[#101828]"
                  />
                  <textarea
                    rows={2}
                    value={srv.text}
                    onChange={(e) => handleUpdateService(idx, 'text', e.target.value)}
                    placeholder="Short description of treatment..."
                    className="w-full p-2 rounded-lg border border-black/10 bg-white text-xs text-[#475467] resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section: Client Supplied Testimonials (Optional) */}
          <div className="pt-4 border-t border-[#ECEEF2] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                  Testimonials (ONLY if client supplied them)
                </h4>
                <p className="text-[11px] text-[#667085]">
                  Never invent reviews or testimonials. If empty, the testimonial section is omitted from the template.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTestimonial}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/10 hover:bg-[#F2F4F7] text-[#344054] cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Client Quote</span>
              </button>
            </div>

            {testimonials.map((t, idx) => (
              <div key={idx} className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#667085]">Testimonial #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTestimonial(idx)}
                    className="text-[#98A2B3] hover:text-[#D92D50]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={t.quote}
                  onChange={(e) => handleUpdateTestimonial(idx, 'quote', e.target.value)}
                  placeholder="Exact quote supplied by client..."
                  className="w-full p-2 rounded-lg border border-black/10 bg-white text-xs text-[#344054] resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={t.author}
                    onChange={(e) => handleUpdateTestimonial(idx, 'author', e.target.value)}
                    placeholder="Author Name"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-black/10 bg-white text-xs"
                  />
                  <input
                    type="text"
                    value={t.role || ''}
                    onChange={(e) => handleUpdateTestimonial(idx, 'role', e.target.value)}
                    placeholder="Role / Verification (Optional)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-black/10 bg-white text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Section: Brand Styling */}
          <div className="pt-4 border-t border-[#ECEEF2] space-y-4">
            <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Brand Styling & Palette
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Primary Color */}
              <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2">
                <label className="block font-semibold text-[#344054]">
                  Primary Brand Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 font-mono text-xs uppercase rounded-lg border border-black/10 bg-white text-[#101828]"
                  />
                </div>
                {contrastWarning && (
                  <div className="text-[11px] text-[#D92D50] leading-tight pt-1">
                    {contrastWarning}
                  </div>
                )}
              </div>

              {/* Secondary Color */}
              <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2">
                <label className="block font-semibold text-[#344054]">
                  Secondary / Header Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 font-mono text-xs uppercase rounded-lg border border-black/10 bg-white text-[#101828]"
                  />
                </div>
              </div>

              {/* Font Stack */}
              <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] space-y-2">
                <label className="block font-semibold text-[#344054]">
                  Typography Font
                </label>
                <select
                  value={fontStack}
                  onChange={(e) => setFontStack(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-black/10 bg-white text-xs text-[#101828] cursor-pointer"
                >
                  {WEB_SAFE_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logo upload (PNG/JPG/WebP/SVG, max 1MB) */}
            <div className="p-4 bg-[#FAFBFD] rounded-xl border border-[#ECEEF2] flex items-center justify-between flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-0.5">
                  Practice Logo
                </label>
                <span className="text-[11px] text-[#667085]">
                  PNG, JPG, WebP, or SVG (max 1 MB). SVG is rendered strictly via &lt;img&gt;, never inlined.
                </span>
              </div>

              <div className="flex items-center gap-3">
                {logoDataUrl && (
                  <div className="p-1.5 bg-white border border-[#ECEEF2] rounded-lg">
                    <img
                      src={logoDataUrl}
                      alt="Logo preview"
                      className="h-8 max-w-[120px] object-contain"
                    />
                  </div>
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-black/10 hover:bg-[#F2F4F7] text-[#101828] cursor-pointer shadow-2xs">
                  <Upload size={13} />
                  <span>{logoDataUrl ? 'Change Logo' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoDataUrl(undefined)}
                    className="text-xs text-[#D92D50] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 1 Next Button */}
          <div className="pt-4 border-t border-[#ECEEF2] flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white cursor-pointer shadow-2xs"
            >
              <span>Next: Choose Template</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: TEMPLATE SELECTOR */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#ECEEF2]">
            <div>
              <h3 className="text-sm font-bold text-[#101828]">Step 2: Choose Template</h3>
              <p className="text-xs text-[#667085]">
                Select a layout template to generate the live preview with {client.businessName}&apos;s details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-[#667085] hover:text-[#101828] cursor-pointer"
            >
              &larr; Back to Details
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {templates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`rounded-[20px] p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#D92D50] bg-[#FFF5F6] shadow-sm ring-1 ring-[#D92D50]'
                      : 'border-[#ECEEF2] bg-white hover:border-[#D0D5DD]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#98A2B3]">
                        v{tpl.version}
                      </span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D92D50] text-white">
                          Selected
                        </span>
                      ) : (
                        <span className="text-xs text-[#667085]">Click to pick</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-[#101828]">{tpl.name}</h4>
                    <p className="text-xs text-[#667085] line-clamp-3">
                      {tpl.description}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {(tpl.nicheTags || []).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-white border border-[#E4E7EC] text-[10px] font-medium text-[#475467]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/5 mt-4 flex items-center justify-between text-xs">
                    <span className="text-[#667085]">Single-page responsive</span>
                    <span className="font-bold text-[#D92D50] flex items-center gap-1">
                      {isSelected && <Check size={14} />}
                      {isSelected ? 'Active' : 'Choose'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#ECEEF2] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold text-[#667085] hover:text-[#101828] cursor-pointer"
            >
              &larr; Back to Details
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-white cursor-pointer shadow-2xs"
            >
              <span>Next: Live Preview & Actions</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PREVIEW, TWEAK & ACTIONS */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/10 hover:bg-[#F2F4F7] text-[#344054] cursor-pointer"
              >
                <Sliders size={13} />
                <span>Switch Template</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-black/10 hover:bg-[#F2F4F7] text-[#344054] cursor-pointer"
              >
                <span>Edit Details</span>
              </button>
            </div>

            {/* Device Width Toggle */}
            <div className="flex items-center gap-1 bg-[#F4F2F2] p-1 rounded-xl border border-black/5">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  previewDevice === 'desktop' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Monitor size={14} />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`p-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  previewDevice === 'tablet' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Tablet size={14} />
                <span>Tablet (768px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  previewDevice === 'mobile' ? 'bg-[#101828] text-white' : 'text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Smartphone size={14} />
                <span>Mobile (375px)</span>
              </button>
            </div>

            {/* Primary Actions: Save Draft, Share to Portal, Download */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-black/10 hover:bg-[#F2F4F7] text-[#344054] cursor-pointer shadow-2xs"
              >
                <Download size={14} />
                <span>Download HTML</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#101828] cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Save size={14} />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={handleShareToClient}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
              >
                <Send size={14} />
                <span>{activeDemo?.status === 'Shared' ? 'Re-share to Client Portal' : 'Share to Client Portal'}</span>
              </button>
            </div>
          </div>

          {/* Sandboxed Live Iframe Container */}
          <div className="bg-[#EEF0F4] rounded-[24px] p-4 sm:p-6 flex items-center justify-center min-h-[640px] border border-black/5">
            <div
              className="bg-white shadow-xl rounded-2xl overflow-hidden transition-all duration-300 border border-black/10 h-[620px] w-full"
              style={{
                maxWidth:
                  previewDevice === 'desktop'
                    ? '100%'
                    : previewDevice === 'tablet'
                    ? '768px'
                    : '375px',
              }}
            >
              <iframe
                title="Website Demo Live Sandbox"
                sandbox=""
                srcDoc={liveHtml}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF2]">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#D92D50]" />
                <h3 className="text-base font-bold text-[#101828]">
                  Website Demo Version History
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F2F4F7] text-[#667085] flex items-center justify-center"
              >
                X
              </button>
            </div>

            <p className="text-xs text-[#667085]">
              Every share creates an immutable historical version. Demos are never overwritten.
            </p>

            <div className="divide-y divide-[#ECEEF2] text-xs max-h-72 overflow-y-auto">
              {demoSites.map((d) => (
                <div key={d.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#101828]">Version {d.version}</span>
                      {getStatusBadge(d.status)}
                    </div>
                    <div className="text-[11px] text-[#667085]">
                      Created by {d.createdBy} on {d.createdAt.split('T')[0]}
                      {d.sharedAt && ` &middot; Shared on ${d.sharedAt.split('T')[0]}`}
                    </div>
                    {d.clientFeedback && (
                      <p className="text-[11px] text-[#D92D50] italic bg-[#FEECEB] p-2 rounded-lg">
                        &ldquo;{d.clientFeedback}&rdquo;
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDemo(d);
                      setShowHistoryModal(false);
                      setStep(3);
                    }}
                    className="px-3 py-1 rounded-lg border border-black/10 hover:bg-[#F2F4F7] text-xs font-semibold text-[#101828]"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#ECEEF2] flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#667085] hover:text-[#101828]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
