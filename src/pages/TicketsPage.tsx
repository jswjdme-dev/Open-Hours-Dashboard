import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  Building,
  Filter,
  Search,
} from 'lucide-react';
import { Ticket, TicketStatus, TicketType, TicketScope } from '../types/index.ts';
import { getTickets, createTicket, updateTicket, addTicketComment, getClients } from '../data/repo.ts';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'Received' | 'In progress' | 'Resolved'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TicketType>('Change');
  const [newScope, setNewScope] = useState<TicketScope>('In package');
  const [newExtraCost, setNewExtraCost] = useState(0);
  const [newDesc, setNewDesc] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newPriority, setNewPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');

  // Comment state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isInternalComment, setIsInternalComment] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [t, c] = await Promise.all([getTickets(), getClients()]);
    setTickets(t);
    setClients(c.map((cli) => ({ id: cli.id, name: cli.businessName })));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newClientId) return;

    const selectedClient = clients.find((c) => c.id === newClientId);
    const promisedBy = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await createTicket({
      clientId: newClientId,
      clientName: selectedClient?.name || 'Clinic',
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: 'Received',
      scope: newScope,
      extraCostEUR: newScope === 'Extra cost' ? newExtraCost : undefined,
      priority: newPriority,
      promisedResponseBy: promisedBy,
    });

    setNewTitle('');
    setNewDesc('');
    setIsModalOpen(false);
    loadData();
  };

  const handleResolveTicket = async (ticketId: string) => {
    await updateTicket(ticketId, {
      status: 'Resolved',
      resolutionNote: 'Issue addressed and verified in live staging/production.',
    });
    loadData();
  };

  const handleSendComment = async (ticketId: string) => {
    const text = commentInputs[ticketId]?.trim();
    if (!text) return;

    await addTicketComment(ticketId, {
      authorName: 'Founder',
      authorRole: 'admin',
      text,
      isInternalOnly: isInternalComment,
    });

    setCommentInputs((prev) => ({ ...prev, [ticketId]: '' }));
    loadData();
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (scopeFilter !== 'all' && t.scope !== scopeFilter) return false;
    return true;
  });

  const unresolvedCount = tickets.filter((t) => t.status !== 'Resolved').length;

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
            Tickets
          </h1>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
            Demo data
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-102"
        >
          <Plus size={14} />
          <span>New ticket</span>
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Open Helpdesk Queue
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#D92D50] tabular-nums">
              {unresolvedCount}
            </span>
            <span className="text-xs text-[#A8A5A5]">Require action</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            SLA Response Commitment
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">
              &lt; 24h
            </span>
            <span className="text-xs text-[#A8A5A5]">Standard target</span>
          </div>
        </div>

        <div className="bg-[#111111] text-white rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-semibold text-white/70 block mb-1">
            Total Resolved
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums">
              {tickets.filter((t) => t.status === 'Resolved').length}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Completed</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2.5 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['all', 'Received', 'In progress', 'Resolved'] as const).map((st) => (
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
              {st === 'all' ? 'All Tickets' : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Scope */}
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Scopes</option>
            <option value="In package">In Package</option>
            <option value="Extra cost">Extra Cost (Add-on)</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Types</option>
            <option value="Change">Change</option>
            <option value="Bug">Bug</option>
            <option value="Question">Question</option>
            <option value="Complaint">Complaint</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.map((tick) => {
          const isOverdue =
            tick.status !== 'Resolved' &&
            new Date(tick.promisedResponseBy).getTime() < Date.now();

          return (
            <div
              key={tick.id}
              className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-[#111111]">{tick.clientName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#111111] text-white text-[10px] font-bold">
                      {tick.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tick.scope === 'Extra cost'
                          ? 'bg-[#FCE9ED] text-[#D92D50]'
                          : 'bg-gray-100 text-[#6B6B6B]'
                      }`}
                    >
                      {tick.scope} {tick.extraCostEUR ? `(€${tick.extraCostEUR})` : ''}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tick.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tick.status === 'In progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tick.status}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded-full bg-[#D92D50] text-white text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle size={10} /> SLA Warning
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-[#111111]">{tick.title}</h3>
                </div>

                {tick.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={() => handleResolveTicket(tick.id)}
                    className="px-3.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors cursor-pointer shadow-2xs"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>

              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                {tick.description}
              </p>

              {tick.resolutionNote && (
                <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900">
                  <strong>Resolution:</strong> {tick.resolutionNote}
                </div>
              )}

              {/* Comments Thread */}
              {tick.comments.length > 0 && (
                <div className="pt-2 border-t border-black/5 space-y-2">
                  {tick.comments.map((cm) => (
                    <div
                      key={cm.id}
                      className={`text-xs p-2.5 rounded-xl ${
                        cm.isInternalOnly ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#A8A5A5] mb-1">
                        <span className="font-bold text-[#111111]">
                          {cm.authorName} {cm.isInternalOnly ? '(Internal Team Note)' : ''}
                        </span>
                        <span>{cm.createdAt}</span>
                      </div>
                      <div className="text-[#111111]">{cm.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Row */}
              <div className="pt-2 border-t border-black/5 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInputs[tick.id] || ''}
                  onChange={(e) =>
                    setCommentInputs({ ...commentInputs, [tick.id]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendComment(tick.id);
                  }}
                  placeholder="Post response or internal team note..."
                  className="flex-1 px-3.5 py-1.5 text-xs bg-[#F1EFEF] rounded-full border border-black/10 focus:outline-none focus:border-[#D92D50]"
                />
                <label className="flex items-center gap-1 text-[11px] text-[#6B6B6B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={() => setIsInternalComment(!isInternalComment)}
                    className="accent-[#D92D50]"
                  />
                  <span>Internal</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleSendComment(tick.id)}
                  className="p-1.5 rounded-full bg-[#111111] text-white hover:bg-black cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <h3 className="text-base font-bold text-[#111111] mb-3">Create Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Clinic Client
                </label>
                <select
                  required
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                >
                  <option value="">Select clinic...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Update holiday opening hours"
                  className="w-full p-2 text-xs border border-black/10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as TicketType)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value="Change">Change</option>
                    <option value="Bug">Bug</option>
                    <option value="Question">Question</option>
                    <option value="Complaint">Complaint</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Scope
                  </label>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as any)}
                    className="w-full p-2 text-xs border border-black/10 rounded-xl"
                  >
                    <option value="In package">In package</option>
                    <option value="Extra cost">Extra cost (Add-on)</option>
                  </select>
                </div>

                {newScope === 'Extra cost' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
                      Cost (€ EUR)
                    </label>
                    <input
                      type="number"
                      value={newExtraCost}
                      onChange={(e) => setNewExtraCost(parseInt(e.target.value) || 0)}
                      className="w-full p-2 text-xs border border-black/10 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Details of the request or bug report..."
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
                  className="px-4 py-1.5 bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold rounded-full"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
