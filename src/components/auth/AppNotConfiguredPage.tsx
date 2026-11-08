import React from 'react';
import { AlertCircle, KeyRound } from 'lucide-react';
import { LogoMark } from '../common/LogoMark.tsx';

export const AppNotConfiguredPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#F6F7F9] flex flex-col items-center justify-center p-4 selection:bg-[#FCE9ED] selection:text-[#D92D50]">
      <div className="w-full max-w-[460px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-[14px] bg-[#D92D50] text-white flex items-center justify-center shadow-sm mb-3">
            <LogoMark size={24} />
          </div>
          <h1 className="text-[20px] font-bold text-[#101828] tracking-tight">Open Hours</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[16px] border border-[#ECEEF2] p-7 shadow-[0_12px_24px_-4px_rgba(16,24,40,0.06)] text-center">
          <div className="w-11 h-11 rounded-full bg-[#FFF4E5] text-[#F79009] flex items-center justify-center mx-auto mb-3.5 border border-[#FEDF89]">
            <KeyRound size={20} />
          </div>

          <h2 className="text-[17px] font-bold text-[#101828] mb-1.5">
            App Not Configured
          </h2>
          <p className="text-[13px] text-[#475467] leading-relaxed mb-6">
            Supabase authentication credentials are required to run this application. Mock auth has been disabled for security.
          </p>

          <div className="bg-[#F8F9FA] border border-[#EAECF0] rounded-[10px] p-4 text-left space-y-2 mb-2">
            <div className="text-[11.5px] font-semibold text-[#344054] uppercase tracking-wider">
              Required Environment Variables
            </div>
            <div className="font-mono text-[12px] text-[#101828] space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F79009]" />
                <code>VITE_SUPABASE_URL</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F79009]" />
                <code>VITE_SUPABASE_ANON_KEY</code>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-[#667085] mt-4">
            Provide these variables in your environment configuration file and restart the development server.
          </p>
        </div>
      </div>
    </div>
  );
};
