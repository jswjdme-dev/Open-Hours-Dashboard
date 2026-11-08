import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Users,
  Building,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  Heart,
  MessageSquare,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  Send,
  HelpCircle,
  FileCheck2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  ArrowLeft,
  Check,
} from 'lucide-react';
import {
  SubTeam,
  SubTeamMember,
  SubTeamClient,
  TeamRequest,
  TeamMemberProfile,
  Client,
  Project,
  Role,
  TeamRequestType,
  TeamRequestPriority,
  TeamRequestStatus,
  TimeEntry,
  LeadActivity,
} from '../../types/index.ts';
import {
  getSubTeams,
  getAllSubTeamMembers,
  getAllSubTeamClients,
  createSubTeam,
  updateSubTeam,
  archiveSubTeam,
  addMemberToSubTeam,
  updateSubTeamMemberRoleLabel,
  removeMemberFromSubTeam,
  assignClientToSubTeam,
  unassignClientFromSubTeam,
  getTeamRequests,
  createTeamRequest,
  reviewTeamRequest,
  triggerSubTeamCheckIn,
  runAllDueSubTeamCheckIns,
  getSubTeamOverviewMetrics,
  SubTeamOverviewMetrics,
  getTeamMembers,
  getClients,
  getTimeEntries,
} from '../../lib/team.ts';
import {
  canActorManageSubTeam,
  canActorAccessSubTeam,
  isSubTeamManager,
} from '../../lib/team.ts';
import { getProjects, getSubTeamActivities } from '../../data/repo.ts';
import {
  PodAvatar,
  PodCapacityBar,
  getAvatarPalette,
} from '../../components/team/PodAvatar.tsx';

interface SubTeamsPageProps {
  currentRole: Role;
  previewMember?: TeamMemberProfile | null;
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

const PRESET_COLORS = [
  '#D92D50', // Crimson
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#059669', // Emerald
  '#D97706', // Amber
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#DC2626', // Red
];

const WEEK_DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
];

export const SubTeamsPage: React.FC<SubTeamsPageProps> = ({
  currentRole,
  previewMember,
  onOpenClientWorkspace,
}) => {
  const [subTeams, setSubTeams] = useState<SubTeam[]>([]);
  const [subTeamMembers, setSubTeamMembers] = useState<SubTeamMember[]>([]);
  const [subTeamClients, setSubTeamClients] = useState<SubTeamClient[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // View state: 'cards' | 'org' | 'detail'
  const [viewMode, setViewMode] = useState<'cards' | 'org'>('cards');
  const [selectedSubTeamId, setSelectedSubTeamId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'members' | 'clients' | 'requests' | 'checkins'>('overview');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSubTeam, setEditingSubTeam] = useState<SubTeam | null>(null);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [assignClientModalOpen, setAssignClientModalOpen] = useState(false);
  const [createRequestModalOpen, setCreateRequestModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<TeamRequest | null>(null);

  // Form states for Create / Edit Sub-Team
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formManagerId, setFormManagerId] = useState('');
  const [formMaxClients, setFormMaxClients] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [formCheckInDay, setFormCheckInDay] = useState<number>(1);
  const [formCheckInTemplate, setFormCheckInTemplate] = useState(
    'Weekly progress update: summarize completed delivery tasks, blockers, and next priorities.'
  );
  // Member selections: Map of memberId -> roleLabel
  const [formSelectedMembers, setFormSelectedMembers] = useState<Record<string, string>>({});
  // Client selections: Set of clientIds
  const [formSelectedClients, setFormSelectedClients] = useState<string[]>([]);
  const [clientMoveConfirmations, setClientMoveConfirmations] = useState<Record<string, boolean>>({});
  const [pendingMoveClient, setPendingMoveClient] = useState<{
    clientId: string;
    clientName: string;
    fromTeamName: string;
  } | null>(null);
  const [subTeamToArchive, setSubTeamToArchive] = useState<SubTeam | null>(null);
  const [expandedClientPods, setExpandedClientPods] = useState<Record<string, boolean>>({});

  const toggleExpandClients = (subTeamId: string) => {
    setExpandedClientPods((prev) => ({
      ...prev,
      [subTeamId]: !prev[subTeamId],
    }));
  };

  // Detail tab state for selected sub-team
  const [detailMetrics, setDetailMetrics] = useState<SubTeamOverviewMetrics | null>(null);
  const [detailRequests, setDetailRequests] = useState<TeamRequest[]>([]);
  const [detailActivities, setDetailActivities] = useState<LeadActivity[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');
  const [reviewComment, setReviewComment] = useState('');

  // Add Member Modal State
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRoleLabel, setNewMemberRoleLabel] = useState('');

  // Assign Client Modal State
  const [clientToAssignId, setClientToAssignId] = useState('');
  const [confirmMoveClient, setConfirmMoveClient] = useState(false);

  // Create Request Form State
  const [reqToMemberId, setReqToMemberId] = useState('');
  const [reqClientId, setReqClientId] = useState('');
  const [reqType, setReqType] = useState<TeamRequestType>('Task');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [reqDueDate, setReqDueDate] = useState('');
  const [reqPriority, setReqPriority] = useState<TeamRequestPriority>('Medium');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await runAllDueSubTeamCheckIns('System');
      const [sts, stm, stc, members, clients, projs, entries] = await Promise.all([
        getSubTeams(),
        getAllSubTeamMembers(),
        getAllSubTeamClients(true),
        getTeamMembers(),
        getClients(),
        getProjects(),
        getTimeEntries(),
      ]);
      setSubTeams(sts);
      setSubTeamMembers(stm);
      setSubTeamClients(stc);
      setAllTeamMembers(members);
      setAllClients(clients);
      setAllProjects(projs);
      setTimeEntries(entries);

      if (selectedSubTeamId) {
        const [metrics, reqs, acts] = await Promise.all([
          getSubTeamOverviewMetrics(selectedSubTeamId),
          getTeamRequests({ subTeamId: selectedSubTeamId }),
          getSubTeamActivities(selectedSubTeamId),
        ]);
        setDetailMetrics(metrics);
        setDetailRequests(reqs);
        setDetailActivities(acts);
      }
    } catch (err: any) {
      console.error('Failed to load sub-teams:', err);
      showToast('Failed to load sub-team data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDomainEvent = () => {
      loadData();
    };
    window.addEventListener('domainEventEmitted', handleDomainEvent);
    return () => {
      window.removeEventListener('domainEventEmitted', handleDomainEvent);
    };
  }, [selectedSubTeamId]);

  // Determine active actor
  const actorMemberId = previewMember?.id || 'member_founder';
  const actorName = previewMember?.name || (currentRole === 'Admin' ? 'Admin' : 'Team Member');

  // Active timers map: memberId -> boolean (true if timer has no endTime)
  const activeTimersMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const entry of timeEntries) {
      if (entry.source === 'timer' && !entry.endTime) {
        map.set(entry.memberId, true);
      }
    }
    return map;
  }, [timeEntries]);

  // Selected sub-team object
  const selectedSubTeam = useMemo(() => {
    return subTeams.find((st) => st.id === selectedSubTeamId) || null;
  }, [subTeams, selectedSubTeamId]);

  // Check if actor can manage the selected sub-team
  const canManageCurrentSubTeam = useMemo(() => {
    if (!selectedSubTeam) return false;
    return canActorManageSubTeam(currentRole, actorMemberId, selectedSubTeam);
  }, [selectedSubTeam, currentRole, actorMemberId]);

  // Filtered sub-teams for search
  const filteredSubTeams = useMemo(() => {
    return subTeams.filter((st) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const manager = allTeamMembers.find((m) => m.id === st.managerMemberId);
      return (
        st.name.toLowerCase().includes(q) ||
        (st.notes && st.notes.toLowerCase().includes(q)) ||
        (manager && manager.name.toLowerCase().includes(q))
      );
    });
  }, [subTeams, searchQuery, allTeamMembers]);

  // Helper: Get active clients for a subteam
  const getSubTeamActiveClients = (subTeamId: string): Client[] => {
    const clientIds = new Set(
      subTeamClients.filter((c) => c.subTeamId === subTeamId && !c.unassignedAt).map((c) => c.clientId)
    );
    return allClients.filter((c) => clientIds.has(c.id));
  };

  // Helper: Get members for a subteam with roleLabel
  const getSubTeamMembersWithProfiles = (subTeamId: string) => {
    const assignments = subTeamMembers.filter((m) => m.subTeamId === subTeamId);
    return assignments.map((a) => {
      const profile = allTeamMembers.find((tm) => tm.id === a.memberId);
      let openTaskCount = 0;
      for (const p of allProjects) {
        for (const s of p.stages || []) {
          for (const t of s.checklist || []) {
            if (t.assigneeId === a.memberId && !t.done) {
              openTaskCount++;
            }
          }
        }
      }
      return {
        ...a,
        profile,
        hasActiveTimer: activeTimersMap.get(a.memberId) || false,
        openTaskCount,
      };
    });
  };

  // Helper: Get open task count for manager
  const getManagerOpenTasks = (managerId: string) => {
    let count = 0;
    for (const p of allProjects) {
      for (const s of p.stages || []) {
        for (const t of s.checklist || []) {
          if (t.assigneeId === managerId && !t.done) {
            count++;
          }
        }
      }
    }
    return count;
  };

  // Helper: Check which sub-team a client currently belongs to
  const getClientActiveSubTeam = (clientId: string): SubTeam | null => {
    const row = subTeamClients.find((sc) => sc.clientId === clientId && !sc.unassignedAt);
    if (!row) return null;
    return subTeams.find((st) => st.id === row.subTeamId) || null;
  };

  // Reset Create/Edit modal form
  const openCreateModal = () => {
    setEditingSubTeam(null);
    setFormName('');
    setFormColor(PRESET_COLORS[0]);
    setFormManagerId(allTeamMembers[0]?.id || '');
    setFormMaxClients('5');
    setFormNotes('');
    setFormCheckInDay(1);
    setFormCheckInTemplate(
      'Weekly progress update: summarize completed delivery tasks, blockers, and next priorities.'
    );
    setFormSelectedMembers({
      [allTeamMembers[0]?.id || '']: 'Pod Lead / Manager',
    });
    setFormSelectedClients([]);
    setClientMoveConfirmations({});
    setCreateModalOpen(true);
  };

  const openEditModal = (st: SubTeam) => {
    setEditingSubTeam(st);
    setFormName(st.name);
    setFormColor(st.color || PRESET_COLORS[0]);
    setFormManagerId(st.managerMemberId);
    setFormMaxClients(st.maxClients ? String(st.maxClients) : '');
    setFormNotes(st.notes || '');
    setFormCheckInDay(st.checkInDay ?? 1);
    setFormCheckInTemplate(st.checkInTemplate || '');

    // Current members
    const currentMembersMap: Record<string, string> = {};
    subTeamMembers
      .filter((m) => m.subTeamId === st.id)
      .forEach((m) => {
        currentMembersMap[m.memberId] = m.roleLabel;
      });
    setFormSelectedMembers(currentMembersMap);

    // Current clients
    const currentClientIds = subTeamClients
      .filter((c) => c.subTeamId === st.id && !c.unassignedAt)
      .map((c) => c.clientId);
    setFormSelectedClients(currentClientIds);
    setClientMoveConfirmations({});
    setCreateModalOpen(true);
  };

  // Save Sub-Team (Create or Edit)
  const handleSaveSubTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formManagerId) {
      showToast('Sub-team name and manager are required.');
      return;
    }

    const maxClientsNum = formMaxClients.trim() ? parseInt(formMaxClients.trim(), 10) : undefined;
    const memberAssignments = Object.entries(formSelectedMembers).map(([memberId, roleLabel]) => ({
      memberId,
      roleLabel: roleLabel.trim() || 'Member',
    }));

    try {
      if (editingSubTeam) {
        // Update basic fields
        await updateSubTeam(
          editingSubTeam.id,
          {
            name: formName.trim(),
            color: formColor,
            managerMemberId: formManagerId,
            maxClients: maxClientsNum,
            notes: formNotes.trim(),
            checkInDay: formCheckInDay,
            checkInTemplate: formCheckInTemplate.trim(),
          },
          actorName
        );

        // Sync members
        const currentMems = subTeamMembers.filter((m) => m.subTeamId === editingSubTeam.id);
        const currentMemberIds = new Set(currentMems.map((m) => m.memberId));
        const newMemberIds = new Set(Object.keys(formSelectedMembers));

        // Add or update
        for (const [memId, rLabel] of Object.entries(formSelectedMembers)) {
          if (!currentMemberIds.has(memId)) {
            await addMemberToSubTeam(editingSubTeam.id, memId, rLabel, actorName);
          } else {
            const existing = currentMems.find((m) => m.memberId === memId);
            if (existing && existing.roleLabel !== rLabel) {
              await updateSubTeamMemberRoleLabel(editingSubTeam.id, memId, rLabel, actorName);
            }
          }
        }
        // Remove dropped (except manager)
        for (const existing of currentMems) {
          if (!newMemberIds.has(existing.memberId) && existing.memberId !== formManagerId) {
            await removeMemberFromSubTeam(editingSubTeam.id, existing.memberId, actorName);
          }
        }

        // Sync clients
        const currentClients = subTeamClients
          .filter((c) => c.subTeamId === editingSubTeam.id && !c.unassignedAt)
          .map((c) => c.clientId);
        const currentClientSet = new Set(currentClients);
        const selectedClientSet = new Set(formSelectedClients);

        for (const cid of formSelectedClients) {
          if (!currentClientSet.has(cid)) {
            await assignClientToSubTeam(editingSubTeam.id, cid, actorName);
          }
        }
        for (const cid of currentClients) {
          if (!selectedClientSet.has(cid)) {
            await unassignClientFromSubTeam(editingSubTeam.id, cid, actorName);
          }
        }

        showToast(`Sub-team "${formName.trim()}" updated successfully.`);
      } else {
        // Create new
        const created = await createSubTeam(
          {
            name: formName.trim(),
            color: formColor,
            managerMemberId: formManagerId,
            maxClients: maxClientsNum,
            notes: formNotes.trim(),
            checkInDay: formCheckInDay,
            checkInTemplate: formCheckInTemplate.trim(),
          },
          memberAssignments,
          formSelectedClients,
          actorName
        );
        showToast(`Sub-team "${created.name}" created successfully.`);
      }

      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save sub-team.');
    }
  };

  // Archive Sub-Team
  const handleArchive = (st: SubTeam) => {
    setSubTeamToArchive(st);
  };

  const confirmArchive = async () => {
    if (!subTeamToArchive) return;
    const st = subTeamToArchive;
    try {
      await archiveSubTeam(st.id, actorName);
      showToast(`Sub-team "${st.name}" archived.`);
      if (selectedSubTeamId === st.id) {
        setSelectedSubTeamId(null);
      }
      setSubTeamToArchive(null);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to archive sub-team.');
    }
  };

  // Add Member to SubTeam
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubTeamId || !newMemberId) return;

    try {
      await addMemberToSubTeam(
        selectedSubTeamId,
        newMemberId,
        newMemberRoleLabel.trim() || 'Specialist',
        actorName
      );
      showToast('Member added to sub-team.');
      setAddMemberModalOpen(false);
      setNewMemberId('');
      setNewMemberRoleLabel('');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to add member.');
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedSubTeamId) return;
    try {
      await removeMemberFromSubTeam(selectedSubTeamId, memberId, actorName);
      showToast('Member removed from sub-team.');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove member.');
    }
  };

  // Assign Client to SubTeam
  const handleAssignClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubTeamId || !clientToAssignId) return;

    try {
      await assignClientToSubTeam(selectedSubTeamId, clientToAssignId, actorName);
      showToast('Client assigned to sub-team.');
      setAssignClientModalOpen(false);
      setClientToAssignId('');
      setConfirmMoveClient(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign client.');
    }
  };

  // Unassign Client
  const handleUnassignClient = async (clientId: string) => {
    if (!selectedSubTeamId) return;
    try {
      await unassignClientFromSubTeam(selectedSubTeamId, clientId, actorName);
      showToast('Client unassigned from sub-team.');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to unassign client.');
    }
  };

  // Create Team Request Submit
  const handleCreateRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubTeamId || !reqToMemberId || !reqTitle.trim() || !reqDueDate) {
      showToast('Please fill all required fields.');
      return;
    }

    try {
      const created = await createTeamRequest(
        {
          subTeamId: selectedSubTeamId,
          fromMemberId: actorMemberId,
          toMemberId: reqToMemberId,
          clientId: reqClientId || undefined,
          type: reqType,
          title: reqTitle.trim(),
          details: reqDetails.trim(),
          dueDate: reqDueDate,
          priority: reqPriority,
        },
        actorName
      );
      showToast(`Request "${created.title}" dispatched.`);
      setCreateRequestModalOpen(false);
      setReqTitle('');
      setReqDetails('');
      setReqDueDate('');
      setReqToMemberId('');
      setReqClientId('');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create request.');
    }
  };

  // Trigger Weekly Check-in
  const handleTriggerCheckIn = async (stId: string) => {
    try {
      const res = await triggerSubTeamCheckIn(stId, actorName);
      showToast(
        res.createdCount > 0
          ? `Dispatched ${res.createdCount} check-in request(s) for this week.`
          : 'Check-in requests for this week already exist for all members (idempotent).'
      );
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to trigger check-in.');
    }
  };

  // Review Team Request (Accept / Needs changes)
  const handleReviewRequest = async (status: 'Accepted' | 'Needs changes') => {
    if (!viewingRequest) return;
    try {
      await reviewTeamRequest(viewingRequest.id, status, reviewComment.trim() || undefined, actorName);
      showToast(status === 'Accepted' ? 'Request marked as Accepted.' : 'Feedback sent to member.');
      setViewingRequest(null);
      setReviewComment('');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to review request.');
    }
  };

  // -------------------------------------------------------------
  // RENDER: DETAIL VIEW
  // -------------------------------------------------------------
  if (selectedSubTeam) {
    const stMembers = getSubTeamMembersWithProfiles(selectedSubTeam.id);
    const stClients = getSubTeamActiveClients(selectedSubTeam.id);
    const manager = allTeamMembers.find((m) => m.id === selectedSubTeam.managerMemberId);
    const isOverCapacity =
      selectedSubTeam.maxClients && stClients.length > selectedSubTeam.maxClients;

    // Filter requests
    const filteredRequests = detailRequests.filter((r) => {
      if (requestStatusFilter !== 'all' && r.status !== requestStatusFilter) return false;
      return true;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Detail Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSubTeamId(null)}
              className="p-2 rounded-[10px] hover:bg-[#F2F4F7] text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
              title="Back to all sub-teams"
            >
              <ArrowLeft size={18} />
            </button>
            <div
              className="w-4 h-10 rounded-full"
              style={{ backgroundColor: selectedSubTeam.color || '#D92D50' }}
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[20px] font-bold text-[#101828] tracking-tight">
                  {selectedSubTeam.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F8F9FA] text-[#344054] border border-[#EAECF0]">
                  {stMembers.length} Members
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isOverCapacity
                      ? 'bg-[#FEECEB] text-[#D92D50] border-[#FECDCA]'
                      : 'bg-[#E7F8EF] text-[#099250] border-[#A6F4C5]'
                  }`}
                >
                  {stClients.length}
                  {selectedSubTeam.maxClients ? ` / ${selectedSubTeam.maxClients}` : ''} Clients
                  {isOverCapacity && ' (Over Capacity)'}
                </span>
              </div>
              <p className="text-[13px] text-[#667085] mt-0.5">
                Manager:{' '}
                <strong className="text-[#101828]">
                  {manager?.name || selectedSubTeam.managerMemberId}
                </strong>{' '}
                · {selectedSubTeam.notes || 'Cross-functional delivery pod'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {canManageCurrentSubTeam && (
              <>
                <button
                  type="button"
                  onClick={() => handleTriggerCheckIn(selectedSubTeam.id)}
                  className="h-[36px] px-3.5 rounded-[10px] bg-white border border-[#D0D5DD] hover:bg-[#F8F9FA] text-[#344054] text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Dispatch weekly check-in request to all members"
                >
                  <RefreshCw size={13} className="text-[#D92D50]" />
                  <span>Run Weekly Check-in</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateRequestModalOpen(true)}
                  className="h-[36px] px-3.5 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus size={14} />
                  <span>New Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedSubTeam)}
                  className="h-[36px] px-3 rounded-[10px] bg-white border border-[#D0D5DD] hover:bg-[#F8F9FA] text-[#344054] text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Edit Sub-Team settings"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 5 Detail Tabs */}
        <div className="border-b border-[#ECEEF2] flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'members', label: `Members (${stMembers.length})`, icon: Users },
            { id: 'clients', label: `Clients (${stClients.length})`, icon: Building },
            { id: 'requests', label: `Requests (${detailRequests.length})`, icon: Send },
            { id: 'checkins', label: 'Check-ins', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = detailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id as any)}
                className={`py-3 px-4 text-[13.5px] font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#D92D50] text-[#D92D50]'
                    : 'border-transparent text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {detailTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Tasks by status */}
              <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-2">
                <div className="flex items-center justify-between text-[#667085] text-[12px] font-medium">
                  <span>Delivery Tasks</span>
                  <CheckCircle2 size={15} className="text-[#12B76A]" />
                </div>
                <div className="text-[22px] font-bold text-[#101828] tabular-nums">
                  {detailMetrics?.pendingTasks ?? 0}{' '}
                  <span className="text-[13px] font-normal text-[#667085]">open</span>
                </div>
                <div className="text-[12px] text-[#667085] flex items-center justify-between">
                  <span>Completed: {detailMetrics?.completedTasks ?? 0}</span>
                  <span className="font-semibold text-[#101828]">
                    Total: {detailMetrics?.totalTasks ?? 0}
                  </span>
                </div>
              </div>

              {/* Card 2: Overdue Tasks */}
              <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-2">
                <div className="flex items-center justify-between text-[#667085] text-[12px] font-medium">
                  <span>Overdue Tasks</span>
                  <AlertTriangle
                    size={15}
                    className={
                      (detailMetrics?.overdueTasks ?? 0) > 0 ? 'text-[#D92D50]' : 'text-[#667085]'
                    }
                  />
                </div>
                <div
                  className={`text-[22px] font-bold tabular-nums ${
                    (detailMetrics?.overdueTasks ?? 0) > 0 ? 'text-[#D92D50]' : 'text-[#101828]'
                  }`}
                >
                  {detailMetrics?.overdueTasks ?? 0}
                </div>
                <div className="text-[12px] text-[#667085]">
                  {(detailMetrics?.overdueTasks ?? 0) > 0
                    ? 'Requires immediate pod follow-up'
                    : 'All pod tasks within SLA'}
                </div>
              </div>

              {/* Card 3: Reports Due This Month & Blocked */}
              <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-2">
                <div className="flex items-center justify-between text-[#667085] text-[12px] font-medium">
                  <span>Reports Due This Month</span>
                  <FileText size={15} className="text-[#2563EB]" />
                </div>
                <div className="text-[22px] font-bold text-[#101828] tabular-nums">
                  {detailMetrics?.reportsDueThisMonth ?? 0}
                </div>
                <div className="text-[12px] text-[#667085] flex items-center justify-between">
                  <span>Blocked clients:</span>
                  <span
                    className={`font-semibold ${
                      (detailMetrics?.blockedClientsCount ?? 0) > 0
                        ? 'text-[#D92D50]'
                        : 'text-[#099250]'
                    }`}
                  >
                    {detailMetrics?.blockedClientsCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Card 4: Hours this week vs capacity */}
              <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-2">
                <div className="flex items-center justify-between text-[#667085] text-[12px] font-medium">
                  <span>Hours This Week</span>
                  <Clock size={15} className="text-[#D97706]" />
                </div>
                <div className="text-[22px] font-bold text-[#101828] tabular-nums">
                  {detailMetrics?.hoursThisWeek ?? 0}h{' '}
                  <span className="text-[13px] font-normal text-[#667085]">
                    / {detailMetrics?.weeklyCapacityHours ?? 0}h
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[#EAECF0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D92D50]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((detailMetrics?.hoursThisWeek ?? 0) /
                            Math.max(1, detailMetrics?.weeklyCapacityHours ?? 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Health Score Banner: visible to Admin and manager ONLY */}
            {(currentRole === 'Admin' || isSubTeamManager(actorMemberId, selectedSubTeam)) && (
              <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E7F8EF] text-[#099250] flex items-center justify-center font-bold">
                    <Heart size={20} />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-[#667085]">
                      Executive View · Average Client Health Score
                    </div>
                    <div className="text-[17px] font-bold text-[#101828]">
                      {detailMetrics?.avgClientHealthScore ?? 0} / 100
                    </div>
                  </div>
                </div>
                <span className="text-[12px] text-[#667085] max-w-sm text-right hidden sm:block">
                  Computed across all active clients assigned to this pod. Visible only to Admins and the designated Sub-Team Manager.
                </span>
              </div>
            )}

            {/* Recent Pod Requests Preview */}
            <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#101828]">Active Pod Requests</h2>
                <button
                  type="button"
                  onClick={() => setDetailTab('requests')}
                  className="text-[12.5px] font-semibold text-[#D92D50] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View All ({detailRequests.length})</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              {detailRequests.length === 0 ? (
                <div className="py-8 text-center text-[#667085] text-[13px] bg-[#F8F9FA] rounded-[12px]">
                  No requests created for this pod yet.
                </div>
              ) : (
                <div className="divide-y divide-[#F2F4F7]">
                  {detailRequests.slice(0, 4).map((req) => (
                    <div
                      key={req.id}
                      onClick={() => setViewingRequest(req)}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-[#F8F9FA] rounded-[8px] px-2 cursor-pointer transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054]">
                            {req.type}
                          </span>
                          <span className="text-[13.5px] font-semibold text-[#101828]">
                            {req.title}
                          </span>
                          {req.priority === 'Urgent' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEECEB] text-[#D92D50]">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[#667085]">
                          Assigned to:{' '}
                          <strong className="text-[#344054]">
                            {allTeamMembers.find((m) => m.id === req.toMemberId)?.name || req.toMemberId}
                          </strong>{' '}
                          · Due: {req.dueDate}
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
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
                  ))}
                </div>
              )}
            </div>

            {/* Pod & Assigned Client Activity Timeline */}
            <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#101828]">Assigned Clients Activity Feed</h2>
                  <p className="text-[12px] text-[#667085] mt-0.5">
                    Live cross-link feed showing change requests, tickets, website changes, and milestone updates for pod clients.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#344054] px-2.5 py-1 rounded-full bg-[#F2F4F7]">
                  {detailActivities.length} Events
                </span>
              </div>

              {detailActivities.length === 0 ? (
                <div className="py-8 text-center text-[#667085] text-[13px] bg-[#F8F9FA] rounded-[12px]">
                  No recent activity recorded for clients assigned to this pod.
                </div>
              ) : (
                <div className="divide-y divide-[#F2F4F7]">
                  {detailActivities.slice(0, 6).map((act) => (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[13px] text-[#101828] font-medium leading-relaxed">
                          {act.text}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[#667085]">
                          <span>Actor: {act.createdBy}</span>
                          <span>·</span>
                          <span>{act.createdAt}</span>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054] capitalize shrink-0">
                        {act.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {detailTab === 'members' && (
          <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#101828]">Pod Members</h2>
                <p className="text-[13px] text-[#667085] mt-0.5">
                  Cross-functional specialists assigned to this sub-team with custom role labels.
                </p>
              </div>
              {canManageCurrentSubTeam && (
                <button
                  type="button"
                  onClick={() => {
                    setNewMemberId('');
                    setNewMemberRoleLabel('');
                    setAddMemberModalOpen(true);
                  }}
                  className="h-[36px] px-3.5 rounded-[10px] bg-[#101828] hover:bg-[#1D2939] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-[#F2F4F7]">
              {stMembers.map((m) => {
                const isManager = selectedSubTeam.managerMemberId === m.memberId;
                return (
                  <div
                    key={m.memberId}
                    className="py-3.5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-[#101828] text-white flex items-center justify-center font-bold text-xs">
                          {m.profile?.avatarInitials || m.profile?.name.slice(0, 2).toUpperCase() || 'TM'}
                        </div>
                        {m.hasActiveTimer && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#12B76A] border-2 border-white animate-pulse"
                            title="Active time tracker running"
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[14px] text-[#101828]">
                            {m.profile?.name || m.memberId}
                          </span>
                          {isManager && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FCE9ED] text-[#D92D50] border border-[#FECDCA]">
                              Manager
                            </span>
                          )}
                          <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054] font-medium">
                            {m.roleLabel}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#667085] mt-0.5">
                          {m.profile?.email} · Global Role: {m.profile?.role} · Joined: {m.joinedAt.split('T')[0]}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManageCurrentSubTeam && !isManager && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.memberId)}
                          className="p-1.5 text-[#667085] hover:text-[#D92D50] rounded-lg hover:bg-[#FEECEB] transition-colors cursor-pointer"
                          title="Remove from sub-team"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CLIENTS */}
        {detailTab === 'clients' && (
          <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#101828]">Assigned Clients</h2>
                <p className="text-[13px] text-[#667085] mt-0.5">
                  Clients serviced exclusively by this sub-team ({stClients.length} of{' '}
                  {selectedSubTeam.maxClients || 'unlimited'} capacity).
                </p>
              </div>
              {canManageCurrentSubTeam && (
                <button
                  type="button"
                  onClick={() => {
                    setClientToAssignId('');
                    setConfirmMoveClient(false);
                    setAssignClientModalOpen(true);
                  }}
                  className="h-[36px] px-3.5 rounded-[10px] bg-[#101828] hover:bg-[#1D2939] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Assign Client</span>
                </button>
              )}
            </div>

            {stClients.length === 0 ? (
              <div className="py-12 text-center text-[#667085] text-[13px] bg-[#F8F9FA] rounded-[12px]">
                No clients currently assigned to this sub-team. Click "Assign Client" above.
              </div>
            ) : (
              <div className="divide-y divide-[#F2F4F7]">
                {stClients.map((c) => (
                  <div
                    key={c.id}
                    className="py-3.5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center font-bold text-xs text-[#101828]">
                        <Building size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[14px] text-[#101828]">
                            {c.businessName}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054]">
                            {c.specialty}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              c.status === 'Live' || c.status === 'Care' || c.status === 'Onboarding'
                                ? 'bg-[#E7F8EF] text-[#099250]'
                                : 'bg-[#FFF4E5] text-[#B54708]'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#667085] mt-0.5">
                          {c.city}, {c.country}
                          {typeof c.healthScore === 'number' &&
                            (currentRole === 'Admin' || isSubTeamManager(actorMemberId, selectedSubTeam)) && (
                              <span> · Health Score: <strong>{c.healthScore}</strong></span>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenClientWorkspace && (
                        <button
                          type="button"
                          onClick={() => onOpenClientWorkspace(c.id, c.businessName)}
                          className="h-[32px] px-3 rounded-[8px] bg-white border border-[#D0D5DD] hover:bg-[#F8F9FA] text-[#344054] text-[12px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Workspace</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                      {canManageCurrentSubTeam && (
                        <button
                          type="button"
                          onClick={() => handleUnassignClient(c.id)}
                          className="p-1.5 text-[#667085] hover:text-[#D92D50] rounded-lg hover:bg-[#FEECEB] transition-colors cursor-pointer"
                          title="Unassign client from sub-team"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REQUESTS */}
        {detailTab === 'requests' && (
          <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-[#101828]">Team Requests</h2>
                <p className="text-[13px] text-[#667085] mt-0.5">
                  Inter-team requests, tasks, progress updates, and question tickets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="h-[36px] px-2.5 rounded-[10px] border border-[#D0D5DD] bg-white text-[12.5px] font-medium text-[#344054] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Needs changes">Needs changes</option>
                </select>

                {canManageCurrentSubTeam && (
                  <button
                    type="button"
                    onClick={() => setCreateRequestModalOpen(true)}
                    className="h-[36px] px-3.5 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create Request</span>
                  </button>
                )}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-[#667085] text-[13px] bg-[#F8F9FA] rounded-[12px]">
                No team requests found matching the current filter.
              </div>
            ) : (
              <div className="divide-y divide-[#F2F4F7]">
                {filteredRequests.map((req) => {
                  const toMember = allTeamMembers.find((m) => m.id === req.toMemberId);
                  const fromMember = allTeamMembers.find((m) => m.id === req.fromMemberId);
                  const client = allClients.find((c) => c.id === req.clientId);
                  const isOverdue =
                    req.status !== 'Accepted' &&
                    req.dueDate &&
                    req.dueDate < new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={req.id}
                      onClick={() => setViewingRequest(req)}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8F9FA] px-3 rounded-[10px] cursor-pointer transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054]">
                            {req.type}
                          </span>
                          <span className="text-[14px] font-semibold text-[#101828]">
                            {req.title}
                          </span>
                          {req.priority === 'Urgent' && (
                            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-[#FEECEB] text-[#D92D50]">
                              Urgent
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-[#FEECEB] text-[#D92D50] border border-[#FECDCA]">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#475467] line-clamp-1">
                          {req.details}
                        </p>
                        <div className="text-[12px] text-[#667085]">
                          From: {fromMember?.name || req.fromMemberId} → To:{' '}
                          <strong className="text-[#344054]">{toMember?.name || req.toMemberId}</strong>
                          {client && (
                            <span> · Client: <strong>{client.businessName}</strong></span>
                          )}
                          <span> · Due: {req.dueDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
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
                        <ChevronRight size={15} className="text-[#98A2B3]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CHECK-INS */}
        {detailTab === 'checkins' && (
          <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#101828]">Weekly Recurring Check-in</h2>
                <p className="text-[13px] text-[#667085] mt-0.5">
                  Automated weekly progress update requests dispatched to all members of this pod.
                </p>
              </div>
              {canManageCurrentSubTeam && (
                <button
                  type="button"
                  onClick={() => handleTriggerCheckIn(selectedSubTeam.id)}
                  className="h-[36px] px-3.5 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={14} />
                  <span>Run Check-in Now</span>
                </button>
              )}
            </div>

            {/* Check-in Settings Card */}
            <div className="p-4 rounded-[12px] bg-[#F8F9FA] border border-[#EAECF0] space-y-3">
              <div className="text-[13px] font-semibold text-[#101828]">
                Check-in Configuration
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#667085] block mb-1">Cadence Day:</span>
                  <strong className="text-[#101828] text-[13px]">
                    Every {WEEK_DAYS.find((d) => d.value === selectedSubTeam.checkInDay)?.label || 'Monday'}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#667085] block mb-1">Prompt Template:</span>
                  <p className="text-[#344054] text-[12.5px] italic">
                    "{selectedSubTeam.checkInTemplate || 'Weekly progress update: Please summarize completed delivery tasks, blockers, and focus priorities for this week.'}"
                  </p>
                </div>
              </div>
            </div>

            {/* Check-in Requests History */}
            <div className="space-y-3">
              <h3 className="text-[14px] font-bold text-[#101828]">Check-in History</h3>
              {detailRequests.filter((r) => r.type === 'Progress update').length === 0 ? (
                <div className="py-8 text-center text-[#667085] text-[13px] bg-[#F8F9FA] rounded-[12px]">
                  No check-in requests dispatched yet. Click "Run Check-in Now" to trigger this week's check-in.
                </div>
              ) : (
                <div className="divide-y divide-[#F2F4F7]">
                  {detailRequests
                    .filter((r) => r.type === 'Progress update')
                    .map((req) => (
                      <div
                        key={req.id}
                        onClick={() => setViewingRequest(req)}
                        className="py-3 flex items-center justify-between gap-4 hover:bg-[#F8F9FA] px-2 rounded-[8px] cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-[13.5px] text-[#101828]">
                            {req.title}
                          </div>
                          <div className="text-[12px] text-[#667085] mt-0.5">
                            Member:{' '}
                            <strong className="text-[#344054]">
                              {allTeamMembers.find((m) => m.id === req.toMemberId)?.name || req.toMemberId}
                            </strong>{' '}
                            · Created: {req.createdAt.split('T')[0]}
                            {req.responseText && (
                              <span className="text-[#099250] ml-2 font-medium">· Response submitted</span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
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
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Add Member */}
        {addMemberModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
                <h3 className="text-[16px] font-bold text-[#101828]">Add Pod Member</h3>
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#F2F4F7] text-[#667085]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Select Member *
                  </label>
                  <select
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    required
                    className="w-full h-[40px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Member --</option>
                    {allTeamMembers
                      .filter((tm) => !stMembers.some((sm) => sm.memberId === tm.id))
                      .map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.name} ({tm.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Role Label (Free Text) *
                  </label>
                  <input
                    type="text"
                    value={newMemberRoleLabel}
                    onChange={(e) => setNewMemberRoleLabel(e.target.value)}
                    required
                    placeholder="e.g. SEO Specialist, Frontend Dev, Copywriter"
                    className="w-full h-[40px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddMemberModalOpen(false)}
                    className="px-4 py-2 rounded-[10px] text-[#667085] hover:text-[#101828]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-[10px] bg-[#101828] hover:bg-[#1D2939] text-white font-semibold cursor-pointer"
                  >
                    Add to Pod
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Assign Client */}
        {assignClientModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
                <h3 className="text-[16px] font-bold text-[#101828]">Assign Client to Pod</h3>
                <button
                  type="button"
                  onClick={() => setAssignClientModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#F2F4F7] text-[#667085]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAssignClientSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Select Client *
                  </label>
                  <select
                    value={clientToAssignId}
                    onChange={(e) => {
                      setClientToAssignId(e.target.value);
                      setConfirmMoveClient(false);
                    }}
                    required
                    className="w-full h-[40px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Client --</option>
                    {allClients
                      .filter((c) => !stClients.some((sc) => sc.id === c.id))
                      .map((c) => {
                        const currentTeam = getClientActiveSubTeam(c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.businessName} {currentTeam ? `(in ${currentTeam.name})` : '(Unassigned)'}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* If selected client is already in another sub-team, require confirmation to move */}
                {(() => {
                  const currentTeam = clientToAssignId ? getClientActiveSubTeam(clientToAssignId) : null;
                  if (currentTeam && currentTeam.id !== selectedSubTeamId) {
                    return (
                      <div className="p-3 bg-[#FFF4E5] border border-[#FEDF89] rounded-[10px] space-y-2">
                        <div className="flex items-start gap-2 text-[#B54708]">
                          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                          <div className="text-[12px]">
                            This client is currently assigned to <strong>{currentTeam.name}</strong>. A client can belong to only one active pod.
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={confirmMoveClient}
                            onChange={(e) => setConfirmMoveClient(e.target.checked)}
                            required
                            className="rounded accent-[#D92D50]"
                          />
                          <span className="text-[12px] font-semibold text-[#101828]">
                            Confirm reassigning from {currentTeam.name}
                          </span>
                        </label>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignClientModalOpen(false)}
                    className="px-4 py-2 rounded-[10px] text-[#667085] hover:text-[#101828]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-[10px] bg-[#101828] hover:bg-[#1D2939] text-white font-semibold cursor-pointer"
                  >
                    Assign Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Create Team Request */}
        {createRequestModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
                <h3 className="text-[16px] font-bold text-[#101828]">Create Pod Request</h3>
                <button
                  type="button"
                  onClick={() => setCreateRequestModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#F2F4F7] text-[#667085]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateRequestSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                      Assignee Member *
                    </label>
                    <select
                      value={reqToMemberId}
                      onChange={(e) => setReqToMemberId(e.target.value)}
                      required
                      className="w-full h-[38px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Member --</option>
                      {stMembers.map((m) => (
                        <option key={m.memberId} value={m.memberId}>
                          {m.profile?.name || m.memberId} ({m.roleLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                      Request Type *
                    </label>
                    <select
                      value={reqType}
                      onChange={(e) => setReqType(e.target.value as any)}
                      className="w-full h-[38px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none cursor-pointer"
                    >
                      <option value="Task">Task</option>
                      <option value="Report request">Report request</option>
                      <option value="Progress update">Progress update</option>
                      <option value="Question">Question</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                      Related Client (Optional)
                    </label>
                    <select
                      value={reqClientId}
                      onChange={(e) => setReqClientId(e.target.value)}
                      className="w-full h-[38px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none cursor-pointer"
                    >
                      <option value="">-- None / Internal --</option>
                      {stClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                      Priority *
                    </label>
                    <select
                      value={reqPriority}
                      onChange={(e) => setReqPriority(e.target.value as any)}
                      className="w-full h-[38px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none cursor-pointer"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    required
                    placeholder="e.g. Audit mobile conversion funnel on client homepage"
                    className="w-full h-[38px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Details & Instructions *
                  </label>
                  <textarea
                    value={reqDetails}
                    onChange={(e) => setReqDetails(e.target.value)}
                    required
                    rows={3}
                    placeholder="Specific guidelines, deliverables, or checklist for the member..."
                    className="w-full p-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={reqDueDate}
                    onChange={(e) => setReqDueDate(e.target.value)}
                    required
                    className="w-full h-[38px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateRequestModalOpen(false)}
                    className="px-4 py-2 rounded-[10px] text-[#667085] hover:text-[#101828]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white font-semibold cursor-pointer shadow-2xs"
                  >
                    Dispatch Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: View / Review Team Request */}
        {viewingRequest && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#344054]">
                    {viewingRequest.type}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      viewingRequest.status === 'Accepted'
                        ? 'bg-[#E7F8EF] text-[#099250]'
                        : viewingRequest.status === 'Submitted'
                        ? 'bg-[#EFF8FF] text-[#175CD3]'
                        : viewingRequest.status === 'Needs changes'
                        ? 'bg-[#FFF4E5] text-[#B54708]'
                        : 'bg-[#F2F4F7] text-[#475467]'
                    }`}
                  >
                    {viewingRequest.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingRequest(null)}
                  className="p-1 rounded-lg hover:bg-[#F2F4F7] text-[#667085]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-[17px] font-bold text-[#101828]">
                  {viewingRequest.title}
                </h3>
                <p className="text-[13px] text-[#475467] leading-relaxed whitespace-pre-wrap">
                  {viewingRequest.details}
                </p>

                <div className="p-3 bg-[#F8F9FA] rounded-[10px] text-xs space-y-1 text-[#667085]">
                  <div>
                    Assigned To:{' '}
                    <strong className="text-[#101828]">
                      {allTeamMembers.find((m) => m.id === viewingRequest.toMemberId)?.name || viewingRequest.toMemberId}
                    </strong>
                  </div>
                  <div>Due Date: {viewingRequest.dueDate} · Priority: {viewingRequest.priority}</div>
                  <div>Created: {viewingRequest.createdAt.split('T')[0]}</div>
                </div>

                {/* Member's Response (if submitted) */}
                {viewingRequest.responseText ? (
                  <div className="p-4 bg-[#EFF8FF] rounded-[12px] border border-[#B2DDFF] space-y-2">
                    <div className="text-[12px] font-bold text-[#175CD3] flex items-center justify-between">
                      <span>Member Response</span>
                      <span>{viewingRequest.respondedAt?.split('T')[0]}</span>
                    </div>
                    <p className="text-[13px] text-[#101828] whitespace-pre-wrap">
                      {viewingRequest.responseText}
                    </p>
                    {viewingRequest.responseFiles && viewingRequest.responseFiles.length > 0 && (
                      <div className="pt-2 border-t border-[#B2DDFF]/40 space-y-1">
                        <span className="text-[11px] font-semibold text-[#175CD3]">
                          Attached Files ({viewingRequest.responseFiles.length}):
                        </span>
                        {viewingRequest.responseFiles.map((f, idx) => (
                          <div key={idx} className="text-xs text-[#344054] flex items-center gap-1.5">
                            <FileCheck2 size={13} className="text-[#175CD3]" />
                            <span>{f.name}</span>
                            <span className="text-[10px] text-[#667085]">({Math.round(f.size / 1024)} KB)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#F8F9FA] rounded-[10px] text-xs text-[#667085] text-center">
                    Awaiting response submission from member.
                  </div>
                )}

                {/* Manager Comments (if any) */}
                {viewingRequest.managerComment && (
                  <div className="p-3 bg-[#FFF4E5] border border-[#FEDF89] rounded-[10px] text-xs text-[#B54708]">
                    <strong>Manager Feedback:</strong> {viewingRequest.managerComment}
                  </div>
                )}

                {/* Manager Review Controls (if manager/admin and submitted) */}
                {canManageCurrentSubTeam && viewingRequest.status === 'Submitted' && (
                  <div className="pt-3 border-t border-[#F2F4F7] space-y-3">
                    <div className="text-[12.5px] font-semibold text-[#101828]">
                      Manager Review
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={2}
                      placeholder="Comment or revision request feedback (optional for accept, required for changes)..."
                      className="w-full p-2.5 rounded-[10px] border border-[#D0D5DD] text-xs text-[#101828] focus:outline-none"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewRequest('Needs changes')}
                        className="px-3 py-1.5 rounded-[8px] bg-[#FFF4E5] text-[#B54708] hover:bg-[#FEDF89] text-xs font-semibold cursor-pointer"
                      >
                        Needs Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewRequest('Accepted')}
                        className="px-4 py-1.5 rounded-[8px] bg-[#12B76A] hover:bg-[#099250] text-white text-xs font-semibold cursor-pointer"
                      >
                        Accept Submission
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: MAIN LIST VIEW (CARDS OR ORG VIEW)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#101828] text-white px-4 py-3 rounded-[12px] shadow-lg flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-[#12B76A] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold text-[#101828] tracking-tight">Sub-teams</h1>
            <span className="px-2.5 py-0.5 rounded-full border border-[#ECEEF2] text-[12px] font-semibold text-[#667085] bg-white">
              {subTeams.length} Active Pod{subTeams.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[13.5px] text-[#667085] mt-1">
            Autonomous delivery pods with dedicated managers, cross-functional members, and client capacity constraints.
          </p>
        </div>

        {/* View toggle & Create button */}
        <div className="flex items-center gap-2.5">
          <div className="bg-white border border-[#D0D5DD] rounded-[10px] p-0.5 flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#101828] text-white shadow-2xs'
                  : 'text-[#667085] hover:text-[#101828]'
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('org')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'org'
                  ? 'bg-[#101828] text-white shadow-2xs'
                  : 'text-[#667085] hover:text-[#101828]'
              }`}
            >
              Org View
            </button>
          </div>

          {(currentRole === 'Admin' || currentRole === 'Account Manager') && (
            <button
              type="button"
              onClick={openCreateModal}
              className="h-[38px] px-4 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus size={15} />
              <span>Create Sub-team</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-[14px] border border-[#ECEEF2] flex items-center gap-3">
        <Search size={16} className="text-[#98A2B3] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by pod name, notes, or manager..."
          className="w-full text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none bg-transparent"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-[#667085] hover:text-[#101828]"
          >
            Clear
          </button>
        )}
      </div>

      {/* VIEW 1: CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
          {filteredSubTeams.length === 0 ? (
            <div className="col-span-full py-16 bg-white rounded-[20px] border border-[#ECEEF2] text-center space-y-3 p-6 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center mx-auto">
                <Layers size={22} />
              </div>
              <h3 className="text-[16px] font-bold text-[#101828]">No sub-teams found</h3>
              <p className="text-[13px] text-[#667085] max-w-sm mx-auto">
                Create your first delivery pod to organize team members and client accounts.
              </p>
              {(currentRole === 'Admin' || currentRole === 'Account Manager') && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-[#D92D50] hover:bg-[#B82340] text-white text-xs font-semibold rounded-[10px] cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none min-h-[36px] transition-colors"
                >
                  Create Sub-team
                </button>
              )}
            </div>
          ) : (
            filteredSubTeams.map((st) => {
              const manager = allTeamMembers.find((m) => m.id === st.managerMemberId);
              const allMembers = getSubTeamMembersWithProfiles(st.id);
              // Rule 2: A person is shown ONCE per pod: exclude manager from members list
              const members = allMembers.filter((m) => m.memberId !== st.managerMemberId);
              const clients = getSubTeamActiveClients(st.id);
              const isManagerTimerRunning = activeTimersMap.get(st.managerMemberId) || false;
              const managerOpenTasks = getManagerOpenTasks(st.managerMemberId);
              const isExpanded = !!expandedClientPods[st.id];
              const visibleClients = isExpanded ? clients : clients.slice(0, 3);
              const remainingClientCount = clients.length - 3;
              const podColor = st.color || '#D92D50';

              return (
                <div
                  key={st.id}
                  className="bg-white rounded-[20px] border border-[#ECEEF2] hover:border-[#D0D5DD] transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-reduce:hover:translate-y-0 flex flex-col justify-between overflow-hidden h-full shadow-2xs"
                >
                  {/* Top Color Stripe */}
                  <div
                    className="h-1.5 w-full shrink-0"
                    style={{ backgroundColor: podColor }}
                  />

                  <div className="p-5 space-y-4 flex-1 flex flex-col">
                    {/* Header: pod colour dot + name (18px/600) + one-line description (muted, 2-line clamp) + small status pill ("Active") */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: podColor }}
                            aria-hidden="true"
                          />
                          <h2 className="text-[18px] font-semibold text-[#101828] leading-tight truncate">
                            {st.name}
                          </h2>
                        </div>
                        {st.notes ? (
                          <p className="text-[13px] text-[#667085] mt-1 line-clamp-2 leading-relaxed">
                            {st.notes}
                          </p>
                        ) : (
                          <p className="text-[13px] text-[#98A2B3] italic mt-1">
                            No description provided
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E7F8EF] text-[#099250] border border-[#A6F4C5] select-none">
                        Active
                      </span>
                    </div>

                    {/* Manager block: large avatar (56px) + name + "Pod manager" label in a soft tinted panel in the pod colour (8% tint), no border */}
                    <div
                      className="p-3.5 rounded-[14px] flex items-center justify-between gap-3 border-0 transition-colors"
                      style={{ backgroundColor: `${podColor}14` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PodAvatar
                          id={st.managerMemberId}
                          name={manager?.name || st.managerMemberId}
                          initials={manager?.avatarInitials}
                          avatarUrl={manager?.avatarDataUrl}
                          size="manager-cards"
                          isManager={true}
                          hasActiveTimer={isManagerTimerRunning}
                          openTaskCount={managerOpenTasks}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D92D50] block leading-tight">
                            Pod manager
                          </span>
                          <span
                            className="text-[14px] font-bold text-[#101828] truncate block mt-0.5"
                            title={manager?.name || st.managerMemberId}
                          >
                            {manager?.name || st.managerMemberId}
                          </span>
                          <span
                            className="text-[11.5px] text-[#667085] truncate block mt-0.5"
                            title={manager?.role}
                          >
                            {manager?.role || 'Team Member'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Members: overlapping avatar stack (max 5 visible, "+N" bubble), names shown in a tooltip on hover, and below it a compact list of "name - role label" rows (2 columns on wide cards) */}
                    <div className="space-y-2 pt-1 border-t border-[#F2F4F7]">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#475467]">
                          Members ({members.length} {members.length === 1 ? 'member' : 'members'} + manager)
                        </span>

                        {/* Overlapping Avatar Stack */}
                        {members.length > 0 && (
                          <div className="flex items-center pl-2">
                            {members.slice(0, 5).map((m, idx) => (
                              <div
                                key={m.memberId}
                                className={`relative transition-transform hover:scale-110 hover:z-10 ${
                                  idx > 0 ? '-ml-2.5' : ''
                                }`}
                                title={`${m.profile?.name || m.memberId}: ${m.roleLabel}`}
                              >
                                <PodAvatar
                                  id={m.memberId}
                                  name={m.profile?.name || m.memberId}
                                  initials={m.profile?.avatarInitials}
                                  avatarUrl={m.profile?.avatarDataUrl}
                                  size="sm"
                                  hasActiveTimer={m.hasActiveTimer}
                                  openTaskCount={m.openTaskCount}
                                  className="ring-2 ring-white rounded-full"
                                />
                              </div>
                            ))}
                            {members.length > 5 && (
                              <div
                                className="-ml-2.5 w-8 h-8 rounded-full bg-[#F2F4F7] border-2 border-white text-[11px] font-bold text-[#475467] flex items-center justify-center shadow-2xs select-none"
                                title={members.slice(5).map((m) => m.profile?.name || m.memberId).join(', ')}
                              >
                                +{members.length - 5}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Compact list of "name - role label" rows (2 columns on wide cards) */}
                      {members.length === 0 ? (
                        <div className="text-[12px] text-[#98A2B3] italic py-1">
                          No additional members assigned (+ manager only)
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pt-1">
                          {members.map((m) => (
                            <div
                              key={m.memberId}
                              className="flex items-center gap-1.5 min-w-0 py-0.5"
                              title={`${m.profile?.name || m.memberId} — ${m.roleLabel}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: podColor }}
                              />
                              <span className="font-semibold text-[#101828] text-[11.5px] truncate max-w-[85px] shrink-0">
                                {m.profile?.name || m.memberId}
                              </span>
                              <span className="text-[#667085] text-[11px] truncate" title={m.roleLabel}>
                                — {m.roleLabel}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Clients: first 3 as small rounded chips with a coloured initial dot, "+N more" chip that expands inline; capacity progress bar (rule 5) under the heading "Clients" */}
                    <div className="space-y-2.5 pt-2 border-t border-[#F2F4F7] mt-auto">
                      <div>
                        <div className="text-[12px] font-semibold text-[#475467] mb-1.5">
                          Clients
                        </div>
                        {/* Capacity progress bar under heading "Clients" */}
                        <PodCapacityBar current={clients.length} max={st.maxClients} />
                      </div>

                      {/* Client chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {clients.length === 0 ? (
                          <span className="text-[12px] text-[#98A2B3] italic">
                            No clients currently assigned
                          </span>
                        ) : (
                          <>
                            {visibleClients.map((c) => {
                              const dotPal = getAvatarPalette(c.id);
                              return (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#F8F9FA] border border-[#EAECF0] text-[#101828] hover:border-[#D0D5DD] transition-colors"
                                  title={`${c.businessName} (${c.city}, ${c.country})`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: dotPal.text }}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate max-w-[150px]">{c.businessName}</span>
                                </span>
                              );
                            })}

                            {clients.length > 3 && !isExpanded && (
                              <button
                                type="button"
                                onClick={() => toggleExpandClients(st.id)}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-[#D92D50] bg-[#FFF5F6] border border-[#FECDCA] hover:bg-[#FEECEB] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none min-h-[24px]"
                                title="Expand to show all clients"
                              >
                                +{remainingClientCount} more
                              </button>
                            )}

                            {clients.length > 3 && isExpanded && (
                              <button
                                type="button"
                                onClick={() => toggleExpandClients(st.id)}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-[#667085] bg-[#F2F4F7] hover:bg-[#EAECF0] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none min-h-[24px]"
                                title="Collapse client chips"
                              >
                                Show less
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer: "Open Pod" primary button (crimson, 36px) left, edit and archive as 36px ghost icon buttons right, separated by a hairline divider */}
                  <div className="p-4 bg-[#FAFBFD] border-t border-[#ECEEF2] flex items-center justify-between gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubTeamId(st.id);
                        setDetailTab('overview');
                      }}
                      className="h-9 px-4 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none min-h-[36px]"
                    >
                      <span>Open Pod</span>
                      <ArrowRight size={13} />
                    </button>

                    {canActorManageSubTeam(currentRole, actorMemberId, st) && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-[1px] bg-[#E4E7EC]" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => openEditModal(st)}
                          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-[8px] text-[#667085] hover:text-[#101828] hover:bg-[#EAECF0] flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none"
                          title="Edit sub-team"
                          aria-label="Edit sub-team"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(st)}
                          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-[8px] text-[#667085] hover:text-[#D92D50] hover:bg-[#FEECEB] flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none"
                          title="Archive sub-team"
                          aria-label="Archive sub-team"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: ORG VIEW */}
      {viewMode === 'org' && (
        <div className="space-y-8">
          {filteredSubTeams.length === 0 ? (
            <div className="py-16 bg-white rounded-[20px] border border-[#ECEEF2] text-center text-[#667085] text-[13px] shadow-2xs">
              No sub-teams available for Org View.
            </div>
          ) : (
            filteredSubTeams.map((st) => {
              const manager = allTeamMembers.find((m) => m.id === st.managerMemberId);
              const allMembers = getSubTeamMembersWithProfiles(st.id);
              // Rule 2: A person is shown ONCE per pod: exclude manager from members list
              const members = allMembers.filter((m) => m.memberId !== st.managerMemberId);
              const clients = getSubTeamActiveClients(st.id);
              const isManagerTimerRunning = activeTimersMap.get(st.managerMemberId) || false;
              const managerOpenTasks = getManagerOpenTasks(st.managerMemberId);
              const podColor = st.color || '#D92D50';
              const connectorColor = `${podColor}55`;

              return (
                <div
                  key={st.id}
                  className="bg-white rounded-[20px] p-6 border border-[#ECEEF2] shadow-2xs space-y-6"
                >
                  {/* Pod Header Bar: colour dot, name, "Open Dashboard ->" link */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#F2F4F7]">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: podColor }}
                        aria-hidden="true"
                      />
                      <h3 className="text-[18px] font-bold text-[#101828] tracking-tight">
                        {st.name}
                      </h3>
                      <span className="text-[12px] text-[#667085] hidden sm:inline">
                        ({members.length} {members.length === 1 ? 'member' : 'members'} + manager)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubTeamId(st.id);
                        setDetailTab('overview');
                      }}
                      className="text-xs font-semibold text-[#D92D50] hover:text-[#B82340] hover:underline flex items-center gap-1 cursor-pointer min-h-[36px] px-2 py-1 rounded-[6px] focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none transition-colors"
                    >
                      <span>Open Dashboard</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Desktop / Tablet Org Tree */}
                  <div className="hidden sm:flex flex-col items-center">
                    {/* 1. Manager Card on Top: avatar 64px with crimson ring, name, "Pod manager" tag, global role in muted text */}
                    <div className="relative flex flex-col items-center p-4 bg-white rounded-[18px] border-2 border-[#101828] shadow-sm max-w-[220px] w-full text-center">
                      <PodAvatar
                        id={st.managerMemberId}
                        name={manager?.name || st.managerMemberId}
                        initials={manager?.avatarInitials}
                        avatarUrl={manager?.avatarDataUrl}
                        size="manager-org"
                        isManager={true}
                        hasActiveTimer={isManagerTimerRunning}
                        openTaskCount={managerOpenTasks}
                      />

                      <div
                        className="font-bold text-[15px] text-[#101828] truncate w-full mt-2"
                        title={manager?.name || st.managerMemberId}
                      >
                        {manager?.name || st.managerMemberId}
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#D92D50] mt-0.5">
                        Pod manager
                      </div>
                      <div className="text-[12px] text-[#667085] mt-0.5 truncate w-full" title={manager?.role}>
                        Global: {manager?.role || 'Team Member'}
                      </div>
                    </div>

                    {/* Vertical Connector Line down from manager */}
                    <div
                      className="w-[1.5px] h-6"
                      style={{ backgroundColor: connectorColor }}
                    />

                    {/* Connectors & Member Cards */}
                    {members.length > 0 ? (
                      <div className="w-full flex flex-col items-center">
                        {/* Horizontal Connector Bar (when multiple members) */}
                        {members.length > 1 && (
                          <div className="relative w-full max-w-4xl flex items-center justify-center">
                            <div
                              className="h-[1.5px] rounded-full"
                              style={{
                                backgroundColor: connectorColor,
                                width: `calc(100% - ${Math.max(120, 700 / members.length)}px)`,
                                maxWidth: '90%',
                              }}
                            />
                          </div>
                        )}

                        {/* Member Cards in a centred flex row */}
                        <div className="flex flex-wrap items-start justify-center gap-4 max-w-5xl">
                          {members.map((m) => (
                            <div key={m.memberId} className="flex flex-col items-center">
                              {/* Short vertical drop line to each member */}
                              <div
                                className="w-[1.5px] h-5 mb-1"
                                style={{ backgroundColor: connectorColor }}
                              />

                              {/* Member Card: 160-200px wide, white, radius 16px, 1px border, avatar 44px, name, role label (up to 2 lines), badges per rule 3 */}
                              <div
                                className="w-[180px] p-3.5 bg-white rounded-[16px] border border-[#ECEEF2] hover:border-[#D0D5DD] transition-all shadow-2xs flex flex-col items-center text-center"
                              >
                                <PodAvatar
                                  id={m.memberId}
                                  name={m.profile?.name || m.memberId}
                                  initials={m.profile?.avatarInitials}
                                  avatarUrl={m.profile?.avatarDataUrl}
                                  size="lg"
                                  hasActiveTimer={m.hasActiveTimer}
                                  openTaskCount={m.openTaskCount}
                                />

                                <div
                                  className="font-semibold text-[13px] text-[#101828] truncate w-full mt-2"
                                  title={m.profile?.name || m.memberId}
                                >
                                  {m.profile?.name || m.memberId}
                                </div>
                                <div
                                  className="text-[11.5px] text-[#D92D50] font-medium leading-snug mt-1 line-clamp-2 px-1 w-full"
                                  title={m.roleLabel}
                                >
                                  {m.roleLabel}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Sub-teams with no members: dashed "Add members" placeholder card that opens the existing edit form */
                      <div className="flex flex-col items-center">
                        <div
                          className="w-[1.5px] h-5 mb-1"
                          style={{ backgroundColor: connectorColor }}
                        />
                        <button
                          type="button"
                          onClick={() => openEditModal(st)}
                          className="w-[180px] p-4 rounded-[16px] border-2 border-dashed border-[#D0D5DD] hover:border-[#D92D50] hover:bg-[#FFF5F6] transition-all flex flex-col items-center justify-center text-center cursor-pointer group focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none min-h-[36px]"
                          title="Add members to this pod"
                        >
                          <div className="w-11 h-11 rounded-full bg-[#F2F4F7] group-hover:bg-[#FEECEB] text-[#667085] group-hover:text-[#D92D50] flex items-center justify-center transition-colors mb-2">
                            <Plus size={18} />
                          </div>
                          <span className="font-semibold text-[13px] text-[#344054] group-hover:text-[#D92D50] transition-colors">
                            Add members
                          </span>
                          <span className="text-[11px] text-[#667085] mt-0.5">
                            Assign team members
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mobile Org View: Simple vertical list with left rail line */}
                  <div className="sm:hidden flex flex-col space-y-4">
                    {/* Manager on top */}
                    <div className="p-3.5 bg-white rounded-[16px] border-2 border-[#101828] flex items-center gap-3">
                      <PodAvatar
                        id={st.managerMemberId}
                        name={manager?.name || st.managerMemberId}
                        initials={manager?.avatarInitials}
                        avatarUrl={manager?.avatarDataUrl}
                        size="manager-cards"
                        isManager={true}
                        hasActiveTimer={isManagerTimerRunning}
                        openTaskCount={managerOpenTasks}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#D92D50] block">
                          Pod manager
                        </span>
                        <span className="font-bold text-[14px] text-[#101828] truncate block">
                          {manager?.name || st.managerMemberId}
                        </span>
                        <span className="text-[12px] text-[#667085] truncate block">
                          Global: {manager?.role || 'Team Member'}
                        </span>
                      </div>
                    </div>

                    {/* Members on vertical rail */}
                    <div
                      className="border-l-2 pl-4 ml-6 space-y-3"
                      style={{ borderColor: connectorColor }}
                    >
                      {members.length > 0 ? (
                        members.map((m) => (
                          <div
                            key={m.memberId}
                            className="p-3 bg-white rounded-[14px] border border-[#ECEEF2] flex items-center gap-3 shadow-2xs"
                          >
                            <PodAvatar
                              id={m.memberId}
                              name={m.profile?.name || m.memberId}
                              initials={m.profile?.avatarInitials}
                              avatarUrl={m.profile?.avatarDataUrl}
                              size="lg"
                              hasActiveTimer={m.hasActiveTimer}
                              openTaskCount={m.openTaskCount}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-[13px] text-[#101828] truncate block">
                                {m.profile?.name || m.memberId}
                              </span>
                              <span className="text-[11.5px] text-[#D92D50] font-medium block leading-tight mt-0.5">
                                {m.roleLabel}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditModal(st)}
                          className="w-full p-3 rounded-[14px] border-2 border-dashed border-[#D0D5DD] hover:border-[#D92D50] flex items-center justify-center gap-2 text-xs font-semibold text-[#667085] hover:text-[#D92D50] transition-colors cursor-pointer min-h-[36px]"
                        >
                          <Plus size={15} />
                          <span>Add members to pod</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Below the tree: "Clients" strip (client chips plus capacity progress bar aligned right) */}
                  <div className="pt-5 border-t border-[#F2F4F7] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      <span className="text-[12px] font-semibold text-[#475467] shrink-0">
                        Assigned Clients ({clients.length}):
                      </span>
                      {clients.length === 0 ? (
                        <span className="text-[12px] text-[#98A2B3] italic">None</span>
                      ) : (
                        clients.map((c) => {
                          const dotPal = getAvatarPalette(c.id);
                          return (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#F8F9FA] border border-[#EAECF0] text-[#101828]"
                              title={`${c.businessName} (${c.city}, ${c.country})`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: dotPal.text }}
                                aria-hidden="true"
                              />
                              <span>{c.businessName}</span>
                            </span>
                          );
                        })
                      )}
                    </div>

                    {/* Capacity progress bar aligned right */}
                    <div className="w-full md:w-64 shrink-0">
                      <PodCapacityBar current={clients.length} max={st.maxClients} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CREATE / EDIT SUB-TEAM */}
      {/* ============================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[18px] max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-3">
              <div>
                <h3 className="text-[17px] font-bold text-[#101828]">
                  {editingSubTeam ? 'Edit Sub-team' : 'Create New Sub-team'}
                </h3>
                <p className="text-[12.5px] text-[#667085] mt-0.5">
                  Configure pod leadership, membership roles, and client capacity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F2F4F7] text-[#667085]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSubTeam} className="space-y-4 text-xs">
              {/* Name & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Pod Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Growth & Search Pod"
                    className="w-full h-[40px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-1.5 h-[40px]">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                          formColor === c ? 'ring-2 ring-offset-2 ring-[#101828] scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Manager & Max Clients */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Pod Manager *
                  </label>
                  <select
                    value={formManagerId}
                    onChange={(e) => setFormManagerId(e.target.value)}
                    required
                    className="w-full h-[40px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select Manager --</option>
                    {allTeamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                    Max Clients Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxClients}
                    onChange={(e) => setFormMaxClients(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full h-[40px] px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:outline-none"
                  />
                </div>
              </div>

              {/* Members Selection with Role Labels */}
              <div className="space-y-2 pt-2 border-t border-[#F2F4F7]">
                <label className="block text-[12px] font-semibold text-[#344054]">
                  Team Members & Custom Roles
                </label>
                <p className="text-[11.5px] text-[#667085]">
                  Select members for this pod and customize their free-text role label (e.g. "SEO Specialist", "Frontend Lead").
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-[#F8F9FA] rounded-[10px] border border-[#EAECF0]">
                  {allTeamMembers.map((tm) => {
                    const isSelected = tm.id in formSelectedMembers || tm.id === formManagerId;
                    const roleLabel = formSelectedMembers[tm.id] || (tm.id === formManagerId ? 'Pod Lead / Manager' : 'Specialist');

                    return (
                      <div
                        key={tm.id}
                        className={`p-2 rounded-[8px] flex items-center justify-between gap-3 ${
                          isSelected ? 'bg-white border border-[#D0D5DD]' : 'opacity-70'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={tm.id === formManagerId}
                            onChange={(e) => {
                              const next = { ...formSelectedMembers };
                              if (e.target.checked) {
                                next[tm.id] = 'Specialist';
                              } else {
                                delete next[tm.id];
                              }
                              setFormSelectedMembers(next);
                            }}
                            className="rounded accent-[#D92D50]"
                          />
                          <span className="font-semibold text-[13px] text-[#101828]">
                            {tm.name}
                          </span>
                          <span className="text-[11px] text-[#667085]">({tm.role})</span>
                        </label>

                        {isSelected && (
                          <input
                            type="text"
                            value={roleLabel}
                            onChange={(e) => {
                              setFormSelectedMembers({
                                ...formSelectedMembers,
                                [tm.id]: e.target.value,
                              });
                            }}
                            placeholder="Role label"
                            className="w-36 h-[30px] px-2 rounded-[6px] border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clients Selection with Move Confirmation */}
              <div className="space-y-2 pt-2 border-t border-[#F2F4F7]">
                <label className="block text-[12px] font-semibold text-[#344054]">
                  Assigned Clients
                </label>
                <p className="text-[11.5px] text-[#667085]">
                  Select client accounts managed by this pod. Clients in another pod will show a notice requiring confirmation to move.
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-[#F8F9FA] rounded-[10px] border border-[#EAECF0]">
                  {allClients.map((c) => {
                    const isSelected = formSelectedClients.includes(c.id);
                    const currentTeam = getClientActiveSubTeam(c.id);
                    const isInOtherTeam = currentTeam && currentTeam.id !== editingSubTeam?.id;

                    return (
                      <div
                        key={c.id}
                        className={`p-2 rounded-[8px] flex items-center justify-between gap-3 ${
                          isSelected ? 'bg-white border border-[#D0D5DD]' : 'opacity-80'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (isInOtherTeam && !clientMoveConfirmations[c.id]) {
                                  setPendingMoveClient({
                                    clientId: c.id,
                                    clientName: c.businessName,
                                    fromTeamName: currentTeam.name,
                                  });
                                } else {
                                  setFormSelectedClients([...formSelectedClients, c.id]);
                                }
                              } else {
                                setFormSelectedClients(formSelectedClients.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded accent-[#D92D50]"
                          />
                          <span className="font-semibold text-[13px] text-[#101828]">
                            {c.businessName}
                          </span>
                        </label>

                        {isInOtherTeam && (
                          <span className="text-[11px] font-bold text-[#B54708] bg-[#FFF4E5] px-2 py-0.5 rounded flex items-center gap-1">
                            <span>in {currentTeam.name}</span>
                            {isSelected && <span className="text-[10px] text-[#12B76A]">· confirmed</span>}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[12px] font-semibold text-[#344054] mb-1">
                  Pod Notes & Mission
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Focus areas, key competencies, or operating guidelines..."
                  className="w-full p-2.5 rounded-[10px] border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2F4F7]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-[10px] text-[#667085] hover:text-[#101828]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white font-semibold cursor-pointer shadow-2xs"
                >
                  {editingSubTeam ? 'Save Changes' : 'Create Pod'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CONFIRM CLIENT MOVE BETWEEN SUB-TEAMS */}
      {/* ============================================================= */}
      {pendingMoveClient && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-[#B54708]">
              <AlertTriangle size={20} />
              <h4 className="font-bold text-[16px] text-[#101828]">Confirm Client Reassignment</h4>
            </div>
            <p className="text-[13px] text-[#475467] leading-relaxed">
              <strong>{pendingMoveClient.clientName}</strong> is currently assigned to{' '}
              <strong>{pendingMoveClient.fromTeamName}</strong>. A client can belong to only one active sub-team.
            </p>
            <p className="text-[12px] text-[#667085] bg-[#F8F9FA] p-2.5 rounded-[8px] border border-[#EAECF0]">
              Moving them will close their previous assignment and record an immutable audit log entry.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F4F7]">
              <button
                type="button"
                onClick={() => setPendingMoveClient(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] text-[#667085] hover:text-[#101828]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormSelectedClients([...formSelectedClients, pendingMoveClient.clientId]);
                  setClientMoveConfirmations((prev) => ({
                    ...prev,
                    [pendingMoveClient.clientId]: true,
                  }));
                  setPendingMoveClient(null);
                }}
                className="px-4 py-2 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[13px] font-semibold cursor-pointer shadow-2xs"
              >
                Confirm & Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CONFIRM SUB-TEAM ARCHIVE */}
      {/* ============================================================= */}
      {subTeamToArchive && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-[#D92D50]">
              <AlertTriangle size={20} />
              <h4 className="font-bold text-[16px] text-[#101828]">Archive Sub-team</h4>
            </div>
            <p className="text-[13px] text-[#475467] leading-relaxed">
              Are you sure you want to archive <strong>"{subTeamToArchive.name}"</strong>? Active client assignments will be released and team requests will be archived. All changes will be recorded in the audit log.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F4F7]">
              <button
                type="button"
                onClick={() => setSubTeamToArchive(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] text-[#667085] hover:text-[#101828]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmArchive}
                className="px-4 py-2 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[13px] font-semibold cursor-pointer shadow-2xs"
              >
                Archive Sub-team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
