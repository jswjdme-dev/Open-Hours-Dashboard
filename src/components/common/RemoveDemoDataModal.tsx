import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Database,
  Lock,
} from 'lucide-react';
import {
  getDemoDataCounts,
  removeDemoData,
  exportAllDataJson,
  DemoDataCounts,
} from '../../data/repo.ts';

interface RemoveDemoDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (removedCounts: Record<string, number>) => void;
}

export const RemoveDemoDataModal: React.FC<RemoveDemoDataModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [counts, setCounts] = useState<DemoDataCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  // Step 2 inputs
  const [confirmationText, setConfirmationText] = useState('');
  const [understandChecked, setUnderstandChecked] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setBackupDownloaded(false);
      setConfirmationText('');
      setUnderstandChecked(false);
      setCountdown(3);
      setDeleteError(null);
      setLoading(true);

      getDemoDataCounts().then((res) => {
        setCounts(res);
        setLoading(false);
      });
    }
  }, [isOpen]);

  // Countdown timer in step 2 once verified
  const isInputsValid = confirmationText === 'REMOVE DEMO DATA' && understandChecked;

  useEffect(() => {
    if (step === 2 && isInputsValid) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
      }
    } else {
      setCountdown(3);
    }
  }, [step, isInputsValid, countdown]);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const jsonStr = exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `open-hours-full-backup-${ts}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setBackupDownloaded(true);
  };

  const handleConfirmRemoval = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await removeDemoData();
      if (!res.success) {
        setDeleteError(res.error || 'Failed to remove demo data.');
        setIsDeleting(false);
        return;
      }

      onSuccess(res.removedCounts);
      onClose();
    } catch (err: any) {
      setDeleteError(err?.message || 'Unexpected error occurred.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-[16px] border border-[#E8EAEE] shadow-[0_20px_24px_-4px_rgba(16,24,40,0.08)] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#F2F4F7] bg-[#FAFBFD]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#FEECEB] text-[#D92D50] flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#101828]">Remove Demo Data</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#D92D50] text-white">
                  Step {step} of 2
                </span>
              </div>
              <p className="text-[12px] text-[#667085]">
                {step === 1 ? 'Review entity counts and verify backup' : 'Confirm irreversible removal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] hover:bg-[#F2F4F7] flex items-center justify-center text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {loading || !counts ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-[#D92D50] border-t-transparent animate-spin" />
              <span className="text-[13px] text-[#667085]">Scanning demo records...</span>
            </div>
          ) : step === 1 ? (
            /* STEP 1: REVIEW */
            <div className="space-y-4">
              {/* Warnings / Blockers */}
              {counts.blockers.length > 0 && (
                <div className="p-4 rounded-[12px] bg-[#FEF0C7]/60 border border-[#FEDF89] text-xs text-[#B54708] space-y-2">
                  <div className="font-semibold flex items-center gap-2 text-[13px]">
                    <AlertTriangle size={15} className="text-[#F79009]" />
                    <span>Removal Blocked: Real Records Linked to Demo Data</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px]">
                    {counts.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] font-medium text-[#B54708]">
                    You must resolve or reassign these references before proceeding with demo data
                    removal.
                  </p>
                </div>
              )}

              <p className="text-[13px] text-[#344054] leading-relaxed">
                This process purges all initial seed entries marked as demonstration data while
                strictly preserving any real clinic leads, clients, invoices, or tasks you created.
              </p>

              {/* Entity Counts Table */}
              <div className="border border-[#E8EAEE] rounded-[12px] overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBFD] border-b border-[#E8EAEE] text-[#667085] font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-4">Entity</th>
                      <th className="py-2.5 px-4 text-center text-[#D92D50]">Will be Removed</th>
                      <th className="py-2.5 px-4 text-center text-[#12B76A]">Will be Kept</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] text-xs">
                    {[
                      { label: 'Leads', c: counts.leads },
                      { label: 'Clients', c: counts.clients },
                      { label: 'Tasks & Reminders', c: counts.tasks },
                      { label: 'Payment Records', c: counts.payments },
                      { label: 'Invoices', c: counts.invoices },
                      { label: 'Client Projects & Stages', c: counts.projects },
                      { label: 'Requests', c: counts.requests },
                      { label: 'Support Tickets', c: counts.tickets },
                      { label: 'Team Members', c: counts.teamMembers },
                      { label: 'Time Entries', c: counts.timeEntries },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#FAFBFD]">
                        <td className="py-2 px-4 font-medium text-[#101828]">{row.label}</td>
                        <td className="py-2 px-4 text-center font-semibold text-[#D92D50]">
                          {row.c.demo} demo
                        </td>
                        <td className="py-2 px-4 text-center font-semibold text-[#12B76A]">
                          {row.c.real} real
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mandatory Backup Step */}
              <div className="p-4 rounded-[12px] bg-[#F8F9FA] border border-[#EAECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[13px] font-semibold text-[#101828] flex items-center gap-1.5">
                    <Database size={14} className="text-[#667085]" />
                    <span>Mandatory Safety Backup</span>
                  </div>
                  <p className="text-[11px] text-[#667085]">
                    Export all current data to a local JSON file before continuing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className={`h-9 px-3.5 rounded-[10px] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                    backupDownloaded
                      ? 'bg-[#E7F8EF] text-[#12B76A] border border-[#A6F4C5]'
                      : 'bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F2F4F7] shadow-xs'
                  }`}
                >
                  {backupDownloaded ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Backup Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Download Backup (JSON)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#F2F4F7]">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-[10px] text-xs font-medium text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!backupDownloaded || counts.blockers.length > 0}
                  onClick={() => setStep(2)}
                  className="h-9 px-4 rounded-[10px] bg-[#101828] hover:bg-black text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Continue to Confirmation</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: CONFIRMATION */
            <div className="space-y-4">
              {deleteError && (
                <div className="p-3 text-xs bg-[#FEECEB] text-[#D92D50] rounded-[10px] border border-[#FECDCA]">
                  {deleteError}
                </div>
              )}

              <div className="p-4 rounded-[12px] bg-[#FEECEB] border border-[#FECDCA] text-[#D92D50] text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-[#D92D50] text-[13px]">
                  <AlertTriangle size={16} />
                  <span>CRITICAL WARNING: This cannot be undone.</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#D92D50]/90">
                  All seed leads, dummy clinics, synthetic timeline milestones, and demo invoices will
                  be permanently purged. A <code>demoRemoved=true</code> state flag will be saved so
                  seed data is NEVER re-created on browser reload.
                </p>
              </div>

              {/* Type to confirm */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[#101828]">
                  Type <span className="font-mono text-[#D92D50] font-bold select-all">REMOVE DEMO DATA</span> below:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="REMOVE DEMO DATA"
                  className="w-full h-10 text-xs font-mono px-3.5 rounded-[10px] border border-[#D0D5DD] focus:border-[#D92D50] focus:ring-3 focus:ring-[#D92D50]/15 outline-none transition-all"
                />
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#344054] pt-1">
                <input
                  type="checkbox"
                  checked={understandChecked}
                  onChange={(e) => setUnderstandChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#D92D50] focus:ring-[#D92D50]"
                />
                <span>I understand real data will not be touched.</span>
              </label>

              {/* Step 2 Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-[#F2F4F7]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isDeleting}
                  className="h-9 px-4 rounded-[10px] text-xs font-medium text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  disabled={!isInputsValid || countdown > 0 || isDeleting}
                  onClick={handleConfirmRemoval}
                  className="h-9 px-4 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <span>Purging records...</span>
                  ) : countdown > 0 && isInputsValid ? (
                    <>
                      <Clock size={14} />
                      <span>Ready in {countdown}s</span>
                    </>
                  ) : (
                    <span>Permanently Remove Demo Data</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
