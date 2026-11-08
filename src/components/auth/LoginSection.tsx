import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Sparkles, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { generateStrongPassword, calculatePasswordStrength, PasswordStrength } from '../../lib/authCrypto.ts';

interface LoginSectionProps {
  loginId: string;
  onLoginIdChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  loginIdLabel?: string;
  loginIdPlaceholder?: string;
  helpText?: string;
}

export const LoginSection: React.FC<LoginSectionProps> = ({
  loginId,
  onLoginIdChange,
  password,
  onPasswordChange,
  loginIdLabel = 'Login ID (Email or Username)',
  loginIdPlaceholder = 'e.g. clinic.owner@example.ie',
  helpText = 'Used for mock portal login. Credentials are encrypted with Web Crypto PBKDF2.',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const strength: PasswordStrength = calculatePasswordStrength(password);

  const handleGenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    const strong = generateStrongPassword(16);
    onPasswordChange(strong);
  };

  return (
    <div className="bg-[#F8F9FA] rounded-[12px] p-4 sm:p-5 border border-[#EAECF0] space-y-4">
      {/* Mandatory Security Banner */}
      <div className="bg-[#FEF0C7]/60 rounded-[10px] p-3 border border-[#FEDF89] flex items-start gap-2.5">
        <ShieldAlert size={16} className="text-[#B54708] shrink-0 mt-0.5" />
        <div className="text-[11px] text-[#B54708] leading-relaxed font-medium">
          <strong className="font-semibold">Security Notice: </strong>
          Mock auth is NOT secure: do not hand credentials to real people until Supabase auth is live (Phase 5).
        </div>
      </div>

      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-[#D92D50]" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#101828]">
          Portal Login Credentials
        </h4>
      </div>

      <div className="space-y-3">
        {/* Login ID */}
        <div>
          <label className="text-[13px] font-medium text-[#101828] block mb-1">
            {loginIdLabel} <span className="text-[#D92D50]">*</span>
          </label>
          <input
            type="text"
            required
            value={loginId}
            onChange={(e) => onLoginIdChange(e.target.value)}
            placeholder={loginIdPlaceholder}
            className="w-full h-10 px-3.5 text-xs rounded-[10px] border border-[#D0D5DD] bg-white text-[#101828] focus:outline-none focus:border-[#D92D50] focus:ring-3 focus:ring-[#D92D50]/15 transition-all"
          />
          <p className="text-[11px] text-[#667085] mt-1">{helpText}</p>
        </div>

        {/* Temporary Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[13px] font-medium text-[#101828]">
              Temporary Password <span className="text-[#D92D50]">*</span>
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D92D50] hover:text-[#B82340] cursor-pointer hover:underline"
            >
              <Sparkles size={12} />
              <span>Generate strong password</span>
            </button>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Minimum 12 characters"
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

          {/* Strength Meter Bar */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#6B6B6B]">
                  Strength:{' '}
                  <span style={{ color: strength.color }} className="font-bold">
                    {strength.label}
                  </span>
                </span>
                <span className="text-[10px] text-[#A8A5A5]">
                  {password.length >= 12 ? '✓ Minimum length satisfied' : `${password.length}/12 chars`}
                </span>
              </div>

              {/* 4-segment visual bar */}
              <div className="grid grid-cols-4 gap-1.5 h-1.5">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className="rounded-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        step <= strength.score ? strength.color : 'rgba(0,0,0,0.08)',
                    }}
                  />
                ))}
              </div>

              {/* Feedback items */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {strength.feedback.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white border border-black/5 text-[#6B6B6B]"
                  >
                    {password.length >= 12 && strength.score >= 3 ? (
                      <Check size={10} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={10} className="text-amber-500" />
                    )}
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
