import React, { useState } from 'react';
import {
  LogIn,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  ArrowRight,
  Mail,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SupabaseLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export const SupabaseLoginModal: React.FC<SupabaseLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { signInWithPassword, sendPasswordResetEmail, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password view state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await signInWithPassword(email.trim(), password);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      onLoginSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await sendPasswordResetEmail(email.trim());
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to send password reset email.');
        return;
      }
      setResetEmailSent(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101828]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-[16px] border border-[#ECEEF2] shadow-[0_20px_24px_-4px_rgba(16,24,40,0.08)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#F2F4F7] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#D92D50] text-white flex items-center justify-center shadow-xs">
              <LogIn size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#101828]">
                {isForgotPassword ? 'Reset Password' : 'Sign In to Console'}
              </h3>
              <p className="text-[12px] text-[#667085]">
                {isForgotPassword
                  ? 'We will send a password reset link to your email'
                  : 'Supabase Authentication'}
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
          {!isConfigured && (
            <div className="p-3.5 bg-[#FFF4E5] border border-[#FEDF89] rounded-[10px] text-xs text-[#B54708] flex items-start gap-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#F79009]" />
              <div>
                <strong className="font-semibold block">Supabase credentials needed</strong>
                Set <code className="font-mono text-[11px] font-bold">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono text-[11px] font-bold">VITE_SUPABASE_ANON_KEY</code> in your environment.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 text-xs bg-[#FEECEB] text-[#D92D50] rounded-[10px] border border-[#FECDCA] flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isForgotPassword ? (
            resetEmailSent ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#E7F8EF] text-[#12B76A] flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-[#101828]">Check your email</h4>
                  <p className="text-[12px] text-[#667085] mt-1">
                    If an account exists for <strong className="text-[#101828]">{email}</strong>, a password reset link has been dispatched.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                  className="w-full h-10 rounded-[10px] bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#101828] text-xs font-semibold transition-all cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <div>
                  <label className="text-[13px] font-medium text-[#101828] block mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@openhours.ie"
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-[10px] border border-[#D0D5DD] bg-white text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-3 focus:ring-[#D92D50]/15 transition-all"
                    />
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-medium text-[#667085] hover:text-[#101828] cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-4 rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Sending Link...' : 'Send Reset Link'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-[13px] font-medium text-[#101828] block mb-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@openhours.ie"
                    className="w-full h-10 pl-9 pr-3 text-xs rounded-[10px] border border-[#D0D5DD] bg-white text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-3 focus:ring-[#D92D50]/15 transition-all"
                  />
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[13px] font-medium text-[#101828]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMessage(null);
                    }}
                    className="text-[12px] font-medium text-[#D92D50] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full h-10 pl-9 pr-10 text-xs rounded-[10px] border border-[#D0D5DD] bg-white text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-3 focus:ring-[#D92D50]/15 transition-all"
                  />
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
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
                  <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
