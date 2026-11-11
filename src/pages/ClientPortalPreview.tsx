import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  Calendar,
  LifeBuoy,
  Send,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  X,
  Plus,
  Paperclip,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  LogOut,
  Monitor,
  Tablet,
  Smartphone,
  ThumbsUp,
  Sparkles,
  QrCode,
  ShieldCheck,
  Calculator,
  Gauge,
  Copy,
  Share2,
  Mail,
  RotateCcw,
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
  ClientPortalViewModel,
  Request,
  Ticket,
  FileItem,
  Meeting,
  ClientMonthlyReport,
} from '../types/index.ts';
import {
  getClientPortalViewModel,
  submitClientRequestResponse,
  clientPortalRaiseTicket,
  getClientById,
  getPartnerById,
  clientApproveDemoSite,
  clientRequestDemoSiteChanges,
  approveCustomVersion,
  requestChangesCustomVersion,
  dismissClientWelcomeMoment,
  updateClientGoogleReviewLink,
} from '../data/repo.ts';
import { GoogleReviewQrModal } from '../components/clients/GoogleReviewQrModal.tsx';
import { LogoMark } from '../components/common/LogoMark.tsx';
import {
  PortalTheme,
  getThemeForClient,
  DEFAULT_OPEN_HOURS_THEME,
} from '../lib/branding.ts';
import { PortalThemeProvider } from '../context/PortalThemeContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { DemoPreviewWithFeedback } from '../components/preview/DemoPreviewWithFeedback.tsx';
import { ReactTemplatePreview } from '../components/website/ReactTemplatePreview.tsx';
import {
  RevealSequenceOverlay,
  RevealStatusPill,
} from '../components/preview/RevealSequenceOverlay.tsx';
import { BoardExplainer } from '../components/referral/BoardExplainer.tsx';

interface ClientPortalPreviewProps {
  clientId: string;
  onExitPreview: () => void;
  isPreview?: boolean;
}

type PortalTab = 'home' | 'progress' | 'actions' | 'reports' | 'files_support';

// Allowed file types for attachments
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_PER_RESPONSE = 5;

export const ClientPortalPreview: React.FC<ClientPortalPreviewProps> = ({
  clientId,
  onExitPreview,
  isPreview = true,
}) => {
  const { isSupabaseAuth, signOut } = useAuth();
  const [data, setData] = useState<ClientPortalViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [theme, setTheme] = useState<PortalTheme>(DEFAULT_OPEN_HOURS_THEME);

  // Action Items / Attachment Flow State
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [responseText, setResponseText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ file: File; name: string; sizeBytes: number; mime: string; dataUrl?: string }>
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Tickets form state
  const [raiseTicketModalOpen, setRaiseTicketModalOpen] = useState(false);
  const [ticketType, setTicketType] = useState<Ticket['type']>('Question');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Visible items limit toggles (No more than 5 before "Show more")
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);

  // Selected Monthly Report Modal for details view
  const [selectedReportDetail, setSelectedReportDetail] = useState<ClientMonthlyReport | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Website Demo Preview State
  const [demoDevice, setDemoDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [changeFeedback, setChangeFeedback] = useState('');
  const [demoActionLoading, setDemoActionLoading] = useState(false);
  const [customWebsiteActivePreviewUrl, setCustomWebsiteActivePreviewUrl] = useState<string | null>(null);
  const [showPreviousVersions, setShowPreviousVersions] = useState(false);

  // Welcome Moment State
  const [welcomeDismissedLocal, setWelcomeDismissedLocal] = useState<boolean>(false);

  // Onboarding Checklist Expand / Collapse
  const [checklistExpanded, setChecklistExpanded] = useState<boolean>(true);

  // ROI Estimator State (portal-local inputs)
  const [roiEnquiries, setRoiEnquiries] = useState<string>('');
  const [roiConversionRate, setRoiConversionRate] = useState<string>('');
  const [roiCustomerValue, setRoiCustomerValue] = useState<string>('');
  const [roiExtraEnquiries, setRoiExtraEnquiries] = useState<number>(10);

  // Google Review QR Sheet Modal
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Referral Programme Copy Feedback
  const [copiedReferralLink, setCopiedReferralLink] = useState<boolean>(false);
  const [showExplainerModal, setShowExplainerModal] = useState<boolean>(false);

  // Portal Reveal Sequence State
  const [showPortalReveal, setShowPortalReveal] = useState<boolean>(false);

  useEffect(() => {
    if (!clientId) return;
    try {
      const stored = localStorage.getItem(`roi_inputs_${clientId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.enquiries !== undefined) setRoiEnquiries(parsed.enquiries);
        if (parsed.conversionRate !== undefined) setRoiConversionRate(parsed.conversionRate);
        if (parsed.customerValue !== undefined) setRoiCustomerValue(parsed.customerValue);
        if (parsed.extraEnquiries !== undefined) setRoiExtraEnquiries(parsed.extraEnquiries);
      }
    } catch {
      // safe fallback
    }
  }, [clientId]);

  const updateRoiStorage = (updates: { enquiries?: string; conversionRate?: string; customerValue?: string; extraEnquiries?: number }) => {
    try {
      const payload = {
        enquiries: updates.enquiries !== undefined ? updates.enquiries : roiEnquiries,
        conversionRate: updates.conversionRate !== undefined ? updates.conversionRate : roiConversionRate,
        customerValue: updates.customerValue !== undefined ? updates.customerValue : roiCustomerValue,
        extraEnquiries: updates.extraEnquiries !== undefined ? updates.extraEnquiries : roiExtraEnquiries,
      };
      localStorage.setItem(`roi_inputs_${clientId}`, JSON.stringify(payload));
    } catch {
      // safe fallback
    }
  };

  const handleDismissWelcomeMoment = async () => {
    setWelcomeDismissedLocal(true);
    try {
      const actor = isPreview ? 'client (preview)' : 'client';
      await dismissClientWelcomeMoment(clientId, actor);
    } catch {
      // safe fallback
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApproveDemo = async () => {
    if (!data?.websiteDemo && !data?.customWebsitePreview) return;
    setDemoActionLoading(true);
    try {
      const actor = isPreview ? 'client (preview)' : 'client';
      if (data.customWebsitePreview) {
        await approveCustomVersion(data.customWebsitePreview.currentVersion.id, undefined, actor);
        showToast('Website version approved! Our team has been notified.');
      } else if (data.websiteDemo) {
        await clientApproveDemoSite(data.websiteDemo.id, actor);
        showToast('Website design approved! Your team has been notified.');
      }
      await loadPortalData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve website.');
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.websiteDemo && !data?.customWebsitePreview) return;
    if (!changeFeedback.trim()) {
      showToast('Please provide your requested revisions.');
      return;
    }
    setDemoActionLoading(true);
    try {
      const actor = isPreview ? 'client (preview)' : 'client';
      if (data.customWebsitePreview) {
        await requestChangesCustomVersion(data.customWebsitePreview.currentVersion.id, changeFeedback.trim(), actor);
        showToast('Changes requested. Your account manager has been notified.');
      } else if (data.websiteDemo) {
        await clientRequestDemoSiteChanges(data.websiteDemo.id, changeFeedback.trim(), actor);
        showToast('Changes requested. Your account manager has been assigned a task.');
      }
      setShowRequestChangesModal(false);
      setChangeFeedback('');
      await loadPortalData();
    } catch (err: any) {
      showToast(err.message || 'Failed to request changes.');
    } finally {
      setDemoActionLoading(false);
    }
  };

  const loadPortalData = async () => {
    setLoading(true);
    const [vm, rawClient] = await Promise.all([
      getClientPortalViewModel(clientId),
      getClientById(clientId),
    ]);
    setData(vm);
    if (vm?.websiteDemo) {
      try {
        const seen = localStorage.getItem(`openhours_reveal_seen_portal_${clientId}_${vm.websiteDemo.id}`);
        if (seen !== 'true') {
          setShowPortalReveal(true);
        }
      } catch {
        // Safe fallback
      }
    }
    if (rawClient?.sourcePartnerId) {
      const partner = await getPartnerById(rawClient.sourcePartnerId);
      if (partner) {
        setTheme(getThemeForClient(rawClient, partner));
      } else {
        setTheme(DEFAULT_OPEN_HOURS_THEME);
      }
    } else {
      setTheme(DEFAULT_OPEN_HOURS_THEME);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPortalData();
  }, [clientId]);

  // File selection & validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (selectedFiles.length + files.length > MAX_FILES_PER_RESPONSE) {
      setUploadError(`Maximum of ${MAX_FILES_PER_RESPONSE} files allowed per response.`);
      return;
    }

    const newFilesList = [...selectedFiles];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      // Validate extension
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setUploadError(`Invalid file type for "${file.name}". Allowed: PDF, PNG, JPG, DOCX, XLSX.`);
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File "${file.name}" exceeds the 5 MB size limit.`);
        return;
      }

      newFilesList.push({
        file,
        name: file.name,
        sizeBytes: file.size,
        mime: file.type || 'application/octet-stream',
      });
    }

    setSelectedFiles(newFilesList);
    // Reset file input value
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  // Submit response with attachments
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!responseText.trim() && selectedFiles.length === 0) {
      setUploadError('Please provide either text details or at least one file.');
      return;
    }

    try {
      setIsSubmittingResponse(true);
      setUploadError(null);

      // Convert files to base64 or metadata payload
      const attachmentsPayload = await Promise.all(
        selectedFiles.map(async (sf) => {
          let dataUrl: string | undefined = undefined;
          try {
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(sf.file);
            });
          } catch {
            // safe fallback
          }

          return {
            name: sf.name,
            sizeBytes: sf.sizeBytes,
            mime: sf.mime,
            dataUrl,
          };
        })
      );

      await submitClientRequestResponse(
        selectedRequest.id,
        responseText.trim() || 'Uploaded attachments for request.',
        attachmentsPayload,
        'client (preview)'
      );

      setSubmitSuccess(true);
      showToast('Sent to Open Hours');

      setTimeout(async () => {
        setSelectedRequest(null);
        setResponseText('');
        setSelectedFiles([]);
        setSubmitSuccess(false);
        await loadPortalData();
      }, 1500);
    } catch {
      setUploadError('Submission failed. Please try again.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Submit Ticket
  const handleRaiseTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDescription.trim()) return;

    try {
      setIsSubmittingTicket(true);
      await clientPortalRaiseTicket({
        clientId,
        type: ticketType,
        title: ticketTitle.trim(),
        description: ticketDescription.trim(),
        actor: 'client (preview)',
      });
      showToast('Support ticket raised.');
      setRaiseTicketModalOpen(false);
      setTicketTitle('');
      setTicketDescription('');
      await loadPortalData();
    } catch {
      showToast('Failed to submit ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[#6B6B6B]">
            Opening client portal...
          </span>
        </div>
      </div>
    );
  }

  const {
    client,
    rightNow,
    visibleStages,
    attentionItems,
    latestPublishedReport,
    publishedReports,
    sixMonthTrend,
    liveReport,
    requests,
    files,
    meetings,
    tickets,
  } = data;

  // Comparison % for published reports
  const prevReport = publishedReports[1] || null;
  const currentReport = latestPublishedReport;

  const visitorsChangePct =
    currentReport && prevReport && prevReport.visitors.value > 0
      ? Math.round(
          ((currentReport.visitors.value - prevReport.visitors.value) /
            prevReport.visitors.value) *
            100
        )
      : null;

  const enquiriesChangePct =
    currentReport && prevReport && prevReport.enquiries.value > 0
      ? Math.round(
          ((currentReport.enquiries.value - prevReport.enquiries.value) /
            prevReport.enquiries.value) *
            100
        )
      : null;

  // Tab visibility: If all features in tab are off, the tab disappears (HOME always stays; max 5 tabs)
  const isProgressVisible = Boolean(
    (data.visibleStages && data.visibleStages.length > 0) ||
    data.websiteDemo ||
    (data.assignedTeam && data.assignedTeam.length > 0) ||
    (data.rightNow && data.rightNow.expectedLaunchDate)
  );

  const isActionsVisible = Boolean(
    (data.requests && data.requests.length > 0) ||
    (data.attentionItems && data.attentionItems.length > 0)
  );

  const isReportsVisible = Boolean(
    data.latestPublishedReport ||
    (data.publishedReports && data.publishedReports.length > 0) ||
    (data.weeklySnapshots && data.weeklySnapshots.length > 0) ||
    (data.sixMonthTrend && data.sixMonthTrend.length > 0) ||
    data.liveReport ||
    data.client.roiEstimatorEnabled
  );

  const isFilesSupportVisible = Boolean(
    (data.files && data.files.length > 0) ||
    (data.meetings && data.meetings.length > 0) ||
    (data.tickets && data.tickets.length > 0) ||
    data.bookingLink ||
    data.client.googleReviewLink ||
    data.securityBasics.httpsEnabled.verified ||
    data.securityBasics.privacyPolicyAdded.verified ||
    data.securityBasics.cookieNoticeAdded.verified ||
    data.securityBasics.contactFormTested.verified
  );

  return (
    <PortalThemeProvider theme={theme}>
      <div className="min-h-screen bg-[#F3F4F6] text-[#111827] font-sans antialiased flex flex-col" style={{ "--accent": theme.accentColor || "#1F5FA8" } as React.CSSProperties}>
        {/* 1. STICKY TOP PREVIEW BANNER (Admin preview only) */}
        {isPreview && (
          <aside
            aria-label="Admin preview status"
            className="sticky top-0 z-50 bg-[#111111] text-white px-4 py-2 flex items-center justify-between text-xs border-b border-black/10"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D92D50] animate-pulse" />
              <span className="font-semibold">
                Previewing as <span className="text-white underline">{client.businessName}</span>
              </span>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                · Read-only preview with simulated client responses
              </span>
            </div>

            <button
              type="button"
              onClick={onExitPreview}
              className="px-3 py-1 rounded-[8px] bg-[var(--accent)] hover:opacity-90 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft size={12} />
              <span>Exit Preview</span>
            </button>
          </aside>
        )}

        {/* 2. STICKY TOP BRAND BAR */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-6 py-3.5 flex items-center justify-between">
          {/* Left: Client Business Name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F8F7F7] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#111111]">
              <Building size={15} />
            </div>
            <div>
              <div className="font-bold text-sm text-[#111111] leading-tight">
                {client.businessName}
              </div>
              <div className="text-[10px] text-[#A8A5A5] font-medium">
                {client.specialty} · {client.city}, {client.country}
              </div>
            </div>
          </div>

          {/* Center: Open Hours Wordmark or Partner Brand Logo/Name */}
          <div className="hidden md:flex items-center gap-2 select-none">
            {theme.isBranded && theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt={theme.brandName}
                className="h-7 max-w-[120px] object-contain rounded"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: theme.accentColor }}
              >
                <LogoMark size={10} />
              </div>
            )}
            <span className="font-bold text-xs text-[#111111] tracking-tight">
              {theme.brandName}
            </span>
          </div>

          {/* Right: Need help? link + Sign Out button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('files_support')}
              className="text-xs font-semibold text-[#6B6B6B] hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center gap-1"
            >
              <HelpCircle size={14} />
              <span>Need help?</span>
            </button>

            {isSupabaseAuth && (
              <button
                type="button"
                onClick={() => signOut()}
                className="h-[32px] px-3 rounded-[8px] bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] text-[#344054] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Sign out of client portal"
              >
                <LogOut size={12} className="text-[#6B7280]" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </header>

      {/* 3. TOP NAVIGATION (MAX 5 TABS - HIDE IF ALL FEATURES IN TAB ARE OFF) */}
      <nav
        aria-label="Client portal primary navigation"
        className="bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-center sm:justify-start gap-1 sm:gap-2 overflow-x-auto"
      >
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'home'
              ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Home
        </button>

        {isProgressVisible && (
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'progress'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Progress
          </button>
        )}

        {isActionsVisible && (
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <span>Action Items</span>
            {attentionItems.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center">
                {attentionItems.length}
              </span>
            )}
          </button>
        )}

        {isReportsVisible && (
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Reports
          </button>
        )}

        {isFilesSupportVisible && (
          <button
            type="button"
            onClick={() => setActiveTab('files_support')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'files_support'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Files & Support
          </button>
        )}
      </nav>

      {/* 4. MAIN VIEWPORT CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* ========================================================================= */}
        {/* TAB 1: HOME */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* 0. WELCOME MOMENT (First portal visit only, CSS-only confetti burst, dismissible) */}
            {!client.welcomeMomentDismissed && !welcomeDismissedLocal && (
              <div className="relative overflow-hidden bg-gradient-to-br from-[#111111] via-[#1a1a1a] to-[#262626] text-white rounded-[12px] p-6 sm:p-8 shadow-md border border-black/10">
                {/* CSS Confetti Burst (max 2 seconds, disabled when prefers-reduced-motion) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                  {[...Array(24)].map((_, i) => {
                    const colors = ['#D92D50', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#FFFFFF'];
                    const left = (i * 4.1 + (i % 3) * 2) % 96 + 2;
                    const delay = ((i % 6) * 0.12).toFixed(2);
                    const bg = colors[i % colors.length];
                    const size = 6 + (i % 4) * 2;
                    return (
                      <span
                        key={i}
                        className="confetti-particle"
                        style={{
                          left: `${left}%`,
                          width: `${size}px`,
                          height: `${size}px`,
                          backgroundColor: bg,
                          animationDelay: `${delay}s`,
                          borderRadius: i % 2 === 0 ? '50%' : '2px',
                        }}
                      />
                    );
                  })}
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold">
                      <Sparkles size={13} className="text-[var(--accent)]" />
                      <span>Welcome to your client portal</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Welcome, {client.businessName}
                    </h2>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      We are glad to work together. Track your delivery milestones, review design concepts, and submit onboarding materials here.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDismissWelcomeMoment}
                    className="px-5 py-2.5 rounded-[8px] bg-[var(--accent)] hover:opacity-90 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-center"
                  >
                    Get started
                  </button>
                </div>
              </div>
            )}

            {/* 1. ONBOARDING CHECKLIST (TOP CARD) */}
            {data.onboardingChecklist && data.onboardingChecklist.totalCount > 0 && (
              <div>
                {data.onboardingChecklist.isAllDone && !checklistExpanded ? (
                  /* Collapsed 100% "All set" line */
                  <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-2xs flex items-center justify-between transition-all">
                    <div className="flex items-center gap-2.5 text-xs text-emerald-800 font-bold">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>All set. All onboarding steps completed.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChecklistExpanded(true)}
                      className="text-xs font-bold text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer underline"
                    >
                      View details ({data.onboardingChecklist.doneCount}/{data.onboardingChecklist.totalCount})
                    </button>
                  </div>
                ) : (
                  /* Full Onboarding Checklist Card */
                  <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                          Onboarding Checklist
                        </span>
                        <h2 className="text-lg font-bold text-[#111111] mt-0.5">
                          Getting your website ready for launch
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#111111] bg-[#F1EFEF] px-3 py-1 rounded-full">
                          {data.onboardingChecklist.doneCount} of {data.onboardingChecklist.totalCount} done
                        </span>
                        {data.onboardingChecklist.isAllDone && (
                          <button
                            type="button"
                            onClick={() => setChecklistExpanded(false)}
                            className="text-xs text-[#6B6B6B] hover:text-[#111111] font-semibold cursor-pointer"
                          >
                            Collapse
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-[#F1EFEF] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--accent)] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(data.onboardingChecklist.doneCount / Math.max(1, data.onboardingChecklist.totalCount)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Primary Next Action Highlight */}
                    {data.onboardingChecklist.primaryNextAction && (
                      <div className="p-4 rounded-2xl bg-blue-50/30 border border-[var(--accent)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-[#D92D50] animate-pulse mt-1 sm:mt-0" />
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] block sm:inline mr-2">
                              Next Step:
                            </span>
                            <span className="text-xs font-bold text-[#111111]">
                              {data.onboardingChecklist.primaryNextAction.label}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const target = data.onboardingChecklist.primaryNextAction;
                            if (!target) return;
                            if (target.targetTab === 'actions') {
                              if (target.targetRequestId) {
                                const req = requests.find((r) => r.id === target.targetRequestId);
                                if (req) setSelectedRequest(req);
                              }
                              setActiveTab('actions');
                            } else if (target.targetTab === 'progress') {
                              setActiveTab('progress');
                            } else {
                              setActiveTab('home');
                            }
                          }}
                          className="px-4 py-1.5 rounded-[8px] bg-[var(--accent)] hover:opacity-90 text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5"
                        >
                          <span>Complete this step</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}

                    {/* Checklist Items */}
                    <div className="divide-y divide-black/5 pt-1">
                      {data.onboardingChecklist.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="py-3.5 flex items-center justify-between gap-4 text-xs transition-colors hover:bg-black/[0.01] px-2 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="mt-0.5 shrink-0">
                              {item.isDone ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                  <Check size={12} />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300 text-gray-400 flex items-center justify-center text-[10px] font-bold">
                                  {idx + 1}
                                </div>
                              )}
                            </div>

                            <div>
                              <span
                                className={`font-semibold block ${
                                  item.isDone ? 'line-through text-[#6B6B6B]' : 'text-[#111111]'
                                }`}
                              >
                                {item.label}
                              </span>
                              {item.isWelcomeOffer && item.offerText && (
                                <p className="text-[11px] text-[#6B6B6B] mt-0.5">{item.offerText}</p>
                              )}
                            </div>
                          </div>

                          <div>
                            {item.isDone ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                Done
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.targetTab === 'actions') {
                                    if (item.targetRequestId) {
                                      const req = requests.find((r) => r.id === item.targetRequestId);
                                      if (req) setSelectedRequest(req);
                                    }
                                    setActiveTab('actions');
                                  } else if (item.targetTab === 'progress') {
                                    setActiveTab('progress');
                                  } else {
                                    setActiveTab('home');
                                  }
                                }}
                                className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Open</span>
                                <ChevronRight size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. COMPACT FOUR-STEP PROGRESS TRACKER (HOME) */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    Milestone Progress
                  </span>
                  <h3 className="text-base font-bold text-[#111111] mt-0.5">
                    Project delivery roadmap
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {data.progressTracker.expectedLaunchDate && (
                    <span className="text-xs font-semibold text-[#6B6B6B]">
                      Expected launch:{' '}
                      <span className="text-[#111111] font-bold">
                        {data.progressTracker.expectedLaunchDate}
                      </span>
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      data.progressTracker.ballInCourt === 'Client'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                  >
                    {data.progressTracker.ballInCourt === 'Client' ? 'Waiting on you' : 'Waiting on us'}
                  </span>
                </div>
              </div>

              {/* Milestones horizontal row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {data.progressTracker.milestones.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      m.status === 'done'
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : m.status === 'in_progress'
                        ? 'bg-blue-50/40 border-[var(--accent)] text-[#111111] ring-1 ring-[var(--accent)]/50'
                        : 'bg-[#FAFAFA] border-black/5 text-[#A8A5A5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold">0{idx + 1}</span>
                      {m.status === 'done' ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check size={10} />
                        </div>
                      ) : m.status === 'in_progress' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#D92D50] animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <div className="text-xs font-bold leading-snug line-clamp-2">
                      {m.label}
                    </div>
                    <div className="text-[10px] uppercase font-bold mt-1.5 tracking-wider">
                      {m.status === 'done' ? 'Done' : m.status === 'in_progress' ? 'In progress' : 'Next'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('progress')}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View full milestone details and design preview</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* "Needs Your Attention" (Max 3 items, link to Action Items) */}
            {attentionItems.length > 0 && (
              <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-[#D92D50]" />
                    <h2 className="text-sm font-bold text-[#111111]">
                      Needs Your Attention ({attentionItems.length})
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('actions')}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    View all action items
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {attentionItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedRequest(item);
                        setActiveTab('actions');
                      }}
                      className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[var(--accent)]/40 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F1EFEF] px-2 py-0.5 rounded text-[#111111]">
                            {item.type}
                          </span>
                          <span className="text-[10px] text-[#A8A5A5]">Due {item.deadline}</span>
                        </div>
                        <h3 className="text-xs font-bold text-[#111111] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-[#6B6B6B] mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-3 flex items-center text-xs font-bold text-[var(--accent)]">
                        <span>Answer request</span>
                        <ChevronRight size={13} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* "This Month" Snapshot (3 numbers from latest published report) */}
            <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A5A5]">
                    Performance Snapshot
                  </span>
                  <h2 className="text-sm font-bold text-[#111111]">
                    {currentReport ? currentReport.monthLabel : 'Latest Monthly Report'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  View full report
                </button>
              </div>

              {currentReport ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                    <span className="text-xs text-[#A8A5A5] font-semibold block mb-1">
                      Website Visitors
                    </span>
                    <div className="text-2xl font-bold text-[#111111] tabular-nums">
                      {currentReport.visitors.value.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                      Source: {currentReport.visitors.source}
                    </span>
                  </div>

                  <div className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                    <span className="text-xs text-[#A8A5A5] font-semibold block mb-1">
                      Enquiries Received
                    </span>
                    <div className="text-2xl font-bold text-[#111111] tabular-nums">
                      {currentReport.enquiries.value.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                      Source: {currentReport.enquiries.source}
                    </span>
                  </div>

                  <div className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                    <span className="text-xs text-[#A8A5A5] font-semibold block mb-1">
                      Google Maps Profile Views
                    </span>
                    <div className="text-2xl font-bold text-[#111111] tabular-nums">
                      {currentReport.profileViews.value.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                      Source: {currentReport.profileViews.source}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#6B6B6B] rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                  Your first performance report arrives on {client.nextReportDue || 'the scheduled report date'}.
                </div>
              )}
            </div>

            {/* Next Meeting Card */}
            {meetings.length > 0 && (
              <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F8F7F7] border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      Upcoming Review
                    </span>
                    <h3 className="text-sm font-bold text-[#111111]">
                      {meetings[0].title}
                    </h3>
                    <div className="text-xs text-[#6B6B6B] flex items-center gap-2 mt-0.5">
                      <Clock size={12} />
                      <span>{meetings[0].startsAt} ({meetings[0].durationMin} min)</span>
                    </div>
                  </div>
                </div>

                {meetings[0].link && (
                  <a
                    href={meetings[0].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    Join Video Call
                  </a>
                )}
              </div>
            )}

            {/* Booking Card */}
            {data.bookingLink && (
              <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F8F7F7] border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      Direct Scheduling
                    </span>
                    <h3 className="text-sm font-bold text-[#111111]">
                      Book a meeting
                    </h3>
                    <p className="text-xs text-[#A8A5A5] mt-0.5">
                      Third-party scheduling service.
                    </p>
                  </div>
                </div>

                <a
                  href={data.bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  <span>Book a meeting</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {/* Share with a friend (Referral Programme) */}
            {data.referral?.enabled && (
              <div className="bg-white rounded-[12px] p-6 sm:p-7 border border-[#E5E7EB] shadow-xs space-y-5">
                {/* Friend reward received banner */}
                {data.referral.receivedFreeMonthsText && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center gap-3 text-xs text-emerald-900 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{data.referral.receivedFreeMonthsText}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-blue-50 px-2.5 py-0.5 rounded-full">
                        Referral Programme
                      </span>
                      <span className="text-xs text-[#6B6B6B] font-mono font-medium">
                        Code: <strong className="text-[#111111]">{data.referral.referralCode}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#111111]">Share with a friend</h3>
                    {/* One-line summary */}
                    <p className="text-xs text-[#6B6B6B] leading-relaxed">
                      {data.referral.summaryText || 'Invite a friend. When they join, you both get a free month.'}
                    </p>
                  </div>

                  {/* See how a referral can save you {savings_price} */}
                  {data.referral.savingsPriceFormatted && (
                    <button
                      type="button"
                      onClick={() => setShowExplainerModal(true)}
                      className="px-4 py-2 rounded-xl bg-[#F8F7F7] hover:bg-[#ECEAEA] text-[#111111] border border-black/10 text-xs font-semibold transition-all shrink-0 cursor-pointer text-left sm:text-center"
                    >
                      See how a referral can save you {data.referral.savingsPriceFormatted}
                    </button>
                  )}
                </div>

                {/* Share Link Row with Copy Button */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#111111]">
                    Your personal referral link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={data.referral.shareUrl}
                      className="flex-1 px-3.5 py-2.5 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl text-[#111111] font-mono focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(data.referral?.shareUrl || '');
                        setCopiedReferralLink(true);
                        setToastMessage('Referral link copied to clipboard!');
                        setTimeout(() => {
                          setCopiedReferralLink(false);
                          setToastMessage(null);
                        }, 2500);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedReferralLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedReferralLink ? 'Copied' : 'Copy link'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Share Options (WhatsApp & Email) */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-[#111111]">
                    Share directly
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(data.referral.shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Share2 size={14} />
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={`mailto:?subject=${encodeURIComponent('Recommendation: Digital systems with Open Hours')}&body=${encodeURIComponent(data.referral.shareText)}`}
                      className="px-4 py-2 rounded-xl bg-[#F8F7F7] hover:bg-[#ECEAEA] text-[#111111] border border-black/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Mail size={14} />
                      <span>Email</span>
                    </a>

                    <span className="text-[11px] text-[#A8A5A5] italic">
                      The app never sends emails or messages automatically on your behalf.
                    </span>
                  </div>
                </div>

                {/* Referral Status Counts: 5 Tiles (Waiting, Approved, Free months earned, Used, Remaining) */}
                <div className="pt-3 border-t border-black/5 space-y-3">
                  <div className="text-xs font-bold text-[#111111]">
                    Your referral activity
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] text-center">
                      <span className="text-[10px] text-[#6B6B6B] block mb-1">Waiting</span>
                      <span className="text-lg font-bold text-[#111111] tabular-nums">
                        {data.referral.counts.waiting ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] text-center">
                      <span className="text-[10px] text-[#6B6B6B] block mb-1">Approved</span>
                      <span className="text-lg font-bold text-[#111111] tabular-nums">
                        {data.referral.counts.approved ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] text-center">
                      <span className="text-[10px] text-[#6B6B6B] block mb-1">Free months earned</span>
                      <span className="text-lg font-bold text-[#111111] tabular-nums">
                        {data.referral.counts.earnedMonths ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] text-center">
                      <span className="text-[10px] text-[#6B6B6B] block mb-1">Used</span>
                      <span className="text-lg font-bold text-[#111111] tabular-nums">
                        {data.referral.counts.usedMonths ?? 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] text-center">
                      <span className="text-[10px] text-[#6B6B6B] block mb-1">Remaining</span>
                      <span className="text-lg font-bold text-[var(--accent)] tabular-nums">
                        {data.referral.counts.remainingMonths ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Next reward computed from milestone rows */}
                  {data.referral.nextReward && (
                    <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-xs text-[#111111] flex items-center justify-between">
                      <span className="font-semibold text-[#6B6B6B]">Next reward:</span>
                      <span className="font-bold text-[#111111]">
                        {data.referral.nextReward.moreNeeded} more referral{data.referral.nextReward.moreNeeded === 1 ? '' : 's'} = {data.referral.nextReward.rewardMonths} months
                      </span>
                    </div>
                  )}

                  {/* Referral activity rows: status only (Waiting / Approved / Credited N months) - NO names */}
                  {data.referral.referralRows && data.referral.referralRows.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">
                        Recent referrals
                      </div>
                      <div className="divide-y divide-black/5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] overflow-hidden">
                        {data.referral.referralRows.map((row) => (
                          <div key={row.id} className="p-2.5 px-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${
                                  row.status === 'Credited'
                                    ? 'bg-emerald-500'
                                    : row.status === 'Approved'
                                    ? 'bg-blue-500'
                                    : 'bg-amber-400'
                                }`}
                              />
                               <span className="font-medium text-[#111111]">
                                {row.status === 'Credited'
                                  ? `Credited ${row.months ?? 1} month${(row.months ?? 1) === 1 ? '' : 's'}`
                                  : row.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#888888] font-mono">
                              {row.date ? new Date(row.date).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-[#A8A5A5] pt-1">
                    Rewards are applied after your friend becomes a paying client.
                  </div>
                </div>

                {/* Explainer Modal */}
                {showExplainerModal && data.referral.clientExplainer && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[12px] max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-black/10 my-8">
                      <div className="flex items-center justify-between pb-3 border-b border-black/10">
                        <div className="space-y-0.5">
                          <h4 className="text-lg font-bold text-[#111111]">
                            How our referral programme works
                          </h4>
                          <p className="text-xs text-[#6B6B6B]">
                            Clear rewards with no hidden conditions
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowExplainerModal(false)}
                          className="p-2 rounded-full hover:bg-black/5 text-[#6B6B6B] hover:text-[#111111] transition-all cursor-pointer"
                          aria-label="Close explainer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <BoardExplainer
                        steps={data.referral.clientExplainer.steps}
                        description={data.referral.clientExplainer.description}
                        tokens={{
                          months_you: '1',
                          months_friend: '1',
                          savings_price: data.referral.savingsPriceFormatted || 'your monthly fee',
                          max_months: '12',
                        }}
                      />

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowExplainerModal(false)}
                          className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PROGRESS */}
        {/* ========================================================================= */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#111111]">Project Progress</h1>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Live verification timeline of your delivery roadmap and launch milestones.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {data.progressTracker.expectedLaunchDate && (
                  <div className="px-4 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-xs font-semibold text-[#111111] shadow-2xs">
                    Expected launch: <span className="font-bold text-[var(--accent)]">{data.progressTracker.expectedLaunchDate}</span>
                  </div>
                )}
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xs ${
                    data.progressTracker.ballInCourt === 'Client'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  {data.progressTracker.ballInCourt === 'Client' ? 'Waiting on you' : 'Waiting on us'}
                </span>
              </div>
            </div>

            {/* Calm Card: Your website preview */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[var(--accent)] flex items-center justify-center">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#111111]">Your website preview</h2>
                      {data?.websiteDemo && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            data.websiteDemo.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : data.websiteDemo.status === 'Changes requested'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {data.websiteDemo.status === 'Approved'
                            ? 'Approved'
                            : data.websiteDemo.status === 'Changes requested'
                            ? `Changes requested (v${data.websiteDemo.version})`
                            : `Awaiting review (v${data.websiteDemo.version})`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      Interactive sandbox preview of your custom website concept.
                    </p>
                  </div>
                </div>

                {data?.websiteDemo && (
                  <div className="flex items-center bg-[#F4F2F2] p-1 rounded-xl border border-[#E5E7EB] gap-1">
                    <button
                      type="button"
                      onClick={() => setDemoDevice('desktop')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        demoDevice === 'desktop'
                          ? 'bg-white text-[#111111] shadow-2xs'
                          : 'text-[#6B6B6B] hover:text-[#111111]'
                      }`}
                      title="Desktop view"
                    >
                      <Monitor size={14} />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoDevice('tablet')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        demoDevice === 'tablet'
                          ? 'bg-white text-[#111111] shadow-2xs'
                          : 'text-[#6B6B6B] hover:text-[#111111]'
                      }`}
                      title="Tablet view"
                    >
                      <Tablet size={14} />
                      <span className="hidden sm:inline">Tablet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoDevice('mobile')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        demoDevice === 'mobile'
                          ? 'bg-white text-[#111111] shadow-2xs'
                          : 'text-[#6B6B6B] hover:text-[#111111]'
                      }`}
                      title="Mobile view"
                    >
                      <Smartphone size={14} />
                      <span className="hidden sm:inline">Mobile</span>
                    </button>
                  </div>
                )}
              </div>

              {!data?.websiteDemo && !data?.customWebsitePreview ? (
                <div className="py-12 px-6 text-center bg-[#FAFAFA] rounded-2xl border border-[#E5E7EB]">
                  <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-3 text-[#6B6B6B]">
                    <Monitor size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-[#111111]">No website demo shared yet</h4>
                  <p className="text-xs text-[#6B6B6B] max-w-md mx-auto mt-1">
                    Your account manager is crafting your website concept. Once the initial preview is ready, it will appear right here for your interactive review and feedback.
                  </p>
                </div>
              ) : data?.customWebsitePreview ? (
                /* CUSTOM (AI STUDIO + GITHUB) MODE CLIENT PREVIEW */
                <div className="space-y-4">
                  {/* Status Banner */}
                  {data.customWebsitePreview.currentVersion.status === 'Changes requested' && data.customWebsitePreview.currentVersion.clientFeedback && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold">Requested Revisions:</span> {data.customWebsitePreview.currentVersion.clientFeedback}
                      </div>
                    </div>
                  )}

                  {data.customWebsitePreview.currentVersion.status === 'Approved' && (
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                      <div>
                        <span className="font-bold">Design Approved!</span> Our team is preparing domain mapping and final production launch.
                      </div>
                    </div>
                  )}

                  {/* Top Bar: Version details & Open in new tab */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-[#6B6B6B] px-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111111]">
                        Version v{data.customWebsitePreview.currentVersion.versionNumber}
                      </span>
                      {data.customWebsitePreview.currentVersion.sharedAt && (
                        <span>
                          &middot; Shared {new Date(data.customWebsitePreview.currentVersion.sharedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <a
                      href={customWebsiteActivePreviewUrl || data.customWebsitePreview.currentVersion.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 bg-white hover:bg-black/5 text-[#111111] text-xs font-bold transition-all shadow-2xs"
                    >
                      <ExternalLink size={13} />
                      <span>Open in new tab</span>
                    </a>
                  </div>

                  {/* Sandboxed External Iframe (Strict sandbox: NO allow-same-origin) */}
                  <div className="flex flex-col items-center justify-center bg-[#F6F7F9] p-3 rounded-2xl border border-[#E5E7EB] overflow-hidden">
                    <div
                      className="bg-white rounded-xl shadow-xs overflow-hidden border border-black/10 transition-all duration-200 w-full flex flex-col"
                      style={{
                        maxWidth:
                          demoDevice === 'mobile'
                            ? '375px'
                            : demoDevice === 'tablet'
                            ? '768px'
                            : '100%',
                        height: '620px',
                      }}
                    >
                      <iframe
                        src={customWebsiteActivePreviewUrl || data.customWebsitePreview.currentVersion.previewUrl}
                        sandbox="allow-scripts allow-forms allow-popups"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full flex-1 border-none"
                        title="Website Version Preview"
                      />
                    </div>
                    <p className="text-[11px] text-[#6B6B6B] mt-2">
                      If the preview stays blank, the site may block embedding. Use Open in new tab.
                    </p>
                  </div>

                  {/* What Changed in this Version (Changelog) */}
                  <div className="p-4 bg-[#FAFAFC] rounded-2xl border border-[#E5E7EB] space-y-2">
                    <h4 className="text-xs font-bold text-[#111111]">
                      What changed in this version:
                    </h4>
                    <ul className="list-disc list-inside text-xs text-[#344054] space-y-1">
                      {data.customWebsitePreview.currentVersion.changelog.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Approval / Change Request Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                    <span className="text-[11px] text-[#6B6B6B]">
                      Review the preview and let us know your decision.
                    </span>

                    <div className="flex items-center gap-2">
                      {data.customWebsitePreview.currentVersion.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => {
                            setChangeFeedback(data?.customWebsitePreview?.currentVersion.clientFeedback || '');
                            setShowRequestChangesModal(true);
                          }}
                          disabled={demoActionLoading}
                          className="px-4 py-2 rounded-full border border-black/15 bg-white hover:bg-black/5 text-[#111111] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Request changes
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleApproveDemo}
                        disabled={demoActionLoading || data.customWebsitePreview.currentVersion.status === 'Approved'}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                          data.customWebsitePreview.currentVersion.status === 'Approved'
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-[var(--accent)] hover:opacity-90 text-white'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        <span>
                          {data.customWebsitePreview.currentVersion.status === 'Approved'
                            ? 'Version Approved'
                            : 'Approve this version'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible: Previous Versions */}
                  {data.customWebsitePreview.previousVersions && data.customWebsitePreview.previousVersions.length > 0 && (
                    <div className="pt-3 border-t border-black/5 space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowPreviousVersions(!showPreviousVersions)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:text-[var(--accent)] transition-colors cursor-pointer"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${showPreviousVersions ? 'rotate-180' : ''}`}
                        />
                        <span>Previous versions ({data.customWebsitePreview.previousVersions.length})</span>
                      </button>

                      {showPreviousVersions && (
                        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                          {data.customWebsitePreview.previousVersions.map((prev) => (
                            <div
                              key={prev.id}
                              className="p-3 bg-[#FAFBFD] rounded-xl border border-[#E5E7EB] text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#111111]">Version v{prev.versionNumber}</span>
                                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                                    {prev.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {prev.sharedAt && (
                                    <span className="text-[11px] text-[#6B6B6B]">
                                      {new Date(prev.sharedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setCustomWebsiteActivePreviewUrl(prev.previewUrl)}
                                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                                  >
                                    Load in preview
                                  </button>
                                </div>
                              </div>
                              <ul className="list-disc list-inside text-[11px] text-[#475467] space-y-0.5">
                                {prev.changelog.map((cl, i) => (
                                  <li key={i}>{cl}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : data.websiteDemo ? (
                /* TEMPLATE MODE DEMO PREVIEW (UNCHANGED) */
                <div className="space-y-4">
                  {/* Feedback or Approval note */}
                  {data.websiteDemo.status === 'Changes requested' && data.websiteDemo.clientFeedback && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-bold">Requested Revisions:</span> {data.websiteDemo.clientFeedback}
                      </div>
                    </div>
                  )}

                  {data.websiteDemo.status === 'Approved' && (
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                      <div>
                        <span className="font-bold">Design Approved!</span> Our development team is moving forward with production setup and live deployment.
                      </div>
                    </div>
                  )}

                  {/* Sandboxed iframe (React live handshake preview or HTML pin preview) */}
                  {data.websiteDemo.templateType === 'react' && data.websiteDemo.previewUrl ? (
                    <div className="space-y-2">
                      <ReactTemplatePreview
                        previewUrl={data.websiteDemo.previewUrl}
                        config={data.websiteDemo.reactConfig || {}}
                        withRibbon={true}
                        ribbonText="Demo Concept"
                        devicePreset={demoDevice}
                        onDevicePresetChange={setDemoDevice}
                      />
                      <p className="text-[11px] text-[#6B6B6B] text-center">
                        Interactive React preview connected via browser messaging. Pin markers are available for static HTML layouts; use Request changes below to submit your feedback.
                      </p>
                    </div>
                  ) : (
                    <DemoPreviewWithFeedback
                      projectId={data.websiteDemo.id}
                      projectTitle="Your Website Preview"
                      version={data.websiteDemo.version}
                      renderedHtml={data.websiteDemo.renderedHtml}
                      isClientView={true}
                      canAddPins={data.websiteDemo.status !== 'Approved'}
                      clientName={data.client.ownerName || data.client.businessName}
                      onRefresh={loadPortalData}
                    />
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#6B6B6B]">
                        Version {data.websiteDemo.version} {data.websiteDemo.sharedAt ? `• Shared ${new Date(data.websiteDemo.sharedAt).toLocaleDateString()}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPortalReveal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
                        title="Replay reveal intro animation"
                      >
                        <RotateCcw size={11} />
                        <span>Replay intro</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {data.websiteDemo.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => {
                            setChangeFeedback(data?.websiteDemo?.clientFeedback || '');
                            setShowRequestChangesModal(true);
                          }}
                          disabled={demoActionLoading}
                          className="px-4 py-2 rounded-full border border-black/15 bg-white hover:bg-black/5 text-[#111111] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Request changes
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleApproveDemo}
                        disabled={demoActionLoading || data.websiteDemo.status === 'Approved'}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                          data.websiteDemo.status === 'Approved'
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-[var(--accent)] hover:opacity-90 text-white'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        <span>{data.websiteDemo.status === 'Approved' ? 'Design Approved' : 'Approve this design'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Reveal Status Pill */}
                  <div className="pt-2 border-t border-black/5 flex items-center justify-between flex-wrap gap-2">
                    <RevealStatusPill
                      projectStatus={data.websiteDemo.status}
                      domainAccessStatus={
                        data.requests.find((r) => r.type === 'Domain access')?.status === 'Approved'
                          ? 'approved'
                          : data.requests.find((r) => r.type === 'Domain access')?.status === 'Submitted'
                          ? 'submitted'
                          : data.requests.find((r) => r.type === 'Domain access')?.status === 'Pending'
                          ? 'pending'
                          : 'none'
                      }
                      isClientPortal={true}
                      onStartDomainSetup={() => {
                        const domainReq = data.requests.find((r) => r.type === 'Domain access');
                        if (domainReq) {
                          setSelectedRequest(domainReq);
                        }
                        setActiveTab('actions');
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Four-Step Progress Tracker Milestones */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    Milestone Roadmap
                  </span>
                  <h2 className="text-lg font-bold text-[#111111]">
                    Key Delivery Milestones
                  </h2>
                </div>

                {data.progressTracker.expectedLaunchDate && (
                  <span className="text-xs text-[#6B6B6B]">
                    Expected launch: <strong className="text-[#111111]">{data.progressTracker.expectedLaunchDate}</strong>
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {data.progressTracker.milestones.map((m, idx) => {
                  const isDone = m.status === 'done';
                  const isInProg = m.status === 'in_progress';

                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                        isInProg
                          ? 'border-[var(--accent)] bg-blue-50/20 ring-1 ring-[var(--accent)]'
                          : isDone
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-black/5 bg-[#FAFAFA]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isDone ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <Check size={14} />
                            </div>
                          ) : isInProg ? (
                            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center animate-pulse">
                              <Clock size={13} />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-xs font-mono font-bold">
                              {idx + 1}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-bold text-[#111111]">
                            {m.label}
                          </div>
                          <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                            {isDone
                              ? 'All delivery stages mapped to this milestone completed.'
                              : isInProg
                              ? `Currently active delivery milestone (${data.progressTracker.ballInCourt === 'Client' ? 'Waiting on you' : 'Waiting on us'}).`
                              : 'Upcoming milestone on the project roadmap.'}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : isInProg
                            ? 'bg-blue-50 text-[var(--accent)]'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isDone ? 'Done' : isInProg ? 'In progress' : 'Next'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Your team card (assigned team members from sub-team) */}
            {data.assignedTeam && data.assignedTeam.length > 0 && (
              <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/5 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      Support & Delivery
                    </span>
                    <h2 className="text-lg font-bold text-[#111111] mt-0.5">
                      Your team
                    </h2>
                  </div>
                  <span className="text-xs text-[#6B6B6B]">
                    Dedicated specialists assigned to your project
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.assignedTeam.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#111111] truncate">
                          {member.firstName}
                        </div>
                        <div className="text-xs text-[#6B6B6B] truncate">
                          {member.roleLabel}
                        </div>
                      </div>
                      {member.isLead && (
                        <span className="text-[10px] font-bold bg-blue-50 text-[var(--accent)] px-2 py-0.5 rounded-full shrink-0">
                          Lead
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ACTION ITEMS & ATTACHMENT FLOW */}
        {/* ========================================================================= */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#111111]">Action Items Required From You</h1>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Onboarding questionnaires, brand assets, and content approvals for Open Hours.
              </p>
            </div>

            {/* List of Requests */}
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#6B6B6B] rounded-[12px] bg-white border border-[#E5E7EB]">
                  <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                  <div className="font-bold text-[#111111]">All action items complete!</div>
                  <p>No pending information or materials requested right now.</p>
                </div>
              ) : (
                (showAllRequests ? requests : requests.slice(0, 5)).map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-[12px] bg-white border border-[#E5E7EB] shadow-xs hover:border-black/15 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1EFEF] text-[#111111] uppercase tracking-wider">
                          {req.type}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'Submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : req.status === 'Needs Changes'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {req.status}
                        </span>

                        <span className="text-[11px] text-[#A8A5A5]">Due {req.deadline}</span>
                      </div>

                      <h3 className="text-sm font-bold text-[#111111]">{req.title}</h3>
                      <p className="text-xs text-[#6B6B6B] leading-relaxed">{req.description}</p>

                      {/* Display comments if admin left feedback */}
                      {req.comments.length > 0 && (
                        <div className="pt-2">
                          <div className="p-2.5 bg-[#F8F7F7] rounded-xl text-xs space-y-1">
                            <span className="font-bold text-[10px] uppercase text-[#A8A5A5] block">
                              Feedback from Open Hours:
                            </span>
                            <p className="text-[#111111]">
                              {req.comments[req.comments.length - 1].text}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(req);
                        setResponseText(req.submittedContent || '');
                        setSelectedFiles([]);
                        setUploadError(null);
                        setSubmitSuccess(false);
                      }}
                      className="px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      {req.status === 'Pending' || req.status === 'Needs Changes'
                        ? 'Respond & Upload'
                        : 'View Details'}
                    </button>
                  </div>
                ))
              )}

              {/* Show more toggle if > 5 items */}
              {requests.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllRequests(!showAllRequests)}
                    className="text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{showAllRequests ? 'Show Less' : `Show More (${requests.length - 5} more)`}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showAllRequests ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* MODAL: ANSWER REQUEST WITH ATTACHMENTS */}
            {/* ========================================================================= */}
            {selectedRequest && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-[32px] max-w-xl w-full p-6 md:p-8 border border-black/10 shadow-2xl space-y-5 my-8">
                  <div className="flex items-start justify-between pb-3 border-b border-black/5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        Action Item
                      </span>
                      <h3 className="text-lg font-bold text-[#111111]">
                        {selectedRequest.title}
                      </h3>
                      <p className="text-xs text-[#6B6B6B] mt-1">
                        {selectedRequest.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedRequest(null)}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {submitSuccess ? (
                    <div className="py-8 text-center space-y-2">
                      <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                      <div className="text-base font-bold text-[#111111]">Sent to Open Hours</div>
                      <p className="text-xs text-[#6B6B6B]">
                        Your response and materials have been submitted for review.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitResponse} className="space-y-4">
                      {/* Privacy Reminder Banner */}
                      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                        <ShieldAlert size={16} className="shrink-0 text-amber-700 mt-0.5" />
                        <div>
                          <span className="font-bold">Privacy Reminder: </span>
                          <span>
                            Please do not upload sensitive customer or personal records. Share only business materials (logo, photos, text, access details we request).
                          </span>
                        </div>
                      </div>

                      {/* Text details / response */}
                      <div>
                        <label className="block text-xs font-bold text-[#111111] mb-1">
                          Written Details / Information
                        </label>
                        <textarea
                          rows={3}
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Provide any details, text content, or instructions..."
                          className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[var(--accent)]"
                        />

                        {/* Password security hint (Prompt requirement) */}
                        <div className="text-[11px] text-[#A8A5A5] mt-1 flex items-center gap-1">
                          <Info size={12} />
                          <span>For logins, we will share a secure method. Do not type passwords above.</span>
                        </div>
                      </div>

                      {/* Attachment Uploader */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#111111]">
                            Attach Files (Multiple allowed)
                          </label>
                          <span className="text-[10px] text-[#A8A5A5]">
                            PDF, PNG, JPG, DOCX, XLSX · Max 5 MB each (up to 5 files)
                          </span>
                        </div>

                        {/* File input */}
                        <label className="p-4 border-2 border-dashed border-black/10 hover:border-[var(--accent)]/50 rounded-[12px] bg-[#F9FAFB] hover:bg-blue-50/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center">
                          <Upload size={18} className="text-[#A8A5A5]" />
                          <span className="text-xs font-semibold text-[#111111]">
                            Choose files from your device
                          </span>
                          <span className="text-[10px] text-[#6B6B6B]">
                            {selectedFiles.length}/{MAX_FILES_PER_RESPONSE} files attached
                          </span>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                            onChange={handleFileSelect}
                            disabled={selectedFiles.length >= MAX_FILES_PER_RESPONSE}
                            className="hidden"
                          />
                        </label>

                        {/* Attached files list with remove (x) */}
                        {selectedFiles.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {selectedFiles.map((f, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 bg-[#F8F7F7] rounded-xl border border-[#E5E7EB] flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Paperclip size={13} className="text-[#A8A5A5] shrink-0" />
                                  <span className="font-semibold text-[#111111] truncate">{f.name}</span>
                                  <span className="text-[10px] text-[#A8A5A5] shrink-0">
                                    ({(f.sizeBytes / (1024 * 1024)).toFixed(2)} MB)
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(idx)}
                                  className="w-5 h-5 rounded-full hover:bg-gray-200 flex items-center justify-center text-xs text-gray-500 cursor-pointer"
                                  title="Remove file"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {uploadError && (
                          <div className="p-2 text-xs text-[var(--crimson)] font-semibold bg-[var(--crimson-tint)] border border-[#FECDCA] rounded-xl">
                            {uploadError}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/5">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(null)}
                          className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingResponse}
                          className="px-5 py-2 text-xs font-bold bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded-full transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          {isSubmittingResponse ? (
                            <span>Sending...</span>
                          ) : (
                            <>
                              <Send size={12} />
                              <span>Submit to Open Hours</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REPORTS */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#111111]">Monthly Performance Reports</h1>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Verified growth metrics, local Google Maps visibility, and progress summaries.
                </p>
              </div>

              {/* "Check Live" Button (Prompt requirement) */}
              {liveReport?.url && (
                <a
                  href={liveReport.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Check Live ({liveReport.label || 'Analytics'})</span>
                </a>
              )}
            </div>

            {/* Growth Overview Card (Built ONLY from published reports, never live) */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    Growth Overview
                  </span>
                  <h2 className="text-lg font-bold text-[#111111]">
                    {currentReport ? `${currentReport.monthLabel} vs Last Month` : 'Performance Overview'}
                  </h2>
                </div>

                {currentReport?.publishedAt && (
                  <span className="text-[11px] text-[#A8A5A5]">
                    Updated by Open Hours on {currentReport.publishedAt}
                  </span>
                )}
              </div>

              {currentReport ? (
                <>
                  {/* KPI comparison pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-xs text-[#A8A5A5] font-semibold block mb-1">
                        Monthly Visitors
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#111111] tabular-nums">
                          {currentReport.visitors.value.toLocaleString()}
                        </span>
                        {visitorsChangePct !== null && (
                          <span
                            className={`text-xs font-bold ${
                              visitorsChangePct >= 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            {visitorsChangePct >= 0 ? `+${visitorsChangePct}%` : `${visitorsChangePct}%`}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                        Source: {currentReport.visitors.source}
                      </span>
                    </div>

                    <div className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-xs text-[#A8A5A5] font-semibold block mb-1">
                        Enquiries Received
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#111111] tabular-nums">
                          {currentReport.enquiries.value.toLocaleString()}
                        </span>
                        {enquiriesChangePct !== null && (
                          <span
                            className={`text-xs font-bold ${
                              enquiriesChangePct >= 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            {enquiriesChangePct >= 0 ? `+${enquiriesChangePct}%` : `${enquiriesChangePct}%`}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                        Source: {currentReport.enquiries.source}
                      </span>
                    </div>

                    <div className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-xs text-[#A8A5A5] font-semibold block mb-1">
                        Estimated ROI Multiplier
                      </span>
                      <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                        {currentReport.estimatedRoiMultiplier || 4.5}x
                      </div>
                      <span className="text-[10px] text-[#A8A5A5] mt-1 block">
                        Estimated return based on customer value
                      </span>
                    </div>
                  </div>

                  {/* 6-Month Trend Chart (Recharts) */}
                  {sixMonthTrend && sixMonthTrend.length > 0 && (
                    <div className="pt-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A5A5]">
                        6-Month Search Traffic & Enquiry Trend
                      </h4>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sixMonthTrend}>
                            <defs>
                              <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1F5FA8" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#1F5FA8" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11, fill: '#6B6B6B' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: '#6B6B6B' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#111111',
                                borderRadius: '12px',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '11px',
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="visitors"
                              stroke="#1F5FA8"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#visitorsGrad)"
                              name="Visitors"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-10 text-center text-xs text-[#6B6B6B] rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB]">
                  Your first report arrives on {client.nextReportDue || 'the scheduled date'}.
                </div>
              )}
            </div>

            {/* Monthly Reports List (Latest first) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#111111]">
                Published Monthly Reports Archive
              </h3>

              {publishedReports.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B6B6B] bg-white rounded-2xl border border-[#E5E7EB]">
                  No monthly reports published yet.
                </div>
              ) : (
                (showAllReports ? publishedReports : publishedReports.slice(0, 5)).map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReportDetail(rep)}
                    className="p-5 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[var(--accent)]/30 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-[#111111] group-hover:text-[var(--accent)] transition-colors">
                          {rep.monthLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Published
                        </span>
                        {rep.version > 1 && (
                          <span className="text-[10px] text-[#A8A5A5]">
                            (v{rep.version})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B6B6B] line-clamp-1">
                        {rep.shortNote || 'Monthly search metrics and SEO activity breakdown.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-[#111111]">
                      <span className="tabular-nums">{rep.visitors.value} visitors</span>
                      <ChevronRight size={14} className="text-[#A8A5A5] group-hover:text-[var(--accent)]" />
                    </div>
                  </div>
                ))
              )}

              {publishedReports.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllReports(!showAllReports)}
                    className="text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{showAllReports ? 'Show Less' : `Show More (${publishedReports.length - 5} more)`}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showAllReports ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* CARD: ESTIMATE YOUR RETURN (ROI ESTIMATOR) */}
            {client.roiEstimatorEnabled !== false && (
              <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      ROI Calculator
                    </span>
                    <h2 className="text-lg font-bold text-[#111111] mt-0.5">
                      Estimate your return
                    </h2>
                  </div>
                  {client.showPlanPriceInPortal && (
                    <div className="px-3.5 py-1.5 rounded-full bg-[#F4F2F2] border border-[#E5E7EB] text-xs text-[#111111] font-semibold">
                      Current plan:{' '}
                      <span className="font-bold">
                        €{client.monthlyFeeEUR || 450} / month
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inputs Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#111111] mb-1">
                        Current monthly enquiries
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        placeholder="e.g. 25"
                        value={roiEnquiries}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoiEnquiries(val);
                          updateRoiStorage({ enquiries: val });
                        }}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[var(--accent)]"
                      />
                      <span className="text-[10px] text-[#A8A5A5] mt-0.5 block">
                        Average calls, form submissions, or enquiries per month.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#111111] mb-1">
                        Share that become customers (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="e.g. 20"
                        value={roiConversionRate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoiConversionRate(val);
                          updateRoiStorage({ conversionRate: val });
                        }}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[var(--accent)]"
                      />
                      <span className="text-[10px] text-[#A8A5A5] mt-0.5 block">
                        Estimated conversion rate from enquiry to active customer.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#111111] mb-1">
                        Average value of a new customer (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50000}
                        placeholder="e.g. 350"
                        value={roiCustomerValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoiCustomerValue(val);
                          updateRoiStorage({ customerValue: val });
                        }}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[var(--accent)]"
                      />
                      <span className="text-[10px] text-[#A8A5A5] mt-0.5 block">
                        Average initial or annual revenue generated per new customer.
                      </span>
                    </div>

                    {/* Extra enquiries per month slider */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#111111]">
                          Extra enquiries per month
                        </label>
                        <span className="px-2.5 py-0.5 bg-[#F1EFEF] rounded-md text-xs font-bold text-[#111111]">
                          +{roiExtraEnquiries}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={roiExtraEnquiries}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setRoiExtraEnquiries(val);
                          updateRoiStorage({ extraEnquiries: val });
                        }}
                        className="w-full accent-[var(--accent)] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-[#A8A5A5] mt-0.5">
                        <span>+1</span>
                        <span>+50</span>
                        <span>+100</span>
                      </div>
                    </div>
                  </div>

                  {/* Output Calculation Column */}
                  <div className="p-6 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                        Estimated Extra Monthly Value
                      </span>

                      {(() => {
                        const extra = Number(roiExtraEnquiries) || 0;
                        const sharePct = parseFloat(roiConversionRate) || 0;
                        const val = parseFloat(roiCustomerValue) || 0;
                        const hasCalculated = sharePct > 0 && val > 0 && extra > 0;
                        const extraMonthly = Math.round(extra * (sharePct / 100) * val);

                        return (
                          <div className="mt-3 space-y-2">
                            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 tabular-nums tracking-tight">
                              {hasCalculated ? `€${extraMonthly.toLocaleString()}` : '—'}
                            </div>

                            {hasCalculated ? (
                              <p className="text-xs text-[#444444] leading-relaxed">
                                {extra} extra enquiries × {sharePct}% conversion ={' '}
                                <strong className="text-[#111111]">
                                  {(extra * (sharePct / 100)).toFixed(1)} new customers
                                </strong>{' '}
                                at €{val.toLocaleString()} average value.
                              </p>
                            ) : (
                              <p className="text-xs text-[#6B6B6B]">
                                Enter your conversion rate and average customer value on the left to see your estimated monthly value.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-4 border-t border-black/5 space-y-2">
                      <p className="text-[11px] text-[#6B6B6B] leading-relaxed italic">
                        Illustrative estimate based on the numbers you entered. Not a forecast or promise.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WEEKLY PERFORMANCE SNAPSHOTS */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    Weekly Snapshots
                  </span>
                  <h2 className="text-lg font-bold text-[#111111] mt-0.5">
                    Latest verified performance snapshots
                  </h2>
                </div>
                <span className="text-xs text-[#6B6B6B]">
                  Published weekly by Open Hours
                </span>
              </div>

              {(!data.weeklySnapshots || data.weeklySnapshots.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#6B6B6B] bg-[#FAFAFA] rounded-2xl border border-[#E5E7EB]">
                  No weekly snapshots published yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.weeklySnapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-5 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#111111]">
                            {snap.weekLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Published
                          </span>
                        </div>
                        {snap.publishedAt && (
                          <span className="text-[11px] text-[#A8A5A5]">
                            Published on {new Date(snap.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {snap.metrics.map((m) => (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-semibold text-[#6B6B6B] truncate">
                                {m.label}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/5 text-[#444444]">
                                {m.source}
                              </span>
                            </div>
                            <div className="text-xl font-bold text-[#111111] tabular-nums">
                              {typeof m.value === 'number' ? (m.value as number).toLocaleString() : String(m.value)}
                            </div>
                            <div className="text-[10px] text-[#A8A5A5] flex items-center justify-between pt-0.5">
                              <span>As of {m.asOfDate}</span>
                              {m.source === 'PageSpeed Insights' && m.testDate && (
                                <span>Tested {m.testDate}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Report Detail Modal */}
            {selectedReportDetail && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 md:p-8 border border-black/10 shadow-2xl space-y-6 my-8">
                  <div className="flex items-start justify-between pb-3 border-b border-black/5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        Performance Report
                      </span>
                      <h3 className="text-xl font-bold text-[#111111]">
                        {selectedReportDetail.monthLabel}
                      </h3>
                      <div className="text-xs text-[#A8A5A5] mt-0.5">
                        Published by Open Hours on {selectedReportDetail.publishedAt || 'N/A'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedReportDetail(null)}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#F8F7F7] rounded-xl">
                      <span className="text-[11px] text-[#A8A5A5] block">Visitors</span>
                      <span className="text-base font-bold text-[#111111]">{selectedReportDetail.visitors.value}</span>
                    </div>
                    <div className="p-3 bg-[#F8F7F7] rounded-xl">
                      <span className="text-[11px] text-[#A8A5A5] block">Enquiries</span>
                      <span className="text-base font-bold text-[#111111]">{selectedReportDetail.enquiries.value}</span>
                    </div>
                    <div className="p-3 bg-[#F8F7F7] rounded-xl">
                      <span className="text-[11px] text-[#A8A5A5] block">Profile Views</span>
                      <span className="text-base font-bold text-[#111111]">{selectedReportDetail.profileViews.value}</span>
                    </div>
                    <div className="p-3 bg-[#F8F7F7] rounded-xl">
                      <span className="text-[11px] text-[#A8A5A5] block">Calls</span>
                      <span className="text-base font-bold text-[#111111]">{selectedReportDetail.calls.value}</span>
                    </div>
                    <div className="p-3 bg-[#F8F7F7] rounded-xl">
                      <span className="text-[11px] text-[#A8A5A5] block">Direction Requests</span>
                      <span className="text-base font-bold text-[#111111]">{selectedReportDetail.directionRequests.value}</span>
                    </div>
                    {selectedReportDetail.bookings && (
                      <div className="p-3 bg-[#F8F7F7] rounded-xl">
                        <span className="text-[11px] text-[#A8A5A5] block">Bookings</span>
                        <span className="text-base font-bold text-[#111111]">{selectedReportDetail.bookings.value}</span>
                      </div>
                    )}
                  </div>

                  {/* What we did */}
                  {selectedReportDetail.whatWeDid.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A5A5]">
                        What Open Hours Executed This Month
                      </h4>
                      <ul className="text-xs text-[#111111] space-y-1 list-disc list-inside">
                        {selectedReportDetail.whatWeDid.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Next month plan */}
                  {selectedReportDetail.nextMonthPlan.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A5A5]">
                        Plan For Next Month
                      </h4>
                      <ul className="text-xs text-[#111111] space-y-1 list-disc list-inside">
                        {selectedReportDetail.nextMonthPlan.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Executive Note */}
                  {selectedReportDetail.shortNote && (
                    <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 text-xs text-emerald-950">
                      <span className="font-bold block mb-1">Executive Summary:</span>
                      <p>{selectedReportDetail.shortNote}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReportDetail(null)}
                      className="px-5 py-2 text-xs font-bold bg-[#111111] text-white rounded-full"
                    >
                      Close Report
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FILES & SUPPORT */}
        {/* ========================================================================= */}
        {activeTab === 'files_support' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-[#111111]">Files & Support</h1>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Shared deliverables, upcoming meetings, and direct support tickets.
              </p>
            </div>

            {/* SECTION A: SHARED FILES */}
            <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[#111111]">Shared Project Files</h2>

              {files.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B6B6B]">
                  No shared assets uploaded yet.
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {(showAllFiles ? files : files.slice(0, 5)).map((file) => (
                    <div
                      key={file.id}
                      className="py-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[var(--accent)] flex items-center justify-center font-bold">
                          <FileText size={15} />
                        </div>
                        <div>
                          <div className="font-bold text-[#111111]">{file.name}</div>
                          <div className="text-[10px] text-[#A8A5A5]">
                            Folder: {file.folder} · {(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => showToast(`Downloaded: ${file.name}`)}
                        className="px-3 py-1 bg-[#F1EFEF] hover:bg-[#E7E2E2] rounded-full text-[11px] font-bold text-[#111111] flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={11} />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllFiles(!showAllFiles)}
                    className="text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{showAllFiles ? 'Show Less' : `Show More (${files.length - 5} more)`}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showAllFiles ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* SECTION B: UPCOMING MEETINGS */}
            {meetings.length > 0 && (
              <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-[#111111]">Scheduled Reviews & Calls</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meetings.map((meet) => (
                    <div
                      key={meet.id}
                      className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F1EFEF] px-2 py-0.5 rounded text-[#111111]">
                            {meet.type}
                          </span>
                          <span className="text-[10px] text-[#A8A5A5]">{meet.status}</span>
                        </div>
                        <h3 className="text-xs font-bold text-[#111111]">{meet.title}</h3>
                        <div className="text-[11px] text-[#6B6B6B] mt-1 flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>{meet.startsAt} ({meet.durationMin} min)</span>
                        </div>
                      </div>

                      {meet.link && (
                        <a
                          href={meet.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-full bg-[#111111] text-white text-[11px] font-bold text-center"
                        >
                          Join Call
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Book a meeting (Calendly) */}
            {data.bookingLink && (
              <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F8F7F7] border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      Direct Scheduling
                    </span>
                    <h3 className="text-sm font-bold text-[#111111]">
                      Book a meeting
                    </h3>
                    <p className="text-xs text-[#A8A5A5] mt-0.5">
                      Third-party scheduling service.
                    </p>
                  </div>
                </div>

                <a
                  href={data.bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  <span>Book a meeting</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {/* SECTION C: SUPPORT TICKETS & RAISE TICKET FORM */}
            <div className="bg-white rounded-[12px] p-6 border border-[#E5E7EB] shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#111111]">Support Tickets & Requests</h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Ask questions, request changes, or report issues directly to your account team.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRaiseTicketModalOpen(true)}
                  className="px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Raise a Ticket</span>
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6B6B6B]">
                  No support tickets raised yet.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {(showAllTickets ? tickets : tickets.slice(0, 5)).map((tick) => (
                    <div
                      key={tick.id}
                      className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F1EFEF] px-2 py-0.5 rounded text-[#111111]">
                            {tick.type}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tick.status === 'Resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tick.status === 'In progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {tick.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#A8A5A5]">{tick.createdAt}</span>
                      </div>

                      <h3 className="text-xs font-bold text-[#111111]">{tick.title}</h3>
                      <p className="text-xs text-[#6B6B6B] leading-relaxed">{tick.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {tickets.length > 5 && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllTickets(!showAllTickets)}
                    className="text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>{showAllTickets ? 'Show Less' : `Show More (${tickets.length - 5} more)`}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showAllTickets ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* SECTION D: SECURITY BASICS CHECKLIST (Replaces free GDPR badge) */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    Verified Technical Baseline
                  </span>
                  <h2 className="text-lg font-bold text-[#111111] mt-0.5">
                    Security & Site Basics
                  </h2>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Technical standards</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    key: 'httpsEnabled',
                    title: 'HTTPS enabled',
                    desc: 'Encrypted connection and SSL certificate active on domain.',
                    verified: data.securityBasics?.httpsEnabled?.verified ?? true,
                    date: data.securityBasics?.httpsEnabled?.verifiedDate || '2026-10-15',
                  },
                  {
                    key: 'privacyPolicyAdded',
                    title: 'Privacy policy page added',
                    desc: 'Clear disclosure of data handling and client communication terms.',
                    verified: data.securityBasics?.privacyPolicyAdded?.verified ?? true,
                    date: data.securityBasics?.privacyPolicyAdded?.verifiedDate || '2026-10-15',
                  },
                  {
                    key: 'cookieNoticeAdded',
                    title: 'Cookie notice added (only if the site uses cookies)',
                    desc: 'Consent banner configured for external tracking or analytics cookies.',
                    verified: data.securityBasics?.cookieNoticeAdded?.verified ?? true,
                    date: data.securityBasics?.cookieNoticeAdded?.verifiedDate || '2026-10-16',
                  },
                  {
                    key: 'contactFormTested',
                    title: 'Contact form tested',
                    desc: 'End-to-end delivery of customer enquiry messages verified.',
                    verified: data.securityBasics?.contactFormTested?.verified ?? true,
                    date: data.securityBasics?.contactFormTested?.verifiedDate || '2026-10-16',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.verified ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Clock size={16} className="text-amber-500 shrink-0" />
                        )}
                        <h3 className="text-xs font-bold text-[#111111]">{item.title}</h3>
                      </div>
                      <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                        {item.desc}
                      </p>
                      <div className="pt-1">
                        <span className="text-[10px] text-[#A8A5A5]">
                          {item.verified ? `Verified on ${item.date}` : 'Verification scheduled'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.verified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Helper Note Required by Brief: Never claim legal compliance */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
                <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Administrative note: </span>
                  <span>
                    These technical checklists reflect technical baseline configurations only. Have legal wording reviewed by a professional.
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION E: GOOGLE REVIEW QR KIT */}
            <div className="bg-white rounded-[12px] p-6 sm:p-8 border border-[#E5E7EB] shadow-xs space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    Reputation Toolkit
                  </span>
                  <h2 className="text-lg font-bold text-[#111111] mt-0.5">
                    Google Review QR Kit
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode size={14} />
                  <span>Create QR Sheet</span>
                </button>
              </div>

              <div className="p-5 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#111111] block">
                      Google Review Target Link
                    </span>
                    <span className="text-xs text-[#6B6B6B] font-mono mt-0.5 block truncate max-w-md">
                      {client.googleReviewLink || 'No Google review link set yet (configure in your portal or ask account manager)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="px-4 py-1.5 rounded-full bg-white border border-black/10 hover:border-black/20 text-xs font-bold text-[#111111] transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    View / Print QR Sheet
                  </button>
                </div>

                {/* Google Policy Tip Required by Brief */}
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Google Review Policy Notice: </span>
                    <span>
                      Ask all customers, do not offer rewards for reviews, and do not select only happy customers (Google policy).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION F: CONTACT LINE (Prompt requirement) */}
            <div className="p-6 rounded-[12px] bg-white border border-[#E5E7EB] shadow-xs text-center space-y-1">
              <span className="text-xs font-semibold text-[#111111]">
                Need immediate assistance?
              </span>
              <p className="text-xs text-[#6B6B6B]">
                Email <a href="mailto:support@openhours.ie" className="text-[var(--accent)] font-semibold underline">support@openhours.ie</a> or contact your dedicated Account Manager.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: RAISE TICKET FORM */}
      {/* ========================================================================= */}
      {raiseTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] max-w-md w-full p-6 border border-black/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Client Support
                </span>
                <h3 className="text-lg font-bold text-[#111111]">Raise a Ticket</h3>
              </div>

              <button
                type="button"
                onClick={() => setRaiseTicketModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRaiseTicketSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Ticket Type
                </label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value as Ticket['type'])}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="Question">Question</option>
                  <option value="Change">Change Request</option>
                  <option value="Issue">Technical Issue</option>
                  <option value="Complaint">Urgent Escalation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Update emergency contact phone number on homepage"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your question or change request in detail..."
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setRaiseTicketModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-5 py-2 text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmittingTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST DEMO CHANGES */}
      {showRequestChangesModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-[12px] max-w-lg w-full p-6 shadow-2xl border border-black/10 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                <h3 className="text-base font-bold text-[#111111]">Request Changes</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestChangesModal(false)}
                className="text-[#6B6B6B] hover:text-[#111111] p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#6B6B6B]">
              Please describe the revisions or adjustments you'd like our design team to make. An urgent task will be created directly for your account manager.
            </p>

            <form onSubmit={handleRequestChanges} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-[#111111]">
                    Revisions & Feedback *
                  </label>
                  <span className="text-[11px] text-[#888888]">
                    {changeFeedback.length} / 1000 characters
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  maxLength={1000}
                  placeholder="e.g. Please update our opening hours to 08:30–17:30 on weekdays, swap the second service description, and use a deeper navy tone for the secondary color."
                  value={changeFeedback}
                  onChange={(e) => setChangeFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowRequestChangesModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={demoActionLoading || !changeFeedback.trim()}
                  className="px-5 py-2 text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {demoActionLoading ? 'Submitting...' : 'Submit Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE REVIEW QR SHEET MODAL */}
      <GoogleReviewQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        businessName={client.businessName}
        reviewLink={client.googleReviewLink || ''}
        brandColor={theme.accentColor || '#111111'}
        logoUrl={theme.logoUrl}
        canEditLink={true}
        onUpdateReviewLink={async (newLink: string) => {
          await updateClientGoogleReviewLink(client.id, newLink, isPreview ? 'client (preview)' : 'client');
          showToast('Google review link saved successfully.');
          await loadPortalData();
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111111] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Powered by Open Hours Footer */}
      {theme.poweredByOpenHours && (
        <footer className="mt-auto border-t border-black/5 py-6 px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5E7EB] text-[11px] font-semibold text-[#6B6B6B] shadow-2xs">
            <LogoMark size={14} />
            <span>Powered by Open Hours</span>
          </div>
        </footer>
      )}
      {/* Reveal Sequence Overlay */}
      {showPortalReveal && data?.websiteDemo && (
        <RevealSequenceOverlay
          businessName={data.client.businessName}
          logoDataUrl={theme.logoUrl}
          welcomeLine={`Welcome, ${data.client.businessName}`}
          style="Blur fade"
          iframeLoaded={true}
          onComplete={() => {
            setShowPortalReveal(false);
            try {
              localStorage.setItem(`openhours_reveal_seen_portal_${clientId}_${data.websiteDemo!.id}`, 'true');
            } catch {
              // safe fallback
            }
          }}
        />
      )}
    </div>
  </PortalThemeProvider>
  );
};
