import React, { useState } from 'react';
import { LostReason } from '../../types/index.ts';
import { AlertCircle, X } from 'lucide-react';

interface LostReasonModalProps {
  isOpen: boolean;
  leadName: string;
  onConfirm: (reason: LostReason, notes: string) => void;
  onCancel: () => void;
}

export const LostReasonModal: React.FC<LostReasonModalProps> = ({
  isOpen,
  leadName,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState<LostReason>('Price');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const reasons: LostReason[] = [
    'Price',
    'Trust',
    'No need',
    'Existing agency',
    'No reply',
    'Other',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lost-reason-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
            <h3 id="lost-reason-title" className="text-lg font-bold text-[#111111]">
              Mark Lead as Lost
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
          Recording the primary lost reason for <span className="font-semibold text-[#111111]">{leadName}</span> helps calibrate outreach targeting and pricing hypotheses.
        </p>

        <div className="space-y-3 mb-5">
          <label className="text-xs font-semibold text-[#111111] block">
            Primary Reason <span className="text-[#D92D50]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer ${
                  reason === r
                    ? 'border-[#D92D50] bg-[#FCE9ED] text-[#D92D50] font-semibold'
                    : 'border-black/10 text-[#6B6B6B] hover:border-black/20 hover:text-[#111111]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Feedback / Context (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clinic owner recently hired an in-house receptionist to handle social."
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
            onClick={() => onConfirm(reason, notes)}
            className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-colors cursor-pointer"
          >
            Confirm Lost Lead
          </button>
        </div>
      </div>
    </div>
  );
};
