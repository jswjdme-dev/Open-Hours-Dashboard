import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Video,
  Plus,
  Clock,
  CheckCircle2,
  ExternalLink,
  Users,
  Search,
  Filter,
  CheckSquare,
} from 'lucide-react';
import { Meeting, MeetingType } from '../types/index.ts';
import { getMeetings, createMeeting, updateMeeting, getClients, getLeads } from '../data/repo.ts';

export const MeetingsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Scheduled' | 'Completed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<MeetingType>('Sales call');
  const [newStartsAt, setNewStartsAt] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16)
  );
  const [newDuration, setNewDuration] = useState(30);
  const [newAgenda, setNewAgenda] = useState('');
  const [newAttendees, setNewAttendees] = useState('Founder');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  const [availableClients, setAvailableClients] = useState<Array<{ id: string; name: string }>>([]);
  const [availableLeads, setAvailableLeads] = useState<Array<{ id: string; name: string }>>([]);

  const loadData = async () => {
    setLoading(true);
    const [m, c, l] = await Promise.all([getMeetings(), getClients(), getLeads()]);
    setMeetings(m);
    setAvailableClients(c.map((cli) => ({ id: cli.id, name: cli.businessName })));
    setAvailableLeads(l.map((ld) => ({ id: ld.id, name: ld.businessName })));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActionItem = async (meeting: Meeting, actionIdx: number) => {
    // In demo mode, mark completed
    const updatedStatus = meeting.status === 'Scheduled' ? 'Completed' : 'Scheduled';
    await updateMeeting(meeting.id, { status: updatedStatus });
    loadData();
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createMeeting({
      title: newTitle.trim(),
      type: newType,
      startsAt: newStartsAt,
      durationMin: newDuration,
      timezone: 'Europe/Dublin',
      link: 'https://meet.google.com/oh-call',
      agenda: newAgenda.trim(),
      attendees: newAttendees.split(',').map((s) => s.trim()).filter(Boolean),
      actionItems: ['Prepare presentation notes'],
      status: 'Scheduled',
      clientId: selectedEntityId.startsWith('cli_') ? selectedEntityId.replace('cli_', '') : undefined,
      leadId: selectedEntityId.startsWith('lead_') ? selectedEntityId : undefined,
    });

    setNewTitle('');
    setNewAgenda('');
    setIsModalOpen(false);
    loadData();
  };

  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
            Meetings
          </h1>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
            Demo data
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-102"
        >
          <Plus size={14} />
          <span>Schedule meeting</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2.5 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['all', 'Scheduled', 'Completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'bg-white text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              {st === 'all' ? 'All Meetings' : st}
            </button>
          ))}
        </div>

        {/* Meeting Type Selector */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
        >
          <option value="all">All Types</option>
          <option value="Sales call">Sales Call (Discovery)</option>
          <option value="Kickoff">Kickoff Alignment</option>
          <option value="Review">Monthly Review</option>
          <option value="Strategy">Strategy Call</option>
          <option value="Support">Client Support</option>
        </select>
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMeetings.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-xs text-[#A8A5A5]">
            No meetings found for the selected filter.
          </div>
        ) : (
          filteredMeetings.map((meet) => (
            <div
              key={meet.id}
              className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FCE9ED] text-[#D92D50] text-[10px] font-bold uppercase tracking-wider">
                    {meet.type}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      meet.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {meet.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#111111] mb-1">{meet.title}</h3>
                <div className="flex items-center gap-2 text-xs text-[#6B6B6B] mb-2">
                  <Calendar size={13} />
                  <span>
                    {new Date(meet.startsAt).toLocaleString()} ({meet.durationMin} mins)
                  </span>
                </div>

                <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
                  <strong>Agenda:</strong> {meet.agenda}
                </p>

                {meet.summary && (
                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-[#111111] mb-2">
                    <span className="font-bold block mb-0.5">Summary:</span>
                    {meet.summary}
                  </div>
                )}

                {/* Action Items */}
                {meet.actionItems.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#A8A5A5] uppercase tracking-wider">
                      Follow-up Action Items
                    </span>
                    {meet.actionItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#111111]">
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-[11px] text-[#A8A5A5]">
                  Attendees: {meet.attendees.join(', ')}
                </span>
                {meet.link && (
                  <a
                    href={meet.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold bg-[#111111] text-white rounded-full hover:bg-black"
                  >
                    <Video size={12} />
                    <span>Join Call</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Meeting Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <h3 className="text-base font-bold text-[#111111] mb-3">Schedule Meeting</h3>
            <form onSubmit={handleCreateMeeting} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sales Discovery Call - Dublin Spine Clinic"
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Meeting Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MeetingType)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value="Sales call">Sales Call (Discovery)</option>
                    <option value="Kickoff">Kickoff Alignment</option>
                    <option value="Review">Monthly Review</option>
                    <option value="Strategy">Strategy Call</option>
                    <option value="Support">Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Link to Lead or Client
                  </label>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value="">None / Standalone</option>
                    <optgroup label="Clients">
                      {availableClients.map((c) => (
                        <option key={c.id} value={`cli_${c.id}`}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Leads">
                      {availableLeads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newStartsAt}
                    onChange={(e) => setNewStartsAt(e.target.value)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Duration
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value))}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Agenda
                </label>
                <textarea
                  rows={3}
                  value={newAgenda}
                  onChange={(e) => setNewAgenda(e.target.value)}
                  placeholder="Items to discuss..."
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-full"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
