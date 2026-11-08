import React, { useState } from 'react';
import {
  LogIn,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  recordCredentialLoginAttempt,
  getUserCredentialByLoginId,
  setActiveAuthSession,
} from '../../data/repo.ts';
import { verifyPassword } from '../../lib/authCrypto.ts';
import { Role, ActiveAuthSession } from '../../types/index.ts';

interface MockLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: ActiveAuthSession) => void;
}

export const MockLoginModal: React.FC<MockLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutInfo, setLockoutInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDemoFill = (id: string, pass: string) => {
    setLoginId(id);
    setPassword(pass);
    setErrorMessage(null);
    setLockoutInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setErrorMessage('Please enter both Login ID and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setLockoutInfo(null);

      // 1. Fetch credential record
      const cred = await getUserCredentialByLoginId(loginId.trim());
      if (!cred) {
        setErrorMessage('Invalid credentials. Account not found.');
        return;
      }

      if (cred.loginDisabled) {
        setErrorMessage('This account login has been disabled by an administrator.');
        return;
      }

      // Check lockout status
      if (cred.lockedUntil && new Date(cred.lockedUntil).getTime() > Date.now()) {
        const remainingMinutes = Math.ceil(
          (new Date(cred.lockedUntil).getTime() - Date.now()) / (60 * 1000)
        );
        setLockoutInfo(`Account locked due to 5 failed attempts. Try again in ${remainingMinutes} min.`);
        return;
      }

      // 2. Verify password via Web Crypto PBKDF2
      const isValid = await verifyPassword(
        password,
        cred.passwordHashHex,
        cred.saltHex,
        cred.iterations
      );

      // 3. Record attempt in repo
      const attemptRes = await recordCredentialLoginAttempt(loginId.trim(), isValid);

      if (!isValid) {
        if (attemptRes.lockedOut) {
          setLockoutInfo('Account locked due to 5 failed attempts. Please contact an admin or wait 15 minutes.');
        } else {
          setErrorMessage(
            `Invalid password. ${attemptRes.attemptsRemaining} attempt${
              attemptRes.attemptsRemaining === 1 ? '' : 's'
            } remaining before 15-minute lockout.`
          );
        }
        return;
      }

      // 4. Successful login session creation
      const session: ActiveAuthSession = {
        credentialId: cred.id,
        loginId: cred.loginId,
        role: cred.role,
        targetEntityId: cred.targetEntityId,
        targetEntityName: cred.targetEntityName,
        mustChangeOnFirstLogin: cred.mustChangeOnFirstLogin,
        loginTimestamp: new Date().toISOString(),
      };

      await setActiveAuthSession(session);
      onLoginSuccess(session);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-[16px] border border-[#E8EAEE] shadow-[0_20px_24px_-4px_rgba(16,24,40,0.08)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#F2F4F7] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#101828] text-white flex items-center justify-center">
              <LogIn size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#101828]">Portal Role Sign In</h3>
              <p className="text-[12px] text-[#667085]">
                Routes dynamically to Console, My Work, Client Portal, or Partner Portal
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
          {/* Mandatory Banner */}
          <div className="bg-[#FEF0C7]/60 rounded-[10px] p-3.5 border border-[#FEDF89] flex items-start gap-2.5">
            <ShieldAlert size={16} className="text-[#B54708] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#B54708] leading-relaxed font-medium">
              <strong className="font-semibold">Security Notice: </strong>
              Mock auth is NOT secure: do not hand credentials to real people until Supabase auth is live (Phase 5).
            </div>
          </div>

          {/* Quick Demo Accounts Pills */}
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#667085] block mb-1.5">
              Quick Role Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@openhours.ie', 'AdminPass2026!')}
                className="px-3 py-2 rounded-[10px] border border-[#E8EAEE] hover:border-[#D0D5DD] bg-[#F8F9FA] text-left text-[11px] transition-all cursor-pointer"
              >
                <div className="font-semibold text-[#101828]">Admin / Staff</div>
                <div className="text-[10px] text-[#667085]">admin@openhours.ie</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('mark@openhours.ie', 'MemberPass2026!')}
                className="px-3 py-2 rounded-[10px] border border-[#E8EAEE] hover:border-[#D0D5DD] bg-[#F8F9FA] text-left text-[11px] transition-all cursor-pointer"
              >
                <div className="font-semibold text-[#101828]">Team Member</div>
                <div className="text-[10px] text-[#667085]">mark@openhours.ie</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('client@apex.ie', 'ClientPass2026!')}
                className="px-3 py-2 rounded-[10px] border border-[#E8EAEE] hover:border-[#D0D5DD] bg-[#F8F9FA] text-left text-[11px] transition-all cursor-pointer"
              >
                <div className="font-semibold text-[#101828]">Client Portal</div>
                <div className="text-[10px] text-[#667085]">client@apex.ie</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('partner@dublinhealth.ie', 'PartnerPass2026!')}
                className="px-3 py-2 rounded-[10px] border border-[#E8EAEE] hover:border-[#D0D5DD] bg-[#F8F9FA] text-left text-[11px] transition-all cursor-pointer"
              >
                <div className="font-semibold text-[#101828]">Partner Portal</div>
                <div className="text-[10px] text-[#667085]">partner@dublinhealth.ie</div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            {errorMessage && (
              <div className="p-3 text-xs bg-[#FEECEB] text-[#D92D50] rounded-[10px] border border-[#FECDCA] flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {lockoutInfo && (
              <div className="p-3 text-xs bg-[#FEECEB] text-[#D92D50] rounded-[10px] border border-[#FECDCA] font-medium flex items-center gap-2">
                <Lock size={14} className="shrink-0 text-[#D92D50]" />
                <span>{lockoutInfo}</span>
              </div>
            )}

            <div>
              <label className="text-[13px] font-medium text-[#101828] block mb-1">
                Login ID
              </label>
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Email or username"
                className="w-full h-10 px-3.5 text-xs rounded-[10px] border border-[#D0D5DD] bg-white text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-3 focus:ring-[#D92D50]/15 transition-all"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#101828] block mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-10 px-3.5 pr-10 text-xs font-mono rounded-[10px] border border-[#D0D5DD] bg-white text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-3 focus:ring-[#D92D50]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#101828] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Verifying PBKDF2 Hash...' : 'Sign In'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
