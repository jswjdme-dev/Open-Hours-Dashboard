import React, { useState, useEffect } from 'react';
import {
  X,
  Link,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Ban,
  Plus,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ProjectRevealToken } from '../../types/index.ts';
import {
  generateProjectRevealToken,
  revokeProjectRevealToken,
  getProjectRevealTokens,
} from '../../data/repo.ts';

interface RevealLinkModalProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}

export const RevealLinkModal: React.FC<RevealLinkModalProps> = ({
  projectId,
  projectTitle,
  onClose,
}) => {
  const [tokens, setTokens] = useState<ProjectRevealToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const list = await getProjectRevealTokens(projectId);
      setTokens(list);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load reveal tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [projectId]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setActionError(null);
      await generateProjectRevealToken(projectId, expiryDays, 'Admin');
      await loadTokens();
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate reveal link');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!window.confirm('Are you sure you want to revoke this reveal preview link? Recipients will no longer be able to view the concept.')) {
      return;
    }
    try {
      setActionError(null);
      await revokeProjectRevealToken(tokenId, 'Admin');
      await loadTokens();
    } catch (err: any) {
      setActionError(err.message || 'Failed to revoke link');
    }
  };

  const handleCopyLink = async (token: ProjectRevealToken) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/preview/${token.token}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedTokenId(token.id);
      setTimeout(() => setCopiedTokenId(null), 2500);
    } catch (err) {
      alert(`Could not copy automatically. URL: ${fullUrl}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-black/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-black/10 flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <Link size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Project Reveal Link</h3>
              <p className="text-xs text-[#6B6B6B] truncate max-w-sm">{projectTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#111111] hover:bg-black/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Note Banner Required by specification */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-950 space-y-2">
            <div className="flex items-start gap-2 font-medium">
              <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Works across devices only after Supabase intake is connected. Test mode: the link
                opens only in this browser. Check ePrivacy/GDPR rules before sending unsolicited
                links.
              </div>
            </div>
            <div className="text-[11px] text-amber-800 italic pt-0.5">
              Note: The app never sends emails or messages itself.
            </div>
          </div>

          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {actionError}
            </div>
          )}

          {/* Generator Controls */}
          <div className="p-4 bg-[#F8F8F7] rounded-2xl border border-black/5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#111111]">Expiry window:</span>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-black/15 bg-white text-[#111111] font-medium"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days (default)</option>
                <option value={60}>60 days</option>
                <option value={0}>No expiry</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-black transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Plus size={14} />
              <span>{generating ? 'Generating...' : 'Generate reveal link'}</span>
            </button>
          </div>

          {/* Tokens List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6B6B6B] font-semibold">
              <span>Active &amp; Past Reveal Links</span>
              <span>{tokens.length} total</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#888888]">Loading links...</div>
            ) : tokens.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#888888] bg-[#FAFAFA] rounded-2xl border border-dashed border-black/10 p-6">
                <Link size={24} className="mx-auto text-[#BBBBBB] mb-2" />
                <p className="font-semibold text-[#111111]">No reveal links generated yet</p>
                <p className="mt-1">
                  Click &ldquo;Generate reveal link&rdquo; above to share a sandboxed concept with your prospect or client.
                </p>
              </div>
            ) : (
              tokens.map((tok) => {
                const isRevoked = Boolean(tok.revokedAt);
                const isExpired =
                  !isRevoked && Boolean(tok.expiresAt && new Date(tok.expiresAt) < new Date());
                const isActive = !isRevoked && !isExpired;
                const isCopied = copiedTokenId === tok.id;
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const previewUrl = `${origin}/preview/${tok.token}`;

                return (
                  <div
                    key={tok.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isActive
                        ? 'bg-white border-black/10 shadow-2xs'
                        : 'bg-[#F9F9F9] border-black/5 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRevoked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {isActive ? 'Active' : isRevoked ? 'Revoked' : 'Expired'}
                        </span>
                        <span className="text-xs font-mono text-[#555555] truncate max-w-[200px]">
                          {tok.token}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(tok)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#111111] text-white hover:bg-black'
                            }`}
                            title="Copy reveal link"
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{isCopied ? 'Copied' : 'Copy link'}</span>
                          </button>
                        )}

                        <a
                          href={`/preview/${tok.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-black/10 text-[#444444] hover:text-[#111111] hover:bg-black/5"
                          title="Open preview in new tab"
                        >
                          <ExternalLink size={14} />
                        </a>

                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(tok.id)}
                            className="p-1.5 rounded-lg text-[#999999] hover:text-rose-600 hover:bg-rose-50"
                            title="Revoke link access"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] pt-0.5 border-t border-black/5">
                      <span>
                        Created {new Date(tok.createdAt).toLocaleDateString()} by {tok.createdBy}
                      </span>
                      <span>
                        {tok.expiresAt
                          ? `Expires ${new Date(tok.expiresAt).toLocaleDateString()}`
                          : 'No expiry'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 bg-[#FAFAFA] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-black/15 text-xs font-semibold text-[#111111] hover:bg-[#F0EEEA] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
