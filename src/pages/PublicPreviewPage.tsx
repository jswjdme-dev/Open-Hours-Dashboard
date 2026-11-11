import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { getPublicPreviewByToken } from '../data/repo.ts';
import { PublicPreviewData, PinDevicePreset } from '../types/index.ts';
import {
  RevealSequenceOverlay,
  RevealStatusPill,
} from '../components/preview/RevealSequenceOverlay.tsx';

interface PublicPreviewPageProps {
  token: string;
}

export const PublicPreviewPage: React.FC<PublicPreviewPageProps> = ({ token }) => {
  const [devicePreset, setDevicePreset] = useState<PinDevicePreset>('desktop');
  const [loading, setLoading] = useState<boolean>(true);
  const [previewData, setPreviewData] = useState<PublicPreviewData | null>(null);

  // Reveal Sequence State
  const [showReveal, setShowReveal] = useState<boolean>(false);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const mainContainerRef = useRef<HTMLElement>(null);

  const storageKey = `openhours_reveal_seen_${token}`;

  // Set robots noindex meta tag dynamically and clean up on unmount
  useEffect(() => {
    let metaTag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;

    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'robots';
      metaTag.content = 'noindex, nofollow';
      document.head.appendChild(metaTag);
      created = true;
    } else {
      metaTag.content = 'noindex, nofollow';
    }

    return () => {
      if (created && metaTag && metaTag.parentNode) {
        metaTag.parentNode.removeChild(metaTag);
      }
    };
  }, []);

  // Pure isolated read function: loads ONLY this preview data
  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const data = await getPublicPreviewByToken(token);
        if (mounted) {
          setPreviewData(data);

          // Check if user has already seen the reveal for this token
          let seen = false;
          try {
            seen = localStorage.getItem(storageKey) === 'true';
          } catch {
            // Safe fallback for restricted storage
          }

          const isEnabled = data.revealConfig?.enabled !== false;
          if (!seen && isEnabled && !data.isExpired && !data.isRevoked && !data.notFound) {
            setShowReveal(true);
          }
        }
      } catch (err) {
        if (mounted) {
          setPreviewData({
            title: '',
            version: 0,
            renderedHtml: '',
            notFound: true,
            isExpired: false,
            isRevoked: false,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPreview();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleRevealComplete = () => {
    setShowReveal(false);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // safe fallback
    }
  };

  const handleReplayIntro = () => {
    setShowReveal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-black/15 border-t-[#0A0A0A] rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Loading website preview...</h2>
        <p className="text-xs text-[#6B6B6B] mt-1">Preparing your private interactive concept</p>
      </div>
    );
  }

  // EXPIRED STATE: Calm page with EXACT text & https website URL button
  if (previewData?.isExpired) {
    const expiryDays = previewData.expiryDays ?? 60;
    const hasHttpsWebsite =
      previewData.websiteUrl && previewData.websiteUrl.startsWith('https://');

    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[12px] p-8 border border-[#E5E7EB] shadow-sm space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#0A0A0A]">Preview Expired</h2>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            {`This website was made ${expiryDays} days ago. Contact Open Hours to regenerate it or apply for a new one.`}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {hasHttpsWebsite && (
              <a
                href={previewData.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0A0A0A] text-white text-xs font-semibold hover:bg-black transition-all shadow-sm"
              >
                <span>Visit Open Hours</span>
                <ArrowRight size={13} />
              </a>
            )}
            <a
              href="/apply?source=expired"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-black/15 bg-white text-[#0A0A0A] text-xs font-semibold hover:bg-black/5 transition-all shadow-xs"
            >
              <span>Apply for a new project</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // NOT FOUND ON THIS DEVICE STATE
  if (previewData?.notFound) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[12px] p-8 border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-black/5 text-[#0A0A0A] flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#0A0A0A]">Link Not Found</h2>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            This link opens only in the browser where it was created until online intake is connected.
          </p>
          <div className="pt-2">
            <a
              href="/apply?source=not_found"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A0A0A] text-white text-xs font-semibold hover:bg-[#1F5FA8] transition-all shadow-sm"
            >
              <span>Start your project</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // REVOKED STATE
  if (previewData?.isRevoked) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[12px] p-8 border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#0A0A0A]">Link Revoked</h2>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            This interactive website preview link is no longer active. If you require access, please reach out to Open Hours.
          </p>
          <div className="pt-2">
            <a
              href="/apply?source=revoked"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A0A0A] text-white text-xs font-semibold hover:bg-[#1F5FA8] transition-all shadow-sm"
            >
              <span>Start your project</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // NOT SHARED STATE
  if (previewData?.notShared || !previewData?.renderedHtml) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[12px] p-8 border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-black/5 text-[#0A0A0A] flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#0A0A0A]">Not Yet Shared</h2>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            This website concept has not been shared yet.
          </p>
          <div className="pt-2">
            <a
              href="/apply?source=not_shared"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A0A0A] text-white text-xs font-semibold hover:bg-[#1F5FA8] transition-all shadow-sm"
            >
              <span>Start your project</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col text-[#0A0A0A] relative">
      {/* NEW CSS REVEAL ANIMATION OVERLAY */}
      {showReveal && (
        <RevealSequenceOverlay
          businessName={previewData.businessName || previewData.title}
          logoDataUrl={previewData.logoDataUrl}
          captionPrefix={previewData.revealIntroPrefix}
          captionSuffix={previewData.revealIntroSuffix}
          iframeLoaded={iframeLoaded}
          onComplete={handleRevealComplete}
          targetFocusRef={mainContainerRef}
        />
      )}

      {/* TOP HEADER BAR (Minimal, no internal app chrome, zero contact leaks) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E3E3E6] px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Concept Ribbon & Replay intro link */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold tracking-wide">
            <Sparkles size={13} className="text-amber-600" />
            Concept - not the final website
          </span>

          {/* Replay intro control */}
          <button
            type="button"
            onClick={handleReplayIntro}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer transition-colors"
            title="Replay intro animation"
          >
            <RotateCcw size={12} />
            <span>Replay intro</span>
          </button>
        </div>

        {/* Center: Device Viewport Switcher */}
        <div className="bg-[#E9E9EC] p-1 rounded-xl flex items-center gap-1 border border-black/5">
          <button
            type="button"
            onClick={() => setDevicePreset('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              devicePreset === 'desktop'
                ? 'bg-white text-[#0A0A0A] shadow-xs'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
            aria-label="Desktop View"
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevicePreset('tablet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              devicePreset === 'tablet'
                ? 'bg-white text-[#0A0A0A] shadow-xs'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
            aria-label="Tablet View"
          >
            <Tablet size={14} />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDevicePreset('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              devicePreset === 'mobile'
                ? 'bg-white text-[#0A0A0A] shadow-xs'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
            aria-label="Mobile View"
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Start your project CTA Button to /apply?source=reveal */}
        <div>
          <a
            href="/apply?source=reveal"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A0A0A] text-white text-xs font-semibold hover:bg-[#1F5FA8] shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <span>Start your project</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </header>

      {/* MAIN VIEWPORT WITH SANDBOXED PREVIEW IFRAME */}
      <main
        ref={mainContainerRef}
        tabIndex={-1}
        className="flex-1 p-3 sm:p-6 flex items-center justify-center overflow-auto focus:outline-none"
      >
        <div
          className={`bg-white rounded-[12px] shadow-sm overflow-hidden transition-all duration-300 border border-[#E5E7EB] flex flex-col ${
            devicePreset === 'desktop'
              ? 'w-full max-w-7xl h-[calc(100vh-110px)] min-h-[580px]'
              : devicePreset === 'tablet'
              ? 'w-[768px] max-w-full h-[calc(100vh-110px)] min-h-[620px]'
              : 'w-[375px] max-w-full h-[calc(100vh-110px)] min-h-[580px]'
          }`}
        >
          {/* Sandboxed iframe with same-origin and NO allow-scripts */}
          <iframe
            srcDoc={previewData.renderedHtml}
            sandbox="allow-same-origin"
            title="Website Concept Preview"
            className="w-full h-full border-none select-none"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </main>

      {/* BOTTOM CORNER STATUS PILL */}
      <div className="fixed bottom-4 right-4 z-30 pointer-events-auto">
        <RevealStatusPill
          projectStatus={previewData.projectStatus}
          domainAccessStatus={previewData.domainAccessStatus}
          isClientPortal={false}
        />
      </div>
    </div>
  );
};
