import React, { useState, useEffect } from 'react';
import {
  Application,
  ApplicationStatus,
  ClientPackage,
  ClinicSpecialty,
  Client,
  Lead,
  SuppressionEntry,
} from '../../types/index.ts';
import {
  getApplications,
  updateApplicationStatus,
  updateApplicationInternalNote,
  checkApplicationConflicts,
  approveApplication,
} from '../../data/repo.ts';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  X,
  FileText,
  Mail,
  Phone,
  Building,
  Globe,
  Tag,
  Calendar,
  AlertCircle,
  Check,
  Ban,
  UserCheck,
  MessageSquare,
  Sparkles,
  Gift,
} from 'lucide-react';

interface ApplicationsManagerProps {
  onClientCreated?: () => void;
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

export const ApplicationsManager: React.FC<ApplicationsManagerProps> = ({
  onClientCreated,
  onOpenClientWorkspace,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Selected for Drawer
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Drawer Note edit state
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Conflict warnings state for selectedApp
  const [conflicts, setConflicts] = useState<{
    existingClient: Client | null;
    existingLead: Lead | null;
    suppressionMatch: { suppressed: boolean; matchedEntry?: SuppressionEntry };
  } | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Approve Modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ClientPackage>('Regular');
  const [selectedSpecialty, setSelectedSpecialty] = useState<ClinicSpecialty>('Dental');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [createdClientInfo, setCreatedClientInfo] = useState<{ id: string; name: string } | null>(null);

  // Reject Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When drawer application changes, load note and conflict checks
  useEffect(() => {
    if (!selectedApp) {
      setConflicts(null);
      setNoteText('');
      return;
    }
    setNoteText(selectedApp.internalNote || '');
    setNoteSuccess(false);

    // Initialise default specialty from niche
    const nicheLower = selectedApp.niche.toLowerCase();
    if (nicheLower.includes('dent') || nicheLower.includes('ortho')) setSelectedSpecialty('Dental');
    else if (nicheLower.includes('physio')) setSelectedSpecialty('Physio');
    else if (nicheLower.includes('chiro')) setSelectedSpecialty('Chiropractic');
    else if (nicheLower.includes('aesthet') || nicheLower.includes('skin')) setSelectedSpecialty('Aesthetics');
    else setSelectedSpecialty('Other');

    // Run conflict check
    let active = true;
    setCheckingConflicts(true);
    checkApplicationConflicts(selectedApp.email, selectedApp.businessName)
      .then((res) => {
        if (active) {
          setConflicts(res);
          setCheckingConflicts(false);
        }
      })
      .catch(() => {
        if (active) setCheckingConflicts(false);
      });

    return () => {
      active = false;
    };
  }, [selectedApp]);

  // Derived filter options
  const uniqueSources = Array.from(
    new Set(applications.map((a) => a.source || 'Website').filter(Boolean))
  );

  const filteredApplications = applications.filter((app) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        app.businessName.toLowerCase().includes(q) ||
        app.contactName.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.referenceCode.toLowerCase().includes(q) ||
        app.niche.toLowerCase().includes(q) ||
        (app.phone && app.phone.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false;
    }

    // Source filter
    if (sourceFilter !== 'all' && (app.source || 'Website') !== sourceFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const appDate = new Date(app.createdAt).getTime();
      const now = Date.now();
      if (dateFilter === 'today') {
        if (now - appDate > 86400000) return false;
      } else if (dateFilter === '7days') {
        if (now - appDate > 7 * 86400000) return false;
      } else if (dateFilter === '30days') {
        if (now - appDate > 30 * 86400000) return false;
      }
    }

    return true;
  });

  // KPI stats
  const totalCount = applications.length;
  const receivedCount = applications.filter((a) => a.status === 'Received').length;
  const underReviewCount = applications.filter((a) => a.status === 'Under review').length;
  const approvedCount = applications.filter((a) => a.status === 'Approved').length;

  // Actions
  const handleMarkUnderReview = async () => {
    if (!selectedApp) return;
    try {
      const updated = await updateApplicationStatus(selectedApp.id, 'Under review', 'Admin');
      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Application marked as Under Review.`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update status.');
    }
  };

  const handleMarkSpam = async () => {
    if (!selectedApp) return;
    if (!window.confirm(`Mark "${selectedApp.businessName}" as Spam?`)) return;
    try {
      const updated = await updateApplicationStatus(selectedApp.id, 'Spam', 'Admin', 'Marked as spam');
      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Application marked as Spam.`);
    } catch (err: any) {
      alert(err?.message || 'Failed to update status.');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedApp) return;
    try {
      setRejecting(true);
      const updated = await updateApplicationStatus(
        selectedApp.id,
        'Rejected',
        'Admin',
        rejectReason.trim() || undefined
      );
      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setRejectModalOpen(false);
      setRejectReason('');
      showToast(`Application rejected. Status page displays generic "Not accepted".`);
    } catch (err: any) {
      alert(err?.message || 'Failed to reject application.');
    } finally {
      setRejecting(false);
    }
  };

  const handleSaveInternalNote = async () => {
    if (!selectedApp) return;
    try {
      setSavingNote(true);
      const updated = await updateApplicationInternalNote(selectedApp.id, noteText, 'Admin');
      setSelectedApp(updated);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 2000);
      showToast('Internal note saved.');
    } catch (err: any) {
      alert(err?.message || 'Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!selectedApp) return;
    setApproveError(null);
    try {
      setApproving(true);
      const result = await approveApplication(selectedApp.id, 'Admin', {
        package: selectedPackage,
        specialty: selectedSpecialty,
      });

      setSelectedApp(result.application);
      setApplications((prev) =>
        prev.map((a) => (a.id === result.application.id ? result.application : a))
      );
      setCreatedClientInfo({ id: result.client.id, name: result.client.businessName });
      setApproveModalOpen(false);
      showToast(`Application approved! Client "${result.client.businessName}" created.`);
      if (onClientCreated) onClientCreated();
    } catch (err: any) {
      setApproveError(err?.message || 'Failed to approve application.');
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'Received':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0F9FF] text-[#026AA2] border border-[#B9E6FE]">
            <Clock size={12} />
            <span>Received</span>
          </span>
        );
      case 'Under review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF4E5] text-[#B54708] border border-[#FEE4C2]">
            <Clock size={12} />
            <span>Under review</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E7F8EF] text-[#099250] border border-[#A6F4C5]">
            <CheckCircle2 size={12} />
            <span>Approved</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEECEB] text-[#D92D50] border border-[#FECDCA]">
            <X size={12} />
            <span>Rejected</span>
          </span>
        );
      case 'Spam':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F2F4F7] text-[#475467] border border-[#EAECF0]">
            <Ban size={12} />
            <span>Spam</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#101828] text-white px-4 py-3 rounded-[12px] shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-[#12B76A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Received */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">New Received</span>
            <div className="w-7 h-7 rounded-[8px] bg-rose-50 text-[#D92D50] flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-semibold text-[#101828] leading-tight">
              {receivedCount}
            </div>
            <span className="text-[12px] text-[#667085] mt-1 block">Awaiting initial review</span>
          </div>
        </div>

        {/* KPI 2: Under Review */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">Under Review</span>
            <div className="w-7 h-7 rounded-[8px] bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-semibold text-[#101828] leading-tight">
              {underReviewCount}
            </div>
            <span className="text-[12px] text-[#667085] mt-1 block">In qualification</span>
          </div>
        </div>

        {/* KPI 3: Approved */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">Approved & Onboarded</span>
            <div className="w-7 h-7 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-semibold text-[#101828] leading-tight">
              {approvedCount}
            </div>
            <span className="text-[12px] text-[#667085] mt-1 block">Converted into active clients</span>
          </div>
        </div>

        {/* KPI 4: Total Submissions */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">Total Submissions</span>
            <div className="w-7 h-7 rounded-[8px] bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-semibold text-[#101828] leading-tight">
              {totalCount}
            </div>
            <span className="text-[12px] text-[#667085] mt-1 block">All recorded intake leads</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-[16px] p-4 border border-[#ECEEF2] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-[#98A2B3]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by practice, contact, email, reference, or niche..."
            className="w-full h-9 pl-9 pr-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
          />
        </div>

        {/* Select Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#344054] font-medium focus:border-[#D92D50] focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses ({applications.length})</option>
            <option value="Received">Received ({receivedCount})</option>
            <option value="Under review">Under review ({underReviewCount})</option>
            <option value="Approved">Approved ({approvedCount})</option>
            <option value="Rejected">Rejected</option>
            <option value="Spam">Spam</option>
          </select>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#344054] font-medium focus:border-[#D92D50] focus:outline-none cursor-pointer"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#344054] font-medium focus:border-[#D92D50] focus:outline-none cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Past 7 days</option>
            <option value="30days">Past 30 days</option>
          </select>

          {(searchQuery || statusFilter !== 'all' || sourceFilter !== 'all' || dateFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSourceFilter('all');
                setDateFilter('all');
              }}
              className="h-9 px-3 text-xs font-semibold text-[#D92D50] hover:text-[#B82340] cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-[20px] border border-[#ECEEF2] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[14px] text-[#667085]">
            Loading application submissions...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="py-16 text-center space-y-3 p-6">
            <div className="w-12 h-12 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center mx-auto">
              <FileText size={22} />
            </div>
            <h3 className="text-[16px] font-bold text-[#101828]">No applications found</h3>
            <p className="text-[13px] text-[#667085] max-w-sm mx-auto">
              {applications.length === 0
                ? 'No website intake submissions received yet. Applications will appear here when visitors complete the /apply form.'
                : 'No submissions matched your filter criteria. Try clearing search or status filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#FAFBFD] border-b border-[#ECEEF2] text-[#667085] font-semibold text-[11.5px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Reference & Date</th>
                  <th className="py-3 px-4">Business & Contact</th>
                  <th className="py-3 px-4">Specialty & Country</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF2]">
                {filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="hover:bg-[#FAFBFD] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#101828]">{app.referenceCode}</div>
                      <div className="text-[11.5px] text-[#667085] mt-0.5">
                        {app.createdAt.split('T')[0]}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#101828] group-hover:text-[#D92D50] transition-colors">
                          {app.businessName}
                        </span>
                        {app.referralCode && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FCE9ED] text-[#D92D50] border border-[#D92D50]/20">
                            <Gift size={10} />
                            <span>Referral</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#667085] flex items-center gap-2 mt-0.5">
                        <span>{app.contactName}</span>
                        <span>·</span>
                        <span className="truncate max-w-[180px]">{app.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#101828]">{app.niche}</div>
                      <div className="text-[11.5px] text-[#667085] mt-0.5">
                        {app.country || 'Ireland'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#F2F4F7] text-[#344054]">
                        {app.source || 'Website'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApp(app);
                        }}
                        className="px-3 py-1.5 rounded-[8px] bg-[#F8F9FA] hover:bg-[#F2F4F7] text-[#344054] text-xs font-semibold cursor-pointer border border-[#EAECF0] transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#ECEEF2] flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                    {selectedApp.referenceCode}
                  </span>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <h2 className="text-[20px] font-bold text-[#101828] mt-1">
                  {selectedApp.businessName}
                </h2>
                <div className="text-xs text-[#667085] mt-0.5">
                  Submitted {new Date(selectedApp.createdAt).toLocaleString()} · Source:{' '}
                  <strong>{selectedApp.source || 'Website'}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full hover:bg-[#F2F4F7] text-[#667085] flex items-center justify-center transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Conflict Warnings Strip */}
              {checkingConflicts ? (
                <div className="p-3 bg-[#F8F9FA] rounded-[12px] text-xs text-[#667085] text-center">
                  Checking client, lead, and suppression databases...
                </div>
              ) : (
                conflicts && (
                  <div className="space-y-2">
                    {/* Suppression Alert */}
                    {conflicts.suppressionMatch.suppressed && (
                      <div className="p-3.5 bg-[#FEECEB] border border-[#FECDCA] rounded-[12px] text-xs text-[#D92D50] flex items-start gap-2.5">
                        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Suppression List Match!</strong>
                          <span>
                            This email is on the suppression list (
                            {conflicts.suppressionMatch.matchedEntry?.reason || 'Opted out'}).
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Existing Client Alert */}
                    {conflicts.existingClient && (
                      <div className="p-3.5 bg-[#FFF4E5] border border-[#FEE4C2] rounded-[12px] text-xs text-[#B54708] flex items-start gap-2.5">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Existing Client Match</strong>
                          <span>
                            Business is already an active client (
                            {conflicts.existingClient.businessName} - ID:{' '}
                            {conflicts.existingClient.id}).
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Existing Lead Match */}
                    {conflicts.existingLead && (
                      <div className="p-3.5 bg-[#F0F9FF] border border-[#B9E6FE] rounded-[12px] text-xs text-[#026AA2] flex items-start gap-2.5">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Existing Lead Match</strong>
                          <span>
                            Lead is in pipeline ({conflicts.existingLead.businessName} - Stage:{' '}
                            {conflicts.existingLead.stage}).
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Applicant Information Section */}
              <div className="bg-[#FAFBFD] rounded-[16px] p-4 border border-[#ECEEF2] space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475467]">
                  Applicant Information
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#667085] block">Contact Person</span>
                    <span className="font-semibold text-[#101828] text-[13px] block mt-0.5">
                      {selectedApp.contactName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#667085] block">Specialty / Niche</span>
                    <span className="font-semibold text-[#101828] text-[13px] block mt-0.5">
                      {selectedApp.niche}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#667085] block">Email Address</span>
                    <a
                      href={`mailto:${selectedApp.email}`}
                      className="font-semibold text-[#D92D50] text-[13px] hover:underline block mt-0.5 truncate"
                    >
                      {selectedApp.email}
                    </a>
                  </div>

                  <div>
                    <span className="text-[#667085] block">Phone</span>
                    <span className="font-semibold text-[#101828] text-[13px] block mt-0.5">
                      {selectedApp.phone || 'Not provided'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#667085] block">Country</span>
                    <span className="font-semibold text-[#101828] text-[13px] block mt-0.5">
                      {selectedApp.country || 'Ireland'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#667085] block">Current Website</span>
                    {selectedApp.currentWebsite ? (
                      <a
                        href={selectedApp.currentWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#D92D50] text-[13px] hover:underline inline-flex items-center gap-1 mt-0.5 truncate"
                      >
                        <span className="truncate max-w-[140px]">{selectedApp.currentWebsite}</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-[#98A2B3] italic mt-0.5 block">None</span>
                    )}
                  </div>
                </div>

                {/* What you need text */}
                <div className="pt-2 border-t border-[#ECEEF2]">
                  <span className="text-[#667085] text-xs block mb-1">
                    What they need (Business Goals)
                  </span>
                  <p className="text-[13px] text-[#101828] leading-relaxed bg-white p-3 rounded-[10px] border border-[#EAECF0] whitespace-pre-wrap">
                    {selectedApp.needs || 'No additional details provided.'}
                  </p>
                </div>

                {/* Referral Code */}
                {selectedApp.referralCode && (
                  <div className="pt-2 border-t border-[#ECEEF2] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[#667085] text-xs block font-medium">
                          Referral Program Attribution
                        </span>
                        <span className="text-[11px] text-[#667085]">
                          Applicant submitted via referral invitation
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs px-2.5 py-1 bg-[#FCE9ED] text-[#D92D50] rounded-lg border border-[#FECDCA]">
                        {selectedApp.referralCode}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-[10px] bg-[#FAFBFD] border border-[#ECEEF2] text-[11.5px] text-[#344054]">
                      On approval, this new client will receive their onboarding friend reward free month(s). The referring client will be credited after first paid invoice.
                    </div>
                  </div>
                )}
              </div>

              {/* Status & Decision History */}
              {selectedApp.decidedAt && (
                <div className="p-3.5 bg-[#FAFBFD] rounded-[14px] border border-[#ECEEF2] text-xs space-y-1">
                  <div className="text-[#667085]">
                    Decided by <strong>{selectedApp.decidedBy || 'Admin'}</strong> on{' '}
                    {new Date(selectedApp.decidedAt).toLocaleString()}
                  </div>
                  {selectedApp.decisionReason && (
                    <div className="text-[#101828] mt-1 font-medium">
                      Reason / Notes: {selectedApp.decisionReason}
                    </div>
                  )}
                  {selectedApp.createdClientId && (
                    <div className="text-[#099250] font-semibold mt-1 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>Linked Client ID: {selectedApp.createdClientId}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Internal Notes Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#475467]">
                    Internal Team Note (Private)
                  </label>
                  {noteSuccess && (
                    <span className="text-xs text-[#099250] font-semibold flex items-center gap-1">
                      <Check size={12} /> Saved
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add private verification notes, discovery call details, or partner terms..."
                  className="w-full p-3 rounded-[12px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleSaveInternalNote}
                  disabled={savingNote}
                  className="px-3.5 py-1.5 rounded-[8px] bg-[#101828] hover:bg-[#1D2939] text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  {savingNote ? 'Saving Note...' : 'Save Note'}
                </button>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-5 border-t border-[#ECEEF2] bg-[#FAFBFD] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {selectedApp.status === 'Received' && (
                  <button
                    type="button"
                    onClick={handleMarkUnderReview}
                    className="px-3.5 py-2 rounded-[10px] bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] text-[#344054] text-xs font-semibold cursor-pointer transition-colors min-h-[36px]"
                  >
                    Mark Under Review
                  </button>
                )}

                {selectedApp.status !== 'Spam' && selectedApp.status !== 'Approved' && (
                  <button
                    type="button"
                    onClick={handleMarkSpam}
                    className="px-3 py-2 rounded-[10px] text-[#667085] hover:text-[#D92D50] hover:bg-[#FEECEB] text-xs font-semibold cursor-pointer transition-colors min-h-[36px]"
                  >
                    Mark Spam
                  </button>
                )}

                {selectedApp.status !== 'Rejected' && selectedApp.status !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectReason('');
                      setRejectModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-[10px] text-[#D92D50] hover:bg-[#FEECEB] text-xs font-semibold cursor-pointer transition-colors min-h-[36px]"
                  >
                    Reject
                  </button>
                )}
              </div>

              {selectedApp.status === 'Approved' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#099250] flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Approved & Onboarded
                  </span>
                  {selectedApp.createdClientId && onOpenClientWorkspace && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenClientWorkspace(
                          selectedApp.createdClientId!,
                          selectedApp.businessName
                        )
                      }
                      className="px-3 py-2 rounded-[10px] bg-[#D92D50] text-white text-xs font-semibold cursor-pointer hover:bg-[#B82340] min-h-[36px] flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setApproveError(null);
                    setApproveModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-[10px] bg-[#099250] hover:bg-[#077a42] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors min-h-[36px] flex items-center gap-1.5"
                >
                  <UserCheck size={15} />
                  <span>Approve & Onboard Client</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {approveModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF2]">
              <div>
                <h3 className="text-[17px] font-bold text-[#101828]">
                  Approve Application & Provision Client
                </h3>
                <span className="text-xs text-[#667085]">
                  {selectedApp.businessName} ({selectedApp.referenceCode})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F2F4F7] text-[#667085] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {approveError && (
              <div className="p-3.5 bg-[#FEECEB] border border-[#FECDCA] rounded-[12px] text-xs text-[#D92D50] flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{approveError}</span>
              </div>
            )}

            {/* Conflicts Warnings in Approve Dialog */}
            {conflicts && (conflicts.suppressionMatch.suppressed || conflicts.existingClient || conflicts.existingLead) && (
              <div className="p-3.5 bg-[#FFF4E5] border border-[#FEE4C2] rounded-[12px] text-xs text-[#B54708] space-y-1">
                <strong className="block font-bold">Important Notice:</strong>
                {conflicts.suppressionMatch.suppressed && (
                  <div>• Email is on Suppression List ({conflicts.suppressionMatch.matchedEntry?.reason}).</div>
                )}
                {conflicts.existingClient && (
                  <div>• Email matches existing active client: {conflicts.existingClient.businessName}.</div>
                )}
                {conflicts.existingLead && (
                  <div>• Email matches lead in pipeline: {conflicts.existingLead.businessName}.</div>
                )}
              </div>
            )}

            {/* Package selector */}
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                Onboarding Client Package
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Regular', 'Advanced', 'Premium'] as ClientPackage[]).map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`py-2 px-3 rounded-[10px] text-xs font-semibold border cursor-pointer transition-all text-center ${
                      selectedPackage === pkg
                        ? 'border-[#D92D50] bg-[#FFF5F6] text-[#D92D50] ring-1 ring-[#D92D50]'
                        : 'border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {pkg}
                  </button>
                ))}
              </div>
            </div>

            {/* Specialty Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                Clinic Specialty Classification
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value as ClinicSpecialty)}
                className="w-full h-10 px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:outline-none cursor-pointer"
              >
                <option value="Dental">Dental Practice</option>
                <option value="Physio">Physiotherapy</option>
                <option value="Chiropractic">Chiropractic</option>
                <option value="Aesthetics">Aesthetics & Dermatology</option>
                <option value="Private clinic">Private Clinic</option>
                <option value="Other">Other Specialty</option>
              </select>
            </div>

            {/* Note about credentials */}
            <div className="p-3.5 bg-[#FAFBFD] rounded-[12px] border border-[#ECEEF2] text-xs text-[#667085] leading-relaxed">
              <strong className="block text-[#101828] font-semibold mb-0.5">
                Portal Access & Credentials
              </strong>
              Portal access will be sent after Supabase invites are live. Login credentials are
              NOT created here and passwords are never stored.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECEEF2]">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 rounded-[10px] border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleConfirmApprove}
                className="px-4 py-2 rounded-[10px] bg-[#099250] hover:bg-[#077a42] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
              >
                {approving ? 'Creating Client...' : 'Confirm & Approve Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#ECEEF2]">
              <h3 className="text-[17px] font-bold text-[#101828]">Reject Application</h3>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F2F4F7] text-[#667085] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#475467] leading-relaxed">
              Rejecting this application will update internal records. The applicant will only see
              the generic <strong>"Not accepted"</strong> status on their public status page.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Optional Internal Reason (Not shown to applicant)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Clinic out of target geography, non-qualifying package inquiry..."
                className="w-full p-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECEEF2]">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-[10px] border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
              >
                {rejecting ? 'Rejecting...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
