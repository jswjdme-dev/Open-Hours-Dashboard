import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Square,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  User,
  AlertTriangle,
  History,
  X,
  Lock,
} from 'lucide-react';
import { TimeEntry, TeamMemberProfile, Client } from '../../types/index.ts';
import {
  getTimeEntries,
  getActiveRunningTimer,
  startTimer,
  stopTimer,
  logManualTimeEntry,
  getTeamMembers,
  getClients,
  getTasks,
} from '../../data/repo.ts';

interface TimeTrackerPageProps {
  currentMemberId?: string;
}

export const TimeTrackerPage: React.FC<TimeTrackerPageProps> = ({
  currentMemberId = 'member_founder',
}) => {
  const [members, setMembers] = useState<TeamMemberProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Form states for starting timer
  const [selectedClientId, setSelectedClientId] = useState('');
  const [deliveryTitle, setDeliveryTitle] = useState('');
  const [timerNote, setTimerNote] = useState('');

  // Manual Entry Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDuration, setManualDuration] = useState(60);
  const [manualTitle, setManualTitle] = useState('');
  const [manualClient, setManualClient] = useState('');
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [manualReason, setManualReason] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Auto-stop prompt after 30 mins
  const [idlePromptOpen, setIdlePromptOpen] = useState(false);

  // Filters for timesheet
  const [filterMemberId, setFilterMemberId] = useState(currentMemberId);
  const [filterClientId, setFilterClientId] = useState('all');

  const loadData = async () => {
    const [mems, cls, tsks, entries, running] = await Promise.all([
      getTeamMembers(),
      getClients(),
      getTasks(),
      getTimeEntries(),
      getActiveRunningTimer(currentMemberId),
    ]);

    setMembers(mems);
    setClients(cls);
    setTasks(tsks);
    setTimeEntries(entries);
    setActiveTimer(running);

    if (running) {
      const elapsed = Math.floor(
        (Date.now() - new Date(running.startTime).getTime()) / 1000
      );
      setElapsedSeconds(Math.max(0, elapsed));
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMemberId]);

  // Timer Tick
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        // Prompt after 30 mins (1800s)
        if (next === 1800) {
          setIdlePromptOpen(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleStartTimer = async () => {
    if (!deliveryTitle.trim()) {
      alert('Please specify the task or delivery item.');
      return;
    }

    const created = await startTimer({
      memberId: currentMemberId,
      clientId: selectedClientId || undefined,
      deliveryItemTitle: deliveryTitle.trim(),
      note: timerNote.trim(),
    });

    setActiveTimer(created);
    setElapsedSeconds(0);
    setDeliveryTitle('');
    setTimerNote('');
    await loadData();
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    await stopTimer(activeTimer.id);
    setActiveTimer(null);
    setElapsedSeconds(0);
    setIdlePromptOpen(false);
    await loadData();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualReason.trim() || manualDuration <= 0) {
      setManualError('Please provide task title, duration, and required reason for manual entry.');
      return;
    }

    try {
      setManualError(null);
      await logManualTimeEntry({
        memberId: currentMemberId,
        clientId: manualClient || undefined,
        deliveryItemTitle: manualTitle.trim(),
        durationMinutes: manualDuration,
        date: manualDate,
        manualReason: manualReason.trim(),
        note: manualNote.trim(),
      });

      setManualModalOpen(false);
      setManualTitle('');
      setManualReason('');
      setManualNote('');
      await loadData();
    } catch (err: any) {
      setManualError(err?.message || 'Failed to log manual time entry.');
    }
  };

  const formatTimerDisplay = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredEntries = timeEntries.filter((e) => {
    if (filterMemberId !== 'all' && e.memberId !== filterMemberId) return false;
    if (filterClientId !== 'all' && e.clientId !== filterClientId) return false;
    return true;
  });

  const totalFilteredMinutes = filteredEntries.reduce(
    (sum, e) => sum + (e.durationMinutes || 0),
    0
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Time Tracker
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Operations
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Live task timers, auto-stop prompts, manual time reconciliation, and client delivery hours.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setManualModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-black/15 hover:bg-black/5 text-[#111111] text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Manual Entry</span>
        </button>
      </div>

      {/* BIG LIVE TIMER CARD */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-black/5 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Timer Display */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A5] block">
              {activeTimer ? 'Running Timer' : 'Ready to Track'}
            </span>
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-[#111111]">
              {formatTimerDisplay(elapsedSeconds)}
            </div>
            {activeTimer && (
              <div className="flex items-center gap-2 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-[#111111]">
                  {activeTimer.deliveryItemTitle}
                </span>
                {activeTimer.clientId && (
                  <span className="text-[11px] text-[#6B6B6B]">
                    · {clients.find((c) => c.id === activeTimer.clientId)?.businessName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div>
            {activeTimer ? (
              <button
                type="button"
                onClick={handleStopTimer}
                className="px-8 py-4 rounded-full bg-[#D92D50] hover:bg-[#b52240] text-white text-base font-extrabold flex items-center gap-3 transition-all shadow-md cursor-pointer"
              >
                <Square size={18} fill="white" />
                <span>Stop Timer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartTimer}
                className="px-8 py-4 rounded-full bg-[#111111] hover:bg-black text-white text-base font-extrabold flex items-center gap-3 transition-all shadow-md cursor-pointer"
              >
                <Play size={18} fill="white" />
                <span>Start Timer</span>
              </button>
            )}
          </div>
        </div>

        {/* Inputs (When Not Running) */}
        {!activeTimer && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-black/5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[#111111] mb-1">
                Client (Optional)
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-black/10 bg-[#FAFAFA] outline-none"
              >
                <option value="">Internal / General</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] mb-1">
                Task / Delivery Item *
              </label>
              <input
                type="text"
                value={deliveryTitle}
                onChange={(e) => setDeliveryTitle(e.target.value)}
                placeholder="e.g. Local Schema JSON-LD markup"
                className="w-full p-2.5 rounded-xl border border-black/10 bg-[#FAFAFA] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#111111] mb-1">Note (Optional)</label>
              <input
                type="text"
                value={timerNote}
                onChange={(e) => setTimerNote(e.target.value)}
                placeholder="Additional details..."
                className="w-full p-2.5 rounded-xl border border-black/10 bg-[#FAFAFA] outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* TIMESHEET TABLE */}
      <div className="bg-white rounded-[24px] border border-black/5 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#111111]">Logged Timesheets</h2>
            <span className="text-xs text-[#6B6B6B]">
              (Total: {Math.round((totalFilteredMinutes / 60) * 10) / 10} hours)
            </span>
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={filterMemberId}
              onChange={(e) => setFilterMemberId(e.target.value)}
              className="text-xs font-semibold p-1.5 rounded-xl border border-black/10 bg-white"
            >
              <option value="all">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="text-xs font-semibold p-1.5 rounded-xl border border-black/10 bg-white"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">Task / Item</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#A8A5A5]">
                    No time entries logged.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const member = members.find((m) => m.id === entry.memberId);
                  const client = clients.find((c) => c.id === entry.clientId);

                  return (
                    <tr key={entry.id} className="hover:bg-black/1">
                      <td className="py-3 px-3 font-medium text-[#111111]">
                        {entry.createdAt || entry.startTime.split('T')[0]}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#111111]">
                        {member?.name || entry.memberId}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#111111]">{entry.deliveryItemTitle}</div>
                        {entry.note && (
                          <div className="text-[10px] text-[#A8A5A5]">{entry.note}</div>
                        )}
                        {entry.manualReason && (
                          <div className="text-[10px] text-amber-700 italic">
                            Reason: {entry.manualReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#6B6B6B]">
                        {client?.businessName || 'Internal'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#111111]">
                        {Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entry.source === 'manual'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {entry.source}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 30-MIN IDLE PROMPT MODAL */}
      {idlePromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-[24px] p-6 border border-black/10 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">Still working?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Your timer has been active for over 30 minutes with no interaction.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStopTimer}
                className="px-4 py-2 rounded-full bg-red-100 text-red-800 hover:bg-red-200 text-xs font-bold cursor-pointer"
              >
                Stop Timer
              </button>
              <button
                type="button"
                onClick={() => setIdlePromptOpen(false)}
                className="px-4 py-2 rounded-full bg-[#111111] text-white hover:bg-black text-xs font-bold cursor-pointer"
              >
                Yes, Still Working
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ENTRY MODAL */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[28px] border border-black/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="text-sm font-bold text-[#111111]">Log Manual Time Entry</h3>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-[#6B6B6B] hover:text-[#111111]"
              >
                <X size={18} />
              </button>
            </div>

            {manualError && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
                {manualError}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#111111] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Content writing for Cork practice"
                  className="w-full p-2.5 rounded-xl border border-black/10 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111111] mb-1">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={manualDuration}
                    onChange={(e) => setManualDuration(parseInt(e.target.value) || 30)}
                    className="w-full p-2.5 rounded-xl border border-black/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111111] mb-1">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-black/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111111] mb-1">Client</label>
                <select
                  value={manualClient}
                  onChange={(e) => setManualClient(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-black/10 bg-white outline-none"
                >
                  <option value="">Internal / Operations</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111111] mb-1">
                  Required Reason for Manual Entry *
                </label>
                <input
                  type="text"
                  required
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Meeting held off-site, forgot to start timer..."
                  className="w-full p-2.5 rounded-xl border border-black/10 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-black cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
