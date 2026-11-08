import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { LogoMark } from '../common/LogoMark.tsx';

interface SignInPageProps {
  authError?: string | null;
}

export const SignInPage: React.FC<SignInPageProps> = ({ authError }) => {
  const { signInWithPassword, sendPasswordResetEmail, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Client-side rate-limit / delay protection after 5 failed attempts
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState<number>(0);

  // Forgot password view state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (lockoutSecondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSecondsRemaining]);

  const displayedError = localError || authError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecondsRemaining > 0) return;

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      clearError();

      const res = await signInWithPassword(email.trim(), password);
      if (!res.success) {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);

        if (nextFailed >= 5) {
          // Trigger a 30-second client-side delay lockout
          setLockoutSecondsRemaining(30);
          setLocalError(
            'Too many failed attempts. Please wait 30 seconds before trying again.'
          );
        } else {
          setLocalError(
            res.error || 'Invalid credentials. Please verify your email and password.'
          );
        }
        return;
      }

      // Successful login resets counter
      setFailedAttempts(0);
      setLockoutSecondsRemaining(0);
    } catch (err: any) {
      setLocalError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError('Please enter your account email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      const res = await sendPasswordResetEmail(email.trim());
      if (!res.success) {
        setLocalError(res.error || 'Failed to send password reset email.');
        return;
      }
      setResetEmailSent(true);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F7F9] flex flex-col items-center justify-center p-4 selection:bg-[#FCE9ED] selection:text-[#D92D50]">
      <div className="w-full max-w-[400px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-[14px] bg-[#D92D50] text-white flex items-center justify-center shadow-sm mb-3">
            <LogoMark size={24} />
          </div>
          <h1 className="text-[20px] font-bold text-[#101828] tracking-tight">Open Hours</h1>
          <p className="text-[13px] text-[#667085] mt-1">
            {isForgotPassword ? 'Reset your account password' : 'Sign in to access your portal'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[16px] border border-[#ECEEF2] p-7 shadow-[0_12px_24px_-4px_rgba(16,24,40,0.06)]">
          {displayedError && (
            <div className="mb-5 p-3.5 text-[13px] bg-[#FEECEB] text-[#D92D50] rounded-[10px] border border-[#FECDCA] flex items-start gap-2.5 leading-snug">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{displayedError}</span>
                {lockoutSecondsRemaining > 0 && (
                  <div className="font-semibold mt-1">
                    Cooldown active: retry in {lockoutSecondsRemaining}s
                  </div>
                )}
              </div>
            </div>
          )}

          {isForgotPassword ? (
            resetEmailSent ? (
              <div className="space-y-5 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-[#E7F8EF] text-[#12B76A] flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[#101828]">Check your email</h2>
                  <p className="text-[13px] text-[#667085] mt-1.5 leading-relaxed">
                    If an active account exists for <strong className="text-[#101828]">{email}</strong>, a password reset link has been dispatched.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetEmailSent(false);
                    setLocalError(null);
                  }}
                  className="w-full h-[42px] rounded-[10px] bg-[#101828] hover:bg-[#1D2939] text-white text-[13px] font-semibold transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-[13px] font-medium text-[#344054] mb-1.5">
                    Account Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="name@openhours.co"
                    className="w-full h-[42px] px-3.5 rounded-[10px] border border-[#D0D5DD] bg-white text-[13.5px] text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[42px] rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] disabled:bg-[#F2F4F7] disabled:text-[#98A2B3] text-white text-[13.5px] font-semibold transition-all cursor-pointer shadow-2xs mt-2"
                >
                  {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setLocalError(null);
                    }}
                    className="text-[12.5px] font-medium text-[#667085] hover:text-[#101828] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-[13px] font-medium text-[#344054] mb-1.5">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                  placeholder="name@openhours.co"
                  className="w-full h-[42px] px-3.5 rounded-[10px] border border-[#D0D5DD] bg-white text-[13.5px] text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] transition-colors disabled:bg-[#F8F9FA] disabled:text-[#98A2B3]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-[13px] font-medium text-[#344054]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setLocalError(null);
                    }}
                    tabIndex={-1}
                    className="text-[12.5px] font-medium text-[#D92D50] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={lockoutSecondsRemaining > 0 || isSubmitting}
                    placeholder="••••••••••••"
                    className="w-full h-[42px] pl-3.5 pr-10 rounded-[10px] border border-[#D0D5DD] bg-white text-[13.5px] text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] transition-colors disabled:bg-[#F8F9FA] disabled:text-[#98A2B3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || lockoutSecondsRemaining > 0}
                className="w-full h-[42px] rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] disabled:bg-[#F2F4F7] disabled:text-[#98A2B3] text-white text-[13.5px] font-semibold transition-all cursor-pointer shadow-2xs mt-2 flex items-center justify-center gap-2"
              >
                {lockoutSecondsRemaining > 0 ? (
                  <>
                    <Lock size={14} />
                    <span>Locked ({lockoutSecondsRemaining}s)</span>
                  </>
                ) : isSubmitting ? (
                  <span>Signing in...</span>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
