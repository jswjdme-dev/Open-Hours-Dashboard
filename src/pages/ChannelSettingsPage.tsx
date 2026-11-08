import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layers,
  Plus,
  Mail,
  Linkedin,
  Phone,
  MessageCircle,
  Send,
  Share2,
  Instagram,
  Facebook,
  Globe,
  GripVertical,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  OutreachChannel,
  ChannelPipelineStage,
  StageType,
} from '../types/index.ts';
import {
  getOutreachChannels,
  createOutreachChannel,
  updateOutreachChannel,
  archiveOutreachChannel,
  getChannelStages,
  createChannelStage,
  updateChannelStage,
  reorderChannelStages,
  archiveChannelStage,
  getDefaultStageTemplate,
} from '../data/repo.ts';

interface SortableStageItemProps {
  stage: ChannelPipelineStage;
  onEdit: (stage: ChannelPipelineStage) => void;
  onArchive: (stage: ChannelPipelineStage) => void;
}

const SortableStageItem: React.FC<SortableStageItemProps> = ({ stage, onEdit, onArchive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const getStageTypeBadge = (type: StageType) => {
    switch (type) {
      case 'Won':
        return <span className="text-[11px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">Won</span>;
      case 'Lost':
        return <span className="text-[11px] font-semibold text-[#D92D50] bg-[#FCE9ED] px-2 py-0.5 rounded-full">Lost (Requires Reason)</span>;
      case 'NotNow':
        return <span className="text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">Not Now (Requires Date)</span>;
      case 'Replied':
        return <span className="text-[11px] font-semibold text-[#2563EB] bg-[#DBEAFE] px-2 py-0.5 rounded-full">Replied (Cancels Tasks)</span>;
      default:
        return <span className="text-[11px] font-semibold text-[#4B5563] bg-[#F3F4F6] px-2 py-0.5 rounded-full">Open</span>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3.5 bg-white border border-black/10 rounded-2xl shadow-2xs transition-all ${
        isDragging ? 'shadow-md border-black/30' : 'hover:border-black/20'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-[#9CA3AF] hover:text-[#111111] cursor-grab active:cursor-grabbing rounded hover:bg-[#F3F4F6] transition-colors"
          title="Drag to reorder"
          aria-label={`Drag to reorder ${stage.name}`}
        >
          <GripVertical size={16} />
        </button>

        <span className="w-6 h-6 rounded-full bg-[#F3F4F6] text-[#6B7280] text-xs font-semibold flex items-center justify-center shrink-0">
          {stage.order + 1}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#111111] truncate">{stage.name}</span>
            {getStageTypeBadge(stage.type)}
          </div>
          <div className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-2">
            {stage.requiresReason && <span>• Requires Lost Reason</span>}
            {stage.requiresDate && <span>• Requires Follow-up Date</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-3">
        <button
          type="button"
          onClick={() => onEdit(stage)}
          className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
          title="Edit stage"
        >
          <Edit2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => onArchive(stage)}
          className="p-1.5 text-[#9CA3AF] hover:text-[#D92D50] hover:bg-[#FCE9ED] rounded-lg transition-colors cursor-pointer"
          title="Archive stage"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const ChannelSettingsPage: React.FC<{
  onNavigateToFollowUpSettings?: () => void;
  onNavigateToTasks?: () => void;
}> = ({ onNavigateToFollowUpSettings, onNavigateToTasks }) => {
  const [channels, setChannels] = useState<OutreachChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [stages, setStages] = useState<ChannelPipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'channels' | 'stages'
  const [activeTab, setActiveTab] = useState<'channels' | 'stages'>('channels');

  // Channel modal
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<OutreachChannel | null>(null);
  const [channelName, setChannelName] = useState('');
  const [channelIcon, setChannelIcon] = useState('Mail');
  const [channelColor, setChannelColor] = useState('#2563EB');
  const [channelActive, setChannelActive] = useState(true);
  const [channelThrottling, setChannelThrottling] = useState('');
  const [channelDailyCap, setChannelDailyCap] = useState<number | ''>('');

  // Stage modal
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ChannelPipelineStage | null>(null);
  const [stageName, setStageName] = useState('');
  const [stageType, setStageType] = useState<StageType>('Open');
  const [stageRequiresReason, setStageRequiresReason] = useState(false);
  const [stageRequiresDate, setStageRequiresDate] = useState(false);

  // Archive error dialog
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Template preview
  const [defaultTemplate, setDefaultTemplate] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadData = async () => {
    setLoading(true);
    const chans = await getOutreachChannels();
    setChannels(chans);
    const currentId = selectedChannelId && chans.some((c) => c.id === selectedChannelId)
      ? selectedChannelId
      : chans[0]?.id || '';
    setSelectedChannelId(currentId);

    if (currentId) {
      const stgs = await getChannelStages(currentId);
      setStages(stgs);
    }
    const tpl = await getDefaultStageTemplate();
    setDefaultTemplate(tpl);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectChannel = async (chanId: string) => {
    setSelectedChannelId(chanId);
    const stgs = await getChannelStages(chanId);
    setStages(stgs);
  };

  // Channel Form Handlers
  const handleOpenAddChannel = () => {
    setEditingChannel(null);
    setChannelName('');
    setChannelIcon('Mail');
    setChannelColor('#2563EB');
    setChannelActive(true);
    setChannelThrottling('');
    setChannelDailyCap('');
    setChannelModalOpen(true);
  };

  const handleOpenEditChannel = (ch: OutreachChannel) => {
    setEditingChannel(ch);
    setChannelName(ch.name);
    setChannelIcon(ch.icon);
    setChannelColor(ch.color);
    setChannelActive(ch.active);
    setChannelThrottling(ch.throttlingNote || '');
    setChannelDailyCap(ch.dailyCap ?? '');
    setChannelModalOpen(true);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    if (editingChannel) {
      await updateOutreachChannel(editingChannel.id, {
        name: channelName.trim(),
        icon: channelIcon,
        color: channelColor,
        active: channelActive,
        throttlingNote: channelThrottling.trim() || undefined,
        dailyCap: channelDailyCap === '' ? null : Number(channelDailyCap),
      });
    } else {
      const created = await createOutreachChannel({
        name: channelName.trim(),
        icon: channelIcon,
        color: channelColor,
        active: channelActive,
        throttlingNote: channelThrottling.trim() || undefined,
        dailyCap: channelDailyCap === '' ? null : Number(channelDailyCap),
      });
      setSelectedChannelId(created.id);
    }

    setChannelModalOpen(false);
    await loadData();
  };

  const handleArchiveChannel = async (ch: OutreachChannel) => {
    if (!confirm(`Are you sure you want to archive outreach channel "${ch.name}"?`)) return;
    await archiveOutreachChannel(ch.id);
    await loadData();
  };

  // Stage Form Handlers
  const handleOpenAddStage = () => {
    setEditingStage(null);
    setStageName('');
    setStageType('Open');
    setStageRequiresReason(false);
    setStageRequiresDate(false);
    setStageModalOpen(true);
  };

  const handleOpenEditStage = (stg: ChannelPipelineStage) => {
    setEditingStage(stg);
    setStageName(stg.name);
    setStageType(stg.type);
    setStageRequiresReason(Boolean(stg.requiresReason));
    setStageRequiresDate(Boolean(stg.requiresDate));
    setStageModalOpen(true);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim() || !selectedChannelId) return;

    if (editingStage) {
      await updateChannelStage(editingStage.id, {
        name: stageName.trim(),
        type: stageType,
        requiresReason: stageType === 'Lost' ? true : stageRequiresReason,
        requiresDate: stageType === 'NotNow' ? true : stageRequiresDate,
      });
    } else {
      await createChannelStage(selectedChannelId, {
        name: stageName.trim(),
        type: stageType,
        requiresReason: stageType === 'Lost' ? true : stageRequiresReason,
        requiresDate: stageType === 'NotNow' ? true : stageRequiresDate,
      });
    }

    setStageModalOpen(false);
    const updated = await getChannelStages(selectedChannelId);
    setStages(updated);
  };

  const handleArchiveStage = async (stg: ChannelPipelineStage) => {
    const res = await archiveChannelStage(stg.id);
    if (!res.success) {
      setArchiveError(res.error || 'Failed to archive stage');
      return;
    }
    const updated = await getChannelStages(selectedChannelId);
    setStages(updated);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newStages = arrayMove(stages, oldIndex, newIndex);
    setStages(newStages);

    const orderedIds = newStages.map((s) => s.id);
    await reorderChannelStages(selectedChannelId, orderedIds);
  };

  const iconOptions = [
    { id: 'Mail', label: 'Email', icon: Mail },
    { id: 'Linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'Phone', label: 'Phone', icon: Phone },
    { id: 'MessageCircle', label: 'WhatsApp', icon: MessageCircle },
    { id: 'Instagram', label: 'Instagram', icon: Instagram },
    { id: 'Facebook', label: 'Facebook', icon: Facebook },
    { id: 'Send', label: 'Direct Message', icon: Send },
    { id: 'Globe', label: 'Web / Portal', icon: Globe },
    { id: 'Share2', label: 'Other Channel', icon: Share2 },
  ];

  const colorOptions = [
    '#2563EB', '#0A66C2', '#16A34A', '#25D366', '#E1306C', '#1877F2', '#D92D50', '#8B5CF6', '#F59E0B', '#111111'
  ];

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Channel Settings
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#F3F4F6] text-[#6B7280] rounded-full border border-black/5">
              Outreach Governance
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure outreach channels, custom per-channel pipeline stages, throttling caps, and delivery rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTasks && (
            <button
              type="button"
              onClick={onNavigateToTasks}
              className="px-3.5 py-2 rounded-full border border-black/10 bg-white hover:bg-gray-50 text-xs font-semibold text-[#111111] cursor-pointer transition-colors"
            >
              ← Tasks & Reminders
            </button>
          )}
          {onNavigateToFollowUpSettings && (
            <button
              type="button"
              onClick={onNavigateToFollowUpSettings}
              className="px-3.5 py-2 rounded-full border border-black/10 bg-white hover:bg-gray-50 text-xs font-semibold text-[#111111] cursor-pointer transition-colors"
            >
              Follow-up Settings →
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAddChannel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2 border border-black/5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'channels'
              ? 'bg-[#111111] text-white shadow-2xs'
              : 'text-[#6B7280] hover:text-[#111111]'
          }`}
        >
          Outreach Channels ({channels.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stages')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'stages'
              ? 'bg-[#111111] text-white shadow-2xs'
              : 'text-[#6B7280] hover:text-[#111111]'
          }`}
        >
          Pipeline Stages per Channel
        </button>
      </div>

      {/* Tab 1: Channels List */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs flex items-center justify-between gap-3 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-[#2563EB] shrink-0" />
              <span>
                <strong>Data-driven channels:</strong> Outreach channels are stored as data. Leads can be reached across multiple channels without hardcoded limits.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((chan) => {
              const IconComp = iconOptions.find((i) => i.id === chan.icon)?.icon || Send;
              return (
                <div
                  key={chan.id}
                  className="bg-white rounded-3xl p-5 border border-black/10 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-2xs"
                          style={{ backgroundColor: chan.color }}
                        >
                          <IconComp size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#111111] leading-tight">{chan.name}</h3>
                          <span className="text-[11px] text-[#9CA3AF] font-mono">ID: {chan.id}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          chan.active
                            ? 'bg-[#DCFCE7] text-[#16A34A]'
                            : 'bg-[#F3F4F6] text-[#9CA3AF]'
                        }`}
                      >
                        {chan.active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#6B7280] bg-[#F9FAFB] p-3 rounded-2xl border border-black/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#9CA3AF]">Daily Cap:</span>
                        <span className="font-semibold text-[#111111]">
                          {chan.dailyCap ? `${chan.dailyCap} messages/day` : 'No daily cap'}
                        </span>
                      </div>
                      {chan.throttlingNote && (
                        <div>
                          <span className="text-[#9CA3AF] block mb-0.5">Throttling Rule:</span>
                          <span className="text-[#374151] italic text-[11px]">{chan.throttlingNote}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannelId(chan.id);
                        setActiveTab('stages');
                        getChannelStages(chan.id).then(setStages);
                      }}
                      className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Configure stages</span>
                      <ArrowRight size={12} />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditChannel(chan)}
                        className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
                        title="Edit channel"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveChannel(chan)}
                        className="p-1.5 text-[#9CA3AF] hover:text-[#D92D50] hover:bg-[#FCE9ED] rounded-lg transition-colors cursor-pointer"
                        title="Archive channel"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Pipeline Stages per Channel */}
      {activeTab === 'stages' && (
        <div className="space-y-6">
          {/* Channel Selector Header */}
          <div className="bg-white rounded-3xl p-5 border border-black/10 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1.5">
                  Select Channel to Configure:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleSelectChannel(ch.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        selectedChannelId === ch.id
                          ? 'bg-[#111111] text-white shadow-2xs'
                          : 'bg-[#F3F4F6] text-[#6B7280] hover:text-[#111111]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span>{ch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddStage}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Add Stage to {selectedChannel?.name || 'Channel'}</span>
              </button>
            </div>

            {selectedChannel && (
              <div className="bg-[#F9FAFB] rounded-2xl p-3.5 border border-black/5 flex items-center justify-between gap-3 text-xs text-[#6B7280]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedChannel.color }} />
                  <span>
                    Configuring <strong>{selectedChannel.name}</strong> ({stages.length} stages). Drag stages to reorder sequence. Editing this channel never alters other channels or the template.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Draggable Stages List */}
          <div className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {stages.map((stage) => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      onEdit={handleOpenEditStage}
                      onArchive={handleArchiveStage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {stages.length === 0 && (
              <div className="py-12 text-center text-sm text-[#6B7280] bg-white rounded-3xl border border-black/5">
                No stages found for this channel. Click &ldquo;Add Stage&rdquo; above.
              </div>
            )}
          </div>

          {/* Default Template Reference */}
          <div className="bg-white rounded-3xl p-5 border border-black/10 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-[#111111] flex items-center gap-2">
              <Layers size={14} />
              <span>Default Stage Template Reference</span>
            </h4>
            <p className="text-xs text-[#6B7280]">
              New outreach channels are automatically pre-populated with copies of this template:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {defaultTemplate.map((tpl, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-[#F3F4F6] border border-black/5 rounded-xl text-xs font-semibold text-[#374151]"
                >
                  {tpl.order + 1}. {tpl.name} ({tpl.type})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Channel Create/Edit Modal */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <h3 className="text-base font-bold text-[#111111]">
              {editingChannel ? `Edit Channel: ${editingChannel.name}` : 'Create Outreach Channel'}
            </h3>

            <form onSubmit={handleSaveChannel} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Channel Name <span className="text-[#D92D50]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cold email, WhatsApp Direct, LinkedIn InMail"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full text-xs bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Icon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {iconOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setChannelIcon(opt.id)}
                        className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                          channelIcon === opt.id
                            ? 'bg-[#111111] text-white border-black'
                            : 'bg-[#F9FAFB] text-[#4B5563] border-black/10 hover:border-black/30'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChannelColor(c)}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-all ${
                        channelColor === c ? 'ring-2 ring-offset-2 ring-black scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    Daily Cap (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    placeholder="e.g. 30"
                    value={channelDailyCap}
                    onChange={(e) => setChannelDailyCap(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2 focus:outline-hidden focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    Channel Status
                  </label>
                  <select
                    value={channelActive ? 'active' : 'paused'}
                    onChange={(e) => setChannelActive(e.target.value === 'active')}
                    className="w-full text-xs bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2 focus:outline-hidden focus:border-black"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Throttling Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Max 15 connection messages per account"
                  value={channelThrottling}
                  onChange={(e) => setChannelThrottling(e.target.value)}
                  className="w-full text-xs bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2 focus:outline-hidden focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setChannelModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold text-[#6B7280] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold cursor-pointer"
                >
                  {editingChannel ? 'Save Changes' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage Create/Edit Modal */}
      {stageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <h3 className="text-base font-bold text-[#111111]">
              {editingStage ? `Edit Stage: ${editingStage.name}` : `Add Stage to ${selectedChannel?.name}`}
            </h3>

            <form onSubmit={handleSaveStage} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Stage Name <span className="text-[#D92D50]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Sent, Demo Booked, Follow-up 1"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full text-xs bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Stage Type
                </label>
                <select
                  value={stageType}
                  onChange={(e) => {
                    const val = e.target.value as StageType;
                    setStageType(val);
                    if (val === 'Lost') setStageRequiresReason(true);
                    if (val === 'NotNow') setStageRequiresDate(true);
                  }}
                  className="w-full text-xs bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-black"
                >
                  <option value="Open">Open (In-flight pipeline stage)</option>
                  <option value="Replied">Replied (Cancels sequence tasks)</option>
                  <option value="Won">Won (Deal closed / Convert to client)</option>
                  <option value="Lost">Lost (Requires lost reason)</option>
                  <option value="NotNow">Not Now (Requires follow-up date)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1 bg-[#F9FAFB] p-3 rounded-2xl border border-black/5 text-xs text-[#374151]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stageType === 'Lost' || stageRequiresReason}
                    disabled={stageType === 'Lost'}
                    onChange={(e) => setStageRequiresReason(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#D92D50]"
                  />
                  <span>Require Lost Reason on transition (Price, Trust, No need, etc.)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stageType === 'NotNow' || stageRequiresDate}
                    disabled={stageType === 'NotNow'}
                    onChange={(e) => setStageRequiresDate(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#D92D50]"
                  />
                  <span>Require Follow-up Date on transition</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setStageModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-black/10 text-xs font-bold text-[#6B7280] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold cursor-pointer"
                >
                  {editingStage ? 'Save Stage' : 'Add Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Blocked Error Modal */}
      {archiveError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center gap-3 text-[#D92D50]">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-[#111111]">Cannot Archive Stage</h3>
            </div>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              {archiveError}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setArchiveError(null)}
                className="px-5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
