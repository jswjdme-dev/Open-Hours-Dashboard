import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  X,
  Building,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
  FileText,
  Video,
  ArrowRight,
} from 'lucide-react';
import { Lead, Client, ClientPackage, ClinicSpecialty } from '../../types/index.ts';
import { convertToClient } from '../../data/repo.ts';

interface ConvertToClientModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConverted?: (newClient: Client) => void;
}

export const ConvertToClientModal: React.FC<ConvertToClientModalProps> = ({
  isOpen,
  lead,
  onClose,
  onConverted,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerRole, setOwnerRole] = useState('Principal');
  const [specialty, setSpecialty] = useState<ClinicSpecialty>('Dental');
  const [country, setCountry] = useState<string>('Ireland');
  const [city, setCity] = useState('');
  const [pkg, setPkg] = useState<ClientPackage>('Regular');
  const [monthlyFee, setMonthlyFee] = useState(1200);
  const [setupFee, setSetupFee] = useState(2500);
  const [accountManager, setAccountManager] = useState('founder');
  const [launchDays, setLaunchDays] = useState(42);
  const [createRequests, setCreateRequests] = useState(true);
  const [createMeeting, setCreateMeeting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      setBusinessName(lead.businessName);
      setOwnerName(lead.ownerName);
      setOwnerRole(lead.ownerRole || 'Practice Owner');
      setSpecialty(lead.specialty);
      setCountry(lead.country);
      setCity(lead.city);
      setAccountManager(lead.assignedTo === 'Sarah M.' ? 'sarah' : lead.assignedTo === 'Liam O.' ? 'liam' : 'founder');

      // Default packages by specialty or score
      if (lead.score.band === 'HOT') {
        setPkg('Advanced');
        setMonthlyFee(1800);
        setSetupFee(3500);
      } else {
        setPkg('Regular');
        setMonthlyFee(1200);
        setSetupFee(2500);
      }
    }
  }, [lead]);

  const handlePackageChange = (selectedPkg: ClientPackage) => {
    setPkg(selectedPkg);
    if (selectedPkg === 'Regular') {
      setMonthlyFee(1200);
      setSetupFee(2500);
    } else if (selectedPkg === 'Advanced') {
      setMonthlyFee(1800);
      setSetupFee(3500);
    } else if (selectedPkg === 'Premium') {
      setMonthlyFee(2800);
      setSetupFee(5000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setIsSubmitting(true);
    try {
      const client = await convertToClient(lead.id, {
        businessName,
        ownerName,
        ownerRole,
        specialty,
        country,
        city,
        package: pkg,
        monthlyFeeEUR: monthlyFee,
        setupFeeEUR: setupFee,
        accountManagerId: accountManager,
        targetLaunchDays: launchDays,
        createDefaultRequests: createRequests,
        createKickoffMeeting: createMeeting,
      });

      setIsSubmitting(false);
      onClose();
      if (onConverted) {
        onConverted(client);
      }
    } catch (err) {
      console.error('Failed to convert client:', err);
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-black/10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 id="convert-modal-title" className="text-lg font-bold text-[#111111]">
                Convert to Active Client
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Initializes dedicated client workspace, delivery stages, and onboarding tasks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] hover:border-black/30 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Clinic Details */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A8A5A5]">
              1. Clinic Identity & Location
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Business / Practice Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Primary Specialty
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as ClinicSpecialty)}
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50] cursor-pointer"
                >
                  {(['Dental', 'Physio', 'Chiropractic', 'Aesthetics', 'Private clinic', 'Other'] as ClinicSpecialty[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Decision Maker Name
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Location (City & Country)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-1/2 p-2.5 text-xs font-semibold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50]"
                  />
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value as any)}
                    className="w-1/2 p-2.5 text-xs font-semibold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50] cursor-pointer"
                  >
                    <option value="Ireland">Ireland</option>
                    <option value="Malta">Malta</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Package Selection */}
          <div className="space-y-3 pt-2 border-t border-black/5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A8A5A5]">
              2. Retainer Package & Fees
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { key: 'Regular', name: 'Regular', mrr: 1200, setup: 2500, desc: 'Web + Local SEO' },
                { key: 'Advanced', name: 'Advanced', mrr: 1800, setup: 3500, desc: 'Web + SEO + Ads' },
                { key: 'Premium', name: 'Premium', mrr: 2800, setup: 5000, desc: 'Full Growth Engine' },
              ].map((p) => {
                const isSelected = pkg === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handlePackageChange(p.key as ClientPackage)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#D92D50] bg-[#FCE9ED]/40 shadow-xs ring-1 ring-[#D92D50]'
                        : 'border-black/10 hover:border-black/25 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#111111]">{p.name}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-[#D92D50]" />}
                    </div>
                    <div className="text-[13px] font-bold text-[#D92D50] tabular-nums">
                      €{p.mrr}
                      <span className="text-[10px] text-[#6B6B6B] font-normal">/mo</span>
                    </div>
                    <div className="text-[10px] text-[#A8A5A5] mt-0.5">€{p.setup} setup</div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Monthly Retainer Fee (€ EUR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Setup & Build Fee (€ EUR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={setupFee}
                  onChange={(e) => setSetupFee(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 text-xs font-bold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50]"
                />
              </div>
            </div>
          </div>

          {/* Delivery & Operations */}
          <div className="space-y-3 pt-2 border-t border-black/5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#A8A5A5]">
              3. Operational Onboarding
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Assigned Account Lead
                </label>
                <select
                  value={accountManager}
                  onChange={(e) => setAccountManager(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50] cursor-pointer"
                >
                  <option value="founder">Founder (Head of Strategy)</option>
                  <option value="sarah">Sarah M. (Account Lead)</option>
                  <option value="liam">Liam O. (SEO & Operations)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Target Launch Schedule
                </label>
                <select
                  value={launchDays}
                  onChange={(e) => setLaunchDays(parseInt(e.target.value) || 42)}
                  className="w-full p-2.5 text-xs font-semibold rounded-xl border border-black/10 bg-[#F8F7F7] focus:bg-white focus:outline-none focus:border-[#D92D50] cursor-pointer"
                >
                  <option value="28">Fast Track (4 Weeks / 28 Days)</option>
                  <option value="42">Standard Build (6 Weeks / 42 Days)</option>
                  <option value="60">Comprehensive (8 Weeks / 60 Days)</option>
                </select>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-xs text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={createRequests}
                  onChange={() => setCreateRequests(!createRequests)}
                  className="w-4 h-4 rounded accent-[#D92D50]"
                />
                <span className="font-semibold">
                  Auto-create standard onboarding requests (Logo, GBP access, Team photos)
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={createMeeting}
                  onChange={() => setCreateMeeting(!createMeeting)}
                  className="w-4 h-4 rounded accent-[#D92D50]"
                />
                <span className="font-semibold">
                  Auto-schedule Kickoff Alignment Call for this week
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-black/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#D92D50] hover:bg-[#C42447] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-102 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Converting...' : 'Convert & Initialize Client'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
