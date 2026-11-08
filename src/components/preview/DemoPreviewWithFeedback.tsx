import React, { useState, useEffect, useRef, useId } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  MapPin,
  Plus,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  X,
  Filter,
  ListTodo,
  AlertCircle,
  Eye,
  RefreshCw,
  Check,
} from 'lucide-react';
import { DemoPin, PinDevicePreset, PinStatus, PinAuthorRole } from '../../types/index.ts';
import {
  getDemoPins,
  addDemoPin,
  addPinReply,
  updatePinStatus,
  createTasksFromOpenPins,
  markPinsAsRead,
  getUnreadPinCount,
  contentGuardCheck,
} from '../../data/repo.ts';

interface DemoPreviewWithFeedbackProps {
  projectId: string;
  projectTitle: string;
  version: number;
  renderedHtml: string;
  isClientView?: boolean;
  canAddPins?: boolean; // false if draft or not latest shared for client
  clientName?: string;
  onRefresh?: () => void;
  className?: string;
}

export const DemoPreviewWithFeedback: React.FC<DemoPreviewWithFeedbackProps> = ({
  projectId,
  projectTitle,
  version,
  renderedHtml,
  isClientView = false,
  canAddPins = true,
  clientName = 'Client',
  onRefresh,
  className = '',
}) => {
  const [devicePreset, setDevicePreset] = useState<PinDevicePreset>('desktop');
  const [isPinModeActive, setIsPinModeActive] = useState<boolean>(false);
  const [pins, setPins] = useState<DemoPin[]>([]);
  const [loadingPins, setLoadingPins] = useState<boolean>(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [activeSideTab, setActiveSideTab] = useState<'pins' | 'tasks'>('pins');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Resolved'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | PinDevicePreset>('all');
  const [versionFilter, setVersionFilter] = useState<number | 'all'>(version);

  // New pin drafting state
  const [draftPinCoords, setDraftPinCoords] = useState<{
    xPercent: number;
    yPercent: number;
    sectionId?: string;
    snippet?: string;
  } | null>(null);
  const [draftComment, setDraftComment] = useState<string>('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingPin, setSubmittingPin] = useState<boolean>(false);

  // Content guard warning & confirm checkbox state for client-visible typing
  const [guardWarning, setGuardWarning] = useState<string[]>([]);
  const [guardConfirmed, setGuardConfirmed] = useState<boolean>(false);

  // Reply drafting state
  const [replyText, setReplyText] = useState<string>('');
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  // Task creation state (Admin)
  const [taskCreationResult, setTaskCreationResult] = useState<{
    created: number;
    skipped: number;
  } | null>(null);
  const [creatingTasks, setCreatingTasks] = useState<boolean>(false);

  // Unread badge count
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load pins
  const loadPinsData = async () => {
    try {
      setLoadingPins(true);
      const role: 'client' | 'admin' = isClientView ? 'client' : 'admin';
      const loaded = await getDemoPins(projectId, {
        role,
        version: versionFilter === 'all' ? undefined : versionFilter,
      });
      setPins(loaded);
      const unread = await getUnreadPinCount(projectId, role);
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load pins:', err);
    } finally {
      setLoadingPins(false);
    }
  };

  useEffect(() => {
    loadPinsData();
    // Mark as read when entering
    markPinsAsRead(projectId, isClientView ? 'client' : 'admin').catch(() => {});
  }, [projectId, version, isClientView, versionFilter]);

  // Handle overlay click in "Add comment" mode
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinModeActive || !canAddPins) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    // Try measuring nearest element in same-origin sandbox iframe
    let sectionId: string | undefined = undefined;
    let snippet: string | undefined = undefined;

    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        // Translate coordinates to iframe document coordinates
        const iframeDocEl = doc.documentElement;
        const scrollLeft = iframeDocEl.scrollLeft || doc.body.scrollLeft || 0;
        const scrollTop = iframeDocEl.scrollTop || doc.body.scrollTop || 0;
        const targetX = (clickX / rect.width) * iframeDocEl.clientWidth + scrollLeft;
        const targetY = (clickY / rect.height) * iframeDocEl.clientHeight + scrollTop;

        const el = doc.elementFromPoint(clickX, clickY) as HTMLElement | null;
        if (el) {
          const closestWithId = el.closest('[id]');
          sectionId = closestWithId?.id || el.tagName.toLowerCase();
          const rawText = el.innerText || el.textContent || '';
          snippet = rawText.trim().replace(/\s+/g, ' ').slice(0, 80);
        }
      }
    } catch {
      // Fallback gracefully without breaking
      sectionId = undefined;
      snippet = undefined;
    }

    setDraftPinCoords({
      xPercent,
      yPercent,
      sectionId,
      snippet,
    });
    setDraftComment('');
    setCommentError(null);
    setGuardWarning([]);
    setGuardConfirmed(false);
    setSelectedPinId(null);
  };

  // Check wording guard on comment change
  const handleCommentChange = (text: string) => {
    setDraftComment(text);
    if (!isClientView) {
      // Admin typing visible text: check content guard
      const guard = contentGuardCheck('Feedback Pin', text, []);
      setGuardWarning(guard.flaggedWords);
      if (guard.flaggedWords.length === 0) {
        setGuardConfirmed(false);
      }
    }
  };

  // Submit new pin
  const handleSubmitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftPinCoords) return;
    const clean = draftComment.trim();
    if (!clean) {
      setCommentError('Please enter a comment (up to 500 characters).');
      return;
    }
    if (clean.length > 500) {
      setCommentError('Comment must not exceed 500 characters.');
      return;
    }
    if (!isClientView && guardWarning.length > 0 && !guardConfirmed) {
      setCommentError('Please review and confirm the wording guard check before submitting.');
      return;
    }

    try {
      setSubmittingPin(true);
      const authorRole: PinAuthorRole = isClientView ? 'client' : 'admin';
      const authorName = isClientView ? clientName : 'Admin';

      const newPin = await addDemoPin({
        projectId,
        version,
        devicePreset,
        xPercent: draftPinCoords.xPercent,
        yPercent: draftPinCoords.yPercent,
        sectionId: draftPinCoords.sectionId,
        snippet: draftPinCoords.snippet,
        comment: clean,
        authorRole,
        authorName,
      });

      setDraftPinCoords(null);
      setDraftComment('');
      setIsPinModeActive(false);
      setSelectedPinId(newPin.id);
      await loadPinsData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setCommentError(err.message || 'Failed to save pin.');
    } finally {
      setSubmittingPin(false);
    }
  };

  // Submit reply
  const handleAddReply = async (pinId: string) => {
    const clean = replyText.trim();
    if (!clean) return;
    if (clean.length > 500) {
      alert('Reply must not exceed 500 characters.');
      return;
    }

    try {
      setSubmittingReply(true);
      const authorRole: PinAuthorRole = isClientView ? 'client' : 'admin';
      const authorName = isClientView ? clientName : 'Admin';

      await addPinReply(pinId, clean, authorRole, authorName);
      setReplyText('');
      await loadPinsData();
    } catch (err: any) {
      alert(err.message || 'Failed to add reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Toggle status (Admin only or Client if open/resolved)
  const handleToggleStatus = async (pin: DemoPin) => {
    const nextStatus: PinStatus = pin.status === 'Open' ? 'Resolved' : 'Open';
    try {
      const actorName = isClientView ? clientName : 'Admin';
      await updatePinStatus(pin.id, nextStatus, actorName);
      await loadPinsData();
    } catch (err: any) {
      alert(err.message || 'Failed to update pin status');
    }
  };

  // Create tasks from open pins (Admin only)
  const handleCreateTasks = async () => {
    try {
      setCreatingTasks(true);
      const result = await createTasksFromOpenPins(projectId, version, 'Admin');
      setTaskCreationResult({
        created: result.createdTasks.length,
        skipped: result.skippedCount,
      });
      await loadPinsData();
    } catch (err: any) {
      alert(err.message || 'Failed to create tasks');
    } finally {
      setCreatingTasks(false);
    }
  };

  // Visible pins on the preview surface: match current devicePreset and project version
  const surfacePins = pins.filter(
    (p) => p.devicePreset === devicePreset && p.version === version
  );

  // Filtered pins for the side list
  const filteredSidePins = pins.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (deviceFilter !== 'all' && p.devicePreset !== deviceFilter) return false;
    if (versionFilter !== 'all' && p.version !== versionFilter) return false;
    return true;
  });

  const selectedPin = pins.find((p) => p.id === selectedPinId);
  const openPinsCount = pins.filter((p) => p.status === 'Open').length;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col xl:flex-row gap-4 w-full bg-[#F4F3F0] rounded-2xl p-3 sm:p-5 border border-black/10 ${className}`}
    >
      {/* MAIN PREVIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP CONTROLS BAR */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            {/* Device Preset Switcher */}
            <div className="bg-white/80 backdrop-blur-xs p-1 rounded-xl border border-black/10 flex items-center gap-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setDevicePreset('desktop')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  devicePreset === 'desktop'
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
                aria-label="Desktop Preview"
                title="Desktop Preview (Full Width)"
              >
                <Monitor size={14} />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevicePreset('tablet')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  devicePreset === 'tablet'
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
                aria-label="Tablet Preview"
                title="Tablet Preview (768px)"
              >
                <Tablet size={14} />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setDevicePreset('mobile')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  devicePreset === 'mobile'
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
                aria-label="Mobile Preview"
                title="Mobile Preview (375px)"
              >
                <Smartphone size={14} />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <span className="text-xs text-[#6B6B6B] font-medium hidden md:inline ml-1">
              Version {version}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Pin Comment Toggle */}
            {canAddPins && (
              <button
                type="button"
                onClick={() => {
                  setIsPinModeActive(!isPinModeActive);
                  setDraftPinCoords(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                  isPinModeActive
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-white text-[#111111] border border-black/10 hover:bg-[#F9F8F6]'
                }`}
                title={
                  isPinModeActive
                    ? 'Click anywhere on the preview to place your pin'
                    : 'Enable pin mode to click and drop feedback'
                }
              >
                <MapPin size={14} className={isPinModeActive ? 'text-white' : 'text-amber-600'} />
                <span>{isPinModeActive ? 'Click preview to drop pin' : 'Add comment'}</span>
              </button>
            )}

            {/* Task creation from open pins (Admin only) */}
            {!isClientView && (
              <button
                type="button"
                onClick={handleCreateTasks}
                disabled={creatingTasks || openPinsCount === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                  openPinsCount > 0 && !creatingTasks
                    ? 'bg-[#111111] text-white hover:bg-black cursor-pointer'
                    : 'bg-black/5 text-[#888888] cursor-not-allowed'
                }`}
                title="Create follow-up tasks from all open pins on this version (idempotent)"
              >
                <ListTodo size={14} />
                <span className="hidden sm:inline">Create tasks from open pins</span>
                {openPinsCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-black rounded-full text-[10px] font-bold">
                    {openPinsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* TASK CREATION BANNER (Admin) */}
        {taskCreationResult && (
          <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                <strong>{taskCreationResult.created}</strong> new task(s) created from open pins
                {taskCreationResult.skipped > 0
                  ? ` (${taskCreationResult.skipped} already linked, skipped duplicates)`
                  : ''}
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTaskCreationResult(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* PIN MODE BANNER */}
        {isPinModeActive && (
          <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-amber-600 shrink-0" />
              <span>
                <strong>Pin Mode Active:</strong> Click anywhere on the website preview to drop a
                numbered pin and leave feedback.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsPinModeActive(false);
                setDraftPinCoords(null);
              }}
              className="px-2 py-0.5 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        {/* PREVIEW CONTAINER */}
        <div className="relative mt-3 w-full bg-[#E5E4E0] rounded-2xl p-2 sm:p-5 flex justify-center border border-black/10 overflow-x-auto min-h-[560px]">
          <div
            className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 border border-black/10 flex flex-col ${
              devicePreset === 'desktop'
                ? 'w-full h-[620px]'
                : devicePreset === 'tablet'
                ? 'w-[768px] max-w-full h-[680px]'
                : 'w-[375px] max-w-full h-[620px]'
            }`}
          >
            {/* The Sandboxed Iframe (Strictly script-free, same-origin allowed for parent inspection) */}
            <iframe
              ref={iframeRef}
              srcDoc={renderedHtml}
              sandbox="allow-same-origin"
              title={projectTitle || 'Website Demo'}
              className="w-full h-full border-0 select-none"
            />

            {/* Interactive Feedback Overlay (Matches rendered document dimensions) */}
            <div
              ref={overlayRef}
              onClick={handleOverlayClick}
              className={`absolute inset-0 z-20 ${
                isPinModeActive ? 'cursor-crosshair bg-black/5' : 'pointer-events-none'
              }`}
              style={{ pointerEvents: isPinModeActive ? 'auto' : 'none' }}
            >
              {/* Render numbered pin badges */}
              {surfacePins.map((pin) => {
                const isSelected = selectedPinId === pin.id;
                const isResolved = pin.status === 'Resolved';

                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPinId(isSelected ? null : pin.id);
                    }}
                    style={{
                      left: `${pin.xPercent}%`,
                      top: `${pin.yPercent}%`,
                      pointerEvents: 'auto',
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform cursor-pointer hover:scale-115 ${
                      isSelected
                        ? 'ring-4 ring-black/20 scale-110 z-30'
                        : 'z-20'
                    } ${
                      isResolved
                        ? 'bg-emerald-600 text-white'
                        : pin.authorRole === 'client'
                        ? 'bg-amber-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                    title={`Pin #${pin.pinNumber}: ${pin.comment.slice(0, 60)} (${pin.status})`}
                    aria-label={`Pin number ${pin.pinNumber}, status ${pin.status}`}
                  >
                    {isResolved ? (
                      <Check size={13} className="stroke-[3]" />
                    ) : (
                      pin.pinNumber
                    )}
                  </button>
                );
              })}

              {/* Draft Pin Indicator when clicked */}
              {draftPinCoords && (
                <div
                  style={{
                    left: `${draftPinCoords.xPercent}%`,
                    top: `${draftPinCoords.yPercent}%`,
                    pointerEvents: 'auto',
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-40"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-lg animate-bounce ring-4 ring-amber-300">
                    <Plus size={16} />
                  </div>
                </div>
              )}
            </div>

            {/* DRAFT PIN POPUP MODAL (Inside container) */}
            {draftPinCoords && (
              <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-md w-full border border-black/10 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-black/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                        <MapPin size={13} />
                      </div>
                      <h4 className="text-sm font-bold text-[#111111]">
                        Add Feedback Pin ({devicePreset})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftPinCoords(null)}
                      className="text-[#888888] hover:text-[#111111] p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitPin} className="space-y-3 pt-3">
                    {/* Element context snippet if captured */}
                    {draftPinCoords.sectionId && (
                      <div className="p-2.5 bg-[#FAFAFA] rounded-xl border border-black/5 text-[11px] text-[#6B6B6B]">
                        <span className="font-semibold text-[#111111]">Target Section:</span> &lt;
                        {draftPinCoords.sectionId}&gt;
                        {draftPinCoords.snippet && (
                          <div className="italic text-[#444444] mt-0.5 line-clamp-1">
                            &ldquo;{draftPinCoords.snippet}&rdquo;
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center text-xs text-[#6B6B6B] mb-1">
                        <label className="font-medium text-[#111111]">Your feedback</label>
                        <span className={draftComment.length > 480 ? 'text-amber-600 font-bold' : ''}>
                          {draftComment.length}/500
                        </span>
                      </div>
                      <textarea
                        value={draftComment}
                        onChange={(e) => handleCommentChange(e.target.value)}
                        placeholder="Describe the requested change or suggestion..."
                        maxLength={500}
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-black/15 focus:outline-hidden focus:ring-2 focus:ring-black/15 bg-white resize-none"
                        autoFocus
                      />
                    </div>

                    {/* Wording Guard warning for admin typed visible copy */}
                    {!isClientView && guardWarning.length > 0 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2">
                        <div className="flex items-start gap-1.5 font-medium">
                          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            Wording guard flagged: <strong>{guardWarning.join(', ')}</strong>.
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#333333]">
                          <input
                            type="checkbox"
                            checked={guardConfirmed}
                            onChange={(e) => setGuardConfirmed(e.target.checked)}
                            className="rounded border-gray-300 text-black focus:ring-black"
                          />
                          <span>I confirm this client-visible wording adheres to professional standards</span>
                        </label>
                      </div>
                    )}

                    {commentError && (
                      <div className="text-xs text-rose-600 font-medium">{commentError}</div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setDraftPinCoords(null)}
                        className="px-3 py-1.5 text-xs text-[#6B6B6B] hover:text-[#111111] font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          submittingPin ||
                          !draftComment.trim() ||
                          (!isClientView && guardWarning.length > 0 && !guardConfirmed)
                        }
                        className="px-4 py-1.5 text-xs font-semibold bg-[#111111] text-white rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {submittingPin ? 'Saving...' : 'Drop Pin'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM METADATA NOTE */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 text-[11px] text-[#6B6B6B]">
          <span>
            {surfacePins.length} pin{surfacePins.length === 1 ? '' : 's'} visible on {devicePreset} view (v{version})
          </span>
          <span>
            Previews rendered script-free in isolated sandbox container
          </span>
        </div>
      </div>

      {/* RIGHT SIDE FEEDBACK THREAD / LIST PANEL */}
      <div className="w-full xl:w-96 flex flex-col bg-white rounded-2xl border border-black/10 shadow-xs p-4 overflow-hidden">
        {/* PANEL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#111111]" />
            <h3 className="text-sm font-bold text-[#111111]">Website Feedback</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadPinsData}
              className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#111111] hover:bg-black/5"
              title="Refresh feedback pins"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* FILTERS BAR */}
        <div className="py-2.5 border-b border-black/10 flex items-center justify-between gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#111111] text-white'
                  : 'text-[#6B6B6B] hover:bg-black/5'
              }`}
            >
              All ({pins.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Open')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                statusFilter === 'Open'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              Open ({pins.filter((p) => p.status === 'Open').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Resolved')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                statusFilter === 'Resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Resolved ({pins.filter((p) => p.status === 'Resolved').length})
            </button>
          </div>

          {/* Device filter */}
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value as any)}
            className="text-[11px] px-2 py-1 rounded-lg border border-black/15 bg-white text-[#444444]"
            aria-label="Filter pins by device"
          >
            <option value="all">All Devices</option>
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>

        {/* SELECTED PIN DETAIL VIEW (THREAD) OR FULL LIST */}
        {selectedPin ? (
          <div className="flex-1 flex flex-col pt-3 min-h-[360px]">
            {/* Back button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5">
              <button
                type="button"
                onClick={() => setSelectedPinId(null)}
                className="text-xs text-[#6B6B6B] hover:text-[#111111] font-medium flex items-center gap-1"
              >
                ← Back to all pins
              </button>

              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedPin.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedPin.status}
                </span>

                {/* Status Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedPin)}
                  className="px-2 py-0.5 rounded-md border border-black/15 text-[10px] font-medium hover:bg-black/5 text-[#444444]"
                >
                  {selectedPin.status === 'Open' ? 'Mark Resolved' : 'Reopen Pin'}
                </button>
              </div>
            </div>

            {/* Pin header info */}
            <div className="p-3 bg-[#FAFAFA] rounded-xl border border-black/5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#111111] flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">
                    #{selectedPin.pinNumber}
                  </span>
                  {selectedPin.authorName} ({selectedPin.authorRole})
                </span>
                <span className="text-[#888888]">
                  {new Date(selectedPin.createdAt).toLocaleDateString()}
                </span>
              </div>

              {selectedPin.sectionId && (
                <div className="text-[11px] text-[#6B6B6B]">
                  <span className="font-semibold text-[#111111]">Section:</span> &lt;
                  {selectedPin.sectionId}&gt; ({selectedPin.devicePreset})
                </div>
              )}

              {selectedPin.snippet && (
                <div className="p-1.5 bg-white rounded border border-black/5 text-[11px] italic text-[#555555]">
                  &ldquo;{selectedPin.snippet}&rdquo;
                </div>
              )}

              <p className="text-xs text-[#111111] pt-1 leading-relaxed">
                {selectedPin.comment}
              </p>
            </div>

            {/* Replies Thread */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[220px]">
              {selectedPin.replies.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#888888]">
                  No replies yet. Join the conversation below.
                </div>
              ) : (
                selectedPin.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-2.5 rounded-xl text-xs space-y-1 ${
                      reply.authorRole === 'client'
                        ? 'bg-amber-50/60 border border-amber-200/60 ml-3'
                        : 'bg-white border border-black/10 mr-3'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#111111]">
                        {reply.authorName} ({reply.authorRole})
                      </span>
                      <span className="text-[#888888]">
                        {new Date(reply.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[#333333] leading-relaxed">{reply.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Form */}
            <div className="pt-2 border-t border-black/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddReply(selectedPin.id);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  maxLength={500}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-black/15 bg-white focus:outline-hidden focus:ring-1 focus:ring-black"
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="px-3 py-1.5 bg-[#111111] text-white text-xs font-semibold rounded-xl hover:bg-black disabled:opacity-40 flex items-center gap-1"
                >
                  <Send size={12} />
                  <span>Reply</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* TEXT-ONLY PIN LIST (KEYBOARD ACCESSIBLE) */
          <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-[500px]">
            {loadingPins ? (
              <div className="py-8 text-center text-xs text-[#888888]">
                Loading feedback pins...
              </div>
            ) : filteredSidePins.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#888888] space-y-1">
                <MapPin size={24} className="mx-auto text-[#BBBBBB] mb-1" />
                <p className="font-semibold text-[#111111]">No feedback pins found</p>
                <p className="text-[11px]">
                  {canAddPins
                    ? 'Click "Add comment" to drop a pin on the preview.'
                    : 'No feedback submitted for this version yet.'}
                </p>
              </div>
            ) : (
              filteredSidePins.map((pin) => {
                const isResolved = pin.status === 'Resolved';
                return (
                  <div
                    key={pin.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedPinId(pin.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPinId(pin.id);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-black/20 ${
                      pin.id === selectedPinId
                        ? 'border-black bg-[#FBFBFB] shadow-2xs'
                        : 'border-black/5 bg-[#FAFAFA] hover:bg-white hover:border-black/15'
                    }`}
                    aria-label={`Feedback pin #${pin.pinNumber} by ${pin.authorName}: ${pin.comment.slice(0, 40)}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isResolved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-black text-white'
                          }`}
                        >
                          #{pin.pinNumber}
                        </span>
                        <span className="font-bold text-[#111111]">{pin.authorName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-black/5 rounded text-[#6B6B6B]">
                          {pin.devicePreset}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {pin.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#333333] line-clamp-2 leading-relaxed">
                      {pin.comment}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#888888] pt-1.5">
                      <span>
                        {pin.sectionId ? `<${pin.sectionId}>` : 'General'} • v{pin.version}
                      </span>
                      {pin.replies.length > 0 && (
                        <span className="font-semibold text-[#111111]">
                          {pin.replies.length} repl{pin.replies.length === 1 ? 'y' : 'ies'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
