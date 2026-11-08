import React, { useState, useEffect } from 'react';
import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Eye,
  EyeOff,
  MoveRight,
  ShieldAlert,
} from 'lucide-react';
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
  Project,
  ProjectStage,
  ProjectStageChecklistItem,
  StageStatus,
  TaskPriority,
  TeamMemberProfile,
} from '../../types/index.ts';
import {
  addClientStage,
  updateClientStage,
  reorderClientStages,
  removeClientStage,
  addDeliveryTask,
  updateDeliveryTask,
  moveDeliveryTask,
  removeDeliveryTask,
  getActiveSubTeamForClient,
  getSubTeamById,
  getSubTeamMembers,
} from '../../data/repo.ts';

interface DeliveryStagesManagerProps {
  clientId: string;
  project: Project;
  teamMembers: TeamMemberProfile[];
  onProjectUpdated: (project: Project) => void;
  selectedStageKey: string;
  onSelectStageKey: (stageKey: string) => void;
  showToast: (msg: string) => void;
}

interface SortableStageItemProps {
  stage: ProjectStage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleVisible: () => void;
  onStatusChange: (status: StageStatus) => void;
}

const SortableStageItem: React.FC<SortableStageItemProps> = ({
  stage,
  index,
  isSelected,
  onSelect,
  onEdit,
  onRemove,
  onToggleVisible,
  onStatusChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id || stage.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isDone = stage.status === 'Done';
  const isInProg = stage.status === 'In progress';
  const openTasksCount = (stage.checklist || []).filter((c) => !c.done).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
        isSelected
          ? 'border-[#D92D50] bg-[#FCE9ED]/30 ring-1 ring-[#D92D50]'
          : 'border-black/5 bg-white hover:border-black/15'
      }`}
    >
      {/* Drag handle & Stage basic info */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-black cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to reorder stage"
        >
          <GripVertical size={16} />
        </button>

        <span className="text-[11px] font-mono font-bold text-[#A8A5A5] w-5 shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div
          onClick={onSelect}
          className="min-w-0 flex-1 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#111111] truncate">
              {stage.name || stage.key}
            </span>
            {stage.visibleToClient === false && (
              <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-gray-100 text-gray-500 rounded flex items-center gap-0.5">
                <EyeOff size={9} />
                Internal only
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#A8A5A5] flex items-center gap-2">
            <span>
              {stage.checklist?.length || 0} task
              {(stage.checklist?.length || 0) !== 1 ? 's' : ''} ({openTasksCount} open)
            </span>
            {stage.dueDate && <span>· Due {stage.dueDate}</span>}
          </div>
        </div>
      </div>

      {/* Stage Status Selector */}
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={stage.status}
          onChange={(e) => onStatusChange(e.target.value as StageStatus)}
          className={`text-[11px] font-bold px-2 py-1 rounded-xl border border-black/5 focus:outline-none cursor-pointer ${
            isDone
              ? 'bg-emerald-50 text-emerald-800'
              : isInProg
              ? 'bg-blue-50 text-blue-800'
              : 'bg-[#F1EFEF] text-[#111111]'
          }`}
        >
          <option value="Not started">Not started</option>
          <option value="In progress">In progress</option>
          <option value="Waiting on client">Waiting on client</option>
          <option value="Pending approval">Pending approval</option>
          <option value="Done">Done</option>
        </select>

        {/* Visible to client toggle */}
        <button
          type="button"
          onClick={onToggleVisible}
          className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
            stage.visibleToClient !== false
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-gray-100 text-gray-400'
          }`}
          title={
            stage.visibleToClient !== false
              ? 'Visible to client in portal (Click to hide)'
              : 'Hidden from client in portal (Click to show)'
          }
        >
          {stage.visibleToClient !== false ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>

        {/* Edit button */}
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg border border-black/5 hover:bg-gray-100 text-gray-600 cursor-pointer transition-colors"
          title="Edit stage name or due date"
        >
          <Edit2 size={13} />
        </button>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg border border-black/5 hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
          title="Archive stage"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

export const DeliveryStagesManager: React.FC<DeliveryStagesManagerProps> = ({
  clientId,
  project,
  teamMembers,
  onProjectUpdated,
  selectedStageKey,
  onSelectStageKey,
  showToast,
}) => {
  // Modals
  const [addStageModalOpen, setAddStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [removeTargetStage, setRemoveTargetStage] = useState<ProjectStage | null>(null);
  const [moveTasksTargetKey, setMoveTasksTargetKey] = useState<string>('');

  // Form states for Add / Edit Stage
  const [stageName, setStageName] = useState('');
  const [stageStatus, setStageStatus] = useState<StageStatus>('Not started');
  const [stageDueDate, setStageDueDate] = useState('');
  const [stageVisible, setStageVisible] = useState(true);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Sub-team assignee scope
  const [subTeamName, setSubTeamName] = useState<string | null>(null);
  const [subTeamMembersList, setSubTeamMembersList] = useState<TeamMemberProfile[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const assignment = await getActiveSubTeamForClient(clientId);
        if (assignment && isMounted) {
          const [st, members] = await Promise.all([
            getSubTeamById(assignment.subTeamId),
            getSubTeamMembers(assignment.subTeamId),
          ]);
          if (st && isMounted) {
            setSubTeamName(st.name);
            const memberIds = new Set(members.map((m) => m.memberId));
            const filtered = teamMembers.filter((m) => memberIds.has(m.id));
            setSubTeamMembersList(filtered);
          }
        } else if (isMounted) {
          setSubTeamName(null);
          setSubTeamMembersList([]);
        }
      } catch (err) {
        console.error('Failed to load client sub-team:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [clientId, teamMembers]);

  const selectableAssignees = subTeamMembersList.length > 0 ? subTeamMembersList : teamMembers;

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Active stages (filter out soft-deleted/archived)
  const activeStages = (project.stages || [])
    .filter((s) => !s.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const currentStage = activeStages.find((s) => s.key === selectedStageKey) || activeStages[0];

  // Drag End handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeStages.findIndex(
      (s) => (s.id || s.key) === active.id
    );
    const newIndex = activeStages.findIndex(
      (s) => (s.id || s.key) === over.id
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(activeStages, oldIndex, newIndex);
      const stageKeysInOrder = reordered.map((s) => s.id || s.key);

      // Optimistic update
      const updatedProject: Project = {
        ...project,
        stages: reordered.map((s, idx) => ({ ...s, order: idx })),
      };
      onProjectUpdated(updatedProject);

      try {
        await reorderClientStages(clientId, stageKeysInOrder);
        showToast('Stage order updated.');
      } catch {
        showToast('Failed to update stage order.');
      }
    }
  };

  // Add Stage Submit
  const handleAddStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) return;

    try {
      const newStage = await addClientStage(clientId, {
        name: stageName.trim(),
        status: stageStatus,
        dueDate: stageDueDate || undefined,
        visibleToClient: stageVisible,
      });

      const updatedProject: Project = {
        ...project,
        stages: [...project.stages, newStage],
      };
      onProjectUpdated(updatedProject);
      setAddStageModalOpen(false);
      setStageName('');
      setStageDueDate('');
      setStageStatus('Not started');
      showToast(`Added stage "${newStage.key}"`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to add stage.');
    }
  };

  // Edit Stage Submit
  const handleEditStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage || !stageName.trim()) return;

    try {
      const updated = await updateClientStage(
        clientId,
        editingStage.id || editingStage.key,
        {
          name: stageName.trim(),
          status: stageStatus,
          dueDate: stageDueDate || undefined,
          visibleToClient: stageVisible,
        }
      );

      const updatedProject: Project = {
        ...project,
        stages: project.stages.map((s) =>
          (s.id || s.key) === (editingStage.id || editingStage.key) ? updated : s
        ),
      };
      onProjectUpdated(updatedProject);
      setEditingStage(null);
      showToast(`Updated stage "${updated.key}"`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update stage.');
    }
  };

  // Toggle Visibility
  const handleToggleVisible = async (stage: ProjectStage) => {
    const nextVal = stage.visibleToClient === false ? true : false;
    try {
      const updated = await updateClientStage(
        clientId,
        stage.id || stage.key,
        { visibleToClient: nextVal }
      );
      const updatedProject: Project = {
        ...project,
        stages: project.stages.map((s) =>
          (s.id || s.key) === (stage.id || stage.key) ? updated : s
        ),
      };
      onProjectUpdated(updatedProject);
      showToast(
        nextVal
          ? `Stage "${stage.key}" now visible to client`
          : `Stage "${stage.key}" hidden from client`
      );
    } catch {
      showToast('Failed to update stage visibility.');
    }
  };

  // Update stage status directly
  const handleStageStatusChange = async (
    stage: ProjectStage,
    newStatus: StageStatus
  ) => {
    try {
      const updated = await updateClientStage(
        clientId,
        stage.id || stage.key,
        { status: newStatus }
      );
      const updatedProject: Project = {
        ...project,
        stages: project.stages.map((s) =>
          (s.id || s.key) === (stage.id || stage.key) ? updated : s
        ),
      };
      onProjectUpdated(updatedProject);
    } catch {
      showToast('Failed to change status.');
    }
  };

  // Remove stage confirmation / execute
  const handleConfirmRemoveStage = async () => {
    if (!removeTargetStage) return;

    const openTasks = (removeTargetStage.checklist || []).filter((c) => !c.done);

    // If there are open tasks and a destination was selected, move them first!
    if (openTasks.length > 0 && moveTasksTargetKey) {
      for (const t of openTasks) {
        await moveDeliveryTask(
          clientId,
          removeTargetStage.id || removeTargetStage.key,
          moveTasksTargetKey,
          t.id
        );
      }
    }

    const res = await removeClientStage(
      clientId,
      removeTargetStage.id || removeTargetStage.key
    );

    if (!res.success) {
      showToast(res.error || 'Failed to remove stage.');
      return;
    }

    const updatedProject: Project = {
      ...project,
      stages: project.stages.map((s) =>
        (s.id || s.key) === (removeTargetStage.id || removeTargetStage.key)
          ? { ...s, archived: true }
          : s
      ),
    };
    onProjectUpdated(updatedProject);

    if (selectedStageKey === removeTargetStage.key) {
      const remaining = activeStages.filter(
        (s) => s.key !== removeTargetStage.key
      );
      if (remaining[0]) onSelectStageKey(remaining[0].key);
    }

    setRemoveTargetStage(null);
    setMoveTasksTargetKey('');
    showToast(`Stage "${removeTargetStage.key}" archived.`);
  };

  // Add delivery task to current stage
  const handleAddDeliveryTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStage || !newTaskTitle.trim()) return;

    try {
      const added = await addDeliveryTask(clientId, currentStage.id || currentStage.key, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        assigneeId: newTaskAssigneeId || undefined,
        dueDate: newTaskDueDate || undefined,
      });

      const updatedProject: Project = {
        ...project,
        stages: project.stages.map((s) => {
          if ((s.id || s.key) === (currentStage.id || currentStage.key)) {
            return {
              ...s,
              checklist: [...(s.checklist || []), added],
            };
          }
          return s;
        }),
      };
      onProjectUpdated(updatedProject);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setIsAddingTask(false);
      showToast(`Added task "${added.title}"`);
    } catch {
      showToast('Failed to add task.');
    }
  };

  // Update inline task property
  const handleInlineUpdateTask = async (
    taskId: string,
    updates: Partial<ProjectStageChecklistItem>
  ) => {
    if (!currentStage) return;

    try {
      const updated = await updateDeliveryTask(
        clientId,
        currentStage.id || currentStage.key,
        taskId,
        updates
      );

      const updatedProject: Project = {
        ...project,
        stages: project.stages.map((s) => {
          if ((s.id || s.key) === (currentStage.id || currentStage.key)) {
            return {
              ...s,
              checklist: s.checklist.map((c) => (c.id === taskId ? updated : c)),
            };
          }
          return s;
        }),
      };
      onProjectUpdated(updatedProject);
    } catch {
      showToast('Failed to update task.');
    }
  };

  // Remove task
  const handleRemoveTask = async (taskId: string) => {
    if (!currentStage) return;

    try {
      await removeDeliveryTask(clientId, currentStage.id || currentStage.key, taskId);
      const updatedProject: Project = {
        ...project,
        stages: project.stages.map((s) => {
          if ((s.id || s.key) === (currentStage.id || currentStage.key)) {
            return {
              ...s,
              checklist: s.checklist.filter((c) => c.id !== taskId),
            };
          }
          return s;
        }),
      };
      onProjectUpdated(updatedProject);
      showToast('Task removed.');
    } catch {
      showToast('Failed to remove task.');
    }
  };

  // Priority badge styling
  const renderPriorityBadge = (priority?: TaskPriority) => {
    const p = priority || 'Medium';
    switch (p) {
      case 'Urgent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE9ED] text-[#D92D50] border border-[#D92D50]/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D92D50]" />
            Urgent
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. STAGES LIST (Reorderable via @dnd-kit) */}
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#D92D50] uppercase tracking-wider">
                Editable Delivery Pipeline
              </span>
              <span className="text-xs text-[#A8A5A5]">
                ({activeStages.length} stages configured for this client)
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Drag stages to reorder. Stages are unique to this clinic.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setStageName('');
              setStageDueDate('');
              setStageStatus('Not started');
              setStageVisible(true);
              setAddStageModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Stage</span>
          </button>
        </div>

        {/* Drag and drop sortable context */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeStages.map((s) => s.id || s.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {activeStages.map((st, idx) => (
                <SortableStageItem
                  key={st.id || st.key}
                  stage={st}
                  index={idx}
                  isSelected={selectedStageKey === st.key}
                  onSelect={() => onSelectStageKey(st.key)}
                  onEdit={() => {
                    setEditingStage(st);
                    setStageName(st.name || st.key);
                    setStageStatus(st.status);
                    setStageDueDate(st.dueDate || '');
                    setStageVisible(st.visibleToClient !== false);
                  }}
                  onRemove={() => {
                    setRemoveTargetStage(st);
                    setMoveTasksTargetKey('');
                  }}
                  onToggleVisible={() => handleToggleVisible(st)}
                  onStatusChange={(status) => handleStageStatusChange(st, status)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 2. DELIVERY TASKS FOR SELECTED STAGE */}
      {currentStage && (
        <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-black/5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#D92D50] uppercase tracking-wider">
                  Active Stage
                </span>
                {currentStage.dueDate && (
                  <span className="text-xs text-[#A8A5A5]">
                    · Due: {currentStage.dueDate}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-[#111111]">
                {currentStage.name || currentStage.key}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Plus size={13} />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* Inline Add Task Form */}
          {isAddingTask && (
            <form
              onSubmit={handleAddDeliveryTask}
              className="p-4 bg-[#F8F7F7] rounded-2xl border border-black/5 space-y-3 animate-in fade-in duration-150"
            >
              <div className="font-bold text-xs text-[#111111]">
                New Delivery Task for {currentStage.name || currentStage.key}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verify Google Tag Manager firing"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#6B6B6B]">
                      Assignee
                    </label>
                    {subTeamName && (
                      <span className="text-[10px] font-bold text-[#D92D50] bg-[#FCE9ED] px-1.5 py-0.5 rounded">
                        Pod: {subTeamName}
                      </span>
                    )}
                  </div>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {selectableAssignees.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-3 py-1 text-xs text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          )}

          {/* Tasks List */}
          <div className="divide-y divide-black/5">
            {(!currentStage.checklist || currentStage.checklist.length === 0) ? (
              <div className="py-8 text-center text-xs text-[#A8A5A5]">
                No delivery tasks configured for this stage yet. Click "Add Task" to create one.
              </div>
            ) : (
              currentStage.checklist.map((task) => (
                <div
                  key={task.id}
                  className="py-3 px-2 rounded-xl hover:bg-gray-50/70 transition-colors flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap group"
                >
                  {/* Task checkbox & title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleInlineUpdateTask(task.id, { done: !task.done })}
                      className="w-4 h-4 rounded accent-[#D92D50] cursor-pointer shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs font-semibold block ${
                          task.done ? 'line-through text-[#A8A5A5]' : 'text-[#111111]'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.assignedBy && (
                        <span className="text-[10px] text-[#A8A5A5]">
                          Assigned by {task.assignedBy}
                          {task.assignedAt ? ` on ${task.assignedAt}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline controls: Priority, Assignee, Due Date */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Inline Priority selector */}
                    <div className="flex items-center">
                      <select
                        value={task.priority || 'Medium'}
                        onChange={(e) =>
                          handleInlineUpdateTask(task.id, {
                            priority: e.target.value as TaskPriority,
                          })
                        }
                        className="text-[10px] font-bold bg-transparent cursor-pointer focus:outline-none"
                      >
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      {renderPriorityBadge(task.priority)}
                    </div>

                    {/* Inline Assignee selector */}
                    <select
                      value={task.assigneeId || ''}
                      onChange={(e) =>
                        handleInlineUpdateTask(task.id, {
                          assigneeId: e.target.value || undefined,
                        })
                      }
                      title={subTeamName ? `Sub-team: ${subTeamName}` : undefined}
                      className="text-[11px] font-medium bg-[#F1EFEF] px-2 py-1 rounded-lg border border-black/5 focus:outline-none cursor-pointer max-w-[130px] truncate"
                    >
                      <option value="">Unassigned</option>
                      {selectableAssignees.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    {/* Inline Due Date */}
                    <input
                      type="date"
                      value={task.dueDate || ''}
                      onChange={(e) =>
                        handleInlineUpdateTask(task.id, {
                          dueDate: e.target.value || undefined,
                        })
                      }
                      className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded-lg border border-black/10 focus:outline-none"
                      title="Due date"
                    />

                    {/* Delete task */}
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(task.id)}
                      className="p-1 text-gray-300 hover:text-red-500 rounded cursor-pointer transition-colors"
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD STAGE */}
      {/* ========================================================================= */}
      {addStageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 border border-black/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50]">
                Client Delivery Pipeline
              </span>
              <h3 className="text-lg font-bold text-[#111111]">Add New Stage</h3>
            </div>

            <form onSubmit={handleAddStageSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Stage Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Video Asset Production"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Status
                </label>
                <select
                  value={stageStatus}
                  onChange={(e) => setStageStatus(e.target.value as StageStatus)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Waiting on client">Waiting on client</option>
                  <option value="Pending approval">Pending approval</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Optional Target Due Date
                </label>
                <input
                  type="date"
                  value={stageDueDate}
                  onChange={(e) => setStageDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-xl border border-black/5">
                <div>
                  <span className="text-xs font-bold text-[#111111] block">
                    Visible to Client in Portal
                  </span>
                  <span className="text-[10px] text-[#A8A5A5]">
                    Clients only see visible stages in their progress timeline.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={stageVisible}
                  onChange={(e) => setStageVisible(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#D92D50] cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddStageModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  Add Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT STAGE */}
      {/* ========================================================================= */}
      {editingStage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 border border-black/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50]">
                Edit Stage
              </span>
              <h3 className="text-lg font-bold text-[#111111]">
                {editingStage.name || editingStage.key}
              </h3>
            </div>

            <form onSubmit={handleEditStageSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Stage Name *
                </label>
                <input
                  type="text"
                  required
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Status
                </label>
                <select
                  value={stageStatus}
                  onChange={(e) => setStageStatus(e.target.value as StageStatus)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Waiting on client">Waiting on client</option>
                  <option value="Pending approval">Pending approval</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Optional Target Due Date
                </label>
                <input
                  type="date"
                  value={stageDueDate}
                  onChange={(e) => setStageDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-xl border border-black/5">
                <div>
                  <span className="text-xs font-bold text-[#111111] block">
                    Visible to Client in Portal
                  </span>
                  <span className="text-[10px] text-[#A8A5A5]">
                    Clients only see visible stages in their progress timeline.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={stageVisible}
                  onChange={(e) => setStageVisible(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#D92D50] cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REMOVE STAGE (WITH OPEN TASKS BLOCKING/MOVING LOGIC) */}
      {/* ========================================================================= */}
      {removeTargetStage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 border border-black/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#D92D50]">
              <ShieldAlert size={20} />
              <h3 className="text-base font-bold text-[#111111]">
                Remove Stage "{removeTargetStage.name || removeTargetStage.key}"
              </h3>
            </div>

            {/* Check if stage has open tasks */}
            {(removeTargetStage.checklist || []).filter((c) => !c.done).length > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-[#FCE9ED] rounded-2xl border border-[#D92D50]/20 text-xs text-[#D92D50]">
                  <span className="font-bold block mb-1">
                    Cannot delete stage with open tasks!
                  </span>
                  This stage contains{' '}
                  {(removeTargetStage.checklist || []).filter((c) => !c.done).length} open
                  task(s). You must move these tasks to another stage before deleting.
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Move open tasks to:
                  </label>
                  <select
                    value={moveTasksTargetKey}
                    onChange={(e) => setMoveTasksTargetKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="">Select destination stage...</option>
                    {activeStages
                      .filter((s) => s.key !== removeTargetStage.key)
                      .map((s) => (
                        <option key={s.id || s.key} value={s.id || s.key}>
                          {s.name || s.key}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveTargetStage(null);
                      setMoveTasksTargetKey('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!moveTasksTargetKey}
                    onClick={handleConfirmRemoveStage}
                    className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#b0223f] disabled:opacity-40 text-white rounded-full transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <MoveRight size={13} />
                    <span>Move Tasks & Archive Stage</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Are you sure you want to remove this stage? It will be soft-deleted
                  (archived) and hidden from the client portal timeline.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRemoveTargetStage(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveStage}
                    className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#b0223f] text-white rounded-full transition-colors cursor-pointer shadow-xs"
                  >
                    Archive Stage
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
