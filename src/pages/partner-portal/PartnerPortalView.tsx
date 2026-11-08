import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  ExternalLink,
  Plus,
  TrendingUp,
  Eye,
  ShieldCheck,
  Lock,
  Sparkles,
  DollarSign,
  Palette,
  Check,
  ChevronRight,
  Info,
  Calendar,
  LogOut,
  Copy,
  Globe,
  Monitor,
  Tablet,
  Smartphone,
  Tag,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  PartnerPortalViewModel,
  ClientPackage,
  ClinicSpecialty,
  DealCurrency,
  Proposal,
  WebsiteProject,
  PartnerClientOutcomeStatus,
  PartnerClientDemoInfo,
  ScopedPartnerClientItem,
} from '../../types/index.ts';
import {
  getPartnerPortalViewModel,
  submitPartnerClient,
  updatePartnerBranding,
  getPartnerPitchesAndProposals,
  updateProposalStatus,
  updateClientPartnerOutcome,
  getWebsiteProjectById,
} from '../../data/repo.ts';
import { PitchProposalBuilder } from '../../components/pitch/PitchProposalBuilder.tsx';
import {
  validateLogoFile,
  getContrastTextColor,
  getThemeForPartner,
  PortalTheme,
} from '../../lib/branding.ts';
import { PortalThemeProvider, usePortalTheme } from '../../context/PortalThemeContext.tsx';
import { ClientPortalPreview } from '../ClientPortalPreview.tsx';
import { LogoMark } from '../../components/common/LogoMark.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface PartnerPortalViewProps {
  partnerId: string;
  isPreview?: boolean;
  onExitPreview: () => void;
}

type TabKey = 'home' | 'clients' | 'growth' | 'add_client' | 'branding';

export const PartnerPortalView: React.FC<PartnerPortalViewProps> = ({
  partnerId,
  isPreview = true,
  onExitPreview,
}) => {
  const { isSupabaseAuth, signOut } = useAuth();
  const [data, setData] = useState<PartnerPortalViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Client Form State
  const [newBizName, setNewBizName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCountry, setNewCountry] = useState<'Ireland' | 'Malta' | 'Other'>('Ireland');
  const [newCity, setNewCity] = useState('');
  const [newSpecialty, setNewSpecialty] = useState<ClinicSpecialty>('Dental');
  const [newPkgChoice, setNewPkgChoice] = useState<ClientPackage | 'Custom'>('Regular');
  const [customPriceAmount, setCustomPriceAmount] = useState('1500');
  const [customCurrency, setCustomCurrency] = useState<DealCurrency>('EUR');
  const [createClientPortalToggle, setCreateClientPortalToggle] = useState(true);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Client Subtabs ('pitch' vs 'add_client')
  const [addClientSubTab, setAddClientSubTab] = useState<'pitch' | 'add_client'>('pitch');
  const [partnerPitches, setPartnerPitches] = useState<{ projects: WebsiteProject[]; proposals: Proposal[] }>({ projects: [], proposals: [] });
  const [loadingPitches, setLoadingPitches] = useState(false);
  const [showPitchBuilder, setShowPitchBuilder] = useState(false);
  const [selectedProposalToPreview, setSelectedProposalToPreview] = useState<Proposal | null>(null);
  const [prefilledFromWonProposal, setPrefilledFromWonProposal] = useState<string | null>(null);
  const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false);
  const [lostProposalTarget, setLostProposalTarget] = useState<Proposal | null>(null);
  const [lostReasonText, setLostReasonText] = useState('');

  // Branding Customization State (Branded Type)
  const [brandingLogoUrl, setBrandingLogoUrl] = useState('');
  const [brandingName, setBrandingName] = useState('');
  const [brandingColor, setBrandingColor] = useState('#D92D50');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);

  // Outcome Tracking Modal State
  const [outcomeModalClient, setOutcomeModalClient] = useState<ScopedPartnerClientItem | null>(null);
  const [outcomeSelectedStatus, setOutcomeSelectedStatus] = useState<PartnerClientOutcomeStatus>('Interested');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);

  // Demo Preview Modal State
  const [demoModalClient, setDemoModalClient] = useState<ScopedPartnerClientItem | null>(null);
  const [demoModalProject, setDemoModalProject] = useState<WebsiteProject | null>(null);
  const [loadingDemoModal, setLoadingDemoModal] = useState(false);
  const [demoPoweredByOpenHours, setDemoPoweredByOpenHours] = useState(true);
  const [demoDevice, setDemoDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const handleOpenDemoModal = async (clientItem: ScopedPartnerClientItem) => {
    if (!clientItem.demo) return;
    setDemoModalClient(clientItem);
    setLoadingDemoModal(true);
    setDemoPoweredByOpenHours(data?.partner.poweredByOpenHours ?? true);
    try {
      const proj = await getWebsiteProjectById(clientItem.demo.id);
      setDemoModalProject(proj);
    } catch (err) {
      console.error('Failed to load demo project:', err);
    } finally {
      setLoadingDemoModal(false);
    }
  };

  const handleCopyRevealLink = async (demo: PartnerClientDemoInfo, bizName: string) => {
    if (data?.canShareRevealLink === false) {
      showToast('Reveal link sharing is disabled for your partner account.');
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/preview/${demo.shareToken || demo.id}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      showToast(`Reveal link copied for ${bizName}!`);
    } catch (err) {
      showToast('Failed to copy reveal link.');
    }
  };

  const handleOpenOutcomeModal = (clientItem: ScopedPartnerClientItem) => {
    setOutcomeModalClient(clientItem);
    setOutcomeSelectedStatus(clientItem.partnerOutcome?.status || 'Interested');
    setOutcomeNote(clientItem.partnerOutcome?.note || '');
  };

  const handleSaveOutcome = async () => {
    if (!outcomeModalClient || !partnerId) return;
    setSavingOutcome(true);
    try {
      await updateClientPartnerOutcome(
        outcomeModalClient.id,
        partnerId,
        outcomeSelectedStatus,
        outcomeNote.trim() || undefined,
        data?.partner.name || 'Partner'
      );
      await loadData();
      showToast(`Client outcome saved as ${outcomeSelectedStatus}!`);
      setOutcomeModalClient(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update outcome.');
    } finally {
      setSavingOutcome(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPartnerPitches = async () => {
    if (!partnerId) return;
    setLoadingPitches(true);
    try {
      const res = await getPartnerPitchesAndProposals(partnerId);
      setPartnerPitches(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPitches(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const vm = await getPartnerPortalViewModel(partnerId);
    if (vm) {
      setData(vm);
      setBrandingLogoUrl(vm.branding.logoUrl || '');
      setBrandingName(vm.branding.brandName || vm.partner.organisation);
      setBrandingColor(vm.branding.primaryColor || '#D92D50');
    }
    await loadPartnerPitches();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [partnerId]);

  const handleProposalWon = async (prop: Proposal) => {
    try {
      await updateProposalStatus(
        prop.id,
        'Won',
        { decidedAt: new Date().toISOString() },
        data?.partner.name || 'Partner'
      );
      showToast(`Proposal for ${prop.prospectName} marked Won! Complete client referral below.`);

      // Pre-fill Add Client form
      setNewBizName(prop.prospectName);
      if (prop.items && prop.items.length > 0) {
        const first = prop.items[0];
        const itemName = (first.title || first.name || '').toLowerCase();
        if (first.type === 'package') {
          if (itemName.includes('advanced')) setNewPkgChoice('Advanced');
          else if (itemName.includes('premium')) setNewPkgChoice('Premium');
          else setNewPkgChoice('Regular');
        } else if (first.type === 'custom') {
          setNewPkgChoice('Custom');
          if (first.price) setCustomPriceAmount(String(first.price));
          if (first.currency && (first.currency === 'EUR' || first.currency === 'BDT')) {
            setCustomCurrency(first.currency as DealCurrency);
          }
        }
      }
      setPrefilledFromWonProposal(prop.prospectName);
      setAddClientSubTab('add_client');
      loadPartnerPitches();
    } catch (err: any) {
      showToast(err.message || 'Failed to update proposal status.');
    }
  };

  const handleProposalShared = async (prop: Proposal) => {
    try {
      await updateProposalStatus(
        prop.id,
        'Shared',
        { sharedAt: new Date().toISOString() },
        data?.partner.name || 'Partner'
      );
      showToast(`Proposal for ${prop.prospectName} marked as Shared with prospect.`);
      loadPartnerPitches();
    } catch (err: any) {
      showToast(err.message || 'Failed to mark shared.');
    }
  };

  const handleProposalLost = async () => {
    if (!lostProposalTarget) return;
    try {
      await updateProposalStatus(
        lostProposalTarget.id,
        'Lost',
        {
          decidedAt: new Date().toISOString(),
          lostReason: lostReasonText.trim() || undefined,
        },
        data?.partner.name || 'Partner'
      );
      showToast(`Proposal marked as Lost.`);
      setLostReasonModalOpen(false);
      setLostProposalTarget(null);
      setLostReasonText('');
      loadPartnerPitches();
    } catch (err: any) {
      showToast(err.message || 'Failed to update proposal status.');
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F6F5F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#D92D50] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-[#6B6B6B]">Loading Partner Portal...</p>
      </div>
    );
  }

  // If viewing client portal preview from partner's clients list
  if (previewClientId) {
    return (
      <ClientPortalPreview
        clientId={previewClientId}
        onExitPreview={() => setPreviewClientId(null)}
      />
    );
  }

  const isBrandedPortal =
    data.partner.portalType === 'Branded partner portal (partner logo, name, colours)';

  const activeAccentColor = isBrandedPortal ? brandingColor || '#D92D50' : '#D92D50';
  const contrastTextColor = getContrastTextColor(activeAccentColor);
  const activeBrandName = isBrandedPortal ? brandingName || data.partner.organisation : 'Open Hours';

  const theme: PortalTheme = {
    isBranded: isBrandedPortal,
    logoUrl: isBrandedPortal ? brandingLogoUrl || undefined : undefined,
    brandName: activeBrandName,
    accentColor: activeAccentColor,
    contrastTextColor,
    poweredByOpenHours: data.partner.poweredByOpenHours,
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploadingLogo(true);
    const result = await validateLogoFile(file);
    setUploadingLogo(false);

    if (!result.valid || !result.dataUrl) {
      setLogoUploadError(result.error || 'Failed to upload logo.');
      return;
    }

    setBrandingLogoUrl(result.dataUrl);
    showToast('Logo uploaded & validated successfully!');
  };

  const handleSaveBranding = async () => {
    try {
      setSavingBranding(true);
      const actor = isPreview ? 'partner (preview)' : 'partner';
      await updatePartnerBranding(
        data.partner.id,
        {
          logoUrl: brandingLogoUrl.trim() || undefined,
          brandName: brandingName.trim() || data.partner.organisation,
          primaryColor: brandingColor,
        },
        data.partner.poweredByOpenHours,
        actor
      );
      await loadData();
      showToast('Partner branding saved successfully!');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newContactName.trim()) {
      setFormError('Please enter business name and principal contact.');
      return;
    }
    if (newEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setFormError('Please enter a valid email address or leave blank.');
      return;
    }

    try {
      setIsSubmittingClient(true);
      setFormError(null);
      const actor = isPreview ? 'partner (preview)' : 'partner';
      const claimedAmt =
        newPkgChoice === 'Custom'
          ? parseFloat(customPriceAmount) || 1500
          : newPkgChoice === 'Premium'
          ? 2800
          : newPkgChoice === 'Advanced'
          ? 1800
          : 1200;

      await submitPartnerClient(
        data.partner.id,
        {
          businessName: newBizName.trim(),
          contactName: newContactName.trim(),
          email: newEmail.trim(),
          country: newCountry,
          city: newCity.trim(),
          specialty: newSpecialty,
          package: newPkgChoice,
          claimedPrice: claimedAmt,
          claimedCurrency: customCurrency,
          createPortal: createClientPortalToggle,
        },
        actor
      );

      // Reset form
      setNewBizName('');
      setNewContactName('');
      setNewEmail('');
      setNewCity('');
      showToast('Client submitted for admin approval!');
      await loadData();
      setActiveTab('clients');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit client.');
    } finally {
      setIsSubmittingClient(false);
    }
  };

  // Preset colour swatches
  const colorPresets = ['#D92D50', '#2563EB', '#059669', '#7C3AED', '#EA580C', '#0D9488', '#111111'];

  return (
    <PortalThemeProvider theme={theme}>
      <div className="min-h-screen bg-[#F6F5F5] text-[#111111] font-sans antialiased pb-20 flex flex-col">
        {/* Sticky Admin Preview Banner */}
        {isPreview && (
          <div className="sticky top-0 z-50 bg-[#111111] text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Previewing as <strong className="text-white">{data.partner.name}</strong> (
                {data.partner.organisation}) · {data.partner.portalType}
              </span>
            </div>
            <button
              type="button"
              onClick={onExitPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Exit preview</span>
            </button>
          </div>
        )}

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Portal Header */}
        <header className="bg-white border-b border-black/5 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              {isBrandedPortal && brandingLogoUrl ? (
                <img
                  src={brandingLogoUrl}
                  alt={activeBrandName}
                  className="h-9 max-w-[140px] object-contain rounded-md"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                  style={{ backgroundColor: activeAccentColor }}
                >
                  <LogoMark size={20} />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-[#111111] tracking-tight">
                    {activeBrandName}
                  </h1>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: `${activeAccentColor}18`,
                      color: activeAccentColor,
                    }}
                  >
                    Partner Portal
                  </span>
                </div>
                <p className="text-[11px] text-[#6B6B6B]">
                  Strategic Referral & Practice Growth Workspace · {data.partner.type}
                </p>
              </div>
            </div>

            {/* Navigation Tabs (Max 5 tabs) */}
            <nav className="flex items-center gap-1 bg-[#F8F7F7] p-1 rounded-full border border-black/5">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'home'
                    ? 'text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
                style={
                  activeTab === 'home'
                    ? { backgroundColor: activeAccentColor, color: contrastTextColor }
                    : {}
                }
              >
                HOME
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clients')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'clients'
                    ? 'text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
                style={
                  activeTab === 'clients'
                    ? { backgroundColor: activeAccentColor, color: contrastTextColor }
                    : {}
                }
              >
                <span>CLIENTS</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                  {data.clients.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('growth')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'growth'
                    ? 'text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
                style={
                  activeTab === 'growth'
                    ? { backgroundColor: activeAccentColor, color: contrastTextColor }
                    : {}
                }
              >
                GROWTH & EARNINGS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('add_client')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'add_client'
                    ? 'text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
                style={
                  activeTab === 'add_client'
                    ? { backgroundColor: activeAccentColor, color: contrastTextColor }
                    : {}
                }
              >
                <Plus size={12} />
                <span>ADD CLIENT</span>
              </button>
              {isBrandedPortal && (
                <button
                  type="button"
                  onClick={() => setActiveTab('branding')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'branding'
                      ? 'text-white shadow-2xs'
                      : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                  style={
                    activeTab === 'branding'
                      ? { backgroundColor: activeAccentColor, color: contrastTextColor }
                      : {}
                  }
                >
                  <Palette size={12} />
                  <span>BRANDING</span>
                </button>
              )}
            </nav>

            {isSupabaseAuth && (
              <button
                type="button"
                onClick={() => signOut()}
                className="h-[34px] px-3.5 rounded-full bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] text-[#344054] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Sign out of partner portal"
              >
                <LogOut size={12} className="text-[#D92D50]" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </header>

        {/* Portal Main Content */}
        <main className="max-w-6xl mx-auto w-full px-6 py-6 flex-1 space-y-6">
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Partner Overview Welcome Card */}
              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A5] block mb-1">
                    Partner Workspace
                  </span>
                  <h2 className="text-2xl font-bold text-[#111111] tracking-tight">
                    Welcome back, {data.partner.name}
                  </h2>
                  <p className="text-xs text-[#6B6B6B] mt-1 max-w-xl leading-relaxed">
                    Track client referrals, review live project statuses, and monitor verified cash-basis referral revenues.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] text-[#A8A5A5] block">Agreement Terms</span>
                    <span className="text-xs font-bold text-[#111111]">
                      {data.dealTerms.dealModel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add_client')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
                    style={{ backgroundColor: activeAccentColor, color: contrastTextColor }}
                  >
                    <Plus size={14} />
                    <span>Submit New Client</span>
                  </button>
                </div>
              </div>

              {/* Outstanding Admin Requests (e.g. Logo Request) */}
              {data.requests.length > 0 && (
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle size={15} />
                    <span>Action Required from Open Hours</span>
                  </div>
                  <div className="space-y-2">
                    {data.requests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-xl p-3 border border-amber-200/60 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#111111]">{req.title}</div>
                          <div className="text-[11px] text-[#6B6B6B]">{req.description}</div>
                        </div>
                        {isBrandedPortal ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('branding')}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-[#111111] text-white hover:bg-black transition-colors cursor-pointer shrink-0"
                          >
                            Upload Asset
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                            Pending
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KPI Cards Row (Real Selectors Only) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4.5 border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                    Clients Referred
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#111111] tabular-nums">
                      {data.stats.totalClients}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {data.stats.activeClients} active
                    </span>
                  </div>
                  {data.stats.pendingClients > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
                      {data.stats.pendingClients} pending approval
                    </span>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-4.5 border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                    New This Month
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#111111] tabular-nums">
                      {data.stats.newClientsThisMonth}
                    </span>
                    <span className="text-[11px] text-[#A8A5A5]">Practice onboarding</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4.5 border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                    Earnings This Month
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: activeAccentColor }}
                    >
                      €{data.stats.earningsThisMonthEUR.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-[#A8A5A5] uppercase">
                      Estimated
                    </span>
                  </div>
                  <span className="text-[10px] text-[#A8A5A5] block mt-0.5">
                    Until confirmed via cash basis
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-4.5 border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                    Earnings Balance
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#111111] tabular-nums">
                      €{data.stats.earningsOwedEUR.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">
                      €{data.stats.earningsPaidEUR.toLocaleString()} paid
                    </span>
                  </div>
                  <span className="text-[10px] text-[#A8A5A5] block mt-0.5">
                    Single source of truth payout ledger
                  </span>
                </div>
              </div>

              {/* Deal Terms Breakdown Pill */}
              <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold text-[#111111]">
                      Your Agreed Deal Structure: {data.dealTerms.dealModel}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    {data.dealTerms.dealSummary} · Share applies on payments{' '}
                    <strong>RECEIVED</strong> (cash basis).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('growth')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
                >
                  <span>View full earnings ledger</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Recent Clients preview */}
              <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Recent Clinic Referrals
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clients')}
                    className="text-xs font-bold text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
                  >
                    View all ({data.clients.length}) →
                  </button>
                </div>

                {data.clients.length === 0 ? (
                  <p className="text-xs text-[#A8A5A5] py-4 text-center">
                    No clients brought yet. Use the "Add Client" button to refer your first clinic.
                  </p>
                ) : (
                  <div className="divide-y divide-black/5">
                    {data.clients.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="py-3 flex items-center justify-between flex-wrap gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#111111]">{c.businessName}</div>
                          <div className="text-[11px] text-[#6B6B6B]">
                            {c.package} Package · Stage: {c.stage}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.isPendingApproval
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            }`}
                          >
                            {c.isPendingApproval ? 'Pending Approval' : c.stage}
                          </span>
                          {!c.isPendingApproval && (
                            <button
                              type="button"
                              onClick={() => setPreviewClientId(c.id)}
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#111111] hover:bg-black text-white transition-colors cursor-pointer"
                            >
                              Preview Portal
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLIENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#111111] tracking-tight">
                    Your Clinic Clients
                  </h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Practices referred under your partner agreement ({data.clients.length} total)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('add_client')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
                  style={{ backgroundColor: activeAccentColor, color: contrastTextColor }}
                >
                  <Plus size={14} />
                  <span>Refer New Client</span>
                </button>
              </div>

              {/* Outcome Counters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] block">
                      Interested
                    </span>
                    <span className="text-2xl font-bold text-[#111111] tabular-nums">
                      {data.outcomeCounters.interested}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                    {data.outcomeCounters.interested}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] block">
                      Agreed
                    </span>
                    <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                      {data.outcomeCounters.agreed}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                    {data.outcomeCounters.agreed}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] block">
                      Rejected
                    </span>
                    <span className="text-2xl font-bold text-rose-700 tabular-nums">
                      {data.outcomeCounters.rejected}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs border border-rose-200">
                    {data.outcomeCounters.rejected}
                  </div>
                </div>
              </div>

              {/* Privacy Notice Banner */}
              {!data.visibility.enabled && (
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-black/5 text-[11px] text-[#6B6B6B] flex items-center gap-2">
                  <Lock size={14} className="shrink-0 text-[#A8A5A5]" />
                  <span>
                    Privacy Shield Active: Contact names and detailed monthly reports are held by Open Hours administration under GDPR client data separation.
                  </span>
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-[24px] border border-black/5 p-4 shadow-xs overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
                      <tr>
                        <th className="py-3 px-3.5">Business Name</th>
                        <th className="py-3 px-3">Contact</th>
                        <th className="py-3 px-3">Package</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Website Demo</th>
                        <th className="py-3 px-3">Partner Outcome</th>
                        <th className="py-3 px-3">Partner Share</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {data.clients.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-[#A8A5A5]">
                            No clients referred yet.
                          </td>
                        </tr>
                      ) : (
                        data.clients.map((c) => (
                          <tr key={c.id} className="hover:bg-[#F8F7F7] transition-colors">
                            {/* 1. Business Name */}
                            <td className="py-3 px-3.5 font-bold text-[#111111]">
                              <div>{c.businessName}</div>
                              {c.isPendingApproval && (
                                <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                  Pending Review
                                </span>
                              )}
                            </td>

                            {/* 2. Contact Name */}
                            <td className="py-3 px-3 text-[#111111]">
                              {c.contactName || '—'}
                            </td>

                            {/* 3. Package */}
                            <td className="py-3 px-3 font-semibold text-[#6B6B6B]">{c.package}</td>

                            {/* 4. Status */}
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.isPendingApproval
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                }`}
                              >
                                {c.isPendingApproval ? 'Pending Approval' : c.status}
                              </span>
                            </td>

                            {/* 5. Website Demo Status & Actions */}
                            <td className="py-3 px-3">
                              {c.demo ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {c.demo.isExpired ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                        Expired
                                      </span>
                                    ) : c.demo.daysLeft !== undefined ? (
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          c.demo.daysLeft <= 7
                                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        }`}
                                      >
                                        {c.demo.daysLeft <= 0 ? 'Expires today' : `${c.demo.daysLeft} days left`}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                                        Demo active
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDemoModal(c)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#111111] hover:bg-black text-white transition-colors cursor-pointer shadow-2xs"
                                      title="Open sandboxed demo preview with partner branding"
                                    >
                                      <Globe size={11} />
                                      <span>Open demo</span>
                                    </button>

                                    {data.canShareRevealLink ? (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyRevealLink(c.demo!, c.businessName)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-white border border-black/15 text-[#344054] hover:bg-black/5 transition-colors cursor-pointer"
                                        title="Copy preview reveal link"
                                      >
                                        <Copy size={10} />
                                        <span>Share link</span>
                                      </button>
                                    ) : (
                                      <span className="text-[9px] text-[#A8A5A5] italic">
                                        Sharing disabled
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#A8A5A5] italic">No demo</span>
                              )}
                            </td>

                            {/* 6. Partner Outcome Tracking */}
                            <td className="py-3 px-3">
                              {c.partnerOutcome ? (
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenOutcomeModal(c)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                      c.partnerOutcome.status === 'Agreed'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                        : c.partnerOutcome.status === 'Interested'
                                        ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                        : c.partnerOutcome.status === 'Rejected'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                        : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                                    }`}
                                    title="Click to update outcome or note"
                                  >
                                    <span>{c.partnerOutcome.status}</span>
                                  </button>
                                  {c.partnerOutcome.note && (
                                    <p className="text-[10px] text-[#6B6B6B] max-w-[140px] truncate italic" title={c.partnerOutcome.note}>
                                      "{c.partnerOutcome.note}"
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenOutcomeModal(c)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#6B6B6B] hover:text-[#111111] border border-dashed border-black/20 hover:border-black/40 transition-colors cursor-pointer"
                                >
                                  <Tag size={10} />
                                  <span>Set outcome</span>
                                </button>
                              )}
                            </td>

                            {/* 7. Partner Share */}
                            <td className="py-3 px-3 tabular-nums font-bold text-[#111111]">
                              €{c.partnerShareEUR.toLocaleString()}
                              <span className="text-[10px] text-[#A8A5A5] font-normal block">
                                Cash basis
                              </span>
                            </td>

                            {/* 8. Actions */}
                            <td className="py-3 px-3 text-right">
                              {c.isPendingApproval ? (
                                <span className="text-[11px] text-[#A8A5A5] italic">
                                  Awaiting approval
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPreviewClientId(c.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white border border-black/15 text-[#111111] hover:bg-black/5 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Eye size={11} />
                                  <span>Preview Portal</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GROWTH & EARNINGS */}
          {activeTab === 'growth' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-xl font-bold text-[#111111] tracking-tight">
                  Growth & Referral Earnings
                </h2>
                <p className="text-xs text-[#6B6B6B]">
                  6-month client trajectory and earnings single source of truth based purely on received client payments.
                </p>
              </div>

              {/* 6-Month Growth Chart */}
              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                      6-Month Referral & Earnings Trajectory
                    </h3>
                    <p className="text-[11px] text-[#A8A5A5]">Cumulative growth since partnership start</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: activeAccentColor }}
                      />
                      <span>Partner Earnings (€)</span>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.growthChart}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="partnerGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeAccentColor} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={activeAccentColor} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#A8A5A5', fontSize: 11, fontWeight: 600 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#A8A5A5', fontSize: 11, fontWeight: 600 }}
                        tickFormatter={(v) => `€${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111111',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="earningsEUR"
                        stroke={activeAccentColor}
                        strokeWidth={2.5}
                        fill="url(#partnerGrowthGrad)"
                        name="Partner Earnings (€)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                    Total Partner Share Earned
                  </span>
                  <div className="text-2xl font-bold text-[#111111] tabular-nums">
                    €{data.stats.earningsToDateEUR.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[#6B6B6B] block mt-1">
                    Calculated cash basis from paid client invoices
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                    Total Earnings Paid Out
                  </span>
                  <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                    €{data.stats.earningsPaidEUR.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[#6B6B6B] block mt-1">
                    Dispatched via Partner Fee bank transfer
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
                    Current Balance Owed
                  </span>
                  <div
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: activeAccentColor }}
                  >
                    €{data.stats.earningsOwedEUR.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[#6B6B6B] block mt-1">
                    Due on next Open Hours settlement cycle
                  </span>
                </div>
              </div>

              {/* Breakdown per referred client */}
              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Earnings Breakdown by Referred Clinic
                  </h3>
                  <p className="text-[11px] text-[#A8A5A5]">
                    Strict cash basis logic: Partner share earned = f(Deal Terms, Verified Client Payments)
                  </p>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
                      <tr>
                        <th className="py-2.5 px-3">Clinic Practice</th>
                        <th className="py-2.5 px-3">Package Tier</th>
                        <th className="py-2.5 px-3">Pipeline Claimed Value</th>
                        <th className="py-2.5 px-3">Gross Payments Received</th>
                        <th className="py-2.5 px-3">Partner Share Earned</th>
                        <th className="py-2.5 px-3">Revenue Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {data.clients.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 px-3 font-bold text-[#111111]">{c.businessName}</td>
                          <td className="py-3 px-3 text-[#6B6B6B]">{c.package}</td>
                          <td className="py-3 px-3 tabular-nums text-[#6B6B6B]">
                            {c.claimedPrice ? `€${c.claimedPrice.toLocaleString()}` : '—'}
                            <span className="text-[9px] font-bold text-[#A8A5A5] ml-1 uppercase">
                              (Claimed)
                            </span>
                          </td>
                          <td className="py-3 px-3 tabular-nums font-semibold text-[#111111]">
                            €{c.grossPaymentsEUR.toLocaleString()}
                          </td>
                          <td
                            className="py-3 px-3 tabular-nums font-bold"
                            style={{ color: activeAccentColor }}
                          >
                            €{c.partnerShareEUR.toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                              Cash Received
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADD CLIENT (WITH SUB-TABS: "Pitch" and "Add client") */}
          {activeTab === 'add_client' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Sub-Tabs Pill Selector */}
              <div className="flex items-center justify-center">
                <div className="inline-flex p-1 bg-[#EBE8E8] rounded-full border border-black/5">
                  <button
                    type="button"
                    onClick={() => setAddClientSubTab('pitch')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      addClientSubTab === 'pitch'
                        ? 'bg-white text-[#111111] shadow-2xs'
                        : 'text-[#6B6B6B] hover:text-[#111111]'
                    }`}
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Pitch &amp; Proposals</span>
                    {partnerPitches.proposals.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 bg-black/10 rounded-full text-[10px]">
                        {partnerPitches.proposals.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddClientSubTab('add_client')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      addClientSubTab === 'add_client'
                        ? 'bg-white text-[#111111] shadow-2xs'
                        : 'text-[#6B6B6B] hover:text-[#111111]'
                    }`}
                  >
                    <Plus size={13} />
                    <span>Add Client</span>
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SUB-TAB 1: PITCH & PROPOSALS */}
              {/* ========================================================================= */}
              {addClientSubTab === 'pitch' && (
                <div className="space-y-6">
                  {/* Sub-tab Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#111111] tracking-tight">
                        Client Pitches &amp; Proposals
                      </h2>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">
                        Build tailored concept website mockups and bespoke package proposals. Once won, seamlessly submit for admin onboarding review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPitchBuilder(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                      style={{ backgroundColor: activeAccentColor, color: contrastTextColor }}
                    >
                      <Sparkles size={14} />
                      <span>Create New Pitch</span>
                    </button>
                  </div>

                  {/* Legal / IP Compliance Note */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2.5">
                    <Info size={15} className="text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Compliance note:</strong> Use only information you are allowed to use. Do not copy a third party's text or images.
                    </span>
                  </div>

                  {/* Proposals List */}
                  {loadingPitches ? (
                    <div className="py-12 text-center text-xs text-[#6B6B6B]">Loading pitches...</div>
                  ) : partnerPitches.proposals.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-black/10 space-y-3">
                      <Sparkles size={36} className="mx-auto text-amber-400" />
                      <div className="font-bold text-sm text-[#111111]">No pitch proposals created yet</div>
                      <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">
                        Generate an interactive website mockup and price quote for prospective clients. Partner-entered custom pricing remains claimed until verified.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPitchBuilder(true)}
                        className="px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        style={{ backgroundColor: activeAccentColor, color: contrastTextColor }}
                      >
                        <Plus size={14} />
                        <span>Create First Pitch</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {partnerPitches.proposals.map((prop) => {
                        const linkedProject = partnerPitches.projects.find((p) => p.id === prop.projectId);
                        const isExpired = linkedProject?.status === 'Expired' ||
                          (linkedProject?.expiresAt && new Date(linkedProject.expiresAt).getTime() < Date.now() && !linkedProject?.keepPermanently && linkedProject?.status !== 'Approved');

                        if (isExpired) {
                          return (
                            <div
                              key={prop.id}
                              className="bg-[#FAFAFA] rounded-3xl border border-black/5 p-4 flex items-center justify-between opacity-60"
                            >
                              <div>
                                <span className="text-[10px] uppercase font-bold text-[#A8A5A5] block">
                                  Prospect Pitch
                                </span>
                                <h3 className="font-semibold text-xs text-[#6B6B6B]">{prop.prospectName}</h3>
                              </div>
                              <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                Expired
                              </span>
                            </div>
                          );
                        }

                        const isPermanent = linkedProject?.keepPermanently || linkedProject?.status === 'Approved';
                        const expiresAtMs = linkedProject?.expiresAt ? new Date(linkedProject.expiresAt).getTime() : null;
                        const daysLeft = expiresAtMs ? Math.ceil((expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                        const statusColor =
                          prop.status === 'Won'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : prop.status === 'Shared'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : prop.status === 'Lost'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200';

                        return (
                          <div
                            key={prop.id}
                            className="bg-white rounded-3xl border border-black/10 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-bold text-[#A8A5A5] uppercase tracking-wider block">
                                    Prospect Pitch
                                  </span>
                                  <h3 className="font-bold text-sm text-[#111111] mt-0.5 line-clamp-1">
                                    {prop.prospectName}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {isPermanent ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                                      Permanent
                                    </span>
                                  ) : daysLeft !== null ? (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                        daysLeft <= 7
                                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {daysLeft <= 0 ? 'Expires today' : `${daysLeft} days left`}
                                    </span>
                                  ) : null}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor} shrink-0`}>
                                    {prop.status}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1.5 text-xs text-[#6B6B6B] border-t border-b border-black/5 py-2.5">
                                <div className="flex items-center justify-between">
                                  <span>Package items:</span>
                                  <span className="font-semibold text-[#111111]">
                                    {prop.items.map((i) => i.title || i.name || 'Custom item').join(', ') || 'Custom'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Valid until:</span>
                                  <span className="font-mono text-[#111111]">{prop.validUntil || '—'}</span>
                                </div>
                                {prop.sharedAt && (
                                  <div className="flex items-center justify-between">
                                    <span>Shared on:</span>
                                    <span className="font-mono text-[#111111]">
                                      {new Date(prop.sharedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {prop.status === 'Lost' && prop.lostReason && (
                                  <div className="p-2 rounded-xl bg-rose-50 text-rose-800 text-[11px]">
                                    <strong>Lost Reason:</strong> {prop.lostReason}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Actions */}
                            <div className="pt-4 flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedProposalToPreview(prop)}
                                className="w-full py-1.5 px-3 rounded-xl border border-black/10 text-xs font-semibold text-[#111111] hover:bg-black/5 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Eye size={13} />
                                <span>Open Proposal / Mockup</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                {prop.status === 'Draft' && (
                                  <button
                                    type="button"
                                    onClick={() => handleProposalShared(prop)}
                                    className="flex-1 py-1.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold cursor-pointer transition-colors"
                                  >
                                    Mark Shared
                                  </button>
                                )}

                                {prop.status !== 'Won' && (
                                  <button
                                    type="button"
                                    onClick={() => handleProposalWon(prop)}
                                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold cursor-pointer transition-colors"
                                    title="Mark Won and pre-fill referral form"
                                  >
                                    Mark Won &rarr;
                                  </button>
                                )}

                                {prop.status !== 'Lost' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLostProposalTarget(prop);
                                      setLostReasonModalOpen(true);
                                    }}
                                    className="py-1.5 px-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer transition-colors"
                                    title="Mark Lost"
                                  >
                                    Lost
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* SUB-TAB 2: ADD CLIENT FORM */}
              {/* ========================================================================= */}
              {addClientSubTab === 'add_client' && (
                <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-xs space-y-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A5] block mb-1">
                      New Client Referral
                    </span>
                    <h2 className="text-xl font-bold text-[#111111] tracking-tight">
                      Submit a Client
                    </h2>
                    <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                      Refer a business client. Upon submission, the client is queued as <strong>Pending approval</strong> for Open Hours admin onboarding verification.
                    </p>
                  </div>

                  {/* Pre-filled from Won Proposal Alert */}
                  {prefilledFromWonProposal && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <div>
                          <strong>Proposal Won!</strong> Form prefilled for{' '}
                          <strong>{prefilledFromWonProposal}</strong>. Verify details below to complete referral.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrefilledFromWonProposal(null)}
                        className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleAddClientSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          Business Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newBizName}
                          onChange={(e) => setNewBizName(e.target.value)}
                          placeholder="e.g. Blackrock Dental Care"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          Principal Contact Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          placeholder="e.g. Dr. Aoife Kelly"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="e.g. principal@blackrockdental.ie (optional)"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black"
                        />
                        <span className="text-[11px] text-[#A8A5A5] mt-1 block">
                          Only add contact details you are allowed to share.
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          Country *
                        </label>
                        <select
                          value={newCountry}
                          onChange={(e) => setNewCountry(e.target.value as any)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black bg-white cursor-pointer"
                        >
                          <option value="Ireland">Ireland</option>
                          <option value="Malta">Malta</option>
                          <option value="Other">Other EU</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          City / Region
                        </label>
                        <input
                          type="text"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          placeholder="e.g. Dublin, Sliema"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          Specialty / Niche *
                        </label>
                        <select
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value as any)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black bg-white cursor-pointer"
                        >
                          <option value="Dental">Dental</option>
                          <option value="Physio">Physiotherapy</option>
                          <option value="Chiropractic">Chiropractic</option>
                          <option value="Aesthetics">Aesthetics</option>
                          <option value="Private clinic">Private Clinic</option>
                          <option value="Other">Other Specialist / Business</option>
                        </select>
                      </div>
                    </div>

                    {/* Package Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                        Package Selection
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'Regular', label: 'Regular', price: 'starting from €1,200/mo' },
                          { id: 'Advanced', label: 'Advanced', price: 'starting from €1,800/mo' },
                          { id: 'Premium', label: 'Premium', price: 'starting from €2,800/mo' },
                          { id: 'Custom', label: 'Custom', price: 'Custom Price' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setNewPkgChoice(item.id as any)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              newPkgChoice === item.id
                                ? 'border-[#111111] bg-[#111111] text-white shadow-xs'
                                : 'border-black/10 bg-white hover:border-black/20 text-[#111111]'
                            }`}
                          >
                            <div className="text-xs font-bold">{item.label}</div>
                            <div
                              className={`text-[10px] mt-0.5 ${
                                newPkgChoice === item.id ? 'text-white/80' : 'text-[#6B6B6B]'
                              }`}
                            >
                              {item.price}
                            </div>
                          </button>
                        ))}
                      </div>

                      {newPkgChoice === 'Custom' && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-[#F8F7F7] border border-black/5 grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#111111] mb-1">
                              Claimed Monthly Price
                            </label>
                            <input
                              type="number"
                              value={customPriceAmount}
                              onChange={(e) => setCustomPriceAmount(e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 bg-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#111111] mb-1">
                              Currency
                            </label>
                            <select
                              value={customCurrency}
                              onChange={(e) => setCustomCurrency(e.target.value as any)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 bg-white outline-none cursor-pointer"
                            >
                              <option value="EUR">EUR (€)</option>
                              <option value="BDT">BDT (৳)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Create Client Portal Toggle */}
                    <div className="p-4 rounded-2xl bg-[#F8F7F7] border border-black/5 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-[#111111] block">
                          Provision Client Portal on Approval
                        </span>
                        <span className="text-[11px] text-[#6B6B6B]">
                          Automatically launch the onboarding checklist once approved by Open Hours.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={createClientPortalToggle}
                          onChange={(e) => setCreateClientPortalToggle(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#111111]" />
                      </label>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingClient}
                        className="w-full py-3 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: activeAccentColor, color: contrastTextColor }}
                      >
                        {isSubmittingClient ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Submitting client...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Submit Client for Administrative Review</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-[#A8A5A5] text-center mt-2">
                        Partner-entered prices are stored as "Claimed" until Open Hours confirms verified cash payments.
                      </p>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BRANDING (Branded type only) */}
          {activeTab === 'branding' && isBrandedPortal && (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A5] block mb-1">
                  Branded White-Labeling
                </span>
                <h2 className="text-xl font-bold text-[#111111] tracking-tight">
                  Custom Partner Portal Branding
                </h2>
                <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                  Your logo, brand name, and accent colour apply across your partner workspace and all referred clinic client portals.
                </p>
              </div>

              {/* Logo Uploader */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#111111]">
                  Partner Brand Logo (PNG, JPG, SVG up to 2 MB)
                </label>
                <div className="p-5 border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-[#FBFBFB]">
                  {brandingLogoUrl ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <img
                        src={brandingLogoUrl}
                        alt="Preview"
                        className="h-12 max-w-[200px] object-contain rounded-md border border-black/5 p-1 bg-white"
                      />
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>Validated & Sanitised</span>
                      </span>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-[#6B6B6B]">
                      <Upload size={20} />
                    </div>
                  )}

                  <div>
                    <label className="px-4 py-2 rounded-full text-xs font-bold bg-[#111111] hover:bg-black text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                      <Upload size={13} />
                      <span>{brandingLogoUrl ? 'Replace Logo' : 'Choose Logo File'}</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {uploadingLogo && (
                      <span className="text-xs text-[#6B6B6B] block mt-1">Sanitising & validating...</span>
                    )}
                  </div>
                  {logoUploadError && (
                    <p className="text-xs text-red-600 font-medium">{logoUploadError}</p>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Brand Display Name
                </label>
                <input
                  type="text"
                  value={brandingName}
                  onChange={(e) => setBrandingName(e.target.value)}
                  placeholder="e.g. MedGrowth Agency"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Accent Colour & Contrast Validation */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#111111]">
                  Primary Accent Colour
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border border-black/10 shadow-2xs shrink-0"
                    style={{ backgroundColor: brandingColor }}
                  />
                  <input
                    type="text"
                    value={brandingColor}
                    onChange={(e) => setBrandingColor(e.target.value)}
                    placeholder="#D92D50"
                    className="w-32 text-xs font-mono px-3 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black uppercase"
                  />
                  {/* Preset swatches */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {colorPresets.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setBrandingColor(hex)}
                        className="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Contrast analysis pill */}
                <div className="p-3 rounded-xl bg-[#F8F7F7] border border-black/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#D92D50]" />
                    <span>Contrast & Text Readability:</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <span
                      className="px-2 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: brandingColor,
                        color: contrastTextColor,
                      }}
                    >
                      Readable Text: {contrastTextColor === '#FFFFFF' ? 'White' : 'Charcoal'}
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      WCAG AA
                    </span>
                  </div>
                </div>
              </div>

              {/* Powered by Open Hours Status */}
              <div className="p-4 rounded-2xl bg-[#F8F7F7] border border-black/5 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#111111] block">
                    "Powered by Open Hours" Footer Badge
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Status: {data.partner.poweredByOpenHours ? 'Enabled (Default ON)' : 'Disabled by administrator'}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    data.partner.poweredByOpenHours
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-[#6B6B6B]'
                  }`}
                >
                  {data.partner.poweredByOpenHours ? 'ON' : 'OFF'}
                </span>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  disabled={savingBranding}
                  className="w-full py-3 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                  style={{ backgroundColor: brandingColor }}
                >
                  {savingBranding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving branding...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Apply & Save Branding</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Portal Footer */}
        {data.partner.poweredByOpenHours && (
          <footer className="mt-auto border-t border-black/5 py-6 px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/5 text-[11px] font-semibold text-[#6B6B6B] shadow-2xs">
              <LogoMark size={14} />
              <span>Powered by Open Hours</span>
            </div>
          </footer>
        )}

        {/* Pitch Proposal Builder Modal */}
        {(showPitchBuilder || selectedProposalToPreview) && (
          <PitchProposalBuilder
            partnerId={partnerId}
            partnerBranding={{
              brandName: data.branding.brandName || data.partner.organisation,
              logoUrl: data.branding.logoUrl,
              accentColor: activeAccentColor,
              poweredByOpenHours: data.partner.poweredByOpenHours ?? true,
              isBranded: isBrandedPortal,
            }}
            initialData={
              selectedProposalToPreview
                ? {
                    proposalId: selectedProposalToPreview.id,
                    projectId: selectedProposalToPreview.projectId,
                    prospectName: selectedProposalToPreview.prospectName,
                    leadId: selectedProposalToPreview.leadId,
                    partnerId: selectedProposalToPreview.partnerId,
                  }
                : undefined
            }
            isAdmin={false}
            onClose={() => {
              setShowPitchBuilder(false);
              setSelectedProposalToPreview(null);
            }}
            onProposalSaved={() => {
              setShowPitchBuilder(false);
              setSelectedProposalToPreview(null);
              loadPartnerPitches();
            }}
            onProposalWon={(wonProp) => {
              setShowPitchBuilder(false);
              setSelectedProposalToPreview(null);
              handleProposalWon(wonProp);
            }}
          />
        )}

        {/* Lost Reason Modal */}
        {lostReasonModalOpen && lostProposalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-black/10 shadow-2xl animate-in fade-in duration-150">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A5A5] block">
                  Proposal Status
                </span>
                <h3 className="text-sm font-bold text-[#111111] mt-0.5">Mark Proposal as Lost</h3>
              </div>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                You are marking the proposal for <strong>{lostProposalTarget.prospectName}</strong> as lost. You can optionally record a reason below.
              </p>
              <textarea
                rows={3}
                value={lostReasonText}
                onChange={(e) => setLostReasonText(e.target.value)}
                placeholder="Optional reason (e.g. Budget constraints, chose internal team, postponed)..."
                className="w-full text-xs p-3 rounded-2xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLostReasonModalOpen(false);
                    setLostProposalTarget(null);
                    setLostReasonText('');
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-full hover:bg-black/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProposalLost}
                  className="px-4 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full cursor-pointer shadow-xs"
                >
                  Confirm Lost
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Outcome Tracking Modal */}
        {outcomeModalClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-black/10 shadow-2xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A5A5] block">
                    Partner Outcome Tracking
                  </span>
                  <h3 className="text-base font-bold text-[#111111] mt-0.5">
                    {outcomeModalClient.businessName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOutcomeModalClient(null)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-[#6B6B6B] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Selector Options */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#111111]">
                  Current Opportunity Outcome *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Interested', 'Agreed', 'Not interested', 'Rejected'] as PartnerClientOutcomeStatus[]).map(
                    (st) => {
                      const isSelected = outcomeSelectedStatus === st;
                      const badgeStyles =
                        st === 'Agreed'
                          ? isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : st === 'Interested'
                          ? isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          : st === 'Rejected'
                          ? isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          : isSelected
                          ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOutcomeSelectedStatus(st)}
                          className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${badgeStyles}`}
                        >
                          {st}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Agreed Context Notice */}
              {outcomeSelectedStatus === 'Agreed' && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                  <strong>Notice:</strong> Marking "Agreed" creates a priority task for the account manager to finalize onboarding. It does not create revenue or client billing; payments remain the single source of truth.
                </div>
              )}

              {/* Optional Note (Max 300 chars) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[#111111]">
                    Outcome Note (Optional)
                  </label>
                  <span className={`text-[10px] tabular-nums ${outcomeNote.length > 280 ? 'text-amber-600 font-bold' : 'text-[#A8A5A5]'}`}>
                    {outcomeNote.length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                  placeholder="e.g. Discussed package options, agreed to proceed with proposal review next Tuesday..."
                  className="w-full text-xs p-3 rounded-xl border border-black/10 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOutcomeModalClient(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-full hover:bg-black/5 text-[#6B6B6B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingOutcome}
                  onClick={handleSaveOutcome}
                  className="px-5 py-2 text-xs font-bold rounded-full text-white cursor-pointer shadow-xs transition-all disabled:opacity-50"
                  style={{ backgroundColor: activeAccentColor }}
                >
                  {savingOutcome ? 'Saving...' : 'Save Outcome'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sandboxed Demo Preview Modal with Partner Branding */}
        {demoModalClient && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Top Partner Branding Header Bar */}
            <div className="bg-white border-b border-black/10 px-6 py-3 flex items-center justify-between flex-wrap gap-4 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                {brandingLogoUrl ? (
                  <img
                    src={brandingLogoUrl}
                    alt={activeBrandName}
                    className="h-8 max-w-[120px] object-contain rounded"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs"
                    style={{ backgroundColor: activeAccentColor }}
                  >
                    <Globe size={16} />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#111111]">
                      {activeBrandName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 text-[#6B6B6B]">
                      Demo Preview
                    </span>
                  </div>
                  <span className="text-xs text-[#6B6B6B] block">
                    {demoModalClient.businessName} Website Concept
                  </span>
                </div>
              </div>

              {/* Middle Device Controls */}
              <div className="flex items-center gap-1 bg-[#F2F4F7] p-1 rounded-full border border-black/5">
                <button
                  type="button"
                  onClick={() => setDemoDevice('desktop')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    demoDevice === 'desktop'
                      ? 'bg-white text-[#111111] shadow-2xs font-bold'
                      : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDemoDevice('tablet')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    demoDevice === 'tablet'
                      ? 'bg-white text-[#111111] shadow-2xs font-bold'
                      : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                  title="Tablet Preview"
                >
                  <Tablet size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDemoDevice('mobile')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    demoDevice === 'mobile'
                      ? 'bg-white text-[#111111] shadow-2xs font-bold'
                      : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone size={15} />
                </button>
              </div>

              {/* Right Controls: Powered-by toggle, Share link, Close */}
              <div className="flex items-center gap-2">
                {/* Powered-by toggle */}
                <button
                  type="button"
                  onClick={() => setDemoPoweredByOpenHours(!demoPoweredByOpenHours)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    demoPoweredByOpenHours
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}
                  title="Toggle Powered by Open Hours badge"
                >
                  <span className="text-[11px]">Powered by Open Hours:</span>
                  <span className="text-[11px] font-bold">
                    {demoPoweredByOpenHours ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Share reveal link button */}
                {data.canShareRevealLink && demoModalClient.demo && (
                  <button
                    type="button"
                    onClick={() => handleCopyRevealLink(demoModalClient.demo!, demoModalClient.businessName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-black/15 text-[#111111] hover:bg-black/5 transition-all cursor-pointer shadow-2xs"
                    title="Copy public reveal link"
                  >
                    <Copy size={13} />
                    <span>Copy Reveal Link</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDemoModalClient(null);
                    setDemoModalProject(null);
                  }}
                  className="p-2 rounded-full hover:bg-black/5 text-[#6B6B6B] transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Preview Frame Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {loadingDemoModal ? (
                <div className="text-white text-xs flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading sandboxed website demo...</span>
                </div>
              ) : (
                <div
                  className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 border border-white/20 h-full max-h-[88vh] ${
                    demoDevice === 'desktop'
                      ? 'w-full max-w-6xl'
                      : demoDevice === 'tablet'
                      ? 'w-[768px]'
                      : 'w-[375px]'
                  }`}
                >
                  {/* Browser Mockup Top Bar */}
                  <div className="px-4 py-2 bg-[#F9FAFB] border-b border-black/10 flex items-center justify-between text-[11px] text-[#6B6B6B] shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="px-4 py-0.5 rounded-md bg-white border border-black/10 text-[10px] text-[#6B6B6B] max-w-sm truncate text-center font-mono">
                      https://preview.openhours.co/{demoModalClient.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-[10px] text-[#111111]">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: activeAccentColor }}
                      />
                      <span>{activeBrandName}</span>
                    </div>
                  </div>

                  {/* Sandboxed iframe */}
                  <div className="flex-1 w-full bg-white relative overflow-hidden">
                    <iframe
                      title={`${demoModalClient.businessName} Website Demo`}
                      srcDoc={
                        demoModalProject?.renderedHtml ||
                        `<div style="font-family:sans-serif;padding:60px 20px;text-align:center;color:#4B5563;">
                          <h2 style="font-size:20px;font-weight:bold;margin-bottom:8px;color:#111827;">${demoModalClient.businessName}</h2>
                          <p style="font-size:14px;color:#6B7280;max-width:400px;margin:0 auto 20px;">Website concept preview active under ${activeBrandName}.</p>
                          <div style="display:inline-block;padding:8px 16px;background:${activeAccentColor};color:#fff;border-radius:999px;font-size:12px;font-weight:bold;">Concept Ready</div>
                        </div>`
                      }
                      sandbox="allow-scripts allow-same-origin"
                      className="w-full h-full border-0"
                    />
                  </div>

                  {/* Powered-by footer inside preview frame */}
                  {demoPoweredByOpenHours && (
                    <div className="py-2 px-4 bg-white border-t border-black/5 flex items-center justify-center gap-2 text-[10px] font-semibold text-[#6B6B6B] shrink-0">
                      <LogoMark size={12} />
                      <span>Powered by Open Hours</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalThemeProvider>
  );
};
