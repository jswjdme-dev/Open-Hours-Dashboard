import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  UserX,
  UserCheck,
  LogOut,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { UserCredential } from '../../types/index.ts';
import {
  getUserCredentialByLoginId,
  resetUserCredentialPassword,
  toggleUserCredentialDisabled,
  unlockUserCredential,
} from '../../data/repo.ts';
import { generateStrongPassword, hashPassword } from '../../lib/authCrypto.ts';
import { GeneratedCredentialModal } from './GeneratedCredentialModal.tsx';

interface ManageCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  loginId: string;
  entityName: string;
  roleLabel: string;
  onCredentialUpdated?: () => void;
}

export const ManageCredentialModal: React.FC<ManageCredentialModalProps> = ({
  isOpen,
  onClose,
  loginId,
  entityName,
  roleLabel,
  onCredentialUpdated,
}) => {
  const [credential, setCredential] = useState<UserCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // One-time display modal for reset password
  const [newPlaintextPassword, setNewPlaintextPassword] = useState<string | null>(null);

  const loadCred = async () => {
    setLoading(true);
    const cred = await getUserCredentialByLoginId(loginId);
    setCredential(cred);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && loginId) {
      loadCred();
    }
  }, [isOpen, loginId]);

  if (!isOpen) return null;

  const handleResetPassword = async () => {
    if (!credential) return;
    try {
      setIsResetting(true);
      const generatedPlaintext = generateStrongPassword(16);
      const { hashHex, saltHex, iterations } = await hashPassword(generatedPlaintext);

      await resetUserCredentialPassword(
        credential.id,
        hashHex,
        saltHex,
        iterations,
        'Admin'
      );

      setNewPlaintextPassword(generatedPlaintext);
      setFeedback('Password successfully reset. One-time credentials generated.');
      loadCred();
      onCredentialUpdated?.();
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleDisabled = async () => {
    if (!credential) return;
    const newStatus = !credential.loginDisabled;
    await toggleUserCredentialDisabled(credential.id, newStatus, 'Admin');
    setFeedback(`Login ${newStatus ? 'disabled' : 'enabled'} successfully.`);
    loadCred();
    onCredentialUpdated?.();
  };

  const handleUnlock = async () => {
    if (!credential) return;
    await unlockUserCredential(credential.id, 'Admin');
    setFeedback('Account unlocked successfully. Failed attempt counter cleared.');
    loadCred();
    onCredentialUpdated?.();
  };

  const handleForceLogout = () => {
    setFeedback('Mock session invalidated. All active client sessions terminated.');
  };

  const isLocked =
    credential?.lockedUntil &&
    new Date(credential.lockedUntil).getTime() > Date.now();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-black/10 shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-black/5 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center">
                <KeyRound size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Manage Login & Credentials</h3>
                <p className="text-[11px] text-[#6B6B6B]">
                  {entityName} · {roleLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-[#6B6B6B] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Banner */}
            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/90 flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed font-medium">
                <strong className="font-bold">Security Notice: </strong>
                Mock auth is NOT secure: do not hand credentials to real people until Supabase auth is live (Phase 5).
              </div>
            </div>

            {feedback && (
              <div className="p-3 text-xs bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 flex items-center gap-2">
                <Check size={14} className="text-emerald-600" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Account Status Card */}
            <div className="bg-[#F8F7F7] rounded-2xl p-4 border border-black/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A5A5] block">
                    Login Identifier
                  </span>
                  <span className="text-xs font-bold text-[#111111] font-mono">{loginId}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A5A5] block">
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isLocked
                        ? 'bg-red-100 text-red-800'
                        : credential?.loginDisabled
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock size={10} /> Locked Out
                      </>
                    ) : credential?.loginDisabled ? (
                      <>
                        <UserX size={10} /> Login Disabled
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={10} /> Active
                      </>
                    )}
                  </span>
                </div>
              </div>

              {isLocked && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-900">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-red-600" />
                    <span>Locked out after 5 failed password attempts.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlock}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] cursor-pointer"
                  >
                    Unlock Account
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 text-[11px]">
                <div>
                  <span className="text-[#A8A5A5] block">Failed Attempts:</span>
                  <span className="font-bold text-[#111111]">
                    {credential?.failedAttemptsCount || 0} / 5
                  </span>
                </div>
                <div>
                  <span className="text-[#A8A5A5] block">First Login Rule:</span>
                  <span className="font-bold text-[#111111]">
                    {credential?.mustChangeOnFirstLogin ? 'Must change password' : 'Clear'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Admin Control Actions
              </h4>

              {/* Reset Password */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-black/10 hover:border-black/20 transition-all">
                <div>
                  <div className="text-xs font-bold text-[#111111]">Reset Password</div>
                  <div className="text-[11px] text-[#6B6B6B]">
                    Generates a new strong temporary password and shows one-time copy modal.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  className="px-3 py-1.5 rounded-lg bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                >
                  <RefreshCw size={12} className={isResetting ? 'animate-spin inline mr-1' : 'inline mr-1'} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Disable / Enable Login */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-black/10 hover:border-black/20 transition-all">
                <div>
                  <div className="text-xs font-bold text-[#111111]">
                    {credential?.loginDisabled ? 'Enable Login' : 'Disable Login'}
                  </div>
                  <div className="text-[11px] text-[#6B6B6B]">
                    Temporarily prevent access without deleting credential record.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDisabled}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ml-2 ${
                    credential?.loginDisabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                  }`}
                >
                  {credential?.loginDisabled ? 'Enable' : 'Disable'}
                </button>
              </div>

              {/* Force Logout */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-black/10 hover:border-black/20 transition-all">
                <div>
                  <div className="text-xs font-bold text-[#111111]">Force Logout (Mock)</div>
                  <div className="text-[11px] text-[#6B6B6B]">
                    Invalidate active portal session token immediately.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleForceLogout}
                  className="px-3 py-1.5 rounded-lg bg-[#F1EFEF] hover:bg-[#E7E2E2] text-[#111111] text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                >
                  <LogOut size={12} className="inline mr-1" />
                  <span>Force Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#F8F7F7] border-t border-black/5 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#111111] text-white hover:bg-black text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* One-Time Credential Modal on Reset */}
      {newPlaintextPassword && (
        <GeneratedCredentialModal
          isOpen={true}
          onClose={() => setNewPlaintextPassword(null)}
          loginId={loginId}
          plaintextPassword={newPlaintextPassword}
          roleLabel={roleLabel}
          entityName={entityName}
        />
      )}
    </>
  );
};
