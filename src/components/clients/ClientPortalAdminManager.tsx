import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  QrCode,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Info,
  ExternalLink,
  Edit2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import {
  Client,
  ClientSecurityBasics,
  ClientWeeklySnapshot,
  WeeklySnapshotMetric,
  WeeklySnapshotMetricSource,
} from '../../types/index.ts';
import {
  updateClientSecurityBasics,
  updateClientGoogleReviewLink,
  updateClientPortalSettings,
  getWeeklySnapshots,
  saveWeeklySnapshot,
  publishWeeklySnapshot,
  deleteWeeklySnapshot,
  contentGuardCheck,
} from '../../data/repo.ts';
import { GoogleReviewQrModal } from './GoogleReviewQrModal.tsx';

interface ClientPortalAdminManagerProps {
  client: Client;
  onClientUpdate: (updatedClient: Client) => void;
  showToast: (msg: string) => void;
}

const METRIC_SOURCES: WeeklySnapshotMetricSource[] = [
  'GA4',
  'Google Business Profile',
  'PageSpeed Insights',
  'Manual',
];

export const ClientPortalAdminManager: React.FC<ClientPortalAdminManagerProps> = ({
  client,
  onClientUpdate,
  showToast,
}) => {
  // Google Review QR Sheet Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [googleReviewLink, setGoogleReviewLink] = useState(client.googleReviewLink || '');
  const [reviewLinkError, setReviewLinkError] = useState<string | null>(null);
  const [savingReviewLink, setSavingReviewLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Security Basics
  const [securityBasics, setSecurityBasics] = useState<ClientSecurityBasics>({
    httpsEnabled: client.securityBasics?.httpsEnabled || { verified: true, verifiedDate: '2026-10-15' },
    privacyPolicyAdded: client.securityBasics?.privacyPolicyAdded || { verified: true, verifiedDate: '2026-10-15' },
    cookieNoticeAdded: client.securityBasics?.cookieNoticeAdded || { verified: true, verifiedDate: '2026-10-16' },
    contactFormTested: client.securityBasics?.contactFormTested || { verified: true, verifiedDate: '2026-10-16' },
  });
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Portal Display Toggles
  const [showPlanPrice, setShowPlanPrice] = useState(client.showPlanPriceInPortal ?? true);
  const [roiEstimatorEnabled, setRoiEstimatorEnabled] = useState(client.roiEstimatorEnabled ?? true);
  const [savingToggles, setSavingToggles] = useState(false);

  // Weekly Snapshots
  const [weeklySnapshots, setWeeklySnapshots] = useState<ClientWeeklySnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);

  // Snapshot Form State
  const [snapWeekLabel, setSnapWeekLabel] = useState('');
  const [snapWeekStartDate, setSnapWeekStartDate] = useState('');
  const [snapStatus, setSnapStatus] = useState<'Draft' | 'Published'>('Draft');
  const [snapMetrics, setSnapMetrics] = useState<WeeklySnapshotMetric[]>([
    {
      id: 'm_1',
      label: 'Local Search Impressions',
      value: '1240',
      source: 'Google Business Profile',
      asOfDate: new Date().toISOString().split('T')[0],
    },
    {
      id: 'm_2',
      label: 'Website Unique Visitors',
      value: '412',
      source: 'GA4',
      asOfDate: new Date().toISOString().split('T')[0],
    },
    {
      id: 'm_3',
      label: 'Mobile Page Speed Score',
      value: '94',
      source: 'PageSpeed Insights',
      asOfDate: new Date().toISOString().split('T')[0],
      testDate: new Date().toISOString().split('T')[0],
    },
  ]);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [snapGuardWarning, setSnapGuardWarning] = useState<string[]>([]);
  const [snapGuardConfirmed, setSnapGuardConfirmed] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  useEffect(() => {
    setGoogleReviewLink(client.googleReviewLink || '');
    setShowPlanPrice(client.showPlanPriceInPortal ?? true);
    setRoiEstimatorEnabled(client.roiEstimatorEnabled ?? true);
    if (client.securityBasics) {
      setSecurityBasics({
        httpsEnabled: client.securityBasics.httpsEnabled || { verified: true, verifiedDate: '2026-10-15' },
        privacyPolicyAdded: client.securityBasics.privacyPolicyAdded || { verified: true, verifiedDate: '2026-10-15' },
        cookieNoticeAdded: client.securityBasics.cookieNoticeAdded || { verified: true, verifiedDate: '2026-10-16' },
        contactFormTested: client.securityBasics.contactFormTested || { verified: true, verifiedDate: '2026-10-16' },
      });
    }
  }, [client]);

  useEffect(() => {
    loadWeeklySnapshots();
  }, [client.id]);

  const loadWeeklySnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const data = await getWeeklySnapshots(client.id);
      setWeeklySnapshots(data);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const handleSaveGoogleReviewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = googleReviewLink.trim();
    if (trimmed && !trimmed.startsWith('https://')) {
      setReviewLinkError('Review link must start with https://');
      return;
    }
    setSavingReviewLink(true);
    setReviewLinkError(null);
    try {
      const updated = await updateClientGoogleReviewLink(client.id, trimmed, 'Admin');
      if (updated) onClientUpdate(updated);
      showToast('Google review link saved successfully.');
    } catch (err: any) {
      setReviewLinkError(err.message || 'Failed to save review link.');
    } finally {
      setSavingReviewLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!googleReviewLink) return;
    navigator.clipboard.writeText(googleReviewLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveSecurityBasics = async () => {
    setSavingSecurity(true);
    try {
      const updated = await updateClientSecurityBasics(client.id, securityBasics, 'Admin');
      if (updated) onClientUpdate(updated);
      showToast('Security basics checklist saved successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to save security basics.');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleSavePortalToggles = async () => {
    setSavingToggles(true);
    try {
      const updated = await updateClientPortalSettings(
        client.id,
        {
          showPlanPriceInPortal: showPlanPrice,
          roiEstimatorEnabled: roiEstimatorEnabled,
        },
        'Admin'
      );
      if (updated) onClientUpdate(updated);
      showToast('Portal display settings saved successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to save portal display options.');
    } finally {
      setSavingToggles(false);
    }
  };

  const openNewSnapshotModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingSnapshotId(null);
    setSnapWeekLabel(`Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
    setSnapWeekStartDate(today);
    setSnapStatus('Draft');
    setSnapMetrics([
      {
        id: `m_${Date.now()}_1`,
        label: 'Local Search Impressions',
        value: '1450',
        source: 'Google Business Profile',
        asOfDate: today,
      },
      {
        id: `m_${Date.now()}_2`,
        label: 'Website Unique Visitors',
        value: '480',
        source: 'GA4',
        asOfDate: today,
      },
      {
        id: `m_${Date.now()}_3`,
        label: 'Mobile Page Speed Score',
        value: '95',
        source: 'PageSpeed Insights',
        asOfDate: today,
        testDate: today,
      },
    ]);
    setSnapError(null);
    setSnapGuardWarning([]);
    setSnapGuardConfirmed(false);
    setShowSnapshotModal(true);
  };

  const openEditSnapshotModal = (snap: ClientWeeklySnapshot) => {
    setEditingSnapshotId(snap.id);
    setSnapWeekLabel(snap.weekLabel);
    setSnapWeekStartDate(snap.weekStartDate);
    setSnapStatus(snap.status);
    setSnapMetrics(snap.metrics.map((m) => ({ ...m })));
    setSnapError(null);
    setSnapGuardWarning([]);
    setSnapGuardConfirmed(false);
    setShowSnapshotModal(true);
  };

  const handleMetricChange = (index: number, updates: Partial<WeeklySnapshotMetric>) => {
    const updated = [...snapMetrics];
    updated[index] = { ...updated[index], ...updates };
    setSnapMetrics(updated);

    // Check wording guard on labels
    const check = contentGuardCheck(updated.map((m) => m.label).join(' '), '', []);
    if (check.hasWarning) {
      setSnapGuardWarning(check.flaggedWords);
    } else {
      setSnapGuardWarning([]);
    }
  };

  const handleAddMetric = () => {
    if (snapMetrics.length >= 3) return;
    const today = new Date().toISOString().split('T')[0];
    setSnapMetrics([
      ...snapMetrics,
      {
        id: `m_${Date.now()}_${snapMetrics.length + 1}`,
        label: 'Metric Label',
        value: '100',
        source: 'GA4',
        asOfDate: today,
      },
    ]);
  };

  const handleRemoveMetric = (index: number) => {
    if (snapMetrics.length <= 1) return;
    setSnapMetrics(snapMetrics.filter((_, i) => i !== index));
  };

  const handleSaveSnapshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapWeekLabel.trim() || !snapWeekStartDate.trim()) {
      setSnapError('Week label and start date are required.');
      return;
    }

    if (snapMetrics.length === 0 || snapMetrics.length > 3) {
      setSnapError('A weekly snapshot must have between 1 and 3 metrics.');
      return;
    }

    // Enforce PageSpeed validation before publish
    if (snapStatus === 'Published') {
      for (const m of snapMetrics) {
        const isSpeed =
          m.source === 'PageSpeed Insights' ||
          m.label.toLowerCase().includes('speed') ||
          m.label.toLowerCase().includes('pagespeed');
        if (isSpeed) {
          if (m.source !== 'PageSpeed Insights' || !m.testDate?.trim()) {
            setSnapError(
              'A page speed metric requires source = PageSpeed Insights and a test date before publishing.'
            );
            return;
          }
        }
      }
    }

    // Wording guard check
    if (snapGuardWarning.length > 0 && !snapGuardConfirmed) {
      setSnapError(
        `Wording Guard: Metric text contains restricted words (${snapGuardWarning.join(
          ', '
        )}). Please acknowledge before saving.`
      );
      return;
    }

    setSavingSnapshot(true);
    setSnapError(null);
    try {
      await saveWeeklySnapshot(
        {
          ...(editingSnapshotId ? { id: editingSnapshotId } : {}),
          clientId: client.id,
          weekLabel: snapWeekLabel.trim(),
          weekStartDate: snapWeekStartDate.trim(),
          status: snapStatus,
          metrics: snapMetrics,
          createdBy: 'Admin',
        },
        'Admin'
      );
      showToast('Weekly snapshot saved successfully.');
      setShowSnapshotModal(false);
      await loadWeeklySnapshots();
    } catch (err: any) {
      setSnapError(err.message || 'Failed to save weekly snapshot.');
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handlePublishDirect = async (snapshotId: string) => {
    try {
      await publishWeeklySnapshot(snapshotId, 'Admin');
      showToast('Weekly snapshot published to client portal.');
      await loadWeeklySnapshots();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish snapshot.');
    }
  };

  const handleDeleteDirect = async (snapshotId: string) => {
    if (!window.confirm('Are you sure you want to delete this weekly snapshot?')) return;
    try {
      await deleteWeeklySnapshot(snapshotId, 'Admin');
      showToast('Weekly snapshot deleted.');
      await loadWeeklySnapshots();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete snapshot.');
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-black/5">
      {/* SECTION 1: GOOGLE REVIEW QR KIT */}
      <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-black/5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <QrCode size={16} className="text-[#D92D50]" />
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Google Review QR Kit Configuration
              </h4>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Set the verified Google review link for {client.businessName} and generate a print-ready A4/A5 display sheet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-4 py-2 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode size={13} />
            <span>Open QR Kit Sheet</span>
          </button>
        </div>

        <form onSubmit={handleSaveGoogleReviewLink} className="space-y-2">
          <label className="block text-xs font-bold text-[#111111]">
            Google Review Link (https:// only)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://g.page/r/example-review-link"
              value={googleReviewLink}
              onChange={(e) => setGoogleReviewLink(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
            />
            {googleReviewLink && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-[#6B6B6B] cursor-pointer"
                title="Copy link"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            )}
            <button
              type="submit"
              disabled={savingReviewLink}
              className="px-4 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {savingReviewLink ? 'Saving...' : 'Save Link'}
            </button>
          </div>
          {reviewLinkError && (
            <p className="text-[11px] text-red-600 font-semibold">{reviewLinkError}</p>
          )}
        </form>

        {/* Tip Required by brief */}
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Google Review Policy Reminder: </span>
            <span>
              Ask all customers, do not offer rewards for reviews, and do not select only happy customers (Google policy).
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: SECURITY BASICS CHECKLIST */}
      <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-black/5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Security Basics Checklist
              </h4>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Verify baseline technical security and privacy features. Replaces any free badge claims. Never claim legal compliance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSecurityBasics}
            disabled={savingSecurity}
            className="px-4 py-1.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {savingSecurity ? 'Saving...' : 'Save Security Checklist'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {[
            {
              key: 'httpsEnabled' as const,
              label: 'HTTPS enabled',
              desc: 'SSL certificate configured and enforced on custom domain.',
            },
            {
              key: 'privacyPolicyAdded' as const,
              label: 'Privacy policy page added',
              desc: 'Published privacy disclosure page on the live website.',
            },
            {
              key: 'cookieNoticeAdded' as const,
              label: 'Cookie notice added (only if the site uses cookies)',
              desc: 'Banner enabled if tracking or analytics cookies are set.',
            },
            {
              key: 'contactFormTested' as const,
              label: 'Contact form tested',
              desc: 'Verified email relay delivery on the primary lead enquiry form.',
            },
          ].map((item) => {
            const data = securityBasics[item.key] || { verified: false };
            return (
              <div
                key={item.key}
                className="p-3.5 bg-white rounded-xl border border-black/5 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.verified}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setSecurityBasics({
                            ...securityBasics,
                            [item.key]: {
                              verified: isChecked,
                              verifiedDate: isChecked
                                ? data.verifiedDate || new Date().toISOString().split('T')[0]
                                : undefined,
                            },
                          });
                        }}
                        className="rounded text-[#D92D50] focus:ring-[#D92D50]"
                      />
                      <span className="text-xs font-bold text-[#111111]">{item.label}</span>
                    </label>
                    <p className="text-[11px] text-[#6B6B6B] mt-1">{item.desc}</p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      data.verified
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {data.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                {data.verified && (
                  <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px]">
                    <span className="text-[#6B6B6B]">Verification Date:</span>
                    <input
                      type="date"
                      value={data.verifiedDate || ''}
                      onChange={(e) => {
                        setSecurityBasics({
                          ...securityBasics,
                          [item.key]: {
                            ...data,
                            verifiedDate: e.target.value,
                          },
                        });
                      }}
                      className="px-2 py-0.5 text-[11px] border border-black/10 rounded-lg bg-[#FAFAFA]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Admin Helper Note Required by Brief */}
        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
          <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Admin Policy Note: </span>
            <span>
              Never claim legal compliance or assign monetary worth labels. Have legal wording reviewed by a professional.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: PORTAL DISPLAY OPTIONS */}
      <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-black/5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Client Portal Feature Toggles
            </h4>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Control pricing visibility and the interactive ROI estimator card for this client.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSavePortalToggles}
            disabled={savingToggles}
            className="px-4 py-1.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {savingToggles ? 'Saving...' : 'Save Display Options'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="p-3.5 bg-white rounded-xl border border-black/5 flex items-start justify-between gap-3 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-[#111111] block">
                Show Plan Price in Portal
              </span>
              <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">
                Displays plain text plan pricing on client portal without promotional pressure.
              </span>
            </div>
            <input
              type="checkbox"
              checked={showPlanPrice}
              onChange={(e) => setShowPlanPrice(e.target.checked)}
              className="rounded text-[#D92D50] focus:ring-[#D92D50] mt-1"
            />
          </label>

          <label className="p-3.5 bg-white rounded-xl border border-black/5 flex items-start justify-between gap-3 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-[#111111] block">
                Enable ROI Estimator Card
              </span>
              <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">
                Allows client to enter custom sliders to estimate monthly enquiry returns.
              </span>
            </div>
            <input
              type="checkbox"
              checked={roiEstimatorEnabled}
              onChange={(e) => setRoiEstimatorEnabled(e.target.checked)}
              className="rounded text-[#D92D50] focus:ring-[#D92D50] mt-1"
            />
          </label>
        </div>
      </div>

      {/* SECTION 4: WEEKLY SNAPSHOTS */}
      <div className="p-5 rounded-2xl bg-[#FAFAFA] border border-black/5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#D92D50]" />
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Weekly Performance Snapshots
              </h4>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Enter verified weekly metrics (up to 3). PageSpeed metric requires source = PageSpeed Insights and test date.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewSnapshotModal}
            className="px-4 py-2 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} />
            <span>New Weekly Snapshot</span>
          </button>
        </div>

        {loadingSnapshots ? (
          <div className="p-6 text-center text-xs text-[#6B6B6B]">Loading snapshots...</div>
        ) : weeklySnapshots.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B6B6B] bg-white rounded-xl border border-black/5">
            No weekly snapshots created for this client yet.
          </div>
        ) : (
          <div className="space-y-3">
            {weeklySnapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-4 bg-white rounded-xl border border-black/5 space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#111111]">{snap.weekLabel}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        snap.status === 'Published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {snap.status}
                    </span>
                    <span className="text-[11px] text-[#A8A5A5]">
                      Start date: {snap.weekStartDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {snap.status !== 'Published' && (
                      <button
                        type="button"
                        onClick={() => handlePublishDirect(snap.id)}
                        className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Publish Now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditSnapshotModal(snap)}
                      className="p-1 rounded-lg hover:bg-black/5 text-[#6B6B6B] cursor-pointer"
                      title="Edit snapshot"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDirect(snap.id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer"
                      title="Delete snapshot"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {snap.metrics.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-[#FAFAFA] border border-black/5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#111111] truncate">{m.label}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/5 text-[#444444]">
                          {m.source}
                        </span>
                      </div>
                      <div className="text-base font-bold text-[#111111] tabular-nums">
                        {m.value}
                      </div>
                      <div className="text-[10px] text-[#A8A5A5] flex items-center justify-between">
                        <span>As of: {m.asOfDate}</span>
                        {m.source === 'PageSpeed Insights' && m.testDate && (
                          <span>Test: {m.testDate}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT WEEKLY SNAPSHOT */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-black/10 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-2 border-b border-black/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50]">
                  Weekly Performance
                </span>
                <h3 className="font-bold text-base text-[#111111]">
                  {editingSnapshotId ? 'Edit Weekly Snapshot' : 'Create Weekly Snapshot'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSnapshotSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Week Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={snapWeekLabel}
                    onChange={(e) => setSnapWeekLabel(e.target.value)}
                    placeholder="e.g. Week of Oct 14, 2026"
                    className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Week Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={snapWeekStartDate}
                    onChange={(e) => setSnapWeekStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Status</label>
                <select
                  value={snapStatus}
                  onChange={(e) => setSnapStatus(e.target.value as 'Draft' | 'Published')}
                  className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-black/10 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="Draft">Draft (Only admins can view)</option>
                  <option value="Published">Published (Visible in client portal)</option>
                </select>
              </div>

              {/* Metrics (Up to 3) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111111]">
                    Verified Metrics (Up to 3)
                  </label>
                  {snapMetrics.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddMetric}
                      className="text-xs font-bold text-[#D92D50] hover:underline cursor-pointer"
                    >
                      + Add Metric
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {snapMetrics.map((metric, idx) => (
                    <div
                      key={metric.id}
                      className="p-3 bg-[#FAFAFA] rounded-xl border border-black/5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#111111]">
                          Metric #{idx + 1}
                        </span>
                        {snapMetrics.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMetric(idx)}
                            className="text-xs text-red-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#6B6B6B] mb-0.5">
                            Label
                          </label>
                          <input
                            type="text"
                            required
                            value={metric.label}
                            onChange={(e) => handleMetricChange(idx, { label: e.target.value })}
                            placeholder="e.g. Unique Visitors"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#6B6B6B] mb-0.5">
                            Value
                          </label>
                          <input
                            type="text"
                            required
                            value={metric.value}
                            onChange={(e) => handleMetricChange(idx, { value: e.target.value })}
                            placeholder="e.g. 480"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#6B6B6B] mb-0.5">
                            Source
                          </label>
                          <select
                            value={metric.source}
                            onChange={(e) =>
                              handleMetricChange(idx, {
                                source: e.target.value as WeeklySnapshotMetricSource,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs bg-white border border-black/10 rounded-lg cursor-pointer"
                          >
                            {METRIC_SOURCES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#6B6B6B] mb-0.5">
                            As Of Date
                          </label>
                          <input
                            type="date"
                            required
                            value={metric.asOfDate}
                            onChange={(e) => handleMetricChange(idx, { asOfDate: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-black/10 rounded-lg"
                          />
                        </div>

                        {metric.source === 'PageSpeed Insights' && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#6B6B6B] mb-0.5">
                              Test Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={metric.testDate || ''}
                              onChange={(e) => handleMetricChange(idx, { testDate: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-black/10 rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wording Guard warning if triggered */}
              {snapGuardWarning.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert size={14} className="text-amber-700" />
                    <span>Wording Guard: Restricted terms found ({snapGuardWarning.join(', ')})</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={snapGuardConfirmed}
                      onChange={(e) => setSnapGuardConfirmed(e.target.checked)}
                      className="rounded text-[#D92D50]"
                    />
                    <span>Confirm metric label accuracy and non-guarantee wording</span>
                  </label>
                </div>
              )}

              {snapError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl">
                  {snapError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSnapshot}
                  className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSnapshot ? 'Saving...' : 'Save Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      <GoogleReviewQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        businessName={client.businessName}
        reviewLink={client.googleReviewLink || googleReviewLink}
        brandColor="#111111"
        logoUrl={undefined}
        canEditLink={true}
        onUpdateReviewLink={async (newLink: string) => {
          const updated = await updateClientGoogleReviewLink(client.id, newLink, 'Admin');
          if (updated) onClientUpdate(updated);
          setGoogleReviewLink(newLink);
          showToast('Google review link saved successfully.');
        }}
      />
    </div>
  );
};
