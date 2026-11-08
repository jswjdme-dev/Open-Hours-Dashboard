import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Printer, ExternalLink, ShieldAlert, Check, Copy } from 'lucide-react';

interface GoogleReviewQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  reviewLink?: string;
  brandColor?: string;
  logoUrl?: string;
  onUpdateReviewLink?: (newLink: string) => Promise<void>;
  canEditLink?: boolean;
}

export const GoogleReviewQrModal: React.FC<GoogleReviewQrModalProps> = ({
  isOpen,
  onClose,
  businessName,
  reviewLink = '',
  brandColor = '#111111',
  logoUrl,
  onUpdateReviewLink,
  canEditLink = true,
}) => {
  const [currentLink, setCurrentLink] = useState(reviewLink);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pageSize, setPageSize] = useState<'A4' | 'A5'>('A4');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [editedLinkInput, setEditedLinkInput] = useState(reviewLink);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setCurrentLink(reviewLink);
    setEditedLinkInput(reviewLink);
  }, [reviewLink]);

  useEffect(() => {
    if (!currentLink || !currentLink.trim().startsWith('https://')) {
      setQrDataUrl('');
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(currentLink.trim(), {
      width: 400,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
        if (isMounted) setQrDataUrl('');
      });

    return () => {
      isMounted = false;
    };
  }, [currentLink]);

  if (!isOpen) return null;

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editedLinkInput.trim();
    if (!trimmed.startsWith('https://')) {
      setLinkError('Google review link must start with https://');
      return;
    }

    setSavingLink(true);
    setLinkError(null);
    try {
      if (onUpdateReviewLink) {
        await onUpdateReviewLink(trimmed);
      }
      setCurrentLink(trimmed);
      setIsEditingLink(false);
    } catch (err: any) {
      setLinkError(err.message || 'Failed to update review link.');
    } finally {
      setSavingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!currentLink) return;
    navigator.clipboard.writeText(currentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-black/10 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-black/5 flex items-center justify-between print:hidden">
          <div>
            <h3 className="font-bold text-base text-[#111111]">Google Review QR Kit</h3>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Print-ready tabletop or counter display sheet for {businessName}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="px-4 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-[#6B6B6B] hover:text-[#111111] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Controls & Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls Bar (Hidden in print) */}
          <div className="print:hidden space-y-4 bg-[#FAFAFA] p-4 rounded-2xl border border-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#111111] block">Review Link Target</span>
                {isEditingLink ? (
                  <form onSubmit={handleSaveLink} className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <input
                      type="url"
                      value={editedLinkInput}
                      onChange={(e) => setEditedLinkInput(e.target.value)}
                      placeholder="https://g.page/r/..."
                      className="text-xs p-2 rounded-xl border border-black/15 bg-white w-72 focus:outline-none focus:border-[#111111]"
                      required
                    />
                    <button
                      type="submit"
                      disabled={savingLink}
                      className="px-3 py-1.5 rounded-xl bg-[#111111] text-white text-xs font-bold cursor-pointer hover:bg-black"
                    >
                      {savingLink ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingLink(false);
                        setEditedLinkInput(currentLink);
                        setLinkError(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-[#444444] truncate max-w-xs sm:max-w-md">
                      {currentLink || 'No link configured'}
                    </span>
                    {canEditLink && (
                      <button
                        type="button"
                        onClick={() => setIsEditingLink(true)}
                        className="text-xs font-bold text-[#D92D50] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                    {currentLink && (
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-1 text-[#6B6B6B] hover:text-[#111111] transition-colors"
                        title="Copy link"
                      >
                        {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                )}
                {linkError && <p className="text-[11px] text-red-600 font-medium mt-1">{linkError}</p>}
              </div>

              {/* Page Format Toggle */}
              <div className="flex items-center gap-1 bg-[#F1EFEF] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPageSize('A4')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    pageSize === 'A4' ? 'bg-white text-[#111111] shadow-2xs' : 'text-[#6B6B6B]'
                  }`}
                >
                  A4 Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setPageSize('A5')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    pageSize === 'A5' ? 'bg-white text-[#111111] shadow-2xs' : 'text-[#6B6B6B]'
                  }`}
                >
                  A5 Card
                </button>
              </div>
            </div>

            {/* Google Policy Guideline Tip */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Google Policy Notice: </span>
                <span>
                  Ask all customers, do not offer rewards for reviews, and do not select only happy customers.
                </span>
              </div>
            </div>
          </div>

          {/* PRINTABLE SHEET CONTAINER */}
          <div
            id="print-qr-sheet"
            className={`mx-auto bg-white border border-black/10 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-between shadow-sm transition-all ${
              pageSize === 'A4' ? 'max-w-lg min-h-[580px]' : 'max-w-md min-h-[460px]'
            }`}
          >
            {/* Top Brand Stripe */}
            <div
              className="w-16 h-1.5 rounded-full mb-6 mx-auto"
              style={{ backgroundColor: brandColor || '#111111' }}
            />

            {/* Brand Logo & Name */}
            <div className="space-y-2 mb-6">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="h-10 mx-auto object-contain max-w-[200px]"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-bold text-white text-base shadow-sm mb-2"
                  style={{ backgroundColor: brandColor || '#111111' }}
                >
                  {businessName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
                {businessName}
              </h2>
            </div>

            {/* Headline */}
            <div className="space-y-2 mb-8 max-w-sm">
              <h3 className="text-lg sm:text-xl font-bold text-[#111111] leading-snug">
                Enjoyed working with us? Scan to leave a review
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Your feedback helps us continuously improve our service and helps others discover us.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-3xl border-2 border-black/10 shadow-sm inline-block mb-6">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Review QR for ${businessName}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-[#A8A5A5] italic">
                  Enter a valid https:// review link above
                </div>
              )}
            </div>

            {/* Footer instruction */}
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold text-[#111111]">
                Point your smartphone camera at the QR code
              </p>
              <p className="text-[11px] text-[#A8A5A5]">
                Tap the link banner that appears on your screen
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
