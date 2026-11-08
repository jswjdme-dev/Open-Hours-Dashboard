import React, { useState, useEffect } from 'react';
import { ExplainerConfig, ExplainerIconKey, ExplainerStep } from '../../types/index.ts';
import { RotateCcw } from 'lucide-react';

export interface BoardExplainerTokens {
  months_you?: string | number;
  months_friend?: string | number;
  savings_price?: string;
  next_reward?: string;
  max_months?: string | number;
}

interface BoardExplainerProps {
  steps?: ExplainerStep[];
  description?: ExplainerConfig['description'];
  config?: ExplainerConfig;
  tokens?: BoardExplainerTokens;
  replayable?: boolean;
  className?: string;
}

// Built-in fixed SVG icon set (hand-drawn whiteboard stroke aesthetic)
export const renderExplainerSvgIcon = (iconKey: ExplainerIconKey, size = 32, color = '#1E293B') => {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    fill: 'none',
    stroke: color,
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'shrink-0',
  };

  switch (iconKey) {
    case 'person':
      return (
        <svg {...commonProps}>
          <circle cx="16" cy="10" r="5" strokeDasharray="32" className="explainer-path" />
          <path d="M6 26c0-4.5 4.5-8 10-8s10 3.5 10 8" strokeDasharray="36" className="explainer-path" />
        </svg>
      );
    case 'link':
      return (
        <svg {...commonProps}>
          <path d="M13 19l6-6" strokeDasharray="14" className="explainer-path" />
          <path d="M10 16l-3 3a4.24 4.24 0 006 6l3-3" strokeDasharray="26" className="explainer-path" />
          <path d="M16 10l3-3a4.24 4.24 0 016 6l-3 3" strokeDasharray="26" className="explainer-path" />
        </svg>
      );
    case 'website':
      return (
        <svg {...commonProps}>
          <rect x="4" y="6" width="24" height="20" rx="3" strokeDasharray="88" className="explainer-path" />
          <line x1="4" y1="12" x2="28" y2="12" strokeDasharray="24" className="explainer-path" />
          <circle cx="8" cy="9" r="1" fill={color} />
          <circle cx="12" cy="9" r="1" fill={color} />
          <circle cx="16" cy="9" r="1" fill={color} />
          <path d="M9 18l3 3 5-6" strokeDasharray="16" className="explainer-path" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...commonProps}>
          <rect x="5" y="7" width="22" height="19" rx="3" strokeDasharray="82" className="explainer-path" />
          <line x1="10" y1="4" x2="10" y2="8" className="explainer-path" />
          <line x1="22" y1="4" x2="22" y2="8" className="explainer-path" />
          <line x1="5" y1="13" x2="27" y2="13" strokeDasharray="22" className="explainer-path" />
          <circle cx="11" cy="18" r="1" fill={color} />
          <circle cx="16" cy="18" r="1" fill={color} />
          <circle cx="21" cy="18" r="1" fill={color} />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...commonProps}>
          <line x1="6" y1="16" x2="26" y2="16" strokeDasharray="22" className="explainer-path" />
          <path d="M19 9l7 7-7 7" strokeDasharray="20" className="explainer-path" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...commonProps}>
          <rect x="5" y="13" width="22" height="14" rx="2" strokeDasharray="72" className="explainer-path" />
          <rect x="3" y="9" width="26" height="5" rx="1.5" strokeDasharray="62" className="explainer-path" />
          <line x1="16" y1="9" x2="16" y2="27" className="explainer-path" />
          <path d="M16 9c-2-3-6-3-6 0s6 0 6 0z" strokeDasharray="20" className="explainer-path" />
          <path d="M16 9c2-3 6-3 6 0s-6 0-6 0z" strokeDasharray="20" className="explainer-path" />
        </svg>
      );
    case 'check':
      return (
        <svg {...commonProps}>
          <circle cx="16" cy="16" r="12" strokeDasharray="76" className="explainer-path" />
          <path d="M10 16l4 4 8-8" strokeDasharray="24" className="explainer-path" strokeWidth="2.5" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...commonProps}>
          <rect x="7" y="14" width="18" height="13" rx="2" strokeDasharray="62" className="explainer-path" />
          <path d="M11 14V9a5 5 0 0110 0v5" strokeDasharray="28" className="explainer-path" />
          <circle cx="16" cy="20" r="1.5" fill={color} />
        </svg>
      );
    case 'star':
      return (
        <svg {...commonProps}>
          <path
            d="M16 4l3.5 7.5 8 .9-6 5.5 1.7 8.1L16 22l-7.2 4 1.7-8.1-6-5.5 8-.9z"
            strokeDasharray="80"
            className="explainer-path"
          />
        </svg>
      );
    case 'chat':
      return (
        <svg {...commonProps}>
          <path
            d="M6 8a4 4 0 014-4h12a4 4 0 014 4v10a4 4 0 01-4 4h-4l-5 4v-4H10a4 4 0 01-4-4V8z"
            strokeDasharray="80"
            className="explainer-path"
          />
          <line x1="11" y1="11" x2="21" y2="11" className="explainer-path" />
          <line x1="11" y1="15" x2="17" y2="15" className="explainer-path" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...commonProps}>
          <line x1="5" y1="26" x2="27" y2="26" className="explainer-path" />
          <line x1="5" y1="5" x2="5" y2="26" className="explainer-path" />
          <path d="M8 20l5-6 5 4 7-9" strokeDasharray="28" className="explainer-path" strokeWidth="2.5" />
        </svg>
      );
    case 'shield':
    default:
      return (
        <svg {...commonProps}>
          <path
            d="M16 4l9 4v7c0 6-4 11-9 13-5-2-9-7-9-13V8l9-4z"
            strokeDasharray="76"
            className="explainer-path"
          />
          <path d="M12 16l3 3 5-5" strokeDasharray="16" className="explainer-path" />
        </svg>
      );
  }
};

// Hand-drawn sketchy arrow connecting step cards
const HandDrawnConnectorArrow: React.FC<{ isVertical?: boolean }> = ({ isVertical = false }) => {
  if (isVertical) {
    return (
      <div className="flex justify-center items-center py-1 md:hidden" aria-hidden="true">
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2c0.5 8-1 14 0 22" strokeDasharray="24" className="explainer-arrow-path" />
          <path d="M7 19l5 5 5-5" strokeDasharray="14" className="explainer-arrow-path" />
        </svg>
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center justify-center px-1 shrink-0 self-center" aria-hidden="true">
      <svg width="34" height="20" viewBox="0 0 34 20" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
        <path d="M2 10c8-1.5 16 1.5 28 0" strokeDasharray="30" className="explainer-arrow-path" />
        <path d="M23 4l7 6-7 6" strokeDasharray="18" className="explainer-arrow-path" />
      </svg>
    </div>
  );
};

export const substituteExplainerTokens = (text: string, tokens: BoardExplainerTokens = {}): string => {
  if (!text) return '';
  return text
    .replace(/\{months_you\}/g, String(tokens.months_you ?? '1'))
    .replace(/\{months_friend\}/g, String(tokens.months_friend ?? '1'))
    .replace(/\{savings_price\}/g, tokens.savings_price || 'your monthly retainer')
    .replace(/\{next_reward\}/g, tokens.next_reward || 'more qualified referrals')
    .replace(/\{max_months\}/g, String(tokens.max_months ?? '12'));
};

export const BoardExplainer: React.FC<BoardExplainerProps> = ({
  steps,
  description,
  config,
  tokens = {},
  replayable = true,
  className = '',
}) => {
  const [playKey, setPlayKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const handleReplay = (e: React.MouseEvent) => {
    e.preventDefault();
    setPlayKey((k) => k + 1);
  };

  const rawSteps = steps || config?.steps || [];
  const safeSteps = Array.isArray(rawSteps) && rawSteps.length > 0 ? rawSteps.slice(0, 5) : [];
  const activeDescription = description || config?.description;

  return (
    <div
      key={playKey}
      className={`bg-[#FAFAF9] rounded-[24px] p-5 sm:p-7 border border-[#E7E5E4] shadow-xs ${className}`}
    >
      <style>{`
        @keyframes strokeDrawIn {
          from {
            stroke-dashoffset: 80;
            opacity: 0.3;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes stepFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .explainer-step-card {
          animation: ${reducedMotion ? 'none' : 'stepFadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'};
          opacity: ${reducedMotion ? '1' : '0'};
        }
        .explainer-path, .explainer-arrow-path {
          stroke-dashoffset: ${reducedMotion ? '0' : '80'};
          animation: ${reducedMotion ? 'none' : 'strokeDrawIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards'};
        }
      `}</style>

      {/* Header with Replay Link */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-[#E7E5E4]/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D92D50] inline-block" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
            Visual Explainer
          </span>
        </div>
        {replayable && !reducedMotion && (
          <button
            type="button"
            onClick={handleReplay}
            className="text-[11.5px] font-semibold text-[#57534E] hover:text-[#111111] transition-colors flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-black/5"
            title="Replay drawing sequence"
          >
            <RotateCcw size={12} />
            <span>Replay</span>
          </button>
        )}
      </div>

      {/* Interactive Light Board Canvas with Steps */}
      <div className="relative">
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-3 md:gap-2">
          {safeSteps.map((step, idx) => {
            const stepDelaySec = reducedMotion ? 0 : idx * 0.45;
            const isLast = idx === safeSteps.length - 1;
            const substitutedTitle = substituteExplainerTokens(step.title, tokens);
            const substitutedCaption = substituteExplainerTokens(step.caption, tokens);

            return (
              <React.Fragment key={step.id || `step_${idx}`}>
                <div
                  className="explainer-step-card flex-1 bg-white rounded-[18px] p-4 border border-[#E7E5E4] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col relative"
                  style={{ animationDelay: `${stepDelaySec}s` }}
                >
                  {/* Step Number Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-6 h-6 rounded-full bg-[#1C1917] text-white font-bold text-xs flex items-center justify-center font-mono shadow-2xs">
                      {idx + 1}
                    </span>
                    <div className="p-2 rounded-xl bg-[#F5F5F4] text-[#1C1917]">
                      {renderExplainerSvgIcon(step.iconKey, 24, '#1C1917')}
                    </div>
                  </div>

                  {/* Title & Caption (Always real text, never rasterized) */}
                  <div className="space-y-1 mt-auto">
                    <h4 className="text-xs font-bold text-[#1C1917] leading-snug line-clamp-2">
                      {substitutedTitle}
                    </h4>
                    <p className="text-[11.5px] text-[#78716C] leading-relaxed line-clamp-3">
                      {substitutedCaption}
                    </p>
                  </div>
                </div>

                {/* Connecting Arrow */}
                {!isLast && (
                  <>
                    <HandDrawnConnectorArrow />
                    <HandDrawnConnectorArrow isVertical />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Structured Description Block */}
      {activeDescription && (
        <div className="mt-6 pt-5 border-t border-[#E7E5E4] space-y-3">
          {activeDescription.heading && (
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
              {substituteExplainerTokens(activeDescription.heading, tokens)}
            </h5>
          )}

          {Array.isArray(activeDescription.bullets) && activeDescription.bullets.length > 0 && (
            <ul className="space-y-2 text-xs text-[#57534E]">
              {activeDescription.bullets.slice(0, 5).map((b, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D92D50] shrink-0 mt-1.5" />
                  <span className="leading-relaxed">
                    {substituteExplainerTokens(b, tokens)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {activeDescription.footnote && (
            <p className="text-[11px] text-[#A8A29E] italic pt-1 border-t border-[#E7E5E4]/60">
              {substituteExplainerTokens(activeDescription.footnote, tokens)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
