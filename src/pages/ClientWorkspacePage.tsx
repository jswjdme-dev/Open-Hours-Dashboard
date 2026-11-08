import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Video,
  LifeBuoy,
  CreditCard,
  Plus,
  Send,
  Upload,
  Download,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Flame,
  User,
  Sparkles,
  Eye,
  Lock,
  Handshake,
  KeyRound,
  Globe,
} from 'lucide-react';
import {
  Client,
  Project,
  ProjectStageKey,
  StageStatus,
  Request,
  RequestStatus,
  RequestType,
  FileItem,
  FileFolder,
  Meeting,
  MeetingType,
  Ticket,
  TicketStatus,
  TicketType,
  Invoice,
  Payment,
  TeamMemberProfile,
  LeadActivity,
} from '../types/index.ts';
import {
  getClientById,
  getProjectByClientId,
  updateProject,
  updateProjectStage,
  toggleProjectChecklistItem,
  getRequests,
  createRequest,
  updateRequest,
  addRequestComment,
  getFiles,
  uploadFile,
  getMeetings,
  createMeeting,
  updateMeeting,
  getTickets,
  createTicket,
  updateTicket,
  addTicketComment,
  getInvoices,
  getPayments,
  getClientPortal,
  updateClientPortal,
  getTeamMembers,
  updateClientReportSchedule,
  getWebsiteProjectsForClient,
  getLeadActivities,
} from '../data/repo.ts';
import { ClientPortal, PortalSectionKey, WebsiteProject } from '../types/index.ts';
import { DeliveryStagesManager } from '../components/clients/DeliveryStagesManager.tsx';
import { ManageCredentialModal } from '../components/auth/ManageCredentialModal.tsx';
import { ClientSuggestionsManager } from '../components/clients/ClientSuggestionsManager.tsx';
import { ClientPortalAdminManager } from '../components/clients/ClientPortalAdminManager.tsx';
import { ClientReferralsAdminTab } from '../components/clients/ClientReferralsAdminTab.tsx';
import { ClientPortalFeatureMatrixTab } from '../components/clients/ClientPortalFeatureMatrixTab.tsx';

interface ClientWorkspacePageProps {
  clientId: string;
  onBackToClients: () => void;
  onOpenPortalPreview?: (clientId: string) => void;
  onOpenWebsiteStudio?: (projectId?: string) => void;
}

export const ClientWorkspacePage: React.FC<ClientWorkspacePageProps> = ({
  clientId,
  onBackToClients,
  onOpenPortalPreview,
  onOpenWebsiteStudio,
}) => {
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [clientWebsiteProjects, setClientWebsiteProjects] = useState<WebsiteProject[]>([]);
  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [manageCredOpen, setManageCredOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Workspace Sub-Tab
  const [workspaceTab, setWorkspaceTab] = useState<
    'Overview' | 'Delivery' | 'Requests' | 'Suggestions' | 'Website demo' | 'Files' | 'Meetings' | 'Tickets' | 'Billing' | 'Referrals' | 'Portal settings'
  >('Overview');

  // Sub-tab specific filters & modal states
  const [requestFilter, setRequestFilter] = useState<string>('all');
  const [fileFolderFilter, setFileFolderFilter] = useState<string>('all');
  const [ticketFilter, setTicketFilter] = useState<string>('all');

  // Modals
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newMeetingModalOpen, setNewMeetingModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [uploadFileModalOpen, setUploadFileModalOpen] = useState(false);

  // New Request form
  const [reqTitle, setReqTitle] = useState('');
  const [reqType, setReqType] = useState<RequestType>('Information');
  const [reqDesc, setReqDesc] = useState('');
  const [reqDeadline, setReqDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // New Meeting form
  const [meetTitle, setMeetTitle] = useState('');
  const [meetType, setMeetType] = useState<MeetingType>('Review');
  const [meetStartsAt, setMeetStartsAt] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16)
  );
  const [meetDuration, setMeetDuration] = useState(30);
  const [meetAgenda, setMeetAgenda] = useState('');

  // New Ticket form
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketType, setTicketType] = useState<TicketType>('Change');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketScope, setTicketScope] = useState<'In package' | 'Extra cost'>('In package');
  const [ticketExtraCost, setTicketExtraCost] = useState(0);
  const [ticketPriority, setTicketPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');

  // Upload file form
  const [uploadName, setUploadName] = useState('');
  const [uploadFolder, setUploadFolder] = useState<FileFolder>('Brand');

  // Selected stage in Delivery view
  const [selectedStageKey, setSelectedStageKey] = useState<ProjectStageKey>('Kickoff');

  // Team members list for delivery tasks assignment
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Portal Live Link & Report Schedule settings
  const [liveUrl, setLiveUrl] = useState('');
  const [liveLabel, setLiveLabel] = useState('Google Analytics');
  const [reportDay, setReportDay] = useState(1);
  const [nextReportDue, setNextReportDue] = useState('2026-11-01');

  // Request Comment input per request
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Ticket comment input
  const [ticketCommentInputs, setTicketCommentInputs] = useState<Record<string, string>>({});
  const [isInternalComment, setIsInternalComment] = useState(false);

  const loadAllClientData = async () => {
    setLoading(true);
    const c = await getClientById(clientId);
    if (c) {
      setClient(c);
      setLiveUrl(c.liveReportUrl || '');
      setLiveLabel(c.liveReportLabel || 'Google Analytics');
      setReportDay(c.reportDayOfMonth || 1);
      setNextReportDue(c.nextReportDue || '2026-11-01');

      const p = await getProjectByClientId(c.id);
      setProject(p);
      if (p) setSelectedStageKey(p.currentStageKey);

      const [r, f, m, t, inv, pay, port, tMembers, webProjs, clientActs] = await Promise.all([
        getRequests({ clientId: c.id }),
        getFiles({ clientId: c.id }),
        getMeetings({ clientId: c.id }),
        getTickets({ clientId: c.id }),
        getInvoices({ clientId: c.id }),
        getPayments({ clientId: c.id }),
        getClientPortal(c.id),
        getTeamMembers(),
        getWebsiteProjectsForClient(c.id),
        getLeadActivities(c.leadId || c.id),
      ]);

      setRequests(r);
      setFiles(f);
      setMeetings(m);
      setTickets(t);
      setInvoices(inv);
      setPayments(pay);
      setPortal(port);
      setTeamMembers(tMembers);
      setClientWebsiteProjects(webProjs);
      setActivities(clientActs);
      if (port?.liveReportUrl && !c.liveReportUrl) {
        setLiveUrl(port.liveReportUrl);
      }
      if (port?.liveReportLabel && !c.liveReportLabel) {
        setLiveLabel(port.liveReportLabel);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllClientData();
    const handleDomainEvent = () => {
      loadAllClientData();
    };
    window.addEventListener('domainEventEmitted', handleDomainEvent);
    return () => {
      window.removeEventListener('domainEventEmitted', handleDomainEvent);
    };
  }, [clientId]);

  if (loading || !client) {
    return (
      <div className="w-full py-16 text-center text-[#A8A5A5] text-xs">
        Loading clinic workspace...
      </div>
    );
  }

  // Delivery Stage Toggle Checklist Item
  const handleToggleChecklist = async (stageKey: ProjectStageKey, itemId: string) => {
    if (!project) return;
    const updated = await toggleProjectChecklistItem(project.id, stageKey, itemId);
    if (updated) setProject({ ...updated });
  };

  // Ball in court toggle
  const handleToggleBallInCourt = async () => {
    if (!project) return;
    const nextVal = project.ballInCourt === 'Us' ? 'Client' : 'Us';
    const updated = await updateProject(project.id, { ballInCourt: nextVal });
    if (updated) setProject({ ...updated });
  };

  // Stage status update
  const handleStageStatusChange = async (stageKey: ProjectStageKey, status: StageStatus) => {
    if (!project) return;
    const updated = await updateProjectStage(project.id, stageKey, { status });
    if (updated) setProject({ ...updated });
  };

  // Create Request Submit
  const handleCreateRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !reqTitle.trim()) return;

    await createRequest({
      clientId: client.id,
      projectId: project.id,
      type: reqType,
      title: reqTitle.trim(),
      description: reqDesc.trim(),
      deadline: reqDeadline,
      status: 'Pending',
      assignedToClient: true,
      createdBy: 'Founder',
      reminderSchedule: [reqDeadline],
      comments: [],
    });

    setReqTitle('');
    setReqDesc('');
    setNewRequestModalOpen(false);
    const r = await getRequests({ clientId: client.id });
    setRequests(r);
  };

  // Add Comment on Request
  const handleSendRequestComment = async (requestId: string) => {
    const text = commentInputs[requestId]?.trim();
    if (!text) return;

    await addRequestComment(requestId, {
      authorName: 'Founder',
      authorRole: 'admin',
      text,
    });

    setCommentInputs((prev) => ({ ...prev, [requestId]: '' }));
    const r = await getRequests({ clientId: client.id });
    setRequests(r);
  };

  // Approve Request
  const handleApproveRequest = async (requestId: string) => {
    await updateRequest(requestId, { status: 'Approved' });
    const r = await getRequests({ clientId: client.id });
    setRequests(r);
  };

  // Request Changes
  const handleRequestChanges = async (requestId: string) => {
    await updateRequest(requestId, { status: 'Needs Changes' });
    const r = await getRequests({ clientId: client.id });
    setRequests(r);
  };

  // Upload File Submit
  const handleUploadFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) return;

    await uploadFile({
      clientId: client.id,
      folder: uploadFolder,
      name: uploadName.trim(),
      sizeBytes: 1024 * 1024 * 1.5, // 1.5MB simulated
      mime: uploadName.endsWith('.pdf')
        ? 'application/pdf'
        : uploadName.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/jpeg',
      direction: 'From us',
      uploadedBy: 'Founder',
      storageRef: `${uploadFolder.toLowerCase()}/${uploadName}`,
    });

    setUploadName('');
    setUploadFileModalOpen(false);
    const f = await getFiles({ clientId: client.id });
    setFiles(f);
  };

  // Create Meeting Submit
  const handleCreateMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetTitle.trim()) return;

    await createMeeting({
      clientId: client.id,
      type: meetType,
      title: meetTitle.trim(),
      startsAt: meetStartsAt,
      durationMin: meetDuration,
      timezone: client.country === 'Malta' ? 'Europe/Malta' : 'Europe/Dublin',
      link: 'https://meet.google.com/oh-clinic',
      agenda: meetAgenda.trim(),
      attendees: ['Founder', client.ownerName],
      actionItems: ['Prepare meeting notes'],
      status: 'Scheduled',
    });

    setMeetTitle('');
    setMeetAgenda('');
    setNewMeetingModalOpen(false);
    const m = await getMeetings({ clientId: client.id });
    setMeetings(m);
  };

  // Create Ticket Submit
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;

    const promisedBy = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await createTicket({
      clientId: client.id,
      clientName: client.businessName,
      type: ticketType,
      title: ticketTitle.trim(),
      description: ticketDesc.trim(),
      status: 'Received',
      scope: ticketScope,
      extraCostEUR: ticketScope === 'Extra cost' ? ticketExtraCost : undefined,
      priority: ticketPriority,
      promisedResponseBy: promisedBy,
    });

    setTicketTitle('');
    setTicketDesc('');
    setNewTicketModalOpen(false);
    const t = await getTickets({ clientId: client.id });
    setTickets(t);
  };

  // Add Comment on Ticket
  const handleSendTicketComment = async (ticketId: string) => {
    const text = ticketCommentInputs[ticketId]?.trim();
    if (!text) return;

    await addTicketComment(ticketId, {
      authorName: 'Founder',
      authorRole: 'admin',
      text,
      isInternalOnly: isInternalComment,
    });

    setTicketCommentInputs((prev) => ({ ...prev, [ticketId]: '' }));
    const t = await getTickets({ clientId: client.id });
    setTickets(t);
  };

  // Resolve Ticket
  const handleResolveTicket = async (ticketId: string) => {
    await updateTicket(ticketId, {
      status: 'Resolved',
      resolutionNote: 'Issue addressed and live production verification complete.',
    });
    const t = await getTickets({ clientId: client.id });
    setTickets(t);
  };

  // Open requests count
  const pendingRequestsCount = requests.filter(
    (r) => r.status === 'Pending' || r.status === 'Needs Changes'
  ).length;

  const activeStage = project?.stages.find((s) => s.key === selectedStageKey);

  return (
    <div className="w-full space-y-6">
      {/* Workspace Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 pb-2 border-b border-black/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToClients}
            className="w-9 h-9 rounded-full bg-white border border-black/10 hover:border-black/30 flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] transition-all cursor-pointer shadow-2xs"
            aria-label="Back to clients"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#A8A5A5] uppercase tracking-wider">
                {client.specialty} · {client.city}, {client.country}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  client.status === 'Live'
                    ? 'bg-emerald-100 text-emerald-800'
                    : client.status === 'Onboarding'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {client.status}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#111111] text-white text-[10px] font-bold">
                {client.package} Package
              </span>
              {(client.sourcePartnerId || (client.source && client.source !== 'Direct')) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FCE9ED] text-[#D92D50] text-[10px] font-bold border border-[#FCE9ED]">
                  <Handshake size={11} />
                  <span>Brought by {client.sourcePartnerName || client.source}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
              {client.businessName}
            </h1>
          </div>
        </div>

        {/* Quick Attributes & Financials Pill */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white rounded-full px-4 py-2 border border-black/5 shadow-2xs flex items-center gap-3 text-xs">
            <div>
              <span className="text-[#A8A5A5] text-[10px] block">Retainer</span>
              <span className="font-bold text-[#111111] tabular-nums">
                €{client.monthlyFeeEUR?.toLocaleString()}/mo
              </span>
            </div>
            <div className="w-[1px] h-6 bg-black/10" />
            <div>
              <span className="text-[#A8A5A5] text-[10px] block">Health Score</span>
              <span className="font-bold text-[#D92D50] tabular-nums">
                {client.healthScore}%
              </span>
            </div>
            <div className="w-[1px] h-6 bg-black/10" />
            <div>
              <span className="text-[#A8A5A5] text-[10px] block">Account Lead</span>
              <span className="font-semibold text-[#111111] capitalize">
                {client.accountManagerId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2 border border-black/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'Overview', label: 'Overview' },
            { id: 'Delivery', label: 'Delivery Stages' },
            {
              id: 'Requests',
              label: 'Requests',
              badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
            },
            { id: 'Suggestions', label: 'Suggestions' },
            { id: 'Website demo', label: 'Website demo' },
            { id: 'Files', label: 'Files' },
            { id: 'Meetings', label: 'Meetings' },
            { id: 'Tickets', label: 'Tickets' },
            { id: 'Billing', label: 'Billing' },
            { id: 'Referrals', label: 'Referrals' },
            { id: 'Portal settings', label: 'Portal settings' },
          ].map((tab) => {
            const isActive = workspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkspaceTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#D92D50] text-white' : 'bg-[#D92D50] text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View as Client Quick Action & Subtab context buttons */}
        <div className="flex items-center gap-2">
          {onOpenPortalPreview && (
            <button
              type="button"
              onClick={() => onOpenPortalPreview(client.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-black/15 text-[#111111] text-xs font-bold hover:bg-black/5 transition-all cursor-pointer shadow-2xs"
            >
              <Eye size={13} className="text-[#D92D50]" />
              <span>View as client</span>
            </button>
          )}
          <div className="relative group">
            <button
              type="button"
              disabled={!client.portalUserEmail}
              onClick={() => setManageCredOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-black/15 text-[#111111] text-xs font-bold hover:bg-black/5 transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              title={!client.portalUserEmail ? 'No email yet: add one before sending portal access' : 'Manage credentials'}
            >
              <KeyRound size={13} className="text-[#111111]" />
              <span>Credentials</span>
            </button>
            {!client.portalUserEmail && (
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block z-50 px-2.5 py-1 bg-[#111111] text-white text-[10px] font-medium rounded-lg whitespace-nowrap shadow-lg">
                No email yet: add one before sending portal access
              </div>
            )}
          </div>
        {workspaceTab === 'Requests' && (
          <button
            type="button"
            onClick={() => setNewRequestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D92D50] text-white text-xs font-bold hover:bg-[#C42447] transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>New Request</span>
          </button>
        )}
        {workspaceTab === 'Files' && (
          <button
            type="button"
            onClick={() => setUploadFileModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-2xs"
          >
            <Upload size={13} />
            <span>Upload File</span>
          </button>
        )}
        {workspaceTab === 'Meetings' && (
          <button
            type="button"
            onClick={() => setNewMeetingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-2xs"
          >
            <Video size={13} />
            <span>Schedule Meeting</span>
          </button>
        )}
        {workspaceTab === 'Tickets' && (
          <button
            type="button"
            onClick={() => setNewTicketModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D92D50] text-white text-xs font-bold hover:bg-[#C42447] transition-all cursor-pointer shadow-2xs"
          >
            <LifeBuoy size={13} />
            <span>New Ticket</span>
          </button>
        )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {workspaceTab === 'Overview' && (
        <div className="space-y-6">
          {/* Partner Outcome Banner */}
          {client.partnerOutcome && (
            <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Partner Outcome
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    client.partnerOutcome.status === 'Agreed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : client.partnerOutcome.status === 'Interested'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : client.partnerOutcome.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-gray-50 text-gray-800 border-gray-200'
                  }`}
                >
                  {client.partnerOutcome.status}
                </span>
                {client.partnerOutcome.note && (
                  <span className="text-xs text-[#6B6B6B] italic">
                    "{client.partnerOutcome.note}"
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#A8A5A5]">
                Marked by partner · {new Date(client.partnerOutcome.updatedAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Top 3 Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Practice Specs */}
            <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Practice Governance
                </span>
                <span className="text-[10px] text-[#A8A5A5] font-semibold">Active Since {client.startDate}</span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-black/5">
                <div className="pt-1 flex justify-between">
                  <span className="text-[#6B6B6B]">Decision Maker</span>
                  <span className="font-bold text-[#111111]">{client.ownerName} ({client.ownerRole})</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-[#6B6B6B]">Direct Email</span>
                  <span className="font-semibold text-[#111111]">{client.portalUserEmail || 'N/A'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-[#6B6B6B]">Estimated Customer Value</span>
                  <span className="font-bold text-[#111111] tabular-nums">
                    €{client.baselineAverageValuePerNewCustomerEUR || 850}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-[#6B6B6B]">Retainer Contract</span>
                  <span className="font-bold text-[#D92D50] tabular-nums">
                    €{client.monthlyFeeEUR}/month
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Current Stage Status & Ball in Court */}
            <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Delivery Status
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FCE9ED] text-[#D92D50] text-[10px] font-bold">
                    Target: {project?.targetLaunchDate || 'TBD'}
                  </span>
                </div>

                <div className="text-lg font-bold text-[#111111] flex items-center gap-2">
                  <span>Current: {project?.currentStageKey}</span>
                </div>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Stage {project ? project.stages.findIndex((s) => s.key === project.currentStageKey) + 1 : 1} of 9 in production pipeline.
                </p>
              </div>

              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-xs text-[#6B6B6B]">Ball in Court:</span>
                <button
                  type="button"
                  onClick={handleToggleBallInCourt}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    project?.ballInCourt === 'Client'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-[#111111] text-white'
                  }`}
                >
                  {project?.ballInCourt === 'Client' ? 'Waiting on Client' : 'Action on Us'}
                </button>
              </div>
            </div>

            {/* Card 3: Health Score Breakdown */}
            <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Health & Retention Score
                </span>
                <span className="text-base font-bold text-[#D92D50] tabular-nums">
                  {client.healthScore}/100
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#6B6B6B]">SEO & Local Search Authority</span>
                    <span className="font-bold text-[#111111]">92%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F1EFEF] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#6B6B6B]">Conversion & Booking Speed</span>
                    <span className="font-bold text-[#111111]">88%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F1EFEF] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[88%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#6B6B6B]">Communication & Asset Approval</span>
                    <span className="font-bold text-[#111111]">85%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F1EFEF] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Practice Notes & Requirements */}
          <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-2">
            <h3 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
              Strategic Notes & Goals
            </h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              {client.notes || 'No strategic notes added yet.'}
            </p>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#D92D50]" />
                <h3 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
                  Client Activity Timeline
                </h3>
              </div>
              <span className="text-[11px] text-[#A8A5A5] font-semibold">
                {activities.length} recorded events
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#A8A5A5] bg-[#F8F9FA] rounded-[16px]">
                No client activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {activities.slice(0, 8).map((act) => (
                  <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-[#111111] font-medium leading-relaxed">
                        {act.text}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#A8A5A5]">
                        <span>By {act.createdBy}</span>
                        <span>·</span>
                        <span>{act.createdAt}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054] text-[10px] font-bold shrink-0 capitalize">
                      {act.type || 'Activity'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: DELIVERY (Board & Timeline) */}
      {/* ========================================================================= */}
      {workspaceTab === 'Delivery' && project && (
        <div className="space-y-6">
          {/* Top Stage Carousel / Steps */}
          <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-xs">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Productized Delivery Pipeline
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B6B6B]">Ball in Court:</span>
                <button
                  type="button"
                  onClick={handleToggleBallInCourt}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    project.ballInCourt === 'Client'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-[#111111] text-white'
                  }`}
                >
                  {project.ballInCourt === 'Client' ? 'Client' : 'Us (Open Hours)'}
                </button>
              </div>
            </div>

            {/* Stepper Grid (Non-archived stages) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2">
              {project.stages
                .filter((st) => !st.archived)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((st, idx) => {
                  const isSelected = selectedStageKey === st.key;
                  const isDone = st.status === 'Done';
                  const isInProg = st.status === 'In progress';

                  return (
                    <button
                      key={st.id || st.key}
                      type="button"
                      onClick={() => setSelectedStageKey(st.key)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#D92D50] bg-[#FCE9ED]/40 ring-1 ring-[#D92D50]'
                          : isDone
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : isInProg
                          ? 'border-blue-200 bg-blue-50/40'
                          : 'border-black/5 bg-[#F8F7F7]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#A8A5A5]">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {isDone ? (
                          <CheckCircle2 size={12} className="text-emerald-600" />
                        ) : (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isInProg ? 'bg-blue-600 animate-pulse' : 'bg-black/15'
                            }`}
                          />
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-[#111111] line-clamp-1">
                        {st.name || st.key}
                      </div>
                      <div className="text-[9px] text-[#6B6B6B] mt-0.5 capitalize">
                        {st.status}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Delivery Stages & Tasks Manager Component */}
          <DeliveryStagesManager
            clientId={client.id}
            project={project}
            teamMembers={teamMembers}
            onProjectUpdated={(updatedProject) => {
              setProject({ ...updatedProject });
            }}
            selectedStageKey={selectedStageKey}
            onSelectStageKey={(key) => setSelectedStageKey(key)}
            showToast={showToast}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: REQUEST MANAGER */}
      {/* ========================================================================= */}
      {workspaceTab === 'Requests' && (
        <div className="space-y-6">
          {/* Requests Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {['all', 'Pending', 'Submitted', 'Needs Changes', 'Approved'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRequestFilter(st)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    requestFilter === st
                      ? 'bg-[#111111] text-white shadow-2xs'
                      : 'bg-white text-[#6B6B6B] border border-black/5 hover:text-[#111111]'
                  }`}
                >
                  <span className="capitalize">{st === 'all' ? 'All Requests' : st}</span>
                </button>
              ))}
            </div>

            <span className="text-xs text-[#6B6B6B]">
              {requests.length} total client requests
            </span>
          </div>

          {/* Requests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests
              .filter((r) => requestFilter === 'all' || r.status === requestFilter)
              .map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-[#F1EFEF] text-[#111111] text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {req.type}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'Submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : req.status === 'Needs Changes'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[#111111] mb-1">
                      {req.title}
                    </h4>
                    <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
                      {req.description}
                    </p>

                    {req.submittedContent && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 mb-3">
                        <span className="font-bold block mb-0.5">Submitted Content:</span>
                        {req.submittedContent}
                      </div>
                    )}

                    {/* Deadline */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#A8A5A5]">
                      <Clock size={12} />
                      <span>Deadline: {req.deadline}</span>
                    </div>
                  </div>

                  {/* Actions & Comment Thread */}
                  <div className="pt-3 border-t border-black/5 space-y-3">
                    {/* Approve / Changes Buttons */}
                    <div className="flex items-center gap-2">
                      {req.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req.id)}
                          className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {req.status !== 'Needs Changes' && req.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => handleRequestChanges(req.id)}
                          className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-colors cursor-pointer"
                        >
                          Request Changes
                        </button>
                      )}
                    </div>

                    {/* Comments */}
                    {req.comments.length > 0 && (
                      <div className="space-y-2 pt-1 max-h-36 overflow-y-auto custom-scrollbar">
                        {req.comments.map((cm) => (
                          <div key={cm.id} className="text-xs p-2 bg-[#F8F7F7] rounded-xl">
                            <div className="flex items-center justify-between text-[10px] text-[#A8A5A5] mb-0.5">
                              <span className="font-bold text-[#111111]">{cm.authorName}</span>
                              <span>{cm.createdAt}</span>
                            </div>
                            <div className="text-[#111111]">{cm.text}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[req.id] || ''}
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [req.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendRequestComment(req.id);
                        }}
                        placeholder="Reply to client..."
                        className="flex-1 px-3 py-1.5 text-xs bg-[#F1EFEF] rounded-full border border-black/10 focus:outline-none focus:border-[#D92D50]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendRequestComment(req.id)}
                        className="p-1.5 rounded-full bg-[#111111] hover:bg-black text-white cursor-pointer"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: CLIENT SUGGESTIONS */}
      {/* ========================================================================= */}
      {workspaceTab === 'Suggestions' && client && (
        <ClientSuggestionsManager
          client={client}
          onClientUpdated={(updated) => setClient(updated)}
          showToast={showToast}
        />
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: WEBSITE STUDIO SHORTCUT CARD */}
      {/* ========================================================================= */}
      {workspaceTab === 'Website demo' && client && (
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-black/5 shadow-xs space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-black/5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FFF5F6] text-[#D92D50] flex items-center justify-center">
                  <Globe size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-[#111111]">Website Studio Project</h3>
                    {clientWebsiteProjects.length > 0 && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        clientWebsiteProjects[0].status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : clientWebsiteProjects[0].status === 'Changes requested'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : clientWebsiteProjects[0].status === 'Shared'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : clientWebsiteProjects[0].status === 'Exported'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}>
                        {clientWebsiteProjects[0].status} (v{clientWebsiteProjects[0].version})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    Website concepts, live previews, and client feedback are now managed centrally in Website Studio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenWebsiteStudio) {
                    onOpenWebsiteStudio(clientWebsiteProjects[0]?.id);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Globe size={14} />
                <span>Open in Website Studio &rarr;</span>
              </button>
            </div>

            {clientWebsiteProjects.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-[#FAFBFD] rounded-2xl border border-black/5 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Project Name:</span>
                      <strong className="text-[#111111]">{clientWebsiteProjects[0].title}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Current Status:</span>
                      <strong className="text-[#111111]">{clientWebsiteProjects[0].status}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Version:</span>
                      <strong className="text-[#111111] font-mono">v{clientWebsiteProjects[0].version}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B6B6B]">Last Updated:</span>
                      <span className="text-[#111111]">
                        {clientWebsiteProjects[0].updatedAt
                          ? new Date(clientWebsiteProjects[0].updatedAt).toLocaleDateString()
                          : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {clientWebsiteProjects[0].clientFeedback && (
                    <div className="p-4 bg-[#FEF6EE] border border-[#FEE4E2] text-[#B54708] rounded-2xl space-y-1">
                      <strong className="block text-xs font-bold">Client Requested Changes:</strong>
                      <p className="italic text-xs leading-relaxed">"{clientWebsiteProjects[0].clientFeedback}"</p>
                    </div>
                  )}

                  <p className="text-xs text-[#6B6B6B] leading-relaxed">
                    The standalone Website Studio provides complete 4-step editing, template selection, auto-contrast, logo colour extraction, creative shuffle variation, and clean production ZIP exports.
                  </p>
                </div>

                {/* Sandboxed Miniature Preview */}
                <div className="bg-[#FAFBFD] rounded-2xl p-4 border border-black/5 flex flex-col items-center">
                  <div className="w-full h-64 rounded-xl overflow-hidden border border-black/10 bg-white shadow-2xs">
                    <iframe
                      title="Website Concept Preview"
                      srcDoc={clientWebsiteProjects[0].renderedHtml}
                      sandbox=""
                      className="w-full h-full border-none pointer-events-none scale-90 origin-top"
                    />
                  </div>
                  <span className="text-[11px] text-[#6B6B6B] mt-2 font-medium">
                    Sandboxed interactive preview (v{clientWebsiteProjects[0].version})
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <Globe size={32} className="mx-auto text-[#98A2B3]" />
                <h4 className="text-sm font-bold text-[#111111]">No Website Project Created Yet</h4>
                <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">
                  Launch the Website Studio builder to create a personalized demo website for {client.businessName}.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenWebsiteStudio?.()}
                  className="px-4 py-2 bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create Website in Website Studio</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: FILES REPOSITORY */}
      {/* ========================================================================= */}
      {workspaceTab === 'Files' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {['all', 'Brand', 'Photos', 'Content', 'Legal', 'Reports', 'Deliverables'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFileFolderFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    fileFolderFilter === f
                      ? 'bg-[#111111] text-white shadow-2xs'
                      : 'bg-white text-[#6B6B6B] border border-black/5 hover:text-[#111111]'
                  }`}
                >
                  <span>{f === 'all' ? 'All Folders' : f}</span>
                </button>
              ))}
            </div>
            <span className="text-xs text-[#6B6B6B]">{files.length} clinic assets</span>
          </div>

          <div className="bg-white rounded-[24px] border border-black/5 p-4 shadow-xs">
            <div className="divide-y divide-black/5 text-xs">
              {files
                .filter((fl) => fileFolderFilter === 'all' || fl.folder === fileFolderFilter)
                .map((file) => (
                  <div key={file.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center font-bold">
                        <FileText size={15} />
                      </div>
                      <div>
                        <div className="font-bold text-[#111111]">{file.name}</div>
                        <div className="text-[11px] text-[#A8A5A5]">
                          Folder: {file.folder} · {(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB · Direction: {file.direction}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#6B6B6B]">Uploaded {file.uploadedAt} by {file.uploadedBy}</span>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Simulated preview/download for ${file.name}`);
                        }}
                        className="px-3 py-1 rounded-full bg-[#F1EFEF] hover:bg-[#E7E2E2] text-[#111111] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: MEETINGS */}
      {/* ========================================================================= */}
      {workspaceTab === 'Meetings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map((meet) => (
              <div
                key={meet.id}
                className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FCE9ED] text-[#D92D50] text-[10px] font-bold uppercase tracking-wider">
                      {meet.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        meet.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {meet.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-[#111111] mb-1">{meet.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B] mb-2">
                    <Calendar size={13} />
                    <span>{new Date(meet.startsAt).toLocaleString()} ({meet.durationMin} mins)</span>
                  </div>

                  <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
                    <strong>Agenda:</strong> {meet.agenda}
                  </p>

                  {meet.summary && (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-[#111111] mb-2">
                      <span className="font-bold block mb-0.5">Meeting Summary:</span>
                      {meet.summary}
                    </div>
                  )}

                  {/* Action Items */}
                  {meet.actionItems.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#A8A5A5] uppercase tracking-wider">
                        Action Items
                      </span>
                      {meet.actionItems.map((ai, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#111111]">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>{ai}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                  <span className="text-[11px] text-[#A8A5A5]">Attendees: {meet.attendees.join(', ')}</span>
                  {meet.link && (
                    <a
                      href={meet.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold bg-[#111111] text-white rounded-full hover:bg-black"
                    >
                      <Video size={12} />
                      <span>Join Meet</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: TICKETS */}
      {/* ========================================================================= */}
      {workspaceTab === 'Tickets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {tickets.map((tick) => (
              <div
                key={tick.id}
                className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-[#111111] text-white text-[10px] font-bold">
                        {tick.type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tick.scope === 'Extra cost'
                            ? 'bg-[#FCE9ED] text-[#D92D50]'
                            : 'bg-gray-100 text-[#6B6B6B]'
                        }`}
                      >
                        {tick.scope} {tick.extraCostEUR ? `(€${tick.extraCostEUR})` : ''}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tick.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tick.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[#111111]">{tick.title}</h4>
                  </div>

                  {tick.status !== 'Resolved' && (
                    <button
                      type="button"
                      onClick={() => handleResolveTicket(tick.id)}
                      className="px-3.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  {tick.description}
                </p>

                {tick.resolutionNote && (
                  <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900">
                    <strong>Resolution:</strong> {tick.resolutionNote}
                  </div>
                )}

                {/* Ticket Comments Thread */}
                {tick.comments.length > 0 && (
                  <div className="pt-2 border-t border-black/5 space-y-2">
                    {tick.comments.map((cm) => (
                      <div
                        key={cm.id}
                        className={`text-xs p-2.5 rounded-xl ${
                          cm.isInternalOnly ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#A8A5A5] mb-1">
                          <span className="font-bold text-[#111111]">
                            {cm.authorName} {cm.isInternalOnly ? '(Internal Note)' : ''}
                          </span>
                          <span>{cm.createdAt}</span>
                        </div>
                        <div className="text-[#111111]">{cm.text}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment on Ticket */}
                <div className="pt-2 border-t border-black/5 flex items-center gap-2">
                  <input
                    type="text"
                    value={ticketCommentInputs[tick.id] || ''}
                    onChange={(e) =>
                      setTicketCommentInputs({ ...ticketCommentInputs, [tick.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendTicketComment(tick.id);
                    }}
                    placeholder="Write comment or resolution update..."
                    className="flex-1 px-3.5 py-1.5 text-xs bg-[#F1EFEF] rounded-full border border-black/10 focus:outline-none focus:border-[#D92D50]"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-[#6B6B6B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={() => setIsInternalComment(!isInternalComment)}
                      className="accent-[#D92D50]"
                    />
                    <span>Internal</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSendTicketComment(tick.id)}
                    className="p-1.5 rounded-full bg-[#111111] text-white hover:bg-black cursor-pointer"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 7: BILLING */}
      {/* ========================================================================= */}
      {workspaceTab === 'Billing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Invoices List */}
            <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
                Issued Invoices ({invoices.length})
              </h3>
              <div className="divide-y divide-black/5 text-xs">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#111111]">{inv.number}</div>
                      <div className="text-[11px] text-[#A8A5A5]">Due: {inv.dueDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#111111] tabular-nums">€{inv.total}</div>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments List */}
            <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-[#111111] uppercase tracking-wider">
                Received Payments ({payments.length})
              </h3>
              <div className="divide-y divide-black/5 text-xs">
                {payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#111111]">{p.kind} via {p.method}</div>
                      <div className="text-[11px] text-[#A8A5A5]">Paid on {p.paidAt}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 tabular-nums">+€{p.amountEUR}</div>
                      <div className="text-[10px] text-[#A8A5A5] tabular-nums">{p.amountBDT?.toLocaleString()} BDT</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: REFERRALS */}
      {/* ========================================================================= */}
      {workspaceTab === 'Referrals' && client && (
        <ClientReferralsAdminTab
          client={client}
          currentRole="Admin"
          showToast={showToast}
          onClientUpdated={loadAllClientData}
        />
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: CLIENT PORTAL FEATURE CONTROL & SETTINGS */}
      {/* ========================================================================= */}
      {(workspaceTab === 'Portal settings' || (workspaceTab as string) === 'Portal') && client && (
        <ClientPortalFeatureMatrixTab
          client={client}
          currentRole="Admin"
          showToast={showToast}
          onClientUpdated={loadAllClientData}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW REQUEST */}
      {/* ========================================================================= */}
      {newRequestModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <h3 className="text-base font-bold text-[#111111] mb-3">Create Asset Request</h3>
            <form onSubmit={handleCreateRequestSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Request Title</label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="e.g. Clinic Interior Photos (5+ high-res)"
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Request Type</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value as RequestType)}
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                >
                  {(['Logo', 'Photos', 'Copy/Text', 'GBP access', 'Domain access', 'Information', 'Approval'] as RequestType[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Instructions / Description</label>
                <textarea
                  rows={3}
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  placeholder="Explain exactly what the client should provide..."
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={reqDeadline}
                  onChange={(e) => setReqDeadline(e.target.value)}
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setNewRequestModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold rounded-full"
                >
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SCHEDULE MEETING */}
      {/* ========================================================================= */}
      {newMeetingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <h3 className="text-base font-bold text-[#111111] mb-3">Schedule Client Meeting</h3>
            <form onSubmit={handleCreateMeetingSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  placeholder="e.g. Monthly SEO Review"
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Meeting Type</label>
                <select
                  value={meetType}
                  onChange={(e) => setMeetType(e.target.value as MeetingType)}
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                >
                  {(['Kickoff', 'Review', 'Strategy', 'Support'] as MeetingType[]).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={meetStartsAt}
                    onChange={(e) => setMeetStartsAt(e.target.value)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Duration</label>
                  <select
                    value={meetDuration}
                    onChange={(e) => setMeetDuration(parseInt(e.target.value))}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Agenda Items</label>
                <textarea
                  rows={3}
                  value={meetAgenda}
                  onChange={(e) => setMeetAgenda(e.target.value)}
                  placeholder="Review monthly keyword rankings, conversion rate..."
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setNewMeetingModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-full"
                >
                  Save Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW TICKET */}
      {/* ========================================================================= */}
      {newTicketModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <h3 className="text-base font-bold text-[#111111] mb-3">Create Support Ticket</h3>
            <form onSubmit={handleCreateTicketSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Ticket Title</label>
                <input
                  type="text"
                  required
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="e.g. Update emergency contact phone number"
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Type</label>
                  <select
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value as TicketType)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    {(['Change', 'Bug', 'Question', 'Complaint'] as TicketType[]).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as any)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Scope</label>
                  <select
                    value={ticketScope}
                    onChange={(e) => setTicketScope(e.target.value as any)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value="In package">In package</option>
                    <option value="Extra cost">Extra cost (Add-on)</option>
                  </select>
                </div>

                {ticketScope === 'Extra cost' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">Cost (€ EUR)</label>
                    <input
                      type="number"
                      value={ticketExtraCost}
                      onChange={(e) => setTicketExtraCost(parseInt(e.target.value) || 0)}
                      className="w-full p-2 text-xs border border-black/10 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Detail the clinic change request..."
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setNewTicketModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold rounded-full"
                >
                  Log Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD FILE */}
      {/* ========================================================================= */}
      {uploadFileModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <h3 className="text-base font-bold text-[#111111] mb-3">Upload Clinic File</h3>
            <form onSubmit={handleUploadFileSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Q4_Growth_Audit_Report.pdf"
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Target Folder</label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value as FileFolder)}
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                >
                  {(['Brand', 'Photos', 'Content', 'Legal', 'Reports', 'Deliverables'] as FileFolder[]).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setUploadFileModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-full"
                >
                  Confirm Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111111] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Manage Credentials Modal */}
      {manageCredOpen && (
        <ManageCredentialModal
          isOpen={true}
          onClose={() => setManageCredOpen(false)}
          loginId={client.portalUserEmail || `${client.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}@openhours.ie`}
          entityName={client.businessName}
          roleLabel="Client Practice"
          onCredentialUpdated={loadAllClientData}
        />
      )}
    </div>
  );
};
