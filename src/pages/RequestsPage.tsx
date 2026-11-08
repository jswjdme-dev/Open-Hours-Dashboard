import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  Calendar,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Request, RequestStatus, RequestType, Client } from '../types/index.ts';
import { getRequests, getClients, updateRequest } from '../data/repo.ts';

interface RequestsPageProps {
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({ onOpenClientWorkspace }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [reqs, clis] = await Promise.all([getRequests(), getClients()]);
    setRequests(reqs);

    const clientMap: Record<string, Client> = {};
    clis.forEach((c) => {
      clientMap[c.id] = c;
    });
    setClients(clientMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (reqId: string, newStatus: RequestStatus) => {
    await updateRequest(reqId, {
      status: newStatus,
      approvedAt: newStatus === 'Approved' ? new Date().toISOString() : undefined,
    });
    loadData();
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const clientName = clients[r.clientId]?.businessName || '';
      return r.title.toLowerCase().includes(q) || clientName.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Client Requests
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Global repository of clinic onboarding items, access credentials, and asset approvals.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search request or practice..."
              className="w-full bg-[#F4F2F2] rounded-full pl-9 pr-4 py-2 text-xs text-[#111111] placeholder-[#A8A5A5] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F4F2F2] p-1 rounded-full text-xs">
            {(['all', 'Pending', 'Submitted', 'Approved', 'Needs Changes'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-[#111111] shadow-xs font-bold'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {st === 'all' ? 'All Requests' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B6B6B]">Loading onboarding requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B6B6B]">No requests matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                  <th className="py-3 px-5">Request Title</th>
                  <th className="py-3 px-4">Client Practice</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Ball in Court</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredRequests.map((req) => {
                  const client = clients[req.clientId];
                  return (
                    <tr key={req.id} className="hover:bg-[#F9F9F9] transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-[#111111]">{req.title}</div>
                        <div className="text-[11px] text-[#A8A5A5] line-clamp-1">{req.description}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#111111]">
                        {client?.businessName || req.clientId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F4F2F2] font-semibold text-[11px] text-[#444444]">
                          {req.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#6B6B6B]">
                        {req.deadline}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-bold ${
                            req.assignedToClient ? 'text-[#D92D50]' : 'text-emerald-700'
                          }`}
                        >
                          {req.assignedToClient ? 'Client Action' : 'Our Review'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : req.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700'
                              : req.status === 'Submitted'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.status !== 'Approved' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(req.id, 'Approved')}
                              className="px-2.5 py-1 rounded-full bg-[#FCE9ED] text-[#D92D50] font-bold text-[10px] hover:bg-[#D92D50] hover:text-white transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {onOpenClientWorkspace && client && (
                            <button
                              type="button"
                              onClick={() => onOpenClientWorkspace(client.id, client.businessName)}
                              className="text-[11px] text-[#6B6B6B] hover:text-[#D92D50] cursor-pointer"
                              title="Workspace"
                            >
                              <ExternalLink size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
