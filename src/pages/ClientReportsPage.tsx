import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Plus,
  Send,
  Edit,
  History,
  TrendingUp,
  Search,
  ExternalLink,
  Building,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  Client,
  ClientMonthlyReport,
  MetricSource,
  MonthlyReportMetric,
} from '../types/index.ts';
import {
  getAllMonthlyReportsOverview,
  getAllMonthlyReports,
  getClientMonthlyReports,
  saveMonthlyReportDraft,
  publishMonthlyReport,
  createMonthlyReportCorrection,
  updateClientReportSchedule,
  getClients,
} from '../data/repo.ts';

interface ClientReportsPageProps {
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
  onOpenPortalPreview?: (clientId: string) => void;
}

interface ReportOverviewRow {
  client: Client;
  latestReport: ClientMonthlyReport | null;
  nextDue: string;
  status: 'Draft' | 'Published' | 'Overdue';
  isOverdue: boolean;
}

export const ClientReportsPage: React.FC<ClientReportsPageProps> = ({
  onOpenClientWorkspace,
  onOpenPortalPreview,
}) => {
  const [rows, setRows] = useState<ReportOverviewRow[]>([]);
  const [allReports, setAllReports] = useState<ClientMonthlyReport[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<'schedule' | 'all-reports'>('schedule');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Draft' | 'Published' | 'Overdue'>('all');

  // Schedule modal state
  const [editingScheduleClient, setEditingScheduleClient] = useState<Client | null>(null);
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleNextDue, setScheduleNextDue] = useState<string>('');

  // Report editor modal state
  const [editorClient, setEditorClient] = useState<Client | null>(null);
  const [editorMonth, setEditorMonth] = useState<string>('2026-10');
  const [clientReports, setClientReports] = useState<ClientMonthlyReport[]>([]);
  const [activeReport, setActiveReport] = useState<ClientMonthlyReport | null>(null);
  const [prevReport, setPrevReport] = useState<ClientMonthlyReport | null>(null);

  // Form fields
  const [visitors, setVisitors] = useState<number>(0);
  const [visitorsSource, setVisitorsSource] = useState<MetricSource>('GA4');
  const [enquiries, setEnquiries] = useState<number>(0);
  const [enquiriesSource, setEnquiriesSource] = useState<MetricSource>('GA4');
  const [profileViews, setProfileViews] = useState<number>(0);
  const [profileViewsSource, setProfileViewsSource] = useState<MetricSource>('Google Business Profile');
  const [calls, setCalls] = useState<number>(0);
  const [callsSource, setCallsSource] = useState<MetricSource>('Google Business Profile');
  const [directionRequests, setDirectionRequests] = useState<number>(0);
  const [directionRequestsSource, setDirectionRequestsSource] = useState<MetricSource>('Google Business Profile');
  const [bookings, setBookings] = useState<number | undefined>(undefined);
  const [bookingsSource, setBookingsSource] = useState<MetricSource>('Manual');
  const [topPages, setTopPages] = useState<string>('');
  const [whatWeDid, setWhatWeDid] = useState<string[]>(['', '']);
  const [nextMonthPlan, setNextMonthPlan] = useState<string[]>(['', '']);
  const [shortNote, setShortNote] = useState<string>('');

  // Correction state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [overviewData, reportsData, clientsData] = await Promise.all([
        getAllMonthlyReportsOverview(),
        getAllMonthlyReports(),
        getClients(),
      ]);
      setRows(overviewData || []);
      setAllReports(reportsData || []);
      setClientsList(clientsData || []);
    } catch (err: any) {
      console.error('Failed to load monthly reports:', err);
      setLoadError(err?.message || 'Failed to load monthly reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered rows for Schedule Overview
  const filteredRows = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const bName = (r.client?.businessName || '').toLowerCase();
      const city = (r.client?.city || '').toLowerCase();
      const country = (r.client?.country || '').toLowerCase();
      return bName.includes(q) || city.includes(q) || country.includes(q);
    }
    return true;
  });

  // Filtered rows for All Monthly Reports
  const filteredAllReports = allReports.filter((rep) => {
    if (statusFilter !== 'all' && rep.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const client = clientsList.find((c) => c.id === rep.clientId || `client-${c.id}` === rep.clientId);
      const bName = (client?.businessName || '').toLowerCase();
      const city = (client?.city || '').toLowerCase();
      const month = (rep.month || '').toLowerCase();
      return bName.includes(q) || city.includes(q) || month.includes(q);
    }
    return true;
  });

  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const publishedCount = rows.filter((r) => r.status === 'Published').length;
  const draftCount = rows.filter((r) => r.status === 'Draft').length;

  // Open schedule editor
  const handleOpenSchedule = (client: Client) => {
    setEditingScheduleClient(client);
    setScheduleDay(client.reportDayOfMonth || 1);
    setScheduleNextDue(client.nextReportDue || '2026-11-01');
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheduleClient) return;

    try {
      await updateClientReportSchedule(editingScheduleClient.id, {
        reportDayOfMonth: Math.max(1, Math.min(28, scheduleDay)),
        nextReportDue: scheduleNextDue,
      });
      showToast(`Updated schedule for ${editingScheduleClient.businessName}`);
      setEditingScheduleClient(null);
      await loadData();
    } catch {
      showToast('Failed to update schedule.');
    }
  };

  // Open Report Editor
  const handleOpenEditor = async (client: Client, preferredMonth?: string) => {
    setEditorClient(client);
    const reports = await getClientMonthlyReports(client.id);
    setClientReports(reports);

    const m = preferredMonth || (reports[0]?.month ?? '2026-10');
    setEditorMonth(m);
    populateEditorForMonth(client.id, m, reports);
  };

  const populateEditorForMonth = (
    cId: string,
    targetMonth: string,
    existingReports: ClientMonthlyReport[]
  ) => {
    const report = existingReports.find((r) => r.month === targetMonth) || null;
    setActiveReport(report);

    // Compute previous month string (e.g. 2026-10 -> 2026-09)
    const [y, mon] = targetMonth.split('-').map(Number);
    let prevY = y;
    let prevM = mon - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
    const prev = existingReports.find((r) => r.month === prevMonthStr) || null;
    setPrevReport(prev);

    if (report) {
      setVisitors(report.visitors.value);
      setVisitorsSource(report.visitors.source);
      setEnquiries(report.enquiries.value);
      setEnquiriesSource(report.enquiries.source);
      setProfileViews(report.profileViews.value);
      setProfileViewsSource(report.profileViews.source);
      setCalls(report.calls.value);
      setCallsSource(report.calls.source);
      setDirectionRequests(report.directionRequests.value);
      setDirectionRequestsSource(report.directionRequests.source);
      setBookings(report.bookings?.value);
      setBookingsSource(report.bookings?.source || 'Manual');
      setTopPages(report.topPages || '');
      setWhatWeDid(report.whatWeDid.length > 0 ? report.whatWeDid : ['', '']);
      setNextMonthPlan(report.nextMonthPlan.length > 0 ? report.nextMonthPlan : ['', '']);
      setShortNote(report.shortNote || '');
    } else {
      // Auto-load comparison defaults from prev month if available
      setVisitors(prev ? prev.visitors.value + 50 : 1200);
      setVisitorsSource('GA4');
      setEnquiries(prev ? prev.enquiries.value + 3 : 28);
      setEnquiriesSource('GA4');
      setProfileViews(prev ? prev.profileViews.value + 20 : 340);
      setProfileViewsSource('Google Business Profile');
      setCalls(prev ? prev.calls.value + 2 : 18);
      setCallsSource('Google Business Profile');
      setDirectionRequests(prev ? prev.directionRequests.value + 5 : 45);
      setDirectionRequestsSource('Google Business Profile');
      setBookings(prev?.bookings ? prev.bookings.value + 2 : 14);
      setBookingsSource('Manual');
      setTopPages(prev?.topPages || 'Home, Services, Contact');
      setWhatWeDid(['Optimised mobile site speed', 'Published local Google Business updates', 'Targeted local search keywords']);
      setNextMonthPlan(['Expand high-intent search queries', 'Implement call tracking schema', 'Publish 2 seasonal service guides']);
      setShortNote('Positive trend in local map pack search clicks and inbound consultation inquiries.');
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setEditorMonth(newMonth);
    if (editorClient) {
      populateEditorForMonth(editorClient.id, newMonth, clientReports);
    }
  };

  const handleSaveDraft = async () => {
    if (!editorClient) return;

    try {
      const saved = await saveMonthlyReportDraft({
        clientId: editorClient.id,
        month: editorMonth,
        visitors: { value: Number(visitors), source: visitorsSource },
        enquiries: { value: Number(enquiries), source: enquiriesSource },
        profileViews: { value: Number(profileViews), source: profileViewsSource },
        calls: { value: Number(calls), source: callsSource },
        directionRequests: { value: Number(directionRequests), source: directionRequestsSource },
        bookings: bookings !== undefined ? { value: Number(bookings), source: bookingsSource } : undefined,
        topPages,
        whatWeDid: whatWeDid.filter((b) => b.trim().length > 0),
        nextMonthPlan: nextMonthPlan.filter((b) => b.trim().length > 0),
        shortNote,
      });

      showToast(`Draft report saved for ${editorMonth}`);
      setActiveReport(saved);
      const updatedList = await getClientMonthlyReports(editorClient.id);
      setClientReports(updatedList);
      await loadData();
    } catch {
      showToast('Failed to save draft.');
    }
  };

  const handlePublish = async () => {
    if (!editorClient) return;

    try {
      // First ensure draft is saved
      const saved = await saveMonthlyReportDraft({
        clientId: editorClient.id,
        month: editorMonth,
        visitors: { value: Number(visitors), source: visitorsSource },
        enquiries: { value: Number(enquiries), source: enquiriesSource },
        profileViews: { value: Number(profileViews), source: profileViewsSource },
        calls: { value: Number(calls), source: callsSource },
        directionRequests: { value: Number(directionRequests), source: directionRequestsSource },
        bookings: bookings !== undefined ? { value: Number(bookings), source: bookingsSource } : undefined,
        topPages,
        whatWeDid: whatWeDid.filter((b) => b.trim().length > 0),
        nextMonthPlan: nextMonthPlan.filter((b) => b.trim().length > 0),
        shortNote,
      });

      const published = await publishMonthlyReport(saved.id);
      showToast(`Report published! Client can now view this report.`);
      setActiveReport(published);
      const updatedList = await getClientMonthlyReports(editorClient.id);
      setClientReports(updatedList);
      await loadData();
    } catch {
      showToast('Failed to publish report.');
    }
  };

  const handleSaveCorrection = async () => {
    if (!activeReport || !correctionReason.trim()) return;

    try {
      const corrected = await createMonthlyReportCorrection(
        activeReport.id,
        correctionReason.trim(),
        {
          visitors: { value: Number(visitors), source: visitorsSource },
          enquiries: { value: Number(enquiries), source: enquiriesSource },
          profileViews: { value: Number(profileViews), source: profileViewsSource },
          calls: { value: Number(calls), source: callsSource },
          directionRequests: { value: Number(directionRequests), source: directionRequestsSource },
          bookings: bookings !== undefined ? { value: Number(bookings), source: bookingsSource } : undefined,
          topPages,
          whatWeDid: whatWeDid.filter((b) => b.trim().length > 0),
          nextMonthPlan: nextMonthPlan.filter((b) => b.trim().length > 0),
          shortNote,
        }
      );

      showToast(`Correction v${corrected.version} created and recorded in audit history.`);
      setActiveReport(corrected);
      setCorrectionModalOpen(false);
      setCorrectionReason('');
      if (editorClient) {
        const updatedList = await getClientMonthlyReports(editorClient.id);
        setClientReports(updatedList);
      }
      await loadData();
    } catch {
      showToast('Failed to save correction.');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-none tracking-tight">
              Monthly Reports
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Admin Schedule
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B]">
            Automated monthly report calendar, verified metrics (GA4 & GBP), and publication management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B6B6B] font-semibold">
            {rows.length} client schedules · {allReports.length} reports total
          </span>
        </div>
      </div>

      {/* Dual Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-black/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-[#111111] text-white shadow-2xs'
              : 'bg-white text-[#6B6B6B] hover:text-[#111111] border border-black/5'
          }`}
        >
          Schedule Overview ({rows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all-reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all-reports'
              ? 'bg-[#111111] text-white shadow-2xs'
              : 'bg-white text-[#6B6B6B] hover:text-[#111111] border border-black/5'
          }`}
        >
          All Monthly Reports ({allReports.length})
        </button>
      </div>

      {/* Error state if loading failed */}
      {loadError && (
        <div className="p-4 bg-[#FCE9ED] border border-[#D92D50]/20 rounded-2xl flex items-center justify-between gap-4 text-xs text-[#D92D50]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1 bg-[#D92D50] text-white rounded-lg font-bold hover:bg-[#b0223e] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Overdue Reports
          </span>
          <div className="flex items-center justify-between">
            <span
              className={`text-2xl font-bold tabular-nums ${
                overdueCount > 0 ? 'text-[#D92D50]' : 'text-emerald-700'
              }`}
            >
              {overdueCount}
            </span>
            {overdueCount > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCE9ED] text-[#D92D50]">
                Needs Attention
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                All On Track
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Published This Cycle
          </span>
          <span className="text-2xl font-bold text-[#111111] tabular-nums">
            {publishedCount}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Drafts in Preparation
          </span>
          <span className="text-2xl font-bold text-[#6B6B6B] tabular-nums">
            {draftCount}
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'Overdue', 'Draft', 'Published'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'bg-[#F1EFEF] text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              {filter === 'all' ? (activeTab === 'schedule' ? 'All Clients' : 'All Reports') : filter}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
          <input
            type="text"
            placeholder="Search business name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F7F7] border border-black/5 rounded-xl focus:outline-none focus:border-[#D92D50]"
          />
        </div>
      </div>

      {/* Tab 1: Schedule Table */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#6B6B6B]">
              Loading report schedules...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6B6B6B] space-y-2">
              <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
              <div className="font-bold text-[#111111]">No report schedules match your filter</div>
              <p>Try searching for a different term or resetting the filter pill.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F7F7] border-b border-black/5 text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Client / Business</th>
                    <th className="py-3 px-4">Report Day</th>
                    <th className="py-3 px-4">Last Published</th>
                    <th className="py-3 px-4">Next Due</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredRows.map((row) => {
                    const isOverdue = row.status === 'Overdue';

                    return (
                      <tr
                        key={row.client.id}
                        className="hover:bg-[#FAFAFA] transition-colors group"
                      >
                        <td className="py-3.5 px-5 font-semibold text-[#111111]">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold group-hover:text-[#D92D50] transition-colors">
                                {row.client.businessName}
                              </div>
                              <div className="text-[11px] text-[#A8A5A5]">
                                {row.client.specialty || row.client.niche || 'Business'} · {[row.client.city, row.client.country].filter(Boolean).join(', ')}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium text-[#111111]">
                          <button
                            type="button"
                            onClick={() => handleOpenSchedule(row.client)}
                            className="px-2 py-0.5 rounded-md hover:bg-gray-100 text-[#111111] hover:text-[#D92D50] cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-black/10"
                            title="Click to edit schedule"
                          >
                            <span>Day {row.client.reportDayOfMonth || 1}</span>
                            <Edit size={10} className="text-[#A8A5A5]" />
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-[#6B6B6B]">
                          {row.latestReport?.publishedAt ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>{row.latestReport.publishedAt}</span>
                            </div>
                          ) : (
                            <span className="text-[#A8A5A5]">Never</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-medium">
                          <span
                            className={
                              isOverdue
                                ? 'text-[#D92D50] font-bold'
                                : 'text-[#111111]'
                            }
                          >
                            {row.nextDue}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOverdue
                                ? 'bg-[#FCE9ED] text-[#D92D50] border border-[#D92D50]/20'
                                : row.status === 'Published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditor(row.client)}
                              className="px-3 py-1 rounded-full text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white transition-colors cursor-pointer shadow-2xs"
                            >
                              Edit Report
                            </button>

                            {onOpenClientWorkspace && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenClientWorkspace(
                                    row.client.id,
                                    row.client.businessName
                                  )
                                }
                                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1EFEF] hover:bg-gray-200 text-[#111111] transition-colors cursor-pointer"
                                title="Go to client workspace"
                              >
                                Workspace
                              </button>
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

      {/* Tab 2: All Monthly Reports Table */}
      {activeTab === 'all-reports' && (
        <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#6B6B6B]">
              Loading reports list...
            </div>
          ) : filteredAllReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6B6B6B] space-y-2">
              <FileText size={24} className="text-[#A8A5A5] mx-auto" />
              <div className="font-bold text-[#111111]">No monthly reports found</div>
              <p>No reports match your current search query or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F7F7] border-b border-black/5 text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Month</th>
                    <th className="py-3 px-4">Client / Business</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Visitors</th>
                    <th className="py-3 px-4">Enquiries</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredAllReports.map((report) => {
                    const client = clientsList.find(
                      (c) => c.id === report.clientId || `client-${c.id}` === report.clientId
                    );
                    const bName = client?.businessName || `Client (${report.clientId.slice(0, 8)})`;

                    return (
                      <tr
                        key={report.id}
                        className="hover:bg-[#FAFAFA] transition-colors group"
                      >
                        <td className="py-3.5 px-5 font-mono font-bold text-[#111111]">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8F7F7] border border-black/5">
                            <Calendar size={12} className="text-[#A8A5A5]" />
                            <span>{report.month}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-[#111111]">
                          <div>
                            <span className="font-bold text-[#111111] group-hover:text-[#D92D50] transition-colors">
                              {bName}
                            </span>
                            {client && (
                              <div className="text-[11px] text-[#A8A5A5] font-normal">
                                {[client.city, client.country].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              report.status === 'Published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {report.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#111111] tabular-nums font-medium">
                          {report.visitors?.value?.toLocaleString() ?? 0}
                          <span className="text-[10px] text-[#A8A5A5] ml-1">
                            ({report.visitors?.source || 'GA4'})
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#111111] tabular-nums font-medium">
                          {report.enquiries?.value?.toLocaleString() ?? 0}
                          <span className="text-[10px] text-[#A8A5A5] ml-1">
                            ({report.enquiries?.source || 'GA4'})
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#6B6B6B] text-[11px]">
                          {report.publishedAt
                            ? `Published ${report.publishedAt}`
                            : `Updated ${report.updatedAt?.split('T')[0] || report.createdAt?.split('T')[0] || ''}`}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {client && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditor(client, report.month)}
                                className="px-3 py-1 rounded-full text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white transition-colors cursor-pointer shadow-2xs"
                              >
                                {report.status === 'Published' ? 'View Report' : 'Edit Report'}
                              </button>
                            )}

                            {onOpenPortalPreview && (
                              <button
                                type="button"
                                onClick={() => onOpenPortalPreview(report.clientId)}
                                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1EFEF] hover:bg-gray-200 text-[#111111] transition-colors cursor-pointer"
                                title="Open client portal preview"
                              >
                                Portal
                              </button>
                            )}

                            {onOpenClientWorkspace && client && (
                              <button
                                type="button"
                                onClick={() => onOpenClientWorkspace(client.id, client.businessName)}
                                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1EFEF] hover:bg-gray-200 text-[#111111] transition-colors cursor-pointer"
                                title="Go to client workspace"
                              >
                                Workspace
                              </button>
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

      {/* ========================================================================= */}
      {/* MODAL 1: REPORT SCHEDULE SETTING */}
      {/* ========================================================================= */}
      {editingScheduleClient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 border border-black/10 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50]">
                  Client Report Schedule
                </span>
                <h3 className="text-lg font-bold text-[#111111]">
                  {editingScheduleClient.businessName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingScheduleClient(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Report Date (Day of Month, 1–28)
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  required
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                />
                <span className="text-[11px] text-[#A8A5A5] mt-1 block">
                  Select a day between 1 and 28 so all months have this date.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Next Report Due (Computed / Overridable)
                </label>
                <input
                  type="date"
                  required
                  value={scheduleNextDue}
                  onChange={(e) => setScheduleNextDue(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                />
                <span className="text-[11px] text-[#A8A5A5] mt-1 block">
                  If this date passes before publication, report is flagged as Overdue.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingScheduleClient(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPORT EDITOR PER CLIENT PER MONTH */}
      {/* ========================================================================= */}
      {editorClient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-4xl w-full p-6 md:p-8 border border-black/10 shadow-2xl my-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-black/5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#D92D50] uppercase tracking-wider">
                    Monthly Performance Report Editor
                  </span>
                  {activeReport?.status === 'Published' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Published (v{activeReport.version})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                      Draft
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-[#111111]">
                  {editorClient.businessName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setEditorClient(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Month Selector + Previous month indicator */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-[#F8F7F7] p-4 rounded-2xl border border-black/5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#111111]">Report Month:</span>
                <select
                  value={editorMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="text-xs font-bold bg-white px-3 py-1.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50] cursor-pointer"
                >
                  {['2026-11', '2026-10', '2026-09', '2026-08', '2026-07', '2026-06'].map(
                    (m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    )
                  )}
                </select>
              </div>

              {prevReport && (
                <div className="text-xs text-[#6B6B6B] flex items-center gap-2">
                  <span className="font-semibold">Auto-compared to {prevReport.monthLabel}:</span>
                  <span className="text-emerald-700 font-bold">
                    {prevReport.visitors.value} visitors · {prevReport.enquiries.value} enquiries
                  </span>
                </div>
              )}
            </div>

            {/* Metrics Section: 6 metrics each with value & Source dropdown */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#A8A5A5]">
                1. Core Metrics & Verified Sources
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* 1. Visitors */}
                <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111]">
                    <span>Visitors</span>
                    {prevReport && (
                      <span className="text-[10px] text-[#A8A5A5] font-normal">
                        Prev: {prevReport.visitors.value}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={visitors}
                    onChange={(e) => setVisitors(parseInt(e.target.value, 10) || 0)}
                    disabled={activeReport?.status === 'Published'}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                    <span>Source:</span>
                    <select
                      value={visitorsSource}
                      onChange={(e) => setVisitorsSource(e.target.value as MetricSource)}
                      disabled={activeReport?.status === 'Published'}
                      className="bg-transparent font-medium text-[#111111] focus:outline-none"
                    >
                      <option value="GA4">GA4</option>
                      <option value="Google Business Profile">Google Business Profile</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>

                {/* 2. Enquiries */}
                <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111]">
                    <span>Enquiries</span>
                    {prevReport && (
                      <span className="text-[10px] text-[#A8A5A5] font-normal">
                        Prev: {prevReport.enquiries.value}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={enquiries}
                    onChange={(e) => setEnquiries(parseInt(e.target.value, 10) || 0)}
                    disabled={activeReport?.status === 'Published'}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                    <span>Source:</span>
                    <select
                      value={enquiriesSource}
                      onChange={(e) => setEnquiriesSource(e.target.value as MetricSource)}
                      disabled={activeReport?.status === 'Published'}
                      className="bg-transparent font-medium text-[#111111] focus:outline-none"
                    >
                      <option value="GA4">GA4</option>
                      <option value="Google Business Profile">Google Business Profile</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>

                {/* 3. Profile Views */}
                <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111]">
                    <span>Profile Views</span>
                    {prevReport && (
                      <span className="text-[10px] text-[#A8A5A5] font-normal">
                        Prev: {prevReport.profileViews.value}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={profileViews}
                    onChange={(e) => setProfileViews(parseInt(e.target.value, 10) || 0)}
                    disabled={activeReport?.status === 'Published'}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                    <span>Source:</span>
                    <select
                      value={profileViewsSource}
                      onChange={(e) => setProfileViewsSource(e.target.value as MetricSource)}
                      disabled={activeReport?.status === 'Published'}
                      className="bg-transparent font-medium text-[#111111] focus:outline-none"
                    >
                      <option value="Google Business Profile">Google Business Profile</option>
                      <option value="GA4">GA4</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>

                {/* 4. Calls */}
                <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111]">
                    <span>Calls</span>
                    {prevReport && (
                      <span className="text-[10px] text-[#A8A5A5] font-normal">
                        Prev: {prevReport.calls.value}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={calls}
                    onChange={(e) => setCalls(parseInt(e.target.value, 10) || 0)}
                    disabled={activeReport?.status === 'Published'}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                    <span>Source:</span>
                    <select
                      value={callsSource}
                      onChange={(e) => setCallsSource(e.target.value as MetricSource)}
                      disabled={activeReport?.status === 'Published'}
                      className="bg-transparent font-medium text-[#111111] focus:outline-none"
                    >
                      <option value="Google Business Profile">Google Business Profile</option>
                      <option value="GA4">GA4</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>

                {/* 5. Direction Requests */}
                <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111]">
                    <span>Direction Requests</span>
                    {prevReport && (
                      <span className="text-[10px] text-[#A8A5A5] font-normal">
                        Prev: {prevReport.directionRequests.value}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={directionRequests}
                    onChange={(e) => setDirectionRequests(parseInt(e.target.value, 10) || 0)}
                    disabled={activeReport?.status === 'Published'}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                    <span>Source:</span>
                    <select
                      value={directionRequestsSource}
                      onChange={(e) => setDirectionRequestsSource(e.target.value as MetricSource)}
                      disabled={activeReport?.status === 'Published'}
                      className="bg-transparent font-medium text-[#111111] focus:outline-none"
                    >
                      <option value="Google Business Profile">Google Business Profile</option>
                      <option value="GA4">GA4</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>

                {/* 6. Bookings (Optional) */}
                <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-black/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111]">
                    <span>Bookings (Optional)</span>
                    {prevReport?.bookings && (
                      <span className="text-[10px] text-[#A8A5A5] font-normal">
                        Prev: {prevReport.bookings.value}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Optional"
                    value={bookings !== undefined ? bookings : ''}
                    onChange={(e) =>
                      setBookings(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    disabled={activeReport?.status === 'Published'}
                    className="w-full px-3 py-2 text-sm font-bold bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                    <span>Source:</span>
                    <select
                      value={bookingsSource}
                      onChange={(e) => setBookingsSource(e.target.value as MetricSource)}
                      disabled={activeReport?.status === 'Published'}
                      className="bg-transparent font-medium text-[#111111] focus:outline-none"
                    >
                      <option value="Manual">Manual</option>
                      <option value="GA4">GA4</option>
                      <option value="Google Business Profile">Google Business Profile</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Pages */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Top Performing Pages (comma separated)
              </label>
              <input
                type="text"
                value={topPages}
                onChange={(e) => setTopPages(e.target.value)}
                disabled={activeReport?.status === 'Published'}
                placeholder="e.g. /treatments/implants, /contact, /about"
                className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
              />
            </div>

            {/* Bullets: What we did & Next month plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* What We Did */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111111]">
                    What We Did This Month (3–5 bullets)
                  </label>
                  {activeReport?.status !== 'Published' && (
                    <button
                      type="button"
                      onClick={() => setWhatWeDid([...whatWeDid, ''])}
                      className="text-[11px] text-[#D92D50] font-bold hover:underline"
                    >
                      + Add bullet
                    </button>
                  )}
                </div>
                {whatWeDid.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-[#A8A5A5]">•</span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const next = [...whatWeDid];
                        next[idx] = e.target.value;
                        setWhatWeDid(next);
                      }}
                      disabled={activeReport?.status === 'Published'}
                      placeholder={`Activity ${idx + 1}...`}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                    />
                    {activeReport?.status !== 'Published' && whatWeDid.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setWhatWeDid(whatWeDid.filter((_, i) => i !== idx))}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Next Month Plan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111111]">
                    Next Month Plan (bullets)
                  </label>
                  {activeReport?.status !== 'Published' && (
                    <button
                      type="button"
                      onClick={() => setNextMonthPlan([...nextMonthPlan, ''])}
                      className="text-[11px] text-[#D92D50] font-bold hover:underline"
                    >
                      + Add bullet
                    </button>
                  )}
                </div>
                {nextMonthPlan.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-[#A8A5A5]">•</span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const next = [...nextMonthPlan];
                        next[idx] = e.target.value;
                        setNextMonthPlan(next);
                      }}
                      disabled={activeReport?.status === 'Published'}
                      placeholder={`Priority ${idx + 1}...`}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                    />
                    {activeReport?.status !== 'Published' && nextMonthPlan.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setNextMonthPlan(nextMonthPlan.filter((_, i) => i !== idx))}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Short Note */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Executive Note / Summary
              </label>
              <textarea
                rows={2}
                value={shortNote}
                onChange={(e) => setShortNote(e.target.value)}
                disabled={activeReport?.status === 'Published'}
                placeholder="High-level takeaway for the business owner..."
                className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
              />
            </div>

            {/* Version History (if published & corrected) */}
            {activeReport?.history && activeReport.history.length > 0 && (
              <div className="bg-[#F8F7F7] p-4 rounded-2xl border border-black/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#111111]">
                  <History size={14} className="text-[#A8A5A5]" />
                  <span>Correction History ({activeReport.history.length})</span>
                </div>
                <div className="divide-y divide-black/5 text-[11px] text-[#6B6B6B]">
                  {activeReport.history.map((hist, idx) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between">
                      <span>
                        v{hist.version} · {hist.reason || 'Correction applied'}
                      </span>
                      <span className="text-[#A8A5A5]">
                        by {hist.editedBy} ({new Date(hist.editedAt).toLocaleDateString()})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-black/5 flex items-center justify-between flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setEditorClient(null)}
                className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-3">
                {activeReport?.status === 'Published' ? (
                  <button
                    type="button"
                    onClick={() => setCorrectionModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-colors cursor-pointer shadow-xs"
                  >
                    Create Correction
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 text-xs font-bold bg-[#F1EFEF] hover:bg-gray-200 text-[#111111] rounded-full transition-colors cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={handlePublish}
                      className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      <span>Publish (Make Visible)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE CORRECTION REASON */}
      {/* ========================================================================= */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 border border-black/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Audit Trail Required
              </span>
              <h3 className="text-lg font-bold text-[#111111]">
                Create Report Correction
              </h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Published reports retain historical versions. Please specify why numbers or copy are being modified.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Reason for Correction
              </label>
              <textarea
                rows={3}
                required
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Updated GA4 profile view discrepancy after Google sync."
                className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={!correctionReason.trim()}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-full transition-colors cursor-pointer shadow-xs"
              >
                Save Correction (v{(activeReport?.version || 1) + 1})
              </button>
            </div>
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
    </div>
  );
};
