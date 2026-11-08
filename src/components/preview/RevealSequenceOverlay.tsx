import React, { useState, useEffect, useRef } from 'react';
import { FastForward, ArrowRight } from 'lucide-react';
import { WebsiteProjectStatus } from '../../types/index.ts';

export interface RevealSequenceOverlayProps {
  businessName: string;
  logoDataUrl?: string | null;
  captionPrefix?: string; // default "Prepared for"
  captionSuffix?: string; // default "by Open Hours"
  welcomeLine?: string; // backward-compatibility
  style?: any; // backward-compatibility
  iframeLoaded: boolean;
  onComplete: () => void;
  targetFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export const RevealSequenceOverlay: React.FC<RevealSequenceOverlayProps> = ({
  businessName,
  logoDataUrl,
  captionPrefix = 'Prepared for',
  captionSuffix = 'by Open Hours',
  welcomeLine,
  style,
  iframeLoaded,
  onComplete,
  targetFocusRef,
  className = '',
}) => {
  // Animation phases:
  // 'intro': 0.0s - 2.6s (line draw, business name, byline + glow)
  // 'waiting_for_load': reached 2.6s but iframe not loaded yet (waits up to 3.0s total)
  // 'splitting': 2.6s - 3.4s (curtain split left/right or top/bottom)
  // 'done': > 3.4s (overlay unmounted)
  const [phase, setPhase] = useState<'intro' | 'waiting_for_load' | 'splitting' | 'done'>('intro');
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');
  const completedRef = useRef(false);
  const iframeLoadedRef = useRef(iframeLoaded);
  iframeLoadedRef.current = iframeLoaded;

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      media.addEventListener?.('change', listener);
      return () => media.removeEventListener?.('change', listener);
    }
  }, []);

  // Completion helper
  const finish = (announced = 'Preview ready') => {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase('done');
    setAriaAnnouncement(announced);
    onComplete();

    setTimeout(() => {
      try {
        if (targetFocusRef && targetFocusRef.current) {
          targetFocusRef.current.focus();
        }
      } catch {
        // safe fallback
      }
    }, 50);
  };

  // Keyboard shortcut: Esc skips animation from frame 0
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finish('Preview ready');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If loading takes > 3s, skip animation immediately
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!completedRef.current) {
        finish('Preview ready');
      }
    }, 3000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  // Handle prefers-reduced-motion: 150ms fade only
  useEffect(() => {
    if (isReducedMotion && !completedRef.current) {
      const fadeTimer = setTimeout(() => {
        finish('Preview ready');
      }, 150);
      return () => clearTimeout(fadeTimer);
    }
  }, [isReducedMotion]);

  // Main sequence timer: at 2.6s (2600ms), transition to splitting if preview is loaded
  useEffect(() => {
    if (isReducedMotion || completedRef.current) return;

    const splitTriggerTimer = setTimeout(() => {
      if (completedRef.current) return;
      if (iframeLoadedRef.current) {
        setPhase('splitting');
        const endTimer = setTimeout(() => {
          finish('Preview ready');
        }, 800); // 2.6s + 0.8s = 3.4s
        return () => clearTimeout(endTimer);
      } else {
        setPhase('waiting_for_load');
      }
    }, 2600);

    return () => clearTimeout(splitTriggerTimer);
  }, [isReducedMotion]);

  // If we were waiting for iframe at 2.6s and it loads before 3.0s
  useEffect(() => {
    if (phase === 'waiting_for_load' && iframeLoaded && !completedRef.current) {
      setPhase('splitting');
      const endTimer = setTimeout(() => {
        finish('Preview ready');
      }, 800);
      return () => clearTimeout(endTimer);
    }
  }, [phase, iframeLoaded]);

  if (phase === 'done') {
    return (
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaAnnouncement}
      </div>
    );
  }

  // Reduced motion: 150ms calm fade
  if (isReducedMotion) {
    return (
      <div
        role="region"
        aria-label="Website preview reveal"
        className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center transition-opacity duration-150"
      >
        <span className="sr-only" aria-live="polite">
          Loading preview
        </span>
        <h1
          className="text-2xl font-semibold text-[#E8D08A]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {businessName}
        </h1>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Website preview reveal"
      className={`fixed inset-0 z-50 select-none cursor-pointer overflow-hidden ${className}`}
      onClick={() => finish('Preview ready')}
    >
      <style>{`
        /* 0.0 - 0.6s: Thin gold line draws left to right */
        @keyframes drawGoldLine {
          0% {
            transform: scaleX(0);
            opacity: 0.6;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }

        /* 0.6 - 1.8s: Small caption & business name in serif stack */
        @keyframes revealNameSerif {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 1.8 - 2.6s: "by Open Hours" and soft gold glow */
        @keyframes revealBylineGlow {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes softGoldAmbientPulse {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .gold-line-anim {
          animation: drawGoldLine 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: left center;
        }

        .gold-name-anim {
          animation: revealNameSerif 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both;
        }

        .gold-byline-anim {
          animation: revealBylineGlow 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1.8s both;
        }

        .gold-glow-ambient {
          animation: softGoldAmbientPulse 0.8s ease-out 1.8s both;
        }

        /* 2.6 - 3.4s: Curtain splits from center */
        .curtain-panel {
          transition: transform 0.8s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .curtain-desktop-left-split {
          transform: translateX(-100%);
        }
        .curtain-desktop-right-split {
          transform: translateX(100%);
        }

        .curtain-mobile-top-split {
          transform: translateY(-100%);
        }
        .curtain-mobile-bottom-split {
          transform: translateY(100%);
        }

        .serif-gold-title {
          font-family: Georgia, "Times New Roman", serif;
          background: linear-gradient(135deg, #C9A24B 0%, #E8D08A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: #E8D08A; /* high contrast fallback >= 4.5:1 */
        }

        .gold-text-accent {
          color: #C9A24B;
        }

        .gold-glow-shadow {
          text-shadow: 0 0 24px rgba(201, 162, 75, 0.35), 0 0 48px rgba(232, 208, 138, 0.2);
        }
      `}</style>

      {/* Skip button visible from frame 0 */}
      <div className="absolute top-4 right-4 z-60 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finish('Preview ready');
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/90 text-[#E8D08A] border border-[#C9A24B]/40 text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer"
          aria-label="Skip preview intro"
        >
          <span>Skip</span>
          <FastForward size={13} className="text-[#C9A24B]" />
        </button>
      </div>

      {/* Screen Reader Live Announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaAnnouncement}
      </div>

      {/* Desktop/Tablet Horizontal Curtain Panels (>= 640px) */}
      <div className="hidden sm:block absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-0 bottom-0 left-0 w-1/2 bg-[#0A0A0A] border-r border-[#C9A24B]/15 curtain-panel ${
            phase === 'splitting' ? 'curtain-desktop-left-split' : ''
          }`}
        />
        <div
          className={`absolute top-0 bottom-0 right-0 w-1/2 bg-[#0A0A0A] border-l border-[#C9A24B]/15 curtain-panel ${
            phase === 'splitting' ? 'curtain-desktop-right-split' : ''
          }`}
        />
      </div>

      {/* Mobile Vertical Curtain Panels (< 640px) */}
      <div className="sm:hidden absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-0 left-0 right-0 h-1/2 bg-[#0A0A0A] border-b border-[#C9A24B]/15 curtain-panel ${
            phase === 'splitting' ? 'curtain-mobile-top-split' : ''
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 h-1/2 bg-[#0A0A0A] border-t border-[#C9A24B]/15 curtain-panel ${
            phase === 'splitting' ? 'curtain-mobile-bottom-split' : ''
          }`}
        />
      </div>

      {/* Center Reveal Content */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-opacity duration-350 ${
          phase === 'splitting' ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
        }`}
      >
        {/* Ambient Soft Gold Radial Glow at 1.8s */}
        <div
          className="gold-glow-ambient absolute w-96 h-96 rounded-full pointer-events-none blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(201, 162, 75, 0.18) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto space-y-4">
          {/* Optional Logo above name if exists */}
          {logoDataUrl && (
            <div className="gold-name-anim max-w-[200px] max-h-16 flex items-center justify-center mb-1">
              <img
                src={logoDataUrl}
                alt=""
                className="max-h-16 max-w-[200px] object-contain drop-shadow"
              />
            </div>
          )}

          {/* 0.0 - 0.6s: Thin gold line draws left to right */}
          <div className="w-32 h-[1.5px] bg-gradient-to-r from-[#C9A24B] to-[#E8D08A] rounded-full gold-line-anim shadow-[0_0_8px_rgba(201,162,75,0.5)]" />

          {/* 0.6 - 1.8s: Small "Prepared for" then Business Name large in serif stack */}
          <div className="gold-name-anim space-y-2">
            <span className="block text-xs uppercase tracking-widest text-[#C9A24B] font-semibold">
              {captionPrefix}
            </span>
            <h1 className="serif-gold-title text-3xl sm:text-5xl font-normal tracking-tight line-clamp-2 px-4 leading-tight">
              {businessName}
            </h1>
          </div>

          {/* 1.8 - 2.6s: Small "by Open Hours" and a soft gold glow */}
          <div className="gold-byline-anim pt-1">
            <span className="gold-glow-shadow inline-block text-xs sm:text-sm font-medium tracking-wide text-[#E8D08A]/90">
              {captionSuffix}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// REVEAL STATUS PILL COMPONENT
// ==========================================

export interface RevealStatusPillProps {
  projectStatus?: WebsiteProjectStatus;
  domainAccessStatus?: 'none' | 'pending' | 'submitted' | 'approved';
  isClientPortal?: boolean;
  onStartDomainSetup?: () => void;
  className?: string;
}

export const RevealStatusPill: React.FC<RevealStatusPillProps> = ({
  projectStatus,
  domainAccessStatus = 'none',
  isClientPortal = false,
  onStartDomainSetup,
  className = '',
}) => {
  const isDomainReceived =
    domainAccessStatus === 'submitted' || domainAccessStatus === 'approved';
  const isDesignApproved = projectStatus === 'Approved';

  let statusLabel = 'Concept preview';
  let dotColor = 'bg-amber-500';
  let containerBg = 'bg-white/95 text-[#0A0A0A] border-black/10';

  if (isDomainReceived) {
    statusLabel = 'Domain details received';
    dotColor = 'bg-blue-600';
    containerBg = 'bg-blue-50/95 text-blue-950 border-blue-200';
  } else if (isDesignApproved) {
    statusLabel = 'Design approved, ready for domain setup';
    dotColor = 'bg-emerald-500';
    containerBg = 'bg-emerald-50/95 text-emerald-950 border-emerald-200';
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md text-xs font-semibold ${containerBg} ${className}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`animate-pulse absolute inline-flex h-full w-full rounded-full ${dotColor}`}
        />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
      </span>

      <span className="truncate max-w-[240px] sm:max-w-none">{statusLabel}</span>

      {isClientPortal ? (
        isDesignApproved && !isDomainReceived && onStartDomainSetup && (
          <button
            type="button"
            onClick={onStartDomainSetup}
            className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0A0A0A] hover:bg-[#D92D50] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
          >
            <span>Start domain setup</span>
            <ArrowRight size={11} />
          </button>
        )
      ) : (
        <a
          href="/apply?source=reveal"
          className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0A0A0A] hover:bg-black text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
        >
          <span>Start your project</span>
          <ArrowRight size={11} />
        </a>
      )}
    </div>
  );
};
