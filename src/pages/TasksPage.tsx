import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Plus,
  Mail,
  Phone,
  Link2,
  Calendar,
  Info,
  Check,
  Sliders,
  Layers,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { FollowUpTask } from '../types/index.ts';
import { getTasks, completeTask, createTask, cancelTask } from '../data/repo.ts';
import { LeadDrawer } from '../components/leads/LeadDrawer.tsx';

interface TasksPageProps {
  onNavigateToSequenceSettings?: () => void;
  onNavigateToChannelSettings?: () => void;
  onNavigateToFollowUpSettings?: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  onNavigateToSequenceSettings,
  onNavigateToChannelSettings,
  onNavigateToFollowUpSettings,
}) => {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter tabs
  const [activeTab, setActiveTab] = useState<'Due today' | 'Overdue' | 'Upcoming' | 'Completed' | 'Cancelled'>('Due today');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Normal' | 'High' | 'Urgent'>('all');

  // Drawer
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);

  // New task modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newLeadId, setNewLeadId] = useState('');
  const [newLeadName, setNewLeadName] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPriority, setNewPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');

  const fetchTasks = async () => {
    setLoading(true);
    const all = await getTasks();
    setTasks(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Tab Filtering
  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

    if (activeTab === 'Completed') return t.status === 'Completed';
    if (activeTab === 'Cancelled') return t.status === 'Cancelled';

    if (t.status !== 'Pending') return false;

    if (activeTab === 'Due today') return t.dueDate === todayStr;
    if (activeTab === 'Overdue') return t.dueDate < todayStr;
    if (activeTab === 'Upcoming') return t.dueDate > todayStr;

    return true;
  });

  // Counts
  const countDueToday = tasks.filter((t) => t.status === 'Pending' && t.dueDate === todayStr).length;
  const countOverdue = tasks.filter((t) => t.status === 'Pending' && t.dueDate < todayStr).length;
  const countUpcoming = tasks.filter((t) => t.status === 'Pending' && t.dueDate > todayStr).length;
  const countCompleted = tasks.filter((t) => t.status === 'Completed').length;
  const countCancelled = tasks.filter((t) => t.status === 'Cancelled').length;

  const handleToggleComplete = async (taskId: string) => {
    await completeTask(taskId);
    fetchTasks();
  };

  const handleCancelTask = async (taskId: string) => {
    await cancelTask(taskId);
    fetchTasks();
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    await createTask({
      leadId: newLeadId || 'lead_general',
      leadBusinessName: newLeadName || 'General Outreach Follow-up',
      taskText: newText.trim(),
      dueDate: newDueDate,
      priority: newPriority,
      sourceTag: 'Manual',
      assignedTo: 'Founder',
    });

    setNewText('');
    setNewLeadName('');
    setShowCreateModal(false);
    fetchTasks();
  };

  return (
    <div className="w-full space-y-6">
      {/* Title & Action */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold text-[#101828] tracking-tight leading-tight select-none">
              Tasks
            </h1>
            <span className="px-2.5 py-0.5 text-[12px] font-semibold bg-[#F8F9FB] text-[#667085] rounded-full border border-[#ECEEF2]">
              Demo data
            </span>
          </div>
          <p className="text-[14px] font-medium text-[#475467] mt-0.5">
            {countOverdue + countDueToday} action items due
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToChannelSettings && (
            <button
              type="button"
              onClick={onNavigateToChannelSettings}
              className="inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-[10px] border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-[#344054] text-[14px] font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Sliders size={14} />
              <span>Channel Settings</span>
            </button>
          )}

          {(onNavigateToFollowUpSettings || onNavigateToSequenceSettings) && (
            <button
              type="button"
              onClick={onNavigateToFollowUpSettings || onNavigateToSequenceSettings}
              className="inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-[10px] border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-[#344054] text-[14px] font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Clock size={14} />
              <span>Follow-up Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[14px] font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={14} />
            <span>+ Add Task</span>
          </button>
        </div>
      </div>

      {/* Mandatory Automation Notice */}
      <div className="bg-white rounded-2xl p-3 px-4 border border-black/5 shadow-2xs flex items-center justify-between gap-3 text-xs text-[#6B6B6B]">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#F1EFEF] text-[#111111] flex items-center justify-center shrink-0">
            <Info size={12} />
          </span>
          <span>
            <strong>Human-in-the-Loop Discipline:</strong> Automation only creates tasks and reminders. It never sends any message automatically anywhere.
          </span>
        </div>

        {onNavigateToSequenceSettings && (
          <button
            type="button"
            onClick={onNavigateToSequenceSettings}
            className="text-[11px] text-[#D92D50] hover:underline font-bold whitespace-nowrap cursor-pointer"
          >
            Configure sequence intervals →
          </button>
        )}
      </div>

      {/* Tabs and Filters Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2.5 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center p-1 bg-white rounded-full border border-black/5 shadow-2xs flex-wrap">
          {[
            { id: 'Due today', label: 'Due today', count: countDueToday },
            { id: 'Overdue', label: 'Overdue', count: countOverdue, alert: countOverdue > 0 },
            { id: 'Upcoming', label: 'Upcoming', count: countUpcoming },
            { id: 'Completed', label: 'Completed', count: countCompleted },
            { id: 'Cancelled', label: 'Cancelled', count: countCancelled },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.alert
                      ? 'bg-[#FCE9ED] text-[#D92D50]'
                      : 'bg-[#F1EFEF] text-[#6B6B6B]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 text-xs ml-auto">
          <span className="text-[#A8A5A5] font-semibold">Priority:</span>
          {(['all', 'Normal', 'High', 'Urgent'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                priorityFilter === p
                  ? 'bg-[#111111] text-white'
                  : 'bg-white text-[#6B6B6B] hover:text-[#111111] border border-black/5'
              }`}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#6B6B6B] bg-white rounded-[24px] border border-black/5">
            No tasks found in &ldquo;{activeTab}&rdquo;.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isCancelled = task.status === 'Cancelled';
            const isOverdue = task.status === 'Pending' && task.dueDate < todayStr;
            const isDueToday = task.status === 'Pending' && task.dueDate === todayStr;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-[20px] p-3.5 px-4 border border-black/5 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted ? 'opacity-60 bg-gray-50' : isOverdue ? 'border-l-4 border-l-[#D92D50]' : isDueToday ? 'border-l-4 border-l-[#2563EB]' : ''
                }`}
              >
                {/* Left: Checkbox & Task Content */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleComplete(task.id)}
                    disabled={isCancelled}
                    className="w-4 h-4 rounded-md accent-[#D92D50] cursor-pointer mt-0.5 sm:mt-0"
                    aria-label={`Mark task completed: ${task.taskText}`}
                  />

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold leading-tight ${
                          isCompleted ? 'line-through text-[#A8A5A5]' : 'text-[#111111]'
                        }`}
                      >
                        {task.taskText}
                      </span>
                    </div>

                    {task.note && (
                      <p className="text-[11px] text-[#6B7280] italic leading-snug">
                        Note: {task.note}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#A8A5A5]">
                      <button
                        type="button"
                        onClick={() => setDrawerLeadId(task.leadId)}
                        className="text-[#111111] hover:text-[#D92D50] font-semibold underline underline-offset-2 transition-colors cursor-pointer truncate max-w-[200px]"
                      >
                        {task.leadBusinessName}
                      </button>

                      {task.channelName && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-[#374151] bg-[#F3F4F6] px-1.5 py-0.2 rounded text-[10px]">
                            {task.channelName}
                          </span>
                        </>
                      )}

                      {task.stageName && (
                        <>
                          <span>·</span>
                          <span className="text-[#4B5563]">
                            Stage: <strong>{task.stageName}</strong>
                          </span>
                        </>
                      )}

                      {task.sequenceStepNumber !== undefined && (
                        <>
                          <span>·</span>
                          <span className="text-[#6B7280] font-medium">
                            Step {task.sequenceStepNumber}
                          </span>
                        </>
                      )}

                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar size={11} />
                        {task.dueDate}
                        {isOverdue && <span className="text-[#D92D50] font-bold bg-[#FCE9ED] px-1.5 py-0.2 rounded text-[10px]">Overdue</span>}
                        {isDueToday && <span className="text-[#2563EB] font-bold bg-[#DBEAFE] px-1.5 py-0.2 rounded text-[10px]">Due today</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Priority Pill & Channel */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      task.priority === 'Urgent'
                        ? 'bg-[#D92D50] text-white shadow-2xs'
                        : task.priority === 'High'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {task.priority}
                  </span>

                  {task.status === 'Pending' && (
                    <button
                      type="button"
                      onClick={() => handleCancelTask(task.id)}
                      className="text-[11px] text-[#A8A5A5] hover:text-[#D92D50] px-1 cursor-pointer"
                      title="Cancel task"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <h3 className="text-base font-bold text-[#111111] mb-4">
              Create Manual Action Task
            </h3>
            <form onSubmit={handleCreateTaskSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Task Description <span className="text-[#D92D50]">*</span>
                </label>
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="e.g. Audit website contact button & send follow-up"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Linked Practice Name (Optional)
                </label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Harbour Dental Studio"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#111111] text-white rounded-full hover:bg-black"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer */}
      <LeadDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onLeadUpdated={fetchTasks}
        onStageChangeRequested={() => {}}
      />
    </div>
  );
};
