import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface NotNowModalProps {
  isOpen: boolean;
  leadName: string;
  onConfirm: (followUpDate: string, notes: string) => void;
  onCancel: () => void;
}

export const NotNowModal: React.FC<NotNowModalProps> = ({
  isOpen,
  leadName,
  onConfirm,
  onCancel,
}) => {
  // Default to 60 days from now
  const defaultDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="not-now-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F1EFEF] text-[#111111] flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <h3 id="not-now-title" className="text-lg font-bold text-[#111111]">
              Snooze Lead to &ldquo;Not Now&rdquo;
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#A8A5A5] hover:text-[#111111] p-1 rounded-full"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[#6B6B6B] mb-4">
          Moving <span className="font-semibold text-[#111111]">{leadName}</span> to Not Now requires a follow-up date. An automated reminder task will be created on that date.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Follow-up Date <span className="text-[#D92D50]">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Reason / Circumstance (e.g. Clinic surgery refit underway)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Owner requested contact after Q4 lease renewal is finalized."
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] transition-colors"
          >
            Cancel Move
          </button>
          <button
            type="button"
            disabled={!date}
            onClick={() => onConfirm(date, notes)}
            className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            Schedule Snooze Task
          </button>
        </div>
      </div>
    </div>
  );
};
