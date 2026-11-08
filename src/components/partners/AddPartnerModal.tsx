import React, { useState, useEffect } from 'react';
import {
  X,
  Handshake,
  ShieldCheck,
  Lock,
  Globe,
  FileText,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import {
  DealModel,
  DealAppliesTo,
  DealCurrency,
  PartnerPortalType,
  PartnerStage,
} from '../../types/index.ts';
import { createPartner, getPartnerTypes, createUserCredential } from '../../data/repo.ts';
import { hashPassword } from '../../lib/authCrypto.ts';
import { LoginSection } from '../auth/LoginSection.tsx';
import { GeneratedCredentialModal } from '../auth/GeneratedCredentialModal.tsx';

interface AddPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPartnerCreated: () => void;
}

export const AddPartnerModal: React.FC<AddPartnerModalProps> = ({
  isOpen,
  onClose,
  onPartnerCreated,
}) => {
  // Basic Fields
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [type, setType] = useState('GDPR consultant');
  const [country, setCountry] = useState('Ireland');
  const [city, setCity] = useState('Dublin');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [existingTypes, setExistingTypes] = useState<string[]>([]);

  // DEAL section fields
  const [dealSummary, setDealSummary] = useState('');
  const [dealModel, setDealModel] = useState<DealModel>('Revenue share % per client');
  const [sharePercentage, setSharePercentage] = useState('10');
  const [fixedAmount, setFixedAmount] = useState('250');
  const [appliesTo, setAppliesTo] = useState<DealAppliesTo>('Monthly fees');
  const [currency, setCurrency] = useState<DealCurrency>('EUR');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [documentLink, setDocumentLink] = useState('');

  // PORTAL SELECTOR
  const [portalType, setPortalType] = useState<PartnerPortalType>('No portal');
  const [brandedLogoUrl, setBrandedLogoUrl] = useState('');
  const [brandedName, setBrandedName] = useState('');
  const [brandedColor, setBrandedColor] = useState('#D92D50');

  // DATA VISIBILITY
  const [visibilityEnabled, setVisibilityEnabled] = useState(false);
  const [visBusinessName, setVisBusinessName] = useState(true);
  const [visProjectStage, setVisProjectStage] = useState(true);
  const [visMonthlyReport, setVisMonthlyReport] = useState(true);
  const [visContactName, setVisContactName] = useState(false);

  // CREDENTIALS & INVITE
  const [portalLoginEmail, setPortalLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createdCredModal, setCreatedCredModal] = useState<{
    loginId: string;
    plaintext: string;
    name: string;
  } | null>(null);
  const [inviteDispatched, setInviteDispatched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getPartnerTypes().then((types) => setExistingTypes(types));
    }
  }, [isOpen]);

  // Keep portal login email synced to contact email if not customized
  useEffect(() => {
    if (!portalLoginEmail && email) {
      setPortalLoginEmail(email);
    }
  }, [email, portalLoginEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organisation.trim()) return;

    try {
      setIsSubmitting(true);
      const contactChannels = [];
      if (email.trim()) contactChannels.push({ type: 'Email', value: email.trim() });
      if (phone.trim()) contactChannels.push({ type: 'Phone', value: phone.trim() });

      const parsedPct = parseFloat(sharePercentage) || 10;
      const parsedFixed = parseFloat(fixedAmount) || 250;

      const createdPartner = await createPartner({
        name: name.trim(),
        organisation: organisation.trim(),
        type: type.trim() || 'Other',
        country: country.trim() || 'Ireland',
        city: city.trim() || 'Dublin',
        email: email.trim(),
        contactChannels,
        stage: 'Identified',
        notes: notes.trim(),
        owner: 'Founder',
        isDemo: true,
        dealTerms: {
          dealSummary:
            dealSummary.trim() ||
            (dealModel === 'Fixed fee per client'
              ? `€${parsedFixed} fixed fee per referred client`
              : `${parsedPct}% revenue share on ${appliesTo.toLowerCase()}`),
          dealModel,
          sharePercentage: parsedPct,
          fixedAmount: parsedFixed,
          appliesTo,
          cashBasis: true, // share applies on payments RECEIVED (cash basis)
          currency,
          startDate: startDate || new Date().toISOString().split('T')[0],
          endDate: endDate ? endDate : undefined,
          documentLink: documentLink.trim() ? documentLink.trim() : undefined,
        },
        portalType,
        portalBranding:
          portalType === 'Branded partner portal (partner logo, name, colours)'
            ? {
                logoUrl: brandedLogoUrl.trim() || undefined,
                brandName: brandedName.trim() || organisation.trim(),
                primaryColor: brandedColor || '#D92D50',
              }
            : undefined,
        clientVisibility: {
          enabled: visibilityEnabled,
          businessName: visBusinessName,
          projectStage: visProjectStage,
          monthlyReportSummary: visMonthlyReport,
          contactName: visContactName,
        },
        portalLoginEmail: (portalLoginEmail || email).trim() || undefined,
      });

      // If portal password provided, hash with PBKDF2 Web Crypto and create credentials
      if (password.trim()) {
        const activeLoginId = (portalLoginEmail || email).trim();
        const { hashHex, saltHex, iterations } = await hashPassword(password.trim());
        await createUserCredential({
          loginId: activeLoginId,
          passwordHashHex: hashHex,
          saltHex,
          iterations,
          role: 'Partner',
          targetEntityId: createdPartner.id,
          targetEntityName: createdPartner.name,
          mustChangeOnFirstLogin: true,
        });

        setCreatedCredModal({
          loginId: activeLoginId,
          plaintext: password.trim(),
          name: createdPartner.name,
        });
        return;
      }

      onPartnerCreated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-black/10 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center">
              <Handshake size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">
                Add Strategic Partner
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Register a B2B referral source with cash-basis deal economics and portal visibility.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A8A5A5] hover:text-[#111111] p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6 pt-5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="space-y-3.5">
            <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
              <Globe size={14} className="text-[#D92D50]" />
              <span>1. Partner Profile & Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Business / Organisation Name *
                </label>
                <input
                  type="text"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder="e.g. Dublin Dental Advisory Group"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Primary Contact Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Liam Byrne"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Partner Type: Free text input with suggestions via datalist */}
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Partner Type (Free text) *
                </label>
                <input
                  type="text"
                  list="partner-types-datalist"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Type or select type..."
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                  required
                />
                <datalist id="partner-types-datalist">
                  {existingTypes.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <span className="text-[10px] text-[#A8A5A5] mt-0.5 block">
                  Free text input (suggestions from historical types)
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="liam@advisory.ie"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Ireland / Malta / UK"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Dublin / Valletta"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+353 1 280 4421"
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Partner Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Introductions network, client profile sweet spot, or background..."
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
              />
            </div>
          </div>

          {/* SECTION 2: DEAL TERMS */}
          <div className="space-y-3.5 pt-4 border-t border-black/5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={14} className="text-[#D92D50]" />
                <span>2. Deal Terms (Cash Basis Single Source of Truth)</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Cash Basis: On Payments Received
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Deal Summary (Free text, what we agreed) *
              </label>
              <input
                type="text"
                value={dealSummary}
                onChange={(e) => setDealSummary(e.target.value)}
                placeholder="e.g. 10% recurring share on monthly care retainers for private practice introductions"
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-[#D92D50]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Deal Model</label>
                <select
                  value={dealModel}
                  onChange={(e) => setDealModel(e.target.value as DealModel)}
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F8F7F7] focus:outline-none"
                >
                  <option value="Revenue share % per client">Revenue share % per client</option>
                  <option value="Fixed fee per client">Fixed fee per client</option>
                  <option value="One-time referral fee">One-time referral fee</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {dealModel.includes('%') || dealModel === 'Custom' ? (
                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">Share % (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={sharePercentage}
                    onChange={(e) => setSharePercentage(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">Fixed Fee Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Applies To</label>
                <select
                  value={appliesTo}
                  onChange={(e) => setAppliesTo(e.target.value as DealAppliesTo)}
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F8F7F7] focus:outline-none"
                >
                  <option value="Setup fees">Setup fees</option>
                  <option value="Monthly fees">Monthly fees</option>
                  <option value="Both">Both</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as DealCurrency)}
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F8F7F7] focus:outline-none"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="BDT">BDT (৳)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Document Link (Optional URL)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={documentLink}
                  onChange={(e) => setDocumentLink(e.target.value)}
                  placeholder="https://docs.google.com/... or agreement URL"
                  className="w-full text-xs p-2.5 pl-8 rounded-xl border border-black/10 focus:outline-none"
                />
                <LinkIcon size={13} className="absolute left-2.5 top-3 text-[#A8A5A5]" />
              </div>
              <span className="text-[10px] text-[#A8A5A5] mt-0.5 block">
                Editing this deal in the future automatically creates immutable deal versions in history.
              </span>
            </div>
          </div>

          {/* SECTION 3: PORTAL SELECTOR */}
          <div className="space-y-3.5 pt-4 border-t border-black/5">
            <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-[#D92D50]" />
              <span>3. Portal Selector</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'No portal' as PartnerPortalType,
                  title: 'No portal',
                  desc: 'Partner has no login access. Managed completely via admin console.',
                },
                {
                  id: 'Standard partner portal (Open Hours branding)' as PartnerPortalType,
                  title: 'Standard partner portal',
                  desc: 'Open Hours branded partner portal for real-time earnings & metrics.',
                },
                {
                  id: 'Branded partner portal (partner logo, name, colours)' as PartnerPortalType,
                  title: 'Branded partner portal',
                  desc: 'White-labeled partner portal with custom logo, name, and accent colours.',
                },
              ].map((opt) => {
                const isSelected = portalType === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#111111] bg-[#111111] text-white shadow-xs'
                        : 'border-black/10 bg-white hover:border-black/20 text-[#111111]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold">{opt.title}</span>
                      <input
                        type="radio"
                        name="portalSelector"
                        checked={isSelected}
                        onChange={() => setPortalType(opt.id)}
                        className="mt-0.5 accent-[#D92D50]"
                      />
                    </div>
                    <p
                      className={`text-[11px] mt-2 leading-relaxed ${
                        isSelected ? 'text-white/80' : 'text-[#6B6B6B]'
                      }`}
                    >
                      {opt.desc}
                    </p>
                  </label>
                );
              })}
            </div>

            {/* Branded partner portal fields */}
            {portalType === 'Branded partner portal (partner logo, name, colours)' && (
              <div className="p-4 bg-[#F8F7F7] rounded-2xl border border-black/5 space-y-3 animate-in fade-in duration-150">
                <span className="text-xs font-bold text-[#111111] block">Custom Branding Setup</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={brandedName}
                      onChange={(e) => setBrandedName(e.target.value)}
                      placeholder={organisation || 'Partner Brand'}
                      className="w-full text-xs p-2 rounded-lg border border-black/10 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={brandedLogoUrl}
                      onChange={(e) => setBrandedLogoUrl(e.target.value)}
                      placeholder="https://partner.com/logo.png"
                      className="w-full text-xs p-2 rounded-lg border border-black/10 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                      Primary Colour
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandedColor}
                        onChange={(e) => setBrandedColor(e.target.value)}
                        className="w-8 h-8 rounded border border-black/10 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brandedColor}
                        onChange={(e) => setBrandedColor(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-black/10 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: CREDENTIALS & ACCESS */}
          <div className="pt-4 border-t border-black/5 animate-in fade-in duration-150">
            <LoginSection
              loginId={portalLoginEmail || email}
              onLoginIdChange={setPortalLoginEmail}
              password={password}
              onPasswordChange={setPassword}
              loginIdLabel="Partner Portal Login ID (Email or Username)"
              loginIdPlaceholder={email || 'partner@agency.ie'}
              helpText="Partner will use this login ID to access their partner portal (Home, Clients, Earnings, Add Client)."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Partner...' : 'Create Strategic Partner'}
            </button>
          </div>
        </form>
      </div>

      {createdCredModal && (
        <GeneratedCredentialModal
          isOpen={true}
          onClose={() => {
            setCreatedCredModal(null);
            onPartnerCreated();
            onClose();
          }}
          loginId={createdCredModal.loginId}
          plaintextPassword={createdCredModal.plaintext}
          roleLabel="Partner Portal Access"
          entityName={createdCredModal.name}
        />
      )}
    </div>
  );
};
