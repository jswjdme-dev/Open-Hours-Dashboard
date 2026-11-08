import React, { useState, useEffect } from 'react';
import { LogoMark } from '../components/common/LogoMark.tsx';
import {
  getGuestPortalViewModel,
} from '../data/repo.ts';
import { GuestPortalViewModel, PortalTabKey } from '../types/index.ts';
import { BoardExplainer } from '../components/referral/BoardExplainer.tsx';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  FileText,
  BarChart2,
  FolderLock,
  ExternalLink,
  Info,
} from 'lucide-react';

interface GuestPortalPageProps {
  onNavigateApply?: (referralCode?: string) => void;
}

export const GuestPortalPage: React.FC<GuestPortalPageProps> = ({
  onNavigateApply,
}) => {
  const [referralCode, setReferralCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || '';
    }
    return '';
  });

  const [loading, setLoading] = useState(true);
  const [vm, setVm] = useState<GuestPortalViewModel | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTabKey>('home');
  const [lockedNoticeTab, setLockedNoticeTab] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getGuestPortalViewModel(referralCode)
      .then((data) => {
        if (mounted) {
          setVm(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load guest portal data:', err);
        if (mounted) {
          setVm(null);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [referralCode]);

  const handleApplyClick = () => {
    if (onNavigateApply) {
      onNavigateApply(referralCode || undefined);
    } else if (typeof window !== 'undefined') {
      const url = referralCode ? `/apply?ref=${encodeURIComponent(referralCode)}` : '/apply';
      window.location.href = url;
    }
  };

  const handleTabClick = (tabKey: PortalTabKey) => {
    if (!vm) return;
    const access =
      tabKey === 'home'
        ? 'open'
        : tabKey === 'progress'
        ? vm.featureAccess.stageTimeline || 'locked'
        : tabKey === 'actions'
        ? vm.featureAccess.requestsAndUploads || 'locked'
        : tabKey === 'reports'
        ? vm.featureAccess.monthlyReports || 'locked'
        : vm.featureAccess.files || 'locked';

    if (access === 'locked') {
      setLockedNoticeTab(
        tabKey === 'progress'
          ? 'Project Progress & Timeline'
          : tabKey === 'actions'
          ? 'Requests & Actions'
          : tabKey === 'reports'
          ? 'Monthly Reports & Intelligence'
          : 'Files & Dedicated Support'
      );
      return;
    }

    setActiveTab(tabKey);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5F4] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#666666]">
            Loading guest preview...
          </span>
        </div>
      </div>
    );
  }

  // Calm generic state for invalid or missing referral code
  if (!vm || !vm.valid) {
    return (
      <div className="min-h-screen bg-[#F6F5F4] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[28px] p-7 sm:p-9 border border-black/5 shadow-sm text-center space-y-5">
          <div className="flex justify-center">
            <LogoMark size={44} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[#111111] tracking-tight">
              Welcome to Open Hours
            </h1>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              We engineer, host, and continuously support high-performing digital systems, bespoke websites, and customer acquisition funnels for private businesses.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAFAF9] border border-black/5 text-xs text-[#555555] space-y-1 text-left">
            <div className="font-semibold text-[#111111] flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#D92D50]" />
              <span>Free website concept first</span>
            </div>
            <p className="text-[11.5px] text-[#777777] leading-relaxed">
              Experience your tailored mobile design before committing. Submit an intake application to begin.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleApplyClick}
              className="w-full py-3 px-5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Apply for a website concept</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tokens = {
    months_you: vm.friendRewardMonths,
    months_friend: vm.friendRewardMonths,
    savings_price: vm.savingsPriceFormatted || 'your monthly retainer',
    next_reward: 'qualified peer referrals',
    max_months: 6,
  };

  return (
    <div className="min-h-screen bg-[#F6F5F4] text-[#111111] flex flex-col">
      {/* Top Navigation Bar in Client Portal Style */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark size={32} />
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-[#111111]">
                Open Hours
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/5 text-[#555555]">
                Guest Preview
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {vm.referrerName ? (
              <span className="text-xs text-[#666666] hidden sm:inline-block">
                Invited by <strong className="text-[#111111]">{vm.referrerName}</strong>
              </span>
            ) : (
              <span className="text-xs text-[#666666] hidden sm:inline-block">
                Exclusive peer invitation
              </span>
            )}

            <button
              type="button"
              onClick={handleApplyClick}
              className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Apply now</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 5 Portal Tabs (with Locked indicators) */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-black/5">
          <button
            type="button"
            onClick={() => handleTabClick('home')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'home'
                ? 'border-[#111111] text-[#111111]'
                : 'border-transparent text-[#777777] hover:text-[#111111]'
            }`}
          >
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('progress')}
            className="px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-[#999999] hover:text-[#555555] flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Available after approval"
          >
            <Lock size={12} className="text-[#999999]" />
            <span>Progress</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('actions')}
            className="px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-[#999999] hover:text-[#555555] flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Available after approval"
          >
            <Lock size={12} className="text-[#999999]" />
            <span>Requests</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('reports')}
            className="px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-[#999999] hover:text-[#555555] flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Available after approval"
          >
            <Lock size={12} className="text-[#999999]" />
            <span>Reports</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('files_support')}
            className="px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-[#999999] hover:text-[#555555] flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Available after approval"
          >
            <Lock size={12} className="text-[#999999]" />
            <span>Files & Support</span>
          </button>
        </div>
      </header>

      {/* Main Guest Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Invitation Welcome Banner */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-black/5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                  Priority Invitation
                </span>
                <span className="text-xs text-[#777777] font-mono">
                  Code: <strong className="text-[#111111]">{vm.referralCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
                {vm.referrerName
                  ? `${vm.referrerName} invited you to Open Hours`
                  : 'You have been invited to Open Hours'}
              </h1>
              <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-2xl">
                Experience your free bespoke website concept first. Upon onboarding and approval, you receive {vm.friendRewardMonths} complimentary care month credited directly to your package.
              </p>
            </div>

            <button
              type="button"
              onClick={handleApplyClick}
              className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Apply now</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Whiteboard Explainer: Guest Version */}
        <BoardExplainer
          steps={vm.guestExplainer.steps}
          description={vm.guestExplainer.description}
          tokens={tokens}
          replayable={true}
        />

        {/* 4 Pillars Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-[22px] p-5 border border-black/5 shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-2">
              <Sparkles size={16} />
            </div>
            <h3 className="text-xs font-bold text-[#111111]">
              Free website concept first
            </h3>
            <p className="text-[11.5px] text-[#6B6B6B] leading-relaxed">
              Review your bespoke mobile layout and interactive preview before deciding on any ongoing retainer.
            </p>
          </div>

          <div className="bg-white rounded-[22px] p-5 border border-black/5 shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-2">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-xs font-bold text-[#111111]">
              Approval by Team Open Hours
            </h3>
            <p className="text-[11.5px] text-[#6B6B6B] leading-relaxed">
              Every client workspace is manually vetted to ensure dedicated account team alignment and capacity.
            </p>
          </div>

          <div className="bg-white rounded-[22px] p-5 border border-black/5 shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold mb-2">
              <CheckCircle2 size={16} />
            </div>
            <h3 className="text-xs font-bold text-[#111111]">
              Credit months from referral
            </h3>
            <p className="text-[11.5px] text-[#6B6B6B] leading-relaxed">
              Your invitation code grants {vm.friendRewardMonths} month complimentary care and maintenance upon joining.
            </p>
          </div>

          <div className="bg-white rounded-[22px] p-5 border border-black/5 shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold mb-2">
              <Layers size={16} />
            </div>
            <h3 className="text-xs font-bold text-[#111111]">
              Cancel any time
            </h3>
            <p className="text-[11.5px] text-[#6B6B6B] leading-relaxed">
              Zero long-term lock-in or surprise fees. Transparent monthly care retainers with dedicated technical support.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-[#111111] rounded-[24px] p-6 sm:p-7 text-white text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold">
              Ready to claim your referral invitation?
            </h3>
            <p className="text-xs text-white/70 max-w-lg mx-auto leading-relaxed">
              Submit your business details in under 2 minutes. Our team will review your application and generate your tailored concept.
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyClick}
            className="px-6 py-3 rounded-xl bg-white hover:bg-white/90 text-[#111111] text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Apply now with code {vm.referralCode}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </main>

      {/* Locked Feature Modal / Tooltip */}
      {lockedNoticeTab && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full border border-black/10 shadow-lg text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#111111]">
                {lockedNoticeTab}
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed">
                Available after approval. When Team Open Hours approves your onboarding, your live milestones, reports, and workspace unlock automatically.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLockedNoticeTab(null)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-semibold text-[#555555] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockedNoticeTab(null);
                  handleApplyClick();
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Apply now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
