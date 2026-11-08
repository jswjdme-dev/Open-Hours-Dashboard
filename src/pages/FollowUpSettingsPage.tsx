import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  History,
  Info,
  Globe,
  Sliders,
  Send,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  OutreachChannel,
  ChannelPipelineStage,
  ChannelSequence,
  ChannelSequenceStep,
} from '../types/index.ts';
import {
  getOutreachChannels,
  getChannelStages,
  getChannelSequences,
  saveChannelSequence,
  getSequenceTimezoneSettings,
  updateSequenceTimezoneSettings,
} from '../data/repo.ts';

export const FollowUpSettingsPage: React.FC<{
  onNavigateToTasks?: () => void;
  onNavigateToChannelSettings?: () => void;
}> = ({ onNavigateToTasks, onNavigateToChannelSettings }) => {
  const [channels, setChannels] = useState<OutreachChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [stages, setStages] = useState<ChannelPipelineStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  // Active and historical sequences
  const [sequences, setSequences] = useState<ChannelSequence[]>([]);
  const [activeSequence, setActiveSequence] = useState<ChannelSequence | null>(null);

  // Editable sequence fields
  const [sequenceName, setSequenceName] = useState('');
  const [steps, setSteps] = useState<ChannelSequenceStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Business-hours & timezone settings
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [tzSavedMsg, setTzSavedMsg] = useState('');

  // Show version history modal/card
  const [showHistory, setShowHistory] = useState(false);

  // Load channels on mount
  useEffect(() => {
    async function init() {
      const chans = await getOutreachChannels();
      setChannels(chans);
      const tzSettings = await getSequenceTimezoneSettings();
      setTimezone(tzSettings.timezone || 'Asia/Dhaka');
      setSkipWeekends(tzSettings.skipWeekends !== false);

      if (chans.length > 0) {
        const initialChanId = chans[0].id;
        setSelectedChannelId(initialChanId);
        loadStagesForChannel(initialChanId);
      }
    }
    init();
  }, []);

  const loadStagesForChannel = async (chanId: string) => {
    const stgs = await getChannelStages(chanId);
    setStages(stgs);
    // Find first open stage, ideally Contacted
    const defaultStage = stgs.find((s) => s.name.toLowerCase() === 'contacted') || stgs.find((s) => s.type === 'Open') || stgs[0];
    if (defaultStage) {
      setSelectedStageId(defaultStage.id);
      loadSequenceForStage(chanId, defaultStage.id, defaultStage.name);
    }
  };

  const loadSequenceForStage = async (chanId: string, stageId: string, stageName?: string) => {
    const allSeq = await getChannelSequences(chanId, stageId);
    setSequences(allSeq);

    const active = allSeq.find((s) => s.isActive) || allSeq[0];
    if (active) {
      setActiveSequence(active);
      setSequenceName(active.name);
      setSteps(active.steps.map((st) => ({ ...st })));
    } else {
      setActiveSequence(null);
      setSequenceName(`${stageName || 'Stage'} Follow-up Sequence`);
      // Default initial step
      setSteps([
        {
          stepNumber: 1,
          delayValue: 2,
          delayUnit: 'days',
          titleTemplate: 'Follow-up #1: Check response for {{businessName}}',
          noteTemplate: 'Reference clinic audit previously shared',
          priority: 'Normal',
        },
      ]);
    }
  };

  const handleSelectChannel = (chanId: string) => {
    setSelectedChannelId(chanId);
    loadStagesForChannel(chanId);
  };

  const handleSelectStage = (stage: ChannelPipelineStage) => {
    setSelectedStageId(stage.id);
    loadSequenceForStage(selectedChannelId, stage.id, stage.name);
  };

  const handleAddStep = () => {
    const nextNumber = steps.length + 1;
    setSteps([
      ...steps,
      {
        stepNumber: nextNumber,
        delayValue: nextNumber * 3,
        delayUnit: 'days',
        titleTemplate: `Follow-up #${nextNumber}: Next touchpoint for {{businessName}}`,
        noteTemplate: '',
        priority: 'Normal',
      },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    const filtered = steps.filter((_, i) => i !== idx);
    // Re-index steps
    const reindexed = filtered.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(reindexed);
  };

  const handleStepChange = (idx: number, field: keyof ChannelSequenceStep, val: any) => {
    const updated = [...steps];
    updated[idx] = { ...updated[idx], [field]: val };
    setSteps(updated);
  };

  const handleInsertPlaceholder = (idx: number, placeholder: string) => {
    const updated = [...steps];
    updated[idx].titleTemplate = `${updated[idx].titleTemplate} ${placeholder}`.trim();
    setSteps(updated);
  };

  const handleSaveSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !selectedStageId) return;
    setSaving(true);

    const newSeq = await saveChannelSequence(selectedChannelId, selectedStageId, {
      name: sequenceName.trim(),
      steps,
      timezone,
      skipWeekends,
    });

    setSaveSuccessMsg(`Saved as Version ${newSeq.versionNumber} for ${selectedStage?.name || 'Stage'}!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);

    await loadSequenceForStage(selectedChannelId, selectedStageId, selectedStage?.name);
    setSaving(false);
  };

  const handleSaveTimezoneSettings = async () => {
    await updateSequenceTimezoneSettings({ timezone, skipWeekends });
    setTzSavedMsg('Default business-hours rules saved successfully.');
    setTimeout(() => setTzSavedMsg(''), 3000);
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const selectedStage = stages.find((s) => s.id === selectedStageId);

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Follow-up Settings
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#F3F4F6] text-[#6B7280] rounded-full border border-black/5">
              Automated Reminders
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure multi-step task cadences per channel and pipeline stage. Automation creates tasks; it never sends messages automatically.
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
          {onNavigateToChannelSettings && (
            <button
              type="button"
              onClick={onNavigateToChannelSettings}
              className="px-3.5 py-2 rounded-full border border-black/10 bg-white hover:bg-gray-50 text-xs font-semibold text-[#111111] cursor-pointer transition-colors"
            >
              Channel Settings →
            </button>
          )}
        </div>
      </div>

      {/* Global Discipline Notice */}
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs flex items-center justify-between gap-3 text-xs text-[#6B7280]">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-[#2563EB] shrink-0" />
          <span>
            <strong>Human-in-the-Loop Safeguard:</strong> Follow-up sequences generate actionable tasks with deadlines and templates for human review. Sequences are versioned so existing tasks preserve their creation parameters.
          </span>
        </div>
      </div>

      {/* STEP 1: Select Channel */}
      <div className="bg-white rounded-3xl p-5 border border-black/10 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#111111] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px]">1</span>
            <span>Select Outreach Channel:</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {channels.map((chan) => (
            <button
              key={chan.id}
              type="button"
              onClick={() => handleSelectChannel(chan.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
                selectedChannelId === chan.id
                  ? 'bg-[#111111] text-white border-black shadow-xs'
                  : 'bg-[#F9FAFB] text-[#4B5563] border-black/10 hover:border-black/20'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: chan.color }} />
              <span>{chan.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 2: Select Stage for that Channel */}
      <div className="bg-white rounded-3xl p-5 border border-black/10 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#111111] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px]">2</span>
            <span>Select Triggering Stage for {selectedChannel?.name || 'Channel'}:</span>
          </label>
          <span className="text-[11px] text-[#9CA3AF]">
            Sequences fire automatically when a lead enters this stage
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stages.map((stg) => {
            const isSelected = selectedStageId === stg.id;
            const isTerminal = stg.type === 'Won' || stg.type === 'Lost' || stg.type === 'Replied' || stg.type === 'NotNow';
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => handleSelectStage(stg)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#111111] text-white border-black shadow-2xs'
                    : 'bg-[#F9FAFB] text-[#4B5563] border-black/10 hover:border-black/20'
                }`}
              >
                <span>{stg.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#E5E7EB] text-[#6B7280]'
                  }`}
                >
                  {stg.type}
                </span>
                {isTerminal && <span className="text-[10px] opacity-60">(Auto-cancels tasks)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Business-Hours & Timezone Settings Box */}
      <div className="bg-white rounded-3xl p-5 border border-black/10 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#111111]">
                Business-Hours Scheduling Rule
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                All sequence due dates calculate using the configured timezone and weekend skipping rules.
              </p>
            </div>
          </div>

          {tzSavedMsg && (
            <span className="text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-3 py-1 rounded-full animate-in fade-in">
              ✓ {tzSavedMsg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-[#111111] block mb-1">
              Default Sequence Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Dhaka"
              className="w-full bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:border-black"
            />
            <span className="text-[10px] text-[#9CA3AF] mt-1 block">
              Default: Asia/Dhaka (IANA standard timezone identifier)
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <label className="font-semibold text-[#111111] block mb-1.5">
              Weekend Handling
            </label>
            <label className="flex items-center gap-2 cursor-pointer bg-[#F9FAFB] p-2.5 rounded-xl border border-black/5">
              <input
                type="checkbox"
                checked={skipWeekends}
                onChange={(e) => setSkipWeekends(e.target.checked)}
                className="w-4 h-4 rounded accent-[#D92D50]"
              />
              <span className="font-medium text-[#374151]">
                Skip weekends (Roll Saturday/Sunday due dates to Monday)
              </span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSaveTimezoneSettings}
              className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-black text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Save Schedule Rules
            </button>
          </div>
        </div>
      </div>

      {/* Sequence Editor */}
      <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#111111]">
                Cadence for {selectedChannel?.name} &rsaquo; {selectedStage?.name}
              </h2>
              {activeSequence && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A]">
                  Version {activeSequence.versionNumber} (Active)
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              When a lead enters this stage, the steps below automatically populate Tasks & Reminders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sequences.length > 1 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1.5 rounded-full border border-black/10 text-xs font-semibold text-[#6B7280] hover:text-[#111111] flex items-center gap-1.5 cursor-pointer"
              >
                <History size={13} />
                <span>Version History ({sequences.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddStep}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Step</span>
            </button>
          </div>
        </div>

        {/* Version History Drawer/List */}
        {showHistory && (
          <div className="bg-[#F9FAFB] rounded-2xl p-4 border border-black/5 space-y-2.5 animate-in fade-in">
            <h4 className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
              <History size={14} />
              <span>Historical Versions for this Sequence</span>
            </h4>
            <div className="space-y-2">
              {sequences.map((sq) => (
                <div
                  key={sq.id}
                  className="bg-white p-3 rounded-xl border border-black/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#111111]">Version {sq.versionNumber}</span>
                    <span className="text-[#6B7280]">{sq.name}</span>
                    <span className="text-[#9CA3AF]">• {sq.steps.length} step(s)</span>
                    <span className="text-[#9CA3AF]">• Created {sq.createdAt} by {sq.createdBy}</span>
                  </div>
                  {sq.isActive ? (
                    <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                      Current Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-[#9CA3AF]">
                      Archived (tasks preserved)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveSequence} className="space-y-6">
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Sequence Name
            </label>
            <input
              type="text"
              required
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              placeholder="e.g. 3-Step Follow-up Cadence"
              className="w-full text-xs bg-[#F9FAFB] border border-black/10 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-black"
            />
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="bg-[#F9FAFB] rounded-2xl p-4.5 border border-black/10 space-y-3.5 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center">
                      {st.stepNumber}
                    </span>
                    <span className="text-xs font-bold text-[#111111]">
                      Step {st.stepNumber} Trigger & Task
                    </span>
                  </div>

                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#D92D50] hover:bg-[#FCE9ED] rounded-lg transition-colors cursor-pointer"
                      title="Remove step"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                      Delay After Entering Stage
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        value={st.delayValue}
                        onChange={(e) => handleStepChange(idx, 'delayValue', Number(e.target.value))}
                        className="w-20 bg-white border border-black/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-black"
                      />
                      <select
                        value={st.delayUnit}
                        onChange={(e) => handleStepChange(idx, 'delayUnit', e.target.value)}
                        className="bg-white border border-black/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-black"
                      >
                        <option value="days">Days</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                      Task Priority
                    </label>
                    <select
                      value={st.priority || 'Normal'}
                      onChange={(e) => handleStepChange(idx, 'priority', e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-black"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#6B7280]">
                      Task Title Template <span className="text-[#D92D50]">*</span>
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#9CA3AF]">Insert tokens:</span>
                      <button
                        type="button"
                        onClick={() => handleInsertPlaceholder(idx, '{{businessName}}')}
                        className="px-1.5 py-0.5 bg-white border border-black/10 rounded text-[#111111] hover:bg-gray-100 cursor-pointer"
                      >
                        + businessName
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertPlaceholder(idx, '{{ownerName}}')}
                        className="px-1.5 py-0.5 bg-white border border-black/10 rounded text-[#111111] hover:bg-gray-100 cursor-pointer"
                      >
                        + ownerName
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertPlaceholder(idx, '{{city}}')}
                        className="px-1.5 py-0.5 bg-white border border-black/10 rounded text-[#111111] hover:bg-gray-100 cursor-pointer"
                      >
                        + city
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    value={st.titleTemplate}
                    onChange={(e) => handleStepChange(idx, 'titleTemplate', e.target.value)}
                    placeholder="e.g. Send follow-up #1 to {{businessName}}"
                    className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                    Optional Note Template (Instructions for team member)
                  </label>
                  <input
                    type="text"
                    value={st.noteTemplate || ''}
                    onChange={(e) => handleStepChange(idx, 'noteTemplate', e.target.value)}
                    placeholder="e.g. Review clinic Google Maps score before calling {{ownerName}}"
                    className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-black"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-black/10">
            {saveSuccessMsg ? (
              <span className="text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>{saveSuccessMsg}</span>
              </span>
            ) : (
              <span className="text-[11px] text-[#9CA3AF]">
                Editing will save as a new version. Existing pending tasks remain tied to their version.
              </span>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-2"
            >
              <span>Save as New Version</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
