import React, { useState, useEffect } from 'react';
import { LogoMark } from '../components/common/LogoMark.tsx';
import {
  getApplicationSettings,
  getApplicationByToken,
  submitPublicApplication,
} from '../data/repo.ts';
import { ApplicationPageSettings, ApplicationPublicStatus } from '../types/index.ts';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Lock,
  Building,
  Mail,
  Phone,
  Globe,
  Tag,
  FileText,
} from 'lucide-react';

interface PublicApplyPageProps {
  initialToken?: string;
  onNavigateHome?: () => void;
}

export const PublicApplyPage: React.FC<PublicApplyPageProps> = ({
  initialToken,
  onNavigateHome,
}) => {
  // Check if URL is /apply/status/<token>
  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(() => {
    if (initialToken) return initialToken;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/apply\/status\/([^/?#]+)/);
      if (match && match[1]) return match[1];
      const params = new URLSearchParams(window.location.search);
      const qToken = params.get('token');
      if (qToken) return qToken;
    }
    return null;
  });

  const [settings, setSettings] = useState<ApplicationPageSettings>({
    formEnabled: true,
    introText:
      'Apply to work with Open Hours. We design, build, and support high-performing websites and digital systems for private practices and businesses.',
    privacyUrl: '/privacy',
    confirmationText:
      'Thank you. Open Hours will verify your details and contact you soon.',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Status view state
  const [statusData, setStatusData] = useState<ApplicationPublicStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Form inputs
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('Ireland');
  const [currentWebsite, setCurrentWebsite] = useState('');
  const [needs, setNeeds] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  // Source & Referral params
  const [sourceParam] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('source') || 'Website';
    }
    return 'Website';
  });

  const [referralParam] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || null;
    }
    return null;
  });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    token: string;
    referenceCode: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load public application settings
  useEffect(() => {
    let mounted = true;
    getApplicationSettings()
      .then((s) => {
        if (mounted) {
          setSettings(s);
          setLoadingSettings(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingSettings(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load status if token present
  useEffect(() => {
    if (!tokenFromUrl) return;
    let mounted = true;
    setLoadingStatus(true);
    setStatusError(null);
    getApplicationByToken(tokenFromUrl)
      .then((res) => {
        if (mounted) {
          if (res) {
            setStatusData(res);
          } else {
            setStatusError('Application not found. Please check your reference link.');
          }
          setLoadingStatus(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setStatusError('Unable to load application status. Please try again.');
          setLoadingStatus(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [tokenFromUrl]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side validations
    const cleanBusiness = businessName.trim();
    const cleanContact = contactName.trim();
    const cleanEmail = email.trim();
    const cleanNiche = niche.trim();
    const cleanWebsite = currentWebsite.trim();

    if (!cleanBusiness) {
      setFormError('Please enter your practice or business name.');
      return;
    }
    if (!cleanContact) {
      setFormError('Please enter your full contact name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!cleanNiche) {
      setFormError('Please specify your specialty or industry niche.');
      return;
    }
    if (cleanWebsite && !cleanWebsite.startsWith('https://')) {
      setFormError('Current website must begin with https://');
      return;
    }
    if (!consent) {
      setFormError(
        'You must agree that Open Hours may use these details to contact you about your application.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitPublicApplication({
        businessName: cleanBusiness,
        contactName: cleanContact,
        email: cleanEmail,
        phone: phone.trim() || undefined,
        niche: cleanNiche,
        country: country.trim() || undefined,
        currentWebsite: cleanWebsite || undefined,
        needs: needs.trim() || undefined,
        source: sourceParam,
        referralCode: referralParam || undefined,
        honeypot: honeypot.trim() || undefined,
      });

      setSubmittedData(res);
      // Update browser URL without reload if history is supported
      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState({}, '', `/apply/status/${res.token}`);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyStatusLink = () => {
    if (!submittedData && !tokenFromUrl) return;
    const token = submittedData?.token || tokenFromUrl;
    const fullUrl = `${window.location.origin}/apply/status/${token}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleViewStatus = () => {
    if (submittedData?.token) {
      setTokenFromUrl(submittedData.token);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between selection:bg-[#FCE9ED] selection:text-[#D92D50]">
      {/* Top Test Mode Banner */}
      <div className="w-full bg-[#FFF4E5] border-b border-[#FEE4C2] px-4 py-2.5 text-center text-xs font-medium text-[#B54708]">
        <span>Test mode: submissions are stored on this device only.</span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-2xl mx-auto px-4 py-10 sm:py-14 flex-1 flex flex-col justify-center">
        {/* Header / Brand Wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D92D50] text-white flex items-center justify-center shadow-xs">
              <LogoMark size={22} className="text-white" />
            </div>
            <span className="text-[22px] font-bold text-[#101828] tracking-tight">
              Open Hours
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#101828] tracking-tight">
            Client Intake Application
          </h1>
          <p className="text-[14px] text-[#475467] max-w-md mx-auto mt-2 leading-relaxed">
            {settings.introText}
          </p>
        </div>

        {/* CONDITION 1: Applications are closed */}
        {!loadingSettings && !settings.formEnabled && !tokenFromUrl && (
          <div className="bg-white rounded-[20px] p-8 sm:p-10 border border-[#ECEEF2] text-center shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center mx-auto">
              <Clock size={22} />
            </div>
            <h2 className="text-[18px] font-bold text-[#101828]">Applications are closed</h2>
            <p className="text-[14px] text-[#667085] max-w-md mx-auto leading-relaxed">
              We are currently at capacity for new website delivery cycles. Please check
              back later or contact our team directly for private reservations.
            </p>
          </div>
        )}

        {/* CONDITION 2: STATUS VIEW (/apply/status/<token>) */}
        {tokenFromUrl && (
          <div className="bg-white rounded-[20px] p-6 sm:p-8 border border-[#ECEEF2] shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#F2F4F7]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                  Application Status
                </span>
                <h2 className="text-[18px] font-bold text-[#101828] mt-0.5">
                  {statusData?.referenceCode || 'Checking status...'}
                </h2>
              </div>
              {statusData && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    statusData.status === 'Approved'
                      ? 'bg-[#E7F8EF] text-[#099250] border border-[#A6F4C5]'
                      : statusData.status === 'Under review'
                      ? 'bg-[#FFF4E5] text-[#B54708] border border-[#FEE4C2]'
                      : statusData.status === 'Not accepted'
                      ? 'bg-[#F2F4F7] text-[#475467] border border-[#EAECF0]'
                      : 'bg-[#F0F9FF] text-[#026AA2] border border-[#B9E6FE]'
                  }`}
                >
                  {statusData.status}
                </span>
              )}
            </div>

            {loadingStatus ? (
              <div className="py-8 text-center text-[14px] text-[#667085]">
                Retrieving your application record...
              </div>
            ) : statusError ? (
              <div className="p-4 bg-[#FEECEB] border border-[#FECDCA] rounded-[14px] text-xs text-[#D92D50] flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{statusError}</span>
              </div>
            ) : statusData ? (
              <div className="space-y-5">
                <div className="p-4 bg-[#FAFBFD] rounded-[14px] border border-[#ECEEF2] space-y-2">
                  <div className="text-xs text-[#667085] font-medium">Status Update</div>
                  <p className="text-[14px] text-[#101828] leading-relaxed font-medium">
                    {statusData.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#667085] block">Reference Number</span>
                    <span className="font-semibold text-[#101828] text-[13px]">
                      {statusData.referenceCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Submitted Date</span>
                    <span className="font-semibold text-[#101828] text-[13px]">
                      {statusData.submittedDate}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F2F4F7] flex items-center justify-between flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCopyStatusLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {copiedLink ? <Check size={14} className="text-[#099250]" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Status Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTokenFromUrl(null);
                      setSubmittedData(null);
                      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
                        window.history.pushState({}, '', '/apply');
                      }
                    }}
                    className="text-xs font-semibold text-[#D92D50] hover:text-[#B82340] cursor-pointer"
                  >
                    Submit another application
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* CONDITION 3: SUBMITTED SUCCESS VIEW */}
        {!tokenFromUrl && submittedData && (
          <div className="bg-white rounded-[20px] p-6 sm:p-8 border border-[#ECEEF2] shadow-xs text-center space-y-5 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-[#E7F8EF] text-[#099250] flex items-center justify-center mx-auto border border-[#A6F4C5]">
              <CheckCircle2 size={28} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[20px] font-bold text-[#101828]">
                Application Successfully Submitted
              </h2>
              <p className="text-[14px] text-[#475467] max-w-md mx-auto leading-relaxed">
                {settings.confirmationText}
              </p>
            </div>

            {/* Reference Badge */}
            <div className="inline-block p-4 bg-[#FAFBFD] rounded-[16px] border border-[#ECEEF2] my-2">
              <span className="text-[11.5px] uppercase tracking-wider font-semibold text-[#667085] block mb-1">
                Your Reference Code
              </span>
              <span className="text-[20px] font-bold text-[#101828] tracking-tight">
                {submittedData.referenceCode}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleViewStatus}
                className="w-full sm:w-auto px-5 py-2.5 rounded-[12px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[13px] font-semibold cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[36px]"
              >
                <span>View Status Page</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleCopyStatusLink}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[12px] bg-white border border-[#D0D5DD] hover:bg-[#F9FAFB] text-[#344054] text-[13px] font-semibold cursor-pointer shadow-2xs transition-colors flex items-center justify-center gap-2 min-h-[36px]"
              >
                {copiedLink ? <Check size={14} className="text-[#099250]" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Status Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* CONDITION 4: APPLICATION FORM */}
        {!tokenFromUrl && !submittedData && settings.formEnabled && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[20px] p-6 sm:p-8 border border-[#ECEEF2] shadow-xs space-y-5"
          >
            {/* Error banner */}
            {formError && (
              <div className="p-3.5 bg-[#FEECEB] border border-[#FECDCA] rounded-[14px] text-xs text-[#D92D50] flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* Hidden Honeypot Field for anti-spam bots */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website_check_trap">Leave this blank</label>
              <input
                id="website_check_trap"
                type="text"
                name="website_check_trap"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Fixed Package Badge */}
            <div className="p-3 bg-[#FAFBFD] rounded-[14px] border border-[#ECEEF2] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block">
                  Selected Package
                </span>
                <span className="text-[13.5px] font-bold text-[#101828]">
                  One-page website
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E7F8EF] text-[#099250] border border-[#A6F4C5]">
                Fixed tier
              </span>
            </div>

            {/* Row 1: Business Name & Contact Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Practice / Business Name <span className="text-[#D92D50]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Merrion Dental Studio"
                    className="w-full h-10 px-3 pl-9 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                  <Building size={15} className="absolute left-3 top-3 text-[#98A2B3]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Contact Person Name <span className="text-[#D92D50]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Dr. Eoin Gallagher"
                  className="w-full h-10 px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Email Address <span className="text-[#D92D50]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    maxLength={100}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@example.com"
                    className="w-full h-10 px-3 pl-9 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                  <Mail size={15} className="absolute left-3 top-3 text-[#98A2B3]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +353 1 289 4412"
                    className="w-full h-10 px-3 pl-9 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                  <Phone size={15} className="absolute left-3 top-3 text-[#98A2B3]" />
                </div>
              </div>
            </div>

            {/* Row 3: Niche & Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Industry / Specialty Niche <span className="text-[#D92D50]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Dental, Physiotherapy, Aesthetics"
                    className="w-full h-10 px-3 pl-9 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                  <Tag size={15} className="absolute left-3 top-3 text-[#98A2B3]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Country
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Ireland, Malta"
                  className="w-full h-10 px-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>
            </div>

            {/* Current Website */}
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Current Website (Optional)
              </label>
              <div className="relative">
                <input
                  type="url"
                  maxLength={200}
                  value={currentWebsite}
                  onChange={(e) => setCurrentWebsite(e.target.value)}
                  placeholder="https://example.com (must begin with https://)"
                  className="w-full h-10 px-3 pl-9 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
                <Globe size={15} className="absolute left-3 top-3 text-[#98A2B3]" />
              </div>
            </div>

            {/* Needs textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#344054]">
                  What you need
                </label>
                <span className="text-[11px] text-[#98A2B3]">{needs.length}/1000</span>
              </div>
              <textarea
                rows={4}
                maxLength={1000}
                value={needs}
                onChange={(e) => setNeeds(e.target.value)}
                placeholder="Tell us about your business, your target clients, or specific features you need on your website..."
                className="w-full p-3 rounded-[10px] border border-[#D0D5DD] bg-white text-[13px] text-[#101828] focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-[#D0D5DD] text-[#D92D50] focus:ring-[#D92D50]"
                />
                <span className="text-xs text-[#475467] leading-relaxed">
                  I agree that Open Hours may use these details to contact me about my
                  application.{' '}
                  {settings.privacyUrl && (
                    <a
                      href={settings.privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D92D50] hover:underline"
                    >
                      Privacy Notice
                    </a>
                  )}
                </span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-[12px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[14px] font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Submitting Application...</span>
                ) : (
                  <>
                    <span>Submit Application</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-[#98A2B3] border-t border-[#ECEEF2]">
        <span>© {new Date().getFullYear()} Open Hours. All rights reserved.</span>
      </footer>
    </div>
  );
};
