import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Globe,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Link2,
  CheckCircle,
  Plus,
  Send,
  MessageSquare,
  AlertTriangle,
  Flame,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  Lead,
  LeadStage,
  LeadActivity,
  FollowUpTask,
  ChannelType,
  ChannelStatus,
  LostReason,
} from '../../types/index.ts';
import {
  updateLead,
  getLeadActivities,
  addLeadActivity,
  addLeadChannel,
  updateLeadChannelStatus,
  getTasks,
  createTask,
  completeTask,
  logCallBooked,
} from '../../data/repo.ts';
import { calculateLeadScore } from '../../lib/logic.ts';
import { LostReasonModal } from '../pipeline/LostReasonModal.tsx';
import { NotNowModal } from '../pipeline/NotNowModal.tsx';
import { ConvertToClientModal } from '../pipeline/ConvertToClientModal.tsx';
import { PitchProposalBuilder } from '../pitch/PitchProposalBuilder.tsx';

interface LeadDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated: () => void;
  onStageChangeRequested: (lead: Lead, targetStage: LeadStage) => void;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  leadId,
  onClose,
  onLeadUpdated,
  onStageChangeRequested,
}) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Activity' | 'Channels' | 'Tasks' | 'Notes'>('Overview');
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(false);

  // New Note state
  const [newNoteText, setNewNoteText] = useState('');
  const [notesAutosaveStatus, setNotesAutosaveStatus] = useState<'Saved' | 'Saving' | ''>('');

  // Add channel state
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState<ChannelType>('Email');
  const [newChannelValue, setNewChannelValue] = useState('');
  const [channelError, setChannelError] = useState('');

  // Add task state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskPriority, setNewTaskPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');

  // Convert to Client modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [showPitchBuilder, setShowPitchBuilder] = useState(false);

  // Stage change modal helpers
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [notNowModalOpen, setNotNowModalOpen] = useState(false);

  // Load Lead data
  const loadData = async () => {
    if (!leadId) return;
    setLoading(true);
    const { getLeadById } = await import('../../data/repo.ts');
    const l = await getLeadById(leadId);
    if (l) {
      setLead(l);
      const acts = await getLeadActivities(l.id);
      setActivities(acts);
      const t = await getTasks({ leadId: l.id });
      setTasks(t);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [leadId]);

  if (!leadId || !lead) return null;

  // Handle live score criteria change
  const handleScoreCriteriaChange = async (key: keyof Lead['score']['criteria'], val: 0 | 1 | 2) => {
    const newCriteria = { ...lead.score.criteria, [key]: val };
    const newScore = calculateLeadScore(newCriteria, lead.score.disqualifiers);
    const updated = { ...lead, score: newScore };
    setLead(updated);
    await updateLead(lead.id, { score: newScore });
    await addLeadActivity({
      leadId: lead.id,
      type: 'score_changed',
      text: `Updated score criteria: ${key} to ${val}. Total: ${newScore.total} (${newScore.band}).`,
      createdBy: 'Founder',
    });
    onLeadUpdated();
    loadData();
  };

  // Handle disqualifier toggle
  const handleDisqualifierToggle = async (key: 'corporateChain' | 'fullyPublicFunded') => {
    const newDisq = { ...lead.score.disqualifiers, [key]: !lead.score.disqualifiers[key] };
    const newScore = calculateLeadScore(lead.score.criteria, newDisq);
    const updated = { ...lead, score: newScore };
    setLead(updated);
    await updateLead(lead.id, { score: newScore });
    await addLeadActivity({
      leadId: lead.id,
      type: 'score_changed',
      text: `Toggled disqualifier ${key}: ${newDisq[key] ? 'Enabled' : 'Disabled'}.`,
      createdBy: 'Founder',
    });
    onLeadUpdated();
    loadData();
  };

  // Handle Note add
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    await addLeadActivity({
      leadId: lead.id,
      type: 'note',
      text: newNoteText.trim(),
      createdBy: 'Founder',
    });

    setNewNoteText('');
    loadData();
    onLeadUpdated();
  };

  // Handle Lead free-form notes autosave
  const handleNotesChange = (text: string) => {
    setNotesAutosaveStatus('Saving');
    setLead({ ...lead, notes: text });

    // Debounce save
    const timeout = setTimeout(async () => {
      await updateLead(lead.id, { notes: text });
      setNotesAutosaveStatus('Saved');
      setTimeout(() => setNotesAutosaveStatus(''), 2000);
      onLeadUpdated();
    }, 600);

    return () => clearTimeout(timeout);
  };

  // Add Channel handler
  const handleAddChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChannelError('');
    if (!newChannelValue.trim()) return;

    const res = await addLeadChannel(lead.id, {
      type: newChannelType,
      value: newChannelValue.trim(),
      status: 'Not contacted',
    });

    if (!res.success) {
      setChannelError(res.error || 'Failed to add channel.');
      return;
    }

    setNewChannelValue('');
    setShowAddChannel(false);
    loadData();
    onLeadUpdated();
  };

  // Log Message Sent
  const handleLogMessageSent = async (channelId: string, channelType: ChannelType) => {
    await updateLeadChannelStatus(lead.id, channelId, 'Contacted');
    await addLeadActivity({
      leadId: lead.id,
      type: 'message_sent',
      channel: channelType,
      text: `Logged message sent via ${channelType}.`,
      createdBy: 'Founder',
    });
    if (lead.stage === 'New Lead') {
      onStageChangeRequested(lead, 'Contacted');
    }
    loadData();
    onLeadUpdated();
  };

  // Log Reply
  const handleLogReply = async (channelId: string, channelType: ChannelType) => {
    await updateLeadChannelStatus(lead.id, channelId, 'Replied');
    await addLeadActivity({
      leadId: lead.id,
      type: 'reply_received',
      channel: channelType,
      text: `Logged reply received via ${channelType}.`,
      createdBy: 'Founder',
    });
    onStageChangeRequested(lead, 'Replied');
    loadData();
    onLeadUpdated();
  };

  // Handle Add Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    await createTask({
      leadId: lead.id,
      leadBusinessName: lead.businessName,
      taskText: newTaskText.trim(),
      dueDate: newTaskDueDate,
      priority: newTaskPriority,
      sourceTag: 'Manual',
      assignedTo: lead.assignedTo,
    });

    setNewTaskText('');
    setShowAddTask(false);
    loadData();
    onLeadUpdated();
  };

  const handleToggleTask = async (taskId: string) => {
    await completeTask(taskId);
    loadData();
    onLeadUpdated();
  };

  // Log Call Booked (Phase 2 Fix 3)
  const [callBookedSuccess, setCallBookedSuccess] = useState('');
  const handleLogCallBooked = async () => {
    if (!lead) return;
    await logCallBooked(lead.id);
    setCallBookedSuccess('Call booked & sales meeting scheduled!');
    setTimeout(() => setCallBookedSuccess(''), 3500);
    loadData();
    onLeadUpdated();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer (520px) */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-[520px] bg-[#FBFBFB] shadow-2xl border-l border-black/10 z-50 flex flex-col animate-in slide-in-from-right duration-200"
        aria-label="Lead details drawer"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-black/5 bg-white">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold tracking-wider text-[#A8A5A5] uppercase">
                  {lead.specialty} · {lead.city}, {lead.country}
                </span>
                {lead.score.isDisqualified && (
                  <span className="px-2 py-0.2 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full">
                    Disqualified
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-[#111111] truncate">
                {lead.businessName}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F1EFEF] hover:bg-[#E7E2E2] flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Score & Stage Row */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Score Badge */}
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  lead.score.isDisqualified
                    ? 'bg-gray-100 text-gray-600'
                    : lead.score.band === 'HOT'
                    ? 'bg-[#D92D50] text-white shadow-xs'
                    : lead.score.band === 'WARM'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {!lead.score.isDisqualified && lead.score.band === 'HOT' && (
                  <Flame size={13} className="fill-white" />
                )}
                <span>
                  {lead.score.isDisqualified ? 'DISQUALIFIED' : lead.score.band}{' '}
                  {lead.score.total}/14
                </span>
              </div>

              {/* Log call booked button / indicator */}
              {lead.callBookedAt ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                  <Calendar size={12} className="text-emerald-600" />
                  <span>Call Booked</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleLogCallBooked}
                  className="px-3 py-1 rounded-full bg-white hover:bg-black/5 text-[#111111] border border-black/15 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-102"
                >
                  <Phone size={12} className="text-[#D92D50]" />
                  <span>Log call booked</span>
                </button>
              )}

              {/* Create Pitch button */}
              <button
                type="button"
                onClick={() => setShowPitchBuilder(true)}
                className="px-3 py-1 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-102"
                title="Create a website pitch and proposal for this prospect"
              >
                <Sparkles size={12} className="text-amber-400" />
                <span>Create pitch</span>
              </button>

              {/* Convert to Client button if Won */}
              {lead.stage === 'Won' && (
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(true)}
                  className="px-3 py-1 rounded-full bg-[#D92D50] text-white text-xs font-bold hover:bg-[#C42447] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <span>Convert to Client</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>

            {/* Stage Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#A8A5A5] font-semibold">Stage:</span>
              <select
                value={lead.stage}
                onChange={(e) => onStageChangeRequested(lead, e.target.value as LeadStage)}
                className="text-xs font-bold text-[#111111] bg-[#F1EFEF] px-2.5 py-1 rounded-lg border border-black/10 focus:outline-none focus:border-[#D92D50] cursor-pointer"
              >
                {(
                  [
                    'New Lead',
                    'Contacted',
                    'Replied',
                    'Audit Sent',
                    'Concept Shown',
                    'Interested',
                    'Proposal Sent',
                    'Won',
                    'Not Now',
                    'Lost',
                  ] as LeadStage[]
                ).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {callBookedSuccess && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              <span>{callBookedSuccess}</span>
            </div>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-black/5 px-6 bg-white gap-4 text-xs font-semibold select-none">
          {(['Overview', 'Activity', 'Channels', 'Tasks', 'Notes'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 transition-colors relative cursor-pointer ${
                  isActive ? 'text-[#D92D50] font-bold' : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                <span>{tab}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D92D50]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Business Facts Card */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-3">
                <div className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Business Attributes
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#A8A5A5] block">Decision Maker</span>
                    <span className="font-semibold text-[#111111]">
                      {lead.ownerName} ({lead.ownerRole})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8A5A5] block">Location</span>
                    <span className="font-semibold text-[#111111]">
                      {lead.city}, {lead.country}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8A5A5] block">Website State</span>
                    <span className="font-semibold text-[#111111] capitalize">
                      {lead.hasWebsite.replace('-', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8A5A5] block">Google Reviews</span>
                    <span className="font-semibold text-[#111111] inline-flex items-center gap-1">
                      <Star size={11} className="text-amber-500 fill-amber-500" />
                      <span>{lead.googleRating} ({lead.googleReviewCount} reviews)</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8A5A5] block">GBP Listing</span>
                    <span className="font-semibold text-[#111111] capitalize">
                      {lead.gbpStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8A5A5] block">Lead Source</span>
                    <span className="font-semibold text-[#111111]">
                      {lead.source}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8A5A5] block">Assigned Specialist</span>
                    <span className="font-semibold text-[#111111]">
                      {lead.assignedTo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8A5A5] block">Added on</span>
                    <span className="font-semibold text-[#111111]">
                      {lead.createdAt}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Fields Card */}
              {lead.customFields && Object.keys(lead.customFields).length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-3">
                  <div className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Custom Fields
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {Object.entries(lead.customFields).map(([k, val]) => (
                      <div key={k}>
                        <span className="text-[#A8A5A5] block capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-[#111111]">
                          {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead Score Criteria Editor (Live Total) */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                      Lead Scoring Model (7 Criteria)
                    </div>
                    <div className="text-[11px] text-[#A8A5A5]">
                      Live total: <span className="font-bold text-[#111111]">{lead.score.total}/14 points</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      lead.score.band === 'HOT'
                        ? 'bg-[#FCE9ED] text-[#D92D50]'
                        : lead.score.band === 'WARM'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {lead.score.band}
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {[
                    { key: 'privateServices', label: '1. Private / Self-pay Services' },
                    { key: 'googleReviews', label: '2. Google Reviews (2 = 30+ & 4.5+)' },
                    { key: 'websiteGap', label: '3. Website Gap (2 = none/facebook)' },
                    { key: 'gbpGaps', label: '4. Google Business Profile Gaps' },
                    { key: 'ownerAccessibility', label: '5. Named Owner Accessibility' },
                    { key: 'recentActivity', label: '6. Recent Activity (<3 months)' },
                    { key: 'scaleFit', label: '7. Scale / Prime Catchment Fit' },
                  ].map((crit) => {
                    const k = crit.key as keyof Lead['score']['criteria'];
                    const currentVal = lead.score.criteria[k];
                    return (
                      <div key={crit.key} className="flex items-center justify-between text-xs py-1 border-b border-black/5">
                        <span className="text-[#6B6B6B] font-medium">{crit.label}</span>
                        <div className="flex items-center gap-1">
                          {([0, 1, 2] as const).map((pts) => (
                            <button
                              key={pts}
                              type="button"
                              onClick={() => handleScoreCriteriaChange(k, pts)}
                              className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                                currentVal === pts
                                  ? 'bg-[#111111] text-white'
                                  : 'bg-[#F1EFEF] text-[#6B6B6B] hover:text-[#111111]'
                              }`}
                            >
                              {pts}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Disqualifiers */}
                <div className="pt-2 border-t border-black/5 space-y-2">
                  <div className="text-[11px] font-bold text-[#A8A5A5] uppercase tracking-wider">
                    Disqualifier Overrides
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#111111] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lead.score.disqualifiers.corporateChain}
                      onChange={() => handleDisqualifierToggle('corporateChain')}
                      className="rounded accent-[#D92D50]"
                    />
                    <span>Corporate chain branch / franchise</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#111111] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lead.score.disqualifiers.fullyPublicFunded}
                      onChange={() => handleDisqualifierToggle('fullyPublicFunded')}
                      className="rounded accent-[#D92D50]"
                    />
                    <span>Fully public / state-subsidised enterprise</span>
                  </label>
                </div>

                <div className="p-2.5 bg-[#F4F2F2] rounded-xl text-[11px] text-[#6B6B6B]">
                  Score weights are calibrated against actual qualification outcomes.
                </div>
              </div>

              {/* Milestone Dates */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs space-y-2">
                <div className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Funnel Milestones
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#6B6B6B]">
                  <div>Contacted: <span className="font-semibold text-[#111111]">{lead.contactedAt || '—'}</span></div>
                  <div>Replied: <span className="font-semibold text-[#111111]">{lead.repliedAt || '—'}</span></div>
                  <div>Audit Sent: <span className="font-semibold text-[#111111]">{lead.auditSentAt || '—'}</span></div>
                  <div>Concept Shown: <span className="font-semibold text-[#111111]">{lead.conceptShownAt || '—'}</span></div>
                  <div>Interested: <span className="font-semibold text-[#111111]">{lead.interestedAt || '—'}</span></div>
                  <div>Proposal Sent: <span className="font-semibold text-[#111111]">{lead.proposalSentAt || '—'}</span></div>
                  <div>Won: <span className="font-semibold text-[#111111]">{lead.wonAt || '—'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVITY TIMELINE */}
          {activeTab === 'Activity' && (
            <div className="space-y-4">
              {/* Add Note Input */}
              <form onSubmit={handleAddNote} className="bg-white rounded-2xl p-3 border border-black/5 shadow-xs">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Log an activity note or observation..."
                    className="flex-1 text-xs px-3 py-2 bg-[#F1EFEF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Add note
                  </button>
                </div>
              </form>

              {/* Timeline */}
              <div className="space-y-3 relative before:content-[''] before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-black/10 pl-8">
                {activities.length === 0 ? (
                  <div className="text-xs text-[#A8A5A5] py-4">No logged activity yet.</div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="relative group text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#111111] border-2 border-white ring-1 ring-black/15" />
                      <div className="bg-white rounded-xl p-3 border border-black/5 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#111111] capitalize">
                            {act.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-[#A8A5A5]">{act.createdAt}</span>
                        </div>
                        <p className="text-[#6B6B6B]">{act.text}</p>
                        <div className="text-[10px] text-[#A8A5A5] mt-1">by {act.createdBy}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHANNELS */}
          {activeTab === 'Channels' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Contact Channels
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddChannel(!showAddChannel)}
                  className="px-3 py-1 bg-white hover:bg-[#FCE9ED] hover:text-[#D92D50] text-[#111111] text-xs font-semibold rounded-full border border-black/10 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add channel</span>
                </button>
              </div>

              {/* Add Channel Form */}
              {showAddChannel && (
                <form
                  onSubmit={handleAddChannelSubmit}
                  className="bg-white p-3.5 rounded-2xl border border-black/10 shadow-xs space-y-3"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B6B6B] block mb-1">Type</label>
                      <select
                        value={newChannelType}
                        onChange={(e) => setNewChannelType(e.target.value as ChannelType)}
                        className="w-full text-xs p-2 rounded-xl border border-black/10 bg-[#F1EFEF]"
                      >
                        <option value="Email">Email</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Phone">Phone</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Instagram">Instagram</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-[#6B6B6B] block mb-1">Value</label>
                      <input
                        type="text"
                        value={newChannelValue}
                        onChange={(e) => setNewChannelValue(e.target.value)}
                        placeholder="e.g. info@business.ie or +353 1..."
                        className="w-full text-xs p-2 rounded-xl border border-black/10"
                        required
                      />
                    </div>
                  </div>

                  {channelError && (
                    <div className="text-[11px] text-[#D92D50] font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} />
                      <span>{channelError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddChannel(false)}
                      className="px-3 py-1 text-xs text-[#6B6B6B]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#111111] text-white text-xs font-bold rounded-xl"
                    >
                      Save channel
                    </button>
                  </div>
                </form>
              )}

              {/* Channels List */}
              <div className="space-y-2.5">
                {lead.channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-xs flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#F1EFEF] flex items-center justify-center text-xs font-bold text-[#111111]">
                          {ch.type === 'Email' ? (
                            <Mail size={13} />
                          ) : ch.type === 'Phone' || ch.type === 'WhatsApp' ? (
                            <Phone size={13} />
                          ) : (
                            <Link2 size={13} />
                          )}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-[#111111]">{ch.value}</span>
                          <span className="text-[10px] text-[#A8A5A5] block capitalize">
                            {ch.type} · Last contacted: {ch.lastContactedAt || 'Never'}
                          </span>
                        </div>
                      </div>

                      {/* Status Chip */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ch.status === 'Replied'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ch.status === 'Contacted'
                            ? 'bg-blue-100 text-blue-800'
                            : ch.status === 'Opted out'
                            ? 'bg-[#FCE9ED] text-[#D92D50]'
                            : ch.status === 'Bounced'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ch.status}
                      </span>
                    </div>

                    {/* Action buttons: Log message sent / Log reply */}
                    <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                      <button
                        type="button"
                        onClick={() => handleLogMessageSent(ch.id, ch.type)}
                        className="px-2.5 py-1 bg-[#F1EFEF] hover:bg-black hover:text-white rounded-lg text-[11px] font-semibold text-[#111111] transition-colors cursor-pointer"
                      >
                        Log message sent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLogReply(ch.id, ch.type)}
                        className="px-2.5 py-1 bg-[#FCE9ED] hover:bg-[#D92D50] hover:text-white rounded-lg text-[11px] font-semibold text-[#D92D50] transition-colors cursor-pointer"
                      >
                        Log reply
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Opt out ${ch.value}? This will add it to the Suppression List and cancel all tasks.`)) {
                            await updateLeadChannelStatus(lead.id, ch.id, 'Opted out');
                            loadData();
                            onLeadUpdated();
                          }
                        }}
                        className="ml-auto text-[10px] text-[#A8A5A5] hover:text-[#D92D50] cursor-pointer"
                      >
                        Opt out
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TASKS */}
          {activeTab === 'Tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Action Tasks for this Lead
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddTask(!showAddTask)}
                  className="px-3 py-1 bg-white hover:bg-[#FCE9ED] hover:text-[#D92D50] text-[#111111] text-xs font-semibold rounded-full border border-black/10 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add task</span>
                </button>
              </div>

              {/* Add Task Form */}
              {showAddTask && (
                <form
                  onSubmit={handleCreateTask}
                  className="bg-white p-3.5 rounded-2xl border border-black/10 shadow-xs space-y-3"
                >
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B6B6B] block mb-1">Task description</label>
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      placeholder="e.g. Review updated booking button URL..."
                      className="w-full text-xs p-2 rounded-xl border border-black/10"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B6B6B] block mb-1">Due date</label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-black/10"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B6B6B] block mb-1">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                        className="w-full text-xs p-2 rounded-xl border border-black/10 bg-[#F1EFEF]"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTask(false)}
                      className="px-3 py-1 text-xs text-[#6B6B6B]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#111111] text-white text-xs font-bold rounded-xl"
                    >
                      Save task
                    </button>
                  </div>
                </form>
              )}

              {/* Task rows */}
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-xs text-[#A8A5A5] py-4">No tasks linked to this lead.</div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                        t.status === 'Completed'
                          ? 'bg-gray-50 border-black/5 opacity-60'
                          : 'bg-white border-black/5 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={t.status === 'Completed'}
                          onChange={() => handleToggleTask(t.id)}
                          className="rounded accent-[#D92D50] cursor-pointer"
                        />
                        <div>
                          <div
                            className={`font-semibold ${
                              t.status === 'Completed' ? 'line-through text-[#A8A5A5]' : 'text-[#111111]'
                            }`}
                          >
                            {t.taskText}
                          </div>
                          <div className="text-[10px] text-[#A8A5A5]">
                            Due: {t.dueDate} · {t.sourceTag}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.priority === 'Urgent'
                            ? 'bg-[#D92D50] text-white'
                            : t.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: FREE-FORM NOTES (AUTOSAVE) */}
          {activeTab === 'Notes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Client Strategy Notes
                </span>
                {notesAutosaveStatus && (
                  <span className="text-[11px] font-semibold text-emerald-600 animate-pulse">
                    {notesAutosaveStatus}
                  </span>
                )}
              </div>

              <textarea
                rows={12}
                value={lead.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Write free-form strategy notes, owner requirements, objections, or proposal talking points..."
                className="w-full text-xs p-3.5 rounded-2xl bg-white border border-black/10 focus:border-[#D92D50] focus:outline-none shadow-xs leading-relaxed"
              />
              <div className="text-[11px] text-[#A8A5A5]">
                Edits autosave continuously to the repository.
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Convert to Client Modal */}
      <ConvertToClientModal
        isOpen={convertModalOpen}
        lead={lead}
        onClose={() => setConvertModalOpen(false)}
        onConverted={() => {
          loadData();
          onLeadUpdated();
        }}
      />

      {/* Pitch Proposal Builder Modal */}
      {showPitchBuilder && (
        <PitchProposalBuilder
          initialData={{
            leadId: lead.id,
            prospectName: lead.businessName,
            websiteUrl: '',
            niche: lead.specialty || 'General',
            phone: lead.channels?.find((c) => c.type === 'Phone')?.value || '',
            email: lead.channels?.find((c) => c.type === 'Email')?.value || '',
          }}
          isAdmin={true}
          onClose={() => setShowPitchBuilder(false)}
          onProposalSaved={() => {
            setShowPitchBuilder(false);
            loadData();
            onLeadUpdated();
          }}
        />
      )}
    </>
  );
};
