import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Building,
  CheckCircle2,
  Filter,
  User,
  ArrowRight,
  ShieldAlert,
  KanbanSquare,
  Send,
  FileCheck2,
  Upload,
  X,
  FileText,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  ProjectStageChecklistItem,
  TeamMemberProfile,
  Role,
  TaskPriority,
  TeamRequest,
  TeamRequestResponseFile,
} from '../../types/index.ts';
import {
  getMyAssignedTasks,
  updateDeliveryTask,
  getTeamMembers,
  getTeamRequests,
  respondToTeamRequest,
} from '../../data/repo.ts';

interface MyWorkPageProps {
  currentRole: Role;
  previewMember?: TeamMemberProfile | null;
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx'];

export const MyWorkPage: React.FC<MyWorkPageProps> = ({
  currentRole,
  previewMember,
  onOpenClientWorkspace,
}) => {
  const [members, setMembers] = useState<TeamMemberProfile[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(previewMember?.id || '');
  const [tasks, setTasks] = useState<ProjectStageChecklistItem[]>([]);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Active section: 'delivery' | 'requests'
  const [activeSection, setActiveSection] = useState<'delivery' | 'requests'>('delivery');

  // Filters for tasks
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Filters for requests
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');

  // Response Modal State
  const [respondingRequest, setRespondingRequest] = useState<TeamRequest | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseFiles, setResponseFiles] = useState<TeamRequestResponseFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadInitial = async () => {
    setLoading(true);
    const teamList = await getTeamMembers();
    setMembers(teamList);

    const initialId = previewMember?.id || selectedMemberId || teamList[0]?.id || 'mem_01';
    setSelectedMemberId(initialId);

    const [assignedTasks, assignedRequests] = await Promise.all([
      getMyAssignedTasks(initialId),
      getTeamRequests({ toMemberId: initialId }),
    ]);

    setTasks(assignedTasks);
    setRequests(assignedRequests);
    setLoading(false);
  };

  useEffect(() => {
    if (previewMember?.id) {
      setSelectedMemberId(previewMember.id);
      loadInitial();
    } else {
      loadInitial();
    }
  }, [previewMember?.id]);

  const handleMemberChange = async (memberId: string) => {
    setSelectedMemberId(memberId);
    setLoading(true);
    const [assignedTasks, assignedRequests] = await Promise.all([
      getMyAssignedTasks(memberId),
      getTeamRequests({ toMemberId: memberId }),
    ]);
    setTasks(assignedTasks);
    setRequests(assignedRequests);
    setLoading(false);
  };

  const handleToggleTaskDone = async (task: ProjectStageChecklistItem) => {
    if (!task.clientId || !task.stageKey) return;

    try {
      const updated = await updateDeliveryTask(
        task.clientId,
        task.stageKey,
        task.id,
        { done: !task.done },
        'Team Member'
      );

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: updated.done } : t))
      );

      showToast(
        updated.done
          ? `Marked "${task.title}" as completed`
          : `Re-opened "${task.title}"`
      );
    } catch {
      showToast('Failed to update task status.');
    }
  };

  // Handle Response Modal Open
  const openResponseModal = (req: TeamRequest) => {
    setRespondingRequest(req);
    setResponseText(req.responseText || '');
    setResponseFiles(req.responseFiles || []);
    setUploadError(null);
  };

  // Client-side file upload validator
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    const newFiles: TeamRequestResponseFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate size (max 5 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File "${file.name}" exceeds the 5 MB limit (${Math.round(file.size / (1024 * 1024))} MB).`);
        return;
      }

      // Validate extension
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setUploadError(`File "${file.name}" has invalid format. Allowed: PDF, PNG, JPG, DOCX, XLSX.`);
        return;
      }

      newFiles.push({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      });
    }

    setResponseFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setResponseFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit Response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingRequest) return;
    if (!responseText.trim() && responseFiles.length === 0) {
      setUploadError('Please provide a response comment or attach deliverable files.');
      return;
    }

    try {
      setIsSubmittingResponse(true);
      const currentMember = members.find((m) => m.id === selectedMemberId);
      const updated = await respondToTeamRequest(
        respondingRequest.id,
        responseText.trim(),
        responseFiles,
        currentMember?.name || 'Team Member'
      );

      if (updated) {
        setRequests((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        showToast('Response submitted successfully.');
        setRespondingRequest(null);
        setResponseText('');
        setResponseFiles([]);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to submit response.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const currentMember = members.find((m) => m.id === selectedMemberId);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'pending' && t.done) return false;
    if (statusFilter === 'completed' && !t.done) return false;
    if (priorityFilter !== 'all' && (t.priority || 'Medium') !== priorityFilter) return false;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.done).length;
  const completedCount = tasks.filter((t) => t.done).length;
  const urgentCount = tasks.filter((t) => !t.done && (t.priority === 'Urgent' || t.priority === 'High')).length;

  const todayStr = new Date().toISOString().split('T')[0];

  // Requests stats
  const pendingRequestsCount = requests.filter(
    (r) => r.status === 'Open' || r.status === 'Needs changes'
  ).length;
  const overdueRequestsCount = requests.filter(
    (r) => r.status !== 'Accepted' && r.dueDate && r.dueDate < todayStr
  ).length;

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (requestStatusFilter !== 'all' && r.status !== requestStatusFilter) return false;
    return true;
  });

  const getPriorityBadge = (priority?: TaskPriority) => {
    const p = priority || 'Medium';
    switch (p) {
      case 'Urgent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEECEB] text-[#D92D50] border border-[#FECDCA] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D92D50]" />
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F79009]" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#667085]" />
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#F8F9FA] text-[#667085] border border-[#EAECF0] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#667085]" />
            Low
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-medium text-[#111827] leading-tight tracking-tight">
              My Work
            </h1>
            <span className="px-2.5 py-0.5 text-[12px] font-semibold bg-blue-50 text-[var(--accent)] rounded-[6px] border border-blue-100 font-medium">
              Personal Dashboard
            </span>
          </div>
          <p className="text-sm text-[#6B7280]">
            All delivery tasks and pod requests assigned to you, sorted by priority and deadline.
          </p>
        </div>

        {/* Member Selector (for Admin / Account Manager or personal switch) */}
        <div className="flex items-center gap-2 bg-white px-3.5 h-[36px] rounded-[10px] border border-[#D0D5DD] shadow-2xs">
          <User size={14} className="text-[#667085]" />
          <span className="text-sm text-[#6B7280]">Member:</span>
          <select
            value={selectedMemberId}
            onChange={(e) => handleMemberChange(e.target.value)}
            className="text-[13px] font-semibold text-[#101828] bg-transparent focus:outline-none cursor-pointer"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <span className="text-[13px] font-medium text-[#667085] block mb-1">
            Open Delivery Tasks
          </span>
          <div className="flex items-center justify-between">
            <span className="text-[28px] font-semibold text-[#101828] tabular-nums">
              {pendingCount}
            </span>
            {pendingCount === 0 && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#E7F8EF] text-[#12B76A]">
                All done!
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <span className="text-[13px] font-medium text-[#667085] block mb-1">
            Urgent Tasks
          </span>
          <div className="flex items-center justify-between">
            <span
              className={`text-[28px] font-semibold tabular-nums ${
                urgentCount > 0 ? 'text-[#D92D50]' : 'text-[#12B76A]'
              }`}
            >
              {urgentCount}
            </span>
            {urgentCount > 0 && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FEECEB] text-[#D92D50]">
                Focus Today
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <span className="text-[13px] font-medium text-[#667085] block mb-1">
            Open Pod Requests
          </span>
          <div className="flex items-center justify-between">
            <span
              className={`text-[28px] font-semibold tabular-nums ${
                pendingRequestsCount > 0 ? 'text-[#2563EB]' : 'text-[#101828]'
              }`}
            >
              {pendingRequestsCount}
            </span>
            {overdueRequestsCount > 0 && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#FEECEB] text-[#D92D50]">
                {overdueRequestsCount} Overdue
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <span className="text-[13px] font-medium text-[#667085] block mb-1">
            Completed Tasks
          </span>
          <span className="text-[28px] font-semibold text-[#12B76A] tabular-nums">
            {completedCount}
          </span>
        </div>
      </div>

      {/* Primary Section Switcher */}
      <div className="border-b border-[#E5E7EB] flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('delivery')}
          className={`py-3 px-4 text-[14px] font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'delivery'
              ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <CheckSquare size={16} />
          <span>Delivery Tasks ({pendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('requests')}
          className={`py-3 px-4 text-[14px] font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'requests'
              ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Send size={16} />
          <span>Pod Requests ({pendingRequestsCount})</span>
          {overdueRequestsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#D92D50]" />
          )}
        </button>
      </div>

      {/* SECTION 1: DELIVERY TASKS */}
      {activeSection === 'delivery' && (
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {(['pending', 'completed', 'all'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#101828] text-white shadow-xs'
                      : 'bg-[#F2F4F7] text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  {st === 'pending'
                    ? `Pending (${pendingCount})`
                    : st === 'completed'
                    ? `Completed (${completedCount})`
                    : 'All Tasks'}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#667085] font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs font-semibold bg-[#F8F9FA] px-3 py-1.5 rounded-[8px] border border-[#D0D5DD] focus:outline-none cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-[12px] p-12 text-center text-[13px] text-[#667085] border border-[#E5E7EB]">
                Loading assigned tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="bg-white rounded-[12px] p-12 text-center text-[13px] text-[#667085] border border-[#E5E7EB] space-y-2">
                <CheckCircle2 size={28} className="text-[#12B76A] mx-auto" />
                <div className="font-semibold text-[#101828] text-[15px]">
                  {statusFilter === 'pending'
                    ? "You're all caught up!"
                    : 'No tasks found'}
                </div>
                <p>
                  {statusFilter === 'pending'
                    ? 'No pending delivery tasks assigned to this team member.'
                    : 'No tasks match the active filters.'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isOverdue =
                  task.dueDate && !task.done && task.dueDate < todayStr;

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-[12px] p-5 border transition-all shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex items-start justify-between gap-4 ${
                      task.done
                        ? 'border-[#E5E7EB] bg-[#F8F9FA] opacity-75'
                        : isOverdue
                        ? 'border-[#D92D50]/40 hover:border-[var(--accent)]'
                        : 'border-[#E5E7EB] hover:border-[#D0D5DD]'
                    }`}
                  >
                    {/* Checkbox and Content */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggleTaskDone(task)}
                        className="mt-0.5 w-4 h-4 rounded accent-[var(--accent)] cursor-pointer shrink-0"
                      />

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[15px] font-semibold ${
                              task.done
                                ? 'line-through text-[#667085]'
                                : 'text-[#101828]'
                            }`}
                          >
                            {task.title}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#667085] flex-wrap">
                          {task.clientName && (
                            <span className="flex items-center gap-1 font-medium text-[#344054]">
                              <Building size={12} className="text-[#667085]" />
                              <span>{task.clientName}</span>
                            </span>
                          )}

                          {task.stageKey && (
                            <span className="bg-[#F2F4F7] px-2 py-0.5 rounded text-[11px] font-medium text-[#344054]">
                              Stage: {task.stageKey}
                            </span>
                          )}

                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 ${
                                isOverdue
                                  ? 'text-[#D92D50] font-bold'
                                  : 'text-[#667085]'
                              }`}
                            >
                              <Clock size={11} />
                              <span>Due: {task.dueDate}</span>
                              {isOverdue && ' (Overdue)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Workspace shortcut if provided */}
                    {task.clientId && onOpenClientWorkspace && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenClientWorkspace(
                            task.clientId!,
                            task.clientName || 'Client'
                          )
                        }
                        className="p-2 rounded-xl text-[#A8A5A5] hover:text-[#111111] hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                        title="Open Client Delivery Workspace"
                      >
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: POD REQUESTS */}
      {activeSection === 'requests' && (
        <div className="space-y-4">
          {/* Requests Filter Tab */}
          <div className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#667085] font-medium">Status:</span>
              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                className="text-xs font-semibold bg-[#F8F9FA] px-3 py-1.5 rounded-[8px] border border-[#D0D5DD] focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses ({requests.length})</option>
                <option value="Open">Open</option>
                <option value="Submitted">Submitted</option>
                <option value="Accepted">Accepted</option>
                <option value="Needs changes">Needs changes</option>
              </select>
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-[12px] p-12 text-center text-[13px] text-[#667085] border border-[#E5E7EB] space-y-2">
                <CheckCircle2 size={28} className="text-[#12B76A] mx-auto" />
                <div className="font-semibold text-[#101828] text-[15px]">
                  No pod requests found
                </div>
                <p>You have no requests matching this status filter.</p>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isOverdue =
                  req.status !== 'Accepted' &&
                  req.dueDate &&
                  req.dueDate < todayStr;

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-[12px] p-5 border transition-all shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-3 ${
                      isOverdue
                        ? 'border-[#D92D50]/40'
                        : 'border-[#E5E7EB]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054]">
                            {req.type}
                          </span>
                          <span className="text-[15px] font-bold text-[#101828]">
                            {req.title}
                          </span>
                          {req.priority === 'Urgent' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEECEB] text-[#D92D50]">
                              Urgent
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEECEB] text-[#D92D50] border border-[#FECDCA]">
                              Overdue
                            </span>
                          )}
                        </div>

                        <p className="text-[13px] text-[#475467] leading-relaxed whitespace-pre-wrap">
                          {req.details}
                        </p>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full shrink-0 ${
                          req.status === 'Accepted'
                            ? 'bg-[#E7F8EF] text-[#099250]'
                            : req.status === 'Submitted'
                            ? 'bg-[#EFF8FF] text-[#175CD3]'
                            : req.status === 'Needs changes'
                            ? 'bg-[#FFF4E5] text-[#B54708]'
                            : 'bg-[#F2F4F7] text-[#475467]'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between text-xs text-[#667085] pt-2 border-t border-[#F2F4F7] flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span>Due Date: <strong>{req.dueDate}</strong></span>
                        {req.respondedAt && (
                          <span>Submitted: {req.respondedAt.split('T')[0]}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openResponseModal(req)}
                          className="h-[32px] px-3.5 rounded-[8px] bg-[#101828] hover:bg-[#1D2939] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Send size={12} />
                          <span>
                            {req.status === 'Submitted' || req.status === 'Accepted'
                              ? 'View / Update Response'
                              : 'Submit Response'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Manager Feedback Alert if Needs Changes */}
                    {req.managerComment && (
                      <div className="p-3 bg-[#FFF4E5] border border-[#FEDF89] rounded-[10px] text-xs text-[#B54708] space-y-1">
                        <strong className="block">Manager Feedback:</strong>
                        <span>{req.managerComment}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: SUBMIT / UPDATE RESPONSE FORM */}
      {/* ============================================================= */}
      {respondingRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[18px] max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in my-8">
            <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
              <div>
                <h3 className="text-[17px] font-bold text-[#101828]">
                  Submit Response
                </h3>
                <p className="text-[12.5px] text-[#667085] mt-0.5">
                  Provide deliverables, updates, and attachments for pod request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRespondingRequest(null)}
                className="p-1 rounded-lg hover:bg-[#F2F4F7] text-[#667085]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded-[10px] space-y-1 text-xs text-[#667085]">
              <div className="font-bold text-[13px] text-[#101828]">
                {respondingRequest.title}
              </div>
              <p className="text-[#475467]">{respondingRequest.details}</p>
              <div>Due Date: {respondingRequest.dueDate}</div>
            </div>

            {uploadError && (
              <div className="p-3 bg-[#FEECEB] border border-[#FECDCA] rounded-[10px] text-xs text-[#D92D50] flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitResponse} className="space-y-4 text-xs">
              <div>
                <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                  Response & Work Summary *
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                  required
                  placeholder="Detail what was delivered, milestones reached, or answers to the questions..."
                  className="w-full p-3 rounded-[10px] border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none"
                />
              </div>

              {/* File Upload (PDF, PNG, JPG, DOCX, XLSX; max 5MB) */}
              <div className="space-y-2">
                <label className="block text-[12px] font-semibold text-[#344054]">
                  Attach Files (Optional · Max 5 MB each)
                </label>
                <div className="border-2 border-dashed border-[#D0D5DD] hover:border-[var(--accent)] rounded-[12px] p-4 text-center transition-colors">
                  <input
                    type="file"
                    id="response-file-input"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="response-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload size={20} className="text-[#667085]" />
                    <span className="text-[12.5px] font-semibold text-[var(--accent)]">
                      Click to upload deliverables
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      Supported: PDF, PNG, JPG, DOCX, XLSX (max 5 MB)
                    </span>
                  </label>
                </div>

                {/* Attached Files List */}
                {responseFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-[#344054]">
                      Attached ({responseFiles.length}):
                    </span>
                    {responseFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#F8F9FA] rounded-[8px] flex items-center justify-between gap-2 border border-[#EAECF0]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck2 size={14} className="text-[#099250] shrink-0" />
                          <span className="font-medium text-[#101828] truncate">{f.name}</span>
                          <span className="text-[10px] text-[#667085]">
                            ({Math.round(f.size / 1024)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-[#667085] hover:text-[#D92D50] p-1"
                          title="Remove file"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2F4F7]">
                <button
                  type="button"
                  onClick={() => setRespondingRequest(null)}
                  className="px-4 py-2 rounded-[10px] text-[#667085] hover:text-[#101828]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResponse}
                  className="px-5 py-2 rounded-[10px] bg-[var(--accent)] hover:opacity-90 text-white font-medium cursor-pointer shadow-xs"
                >
                  {isSubmittingResponse ? 'Submitting...' : 'Submit to Manager'}
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
    </div>
  );
};
