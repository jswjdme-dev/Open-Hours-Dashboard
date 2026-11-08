import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateConfigPayloadSize,
  isPayloadWithinLimit,
  validateHandshakeMessage,
  MAX_PAYLOAD_BYTES,
  HANDSHAKE_TIMEOUT_MS,
  HANDSHAKE_TIMEOUT_MESSAGE,
} from '../../lib/reactTemplateManifest.ts';

export interface ReactTemplatePreviewProps {
  previewUrl: string;
  config: Record<string, any>;
  devicePreset?: 'desktop' | 'tablet' | 'mobile';
  onDevicePresetChange?: (preset: 'desktop' | 'tablet' | 'mobile') => void;
  withRibbon?: boolean;
  ribbonText?: string;
  title?: string;
  className?: string;
}

export const ReactTemplatePreview: React.FC<ReactTemplatePreviewProps> = ({
  previewUrl,
  config,
  devicePreset = 'desktop',
  onDevicePresetChange,
  withRibbon = false,
  ribbonText = 'Concept Preview Only',
  title = 'React Website Preview',
  className = '',
}) => {
  const [localDevice, setLocalDevice] = useState<'desktop' | 'tablet' | 'mobile'>(devicePreset);
  const currentDevice = onDevicePresetChange ? devicePreset : localDevice;
  const setDevice = onDevicePresetChange || setLocalDevice;

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'timeout' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const handshakeTimerRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);
  const isHandshakeCompleteRef = useRef<boolean>(false);

  // Compute target origin safely
  const targetOrigin = useMemo(() => {
    try {
      return new URL(previewUrl).origin;
    } catch {
      return '';
    }
  }, [previewUrl]);

  // Payload size calculation
  const payloadBytes = useMemo(() => {
    return calculateConfigPayloadSize(config);
  }, [config]);

  const isOversized = payloadBytes > MAX_PAYLOAD_BYTES;
  const formattedSize = useMemo(() => {
    if (payloadBytes < 1024) return `${payloadBytes} B`;
    if (payloadBytes < 1024 * 1024) return `${(payloadBytes / 1024).toFixed(1)} KB`;
    return `${(payloadBytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [payloadBytes]);

  // Function to post config to iframe
  const sendConfigToIframe = useCallback(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    if (!targetOrigin || targetOrigin === 'null') return;
    if (isOversized) return;

    try {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'OH_CONFIG',
          version: 1,
          config,
        },
        targetOrigin
      );
    } catch (err: any) {
      console.error('Failed to postMessage to template iframe:', err);
    }
  }, [config, targetOrigin, isOversized]);

  // Reset and restart handshake when previewUrl changes
  useEffect(() => {
    setConnectionState('connecting');
    setErrorMessage(null);
    isHandshakeCompleteRef.current = false;

    if (handshakeTimerRef.current) {
      clearTimeout(handshakeTimerRef.current);
    }

    // 8-second timeout waiting for OH_READY
    handshakeTimerRef.current = setTimeout(() => {
      if (!isHandshakeCompleteRef.current) {
        setConnectionState('timeout');
        setErrorMessage(HANDSHAKE_TIMEOUT_MESSAGE);
      }
    }, HANDSHAKE_TIMEOUT_MS);

    return () => {
      if (handshakeTimerRef.current) {
        clearTimeout(handshakeTimerRef.current);
      }
    };
  }, [previewUrl]);

  // Window message listener for OH_READY
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) return;

      // CRITICAL: Accept only if event.source === the iframe's contentWindow
      if (event.source !== iframeRef.current.contentWindow) {
        return;
      }

      // Check OH_READY handshake message
      if (validateHandshakeMessage(event, iframeRef.current.contentWindow)) {
        isHandshakeCompleteRef.current = true;
        setConnectionState('connected');
        setErrorMessage(null);
        if (handshakeTimerRef.current) {
          clearTimeout(handshakeTimerRef.current);
        }

        // Immediately transmit active config
        sendConfigToIframe();
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [sendConfigToIframe]);

  // Debounced transmission on config changes (200 ms)
  useEffect(() => {
    if (connectionState !== 'connected' || isOversized) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      sendConfigToIframe();
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [config, connectionState, isOversized, sendConfigToIframe]);

  const handleManualReload = () => {
    setConnectionState('connecting');
    setErrorMessage(null);
    isHandshakeCompleteRef.current = false;

    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }

    if (handshakeTimerRef.current) {
      clearTimeout(handshakeTimerRef.current);
    }
    handshakeTimerRef.current = setTimeout(() => {
      if (!isHandshakeCompleteRef.current) {
        setConnectionState('timeout');
        setErrorMessage(
          'No response: the template did not answer. Check the preview URL and that the template includes the OH message listener.'
        );
      }
    }, 8000);
  };

  return (
    <div className={`flex flex-col h-full bg-[#F3F3F5] rounded-2xl overflow-hidden border border-black/10 ${className}`}>
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-black/10 gap-3 flex-wrap">
        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-[#F3F3F5] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentDevice === 'desktop'
                ? 'bg-white text-[#0A0A0A] shadow-xs'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentDevice === 'tablet'
                ? 'bg-white text-[#0A0A0A] shadow-xs'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            <Tablet size={14} />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentDevice === 'mobile'
                ? 'bg-white text-[#0A0A0A] shadow-xs'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Handshake & Payload Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {connectionState === 'connected' && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Connected
              </span>
            )}
            {connectionState === 'connecting' && (
              <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <RefreshCw size={12} className="animate-spin text-amber-600" />
                Connecting...
              </span>
            )}
            {connectionState === 'timeout' && (
              <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                <AlertTriangle size={12} className="text-amber-700" />
                No response
              </span>
            )}
          </div>

          <div
            className={`text-xs px-2.5 py-1 rounded-full font-mono ${
              isOversized
                ? 'bg-red-100 text-red-800 border border-red-300 font-bold'
                : 'bg-black/5 text-[#4B5563]'
            }`}
            title="Serialized postMessage payload size"
          >
            Payload: {formattedSize} / 6 MB
          </div>

          <button
            type="button"
            onClick={handleManualReload}
            className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
            title="Reload preview"
          >
            <RefreshCw size={14} />
          </button>

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/15 bg-white hover:bg-black/5 text-[#0A0A0A] text-xs font-bold transition-all shadow-2xs"
            title="Open in new tab (shows the template's default dummy content)"
          >
            <ExternalLink size={13} />
            <span>Open in new tab</span>
          </a>
        </div>
      </div>

      {/* Warnings & Notices */}
      {isOversized && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-900 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-600 shrink-0" />
          <span>
            <strong>Oversized Payload Blocked:</strong> Configuration payload is {formattedSize}, exceeding the 6 MB postMessage limit. Reduce image sizes or remove list items.
          </span>
        </div>
      )}

      {connectionState === 'timeout' && errorMessage && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Ensure your React application has loaded and dispatched <code className="bg-amber-100 px-1 py-0.5 rounded">window.parent.postMessage({'{'}type: 'OH_READY', version: 1{'}'}, '*')</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleManualReload}
            className="px-3 py-1 bg-amber-700 text-white font-bold rounded-lg text-[11px] hover:bg-amber-800 transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Central Viewport Area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative min-h-[460px]">
        <div
          className="bg-white rounded-xl shadow-md overflow-hidden border border-black/10 transition-all duration-300 w-full flex flex-col relative"
          style={{
            maxWidth:
              currentDevice === 'mobile'
                ? '375px'
                : currentDevice === 'tablet'
                ? '768px'
                : '100%',
            height: '100%',
            minHeight: '520px',
          }}
        >
          {/* Optional Ribbon Banner */}
          {withRibbon && (
            <div className="bg-[#D92D50] text-white text-[11px] font-bold text-center py-1 tracking-wider uppercase shadow-xs z-10">
              {ribbonText}
            </div>
          )}

          {/* Sandboxed React Template Iframe */}
          <iframe
            ref={iframeRef}
            src={previewUrl}
            sandbox="allow-scripts allow-forms allow-popups"
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full flex-1 border-none"
            title={title}
          />
        </div>
      </div>

      {/* Bottom Privacy & Architecture Note */}
      <div className="px-4 py-2 bg-white border-t border-black/10 flex items-center justify-between text-[11px] text-[#6B6B6B] flex-wrap gap-2">
        <span>
          The preview link is public and holds no client data; the client's data travels only by postMessage inside the browser.
        </span>
        <span className="font-mono text-[10px]">
          Target Origin: {targetOrigin || 'restricted'}
        </span>
      </div>
    </div>
  );
};
