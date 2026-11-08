import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Copy, Check, X, Lock } from 'lucide-react';

interface GeneratedCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  loginId: string;
  plaintextPassword: string;
  roleLabel: string;
  entityName?: string;
}

export const GeneratedCredentialModal: React.FC<GeneratedCredentialModalProps> = ({
  isOpen,
  onClose,
  loginId,
  plaintextPassword,
  roleLabel,
  entityName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = `Login ID: ${loginId}\nTemporary Password: ${plaintextPassword}\nRole: ${roleLabel}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-[16px] border border-[#E8EAEE] shadow-[0_20px_24px_-4px_rgba(16,24,40,0.08)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#F2F4F7] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#FEECEB] text-[#D92D50] flex items-center justify-center">
              <KeyRound size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#101828]">One-Time Credentials Generated</h3>
              <p className="text-[12px] text-[#667085]">
                {roleLabel} {entityName ? `· ${entityName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] hover:bg-[#F2F4F7] flex items-center justify-center text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Security Banner */}
          <div className="bg-[#FEF0C7]/60 rounded-[10px] p-3.5 border border-[#FEDF89] flex items-start gap-2.5">
            <ShieldAlert size={16} className="text-[#B54708] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#B54708] leading-relaxed font-medium">
              <strong className="font-semibold">Security Notice: </strong>
              Mock auth is NOT secure: do not hand credentials to real people until Supabase auth is live (Phase 5).
            </div>
          </div>

          {/* Credentials Display Box */}
          <div className="bg-[#F8F9FA] rounded-[12px] p-4 border border-[#EAECF0] space-y-3">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#667085] block">
                Login ID
              </span>
              <span className="text-[13px] font-semibold text-[#101828] font-mono select-all">
                {loginId}
              </span>
            </div>

            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#667085] block mb-1">
                Temporary Password
              </span>
              <div className="flex items-center justify-between p-2.5 bg-white rounded-[10px] border border-[#D0D5DD]">
                <span className="text-xs font-mono font-semibold text-[#101828] tracking-wider select-all">
                  {plaintextPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-[#101828] text-white hover:bg-black text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                >
                  {copied ? <Check size={12} className="text-[#12B76A]" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Crucial Single-Display Notice */}
            <div className="pt-2 border-t border-[#EAECF0] flex items-center gap-2 text-[11px] text-[#D92D50] font-semibold">
              <Lock size={13} />
              <span>Share this securely. It will not be shown again.</span>
            </div>
          </div>

          <div className="text-[11px] text-[#027A48] bg-[#E7F8EF] rounded-[10px] p-3 border border-[#A6F4C5]">
            ✓ Marked as <strong>Must change password on first login</strong>. Hashed with Web Crypto PBKDF2 (100,000 iterations). Plaintext has been permanently deleted from storage.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAFBFD] border-t border-[#F2F4F7] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-[10px] bg-[#101828] text-white hover:bg-black text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            I have safely copied the credentials
          </button>
        </div>
      </div>
    </div>
  );
};
