import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  Archive,
  Search,
  CheckCircle,
  X,
} from 'lucide-react';
import { SuppressionEntry, SuppressionType, SuppressionReason } from '../types/index.ts';
import {
  getSuppressionList,
  addSuppressionEntry,
  archiveSuppressionEntry,
} from '../data/repo.ts';

export const SuppressionListPage: React.FC = () => {
  const [entries, setEntries] = useState<SuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add entry modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [contactValue, setContactValue] = useState('');
  const [type, setType] = useState<SuppressionType>('email');
  const [reason, setReason] = useState<SuppressionReason>('Asked to stop');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const list = await getSuppressionList();
      setEntries(list);
    } catch (err: any) {
      console.error('Error loading suppression list:', err);
      setErrorMessage(err?.message || 'Failed to load suppression list from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue.trim()) return;

    try {
      setErrorMessage(null);
      await addSuppressionEntry({
        contactValue: contactValue.trim(),
        type,
        reason,
        addedBy: 'Founder',
        notes: notes.trim(),
      });

      setContactValue('');
      setNotes('');
      setAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Error adding suppression entry:', err);
      setErrorMessage(err?.message || 'Failed to add suppression entry.');
    }
  };

  const handleArchive = async (id: string, contact: string) => {
    const confirmed = confirm(
      `WARNING: Are you sure you want to archive suppression for "${contact}"?\n\nUn-suppressing a contact who requested to opt out risks regulatory non-compliance under ePrivacy and GDPR.`
    );
    if (confirmed) {
      try {
        setErrorMessage(null);
        await archiveSuppressionEntry(id);
        await loadData();
      } catch (err: any) {
        console.error('Error archiving suppression entry:', err);
        setErrorMessage(err?.message || 'Failed to archive suppression entry.');
      }
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!showArchived && e.archivedAt) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.contactValue.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full space-y-6">
      {/* Title & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-bold text-[#101828] tracking-tight leading-none select-none">
            Suppression list
          </h1>
          <span className="px-2.5 py-0.5 text-[12px] font-semibold uppercase bg-[#E7E2E2] text-[#475467] rounded-full border border-black/5">
            Permanent Safeguard
          </span>
          <span className="text-[13px] text-[#667085] font-medium">
            {entries.filter((e) => !e.archivedAt).length} active blocks
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-[10px] bg-[#101828] hover:bg-black text-white text-[14px] font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Add Entry</span>
          </button>
        </div>
      </div>

      {/* Strict Policy Banner */}
      <div className="bg-[#FCE9ED] border border-[#D92D50]/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-[#111111]">
        <ShieldAlert size={18} className="text-[#D92D50] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[#D92D50]">
            System-Wide Opt-Out Enforcement
          </div>
          <p className="text-[#6B6B6B]">
            This list is permanent: no hard deletes are permitted. Entries are checked automatically during lead creation, CSV import, channel addition, outreach dispatch, and sequence task generation.
          </p>
        </div>
      </div>

      {/* Supabase Error Alert Banner */}
      {errorMessage && (
        <div className="bg-[#FEECEB] border border-[#FECDCA] rounded-2xl p-4 flex items-start gap-3 text-xs text-[#D92D50] animate-in fade-in">
          <AlertTriangle size={18} className="text-[#D92D50] shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-bold">Supabase Operation Failed</div>
            <p className="text-[#B42318]">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#D92D50] hover:text-[#912018] p-1 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-3 border border-black/5 flex items-center justify-between gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, domain, phone..."
            className="h-8 pl-8 pr-3 w-64 text-xs bg-white rounded-full border border-black/5 focus:outline-none focus:border-[#D92D50] shadow-2xs"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
            showArchived
              ? 'bg-[#111111] text-white border-black'
              : 'bg-white text-[#6B6B6B] border-black/5 hover:text-[#111111]'
          }`}
        >
          <Archive size={12} />
          <span>Show Archived ({entries.filter((e) => e.archivedAt).length})</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F8F7F7] text-[#6B6B6B] font-bold border-b border-black/5 text-[11px] uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-4">Contact Value</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Date Added</th>
                <th className="py-3 px-3">Added By</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/4">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#A8A5A5]">
                    No suppression entries found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => (
                  <tr
                    key={e.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      e.archivedAt ? 'opacity-50 bg-gray-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#111111]">
                      {e.contactValue}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-[#F1EFEF] rounded-full text-[10px] font-semibold uppercase text-[#6B6B6B]">
                        {e.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.reason === 'Asked to stop'
                            ? 'bg-[#FCE9ED] text-[#D92D50]'
                            : e.reason === 'Complained'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {e.reason}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#6B6B6B]">{e.dateAdded}</td>
                    <td className="py-3 px-3 text-[#6B6B6B]">{e.addedBy}</td>
                    <td className="py-3 px-3 text-[#6B6B6B] max-w-[200px] truncate">
                      {e.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!e.archivedAt ? (
                        <button
                          type="button"
                          onClick={() => handleArchive(e.id, e.contactValue)}
                          className="text-[11px] text-[#A8A5A5] hover:text-[#D92D50] font-semibold transition-colors cursor-pointer"
                        >
                          Archive
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#A8A5A5]">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111111]">
                Add Suppression Entry
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-[#A8A5A5] hover:text-[#111111] p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Contact Value <span className="text-[#D92D50]">*</span>
                </label>
                <input
                  type="text"
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder="e.g. dr.smith@domain.ie, blockeddomain.com, +353..."
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SuppressionType)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
                  >
                    <option value="email">Email address</option>
                    <option value="domain">Domain (@domain.com)</option>
                    <option value="phone">Phone number</option>
                    <option value="social_handle">Social handle</option>
                    <option value="business_name">Business name</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as SuppressionReason)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
                  >
                    <option value="Asked to stop">Asked to stop</option>
                    <option value="Bounced">Bounced</option>
                    <option value="Complained">Complained</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Requested removal via email reply."
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-colors"
                >
                  Add to Suppression List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
