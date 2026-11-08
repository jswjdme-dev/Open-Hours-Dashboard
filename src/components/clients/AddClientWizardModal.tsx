import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Mail,
  User,
  Globe,
  Tag,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
  Handshake,
} from 'lucide-react';
import { ClientPackage, ClinicSpecialty, Partner } from '../../types/index.ts';
import { createClientWithPortalWizard, getPartners, createUserCredential } from '../../data/repo.ts';
import { hashPassword } from '../../lib/authCrypto.ts';
import { LoginSection } from '../auth/LoginSection.tsx';
import { GeneratedCredentialModal } from '../auth/GeneratedCredentialModal.tsx';

interface AddClientWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (clientId: string, clientName: string) => void;
}

export const AddClientWizardModal: React.FC<AddClientWizardModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<'Ireland' | 'Malta' | 'Other'>('Ireland');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState<ClinicSpecialty>('Dental');
  const [pkg, setPkg] = useState<ClientPackage>('Regular');
  const [createPortal, setCreatePortal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Source / Partner Attribution
  const [sourceType, setSourceType] = useState<'Direct' | 'Partner'>('Direct');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [partners, setPartners] = useState<Partner[]>([]);

  // Login credentials state
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [createdCredModal, setCreatedCredModal] = useState<{
    loginId: string;
    plaintext: string;
    clientId: string;
    businessName: string;
  } | null>(null);

  useEffect(() => {
    if (email && !loginId) {
      setLoginId(email);
    }
  }, [email]);

  useEffect(() => {
    if (isOpen) {
      getPartners().then((pts) => {
        const active = pts.filter((p) => !p.archivedAt);
        setPartners(active);
        if (active.length > 0) {
          setSelectedPartnerId(active[0].id);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !contactName.trim() || !email.trim()) {
      setError('Please provide practice name, principal contact, and email.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const partnerObj =
        sourceType === 'Partner' ? partners.find((p) => p.id === selectedPartnerId) : null;

      const res = await createClientWithPortalWizard({
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        country,
        city: city.trim() || (country === 'Malta' ? 'Valletta' : 'Dublin'),
        specialty,
        package: pkg,
        createPortal,
        source: partnerObj ? partnerObj.name : 'Direct',
        sourcePartnerId: partnerObj ? partnerObj.id : undefined,
        sourcePartnerName: partnerObj ? partnerObj.name : undefined,
      });

      // If login credentials provided, create user credential record with Web Crypto PBKDF2 hash
      if (password.trim()) {
        const activeLoginId = loginId.trim() || email.trim();
        const { hashHex, saltHex, iterations } = await hashPassword(password.trim());
        await createUserCredential({
          loginId: activeLoginId,
          passwordHashHex: hashHex,
          saltHex,
          iterations,
          role: 'Client',
          targetEntityId: res.client.id,
          targetEntityName: res.client.businessName,
          mustChangeOnFirstLogin: true,
        });

        // Trigger one-time credential modal
        setCreatedCredModal({
          loginId: activeLoginId,
          plaintext: password.trim(),
          clientId: res.client.id,
          businessName: res.client.businessName,
        });
        return;
      }

      onClientCreated(res.client.id, res.client.businessName);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create client practice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-[28px] border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center">
              <Building size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Add New Client Practice</h2>
              <p className="text-xs text-[#6B6B6B]">
                Onboard clinic with automated delivery timeline & onboarding requests
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#6B6B6B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Business & Contact Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Clinic Business Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Grafton Dental Studio"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Principal Contact Name *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Dr. Liam Higgins"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Contact / Portal Login Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. clinic@graftondental.ie"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none"
            />
          </div>

          {/* Country & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Country *</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none bg-white cursor-pointer"
              >
                <option value="Ireland">Ireland</option>
                <option value="Malta">Malta</option>
                <option value="Other">Other EU</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={country === 'Malta' ? 'e.g. Sliema, Valletta' : 'e.g. Dublin, Cork'}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none"
              />
            </div>
          </div>

          {/* Specialty & Package */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Specialty</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none bg-white cursor-pointer"
              >
                <option value="Dental">Dental</option>
                <option value="Physio">Physiotherapy</option>
                <option value="Chiropractic">Chiropractic</option>
                <option value="Aesthetics">Aesthetics</option>
                <option value="Private clinic">Private Clinic</option>
                <option value="Other">Other Specialist</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Package Tier</label>
              <select
                value={pkg}
                onChange={(e) => setPkg(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none bg-white cursor-pointer"
              >
                <option value="Regular">Regular (€1,200/mo)</option>
                <option value="Advanced">Advanced (€1,800/mo)</option>
                <option value="Premium">Premium (€2,800/mo)</option>
              </select>
            </div>
          </div>

          {/* Client Acquisition Source (Direct vs Partner) */}
          <div className="p-3.5 rounded-2xl bg-[#FBFBFB] border border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
                <Handshake size={14} className="text-[#D92D50]" />
                <span>Acquisition Source</span>
              </label>
              <div className="inline-flex p-0.5 rounded-full bg-white border border-black/10">
                <button
                  type="button"
                  onClick={() => setSourceType('Direct')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    sourceType === 'Direct' ? 'bg-[#111111] text-white shadow-2xs' : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                >
                  Direct Client
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('Partner')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    sourceType === 'Partner' ? 'bg-[#D92D50] text-white shadow-2xs' : 'text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                >
                  Partner Referral
                </button>
              </div>
            </div>

            {sourceType === 'Partner' && (
              <div className="pt-1 animate-in fade-in duration-150">
                <label className="block text-[11px] font-semibold text-[#6B6B6B] mb-1">
                  Referred by Strategic Partner:
                </label>
                {partners.length === 0 ? (
                  <p className="text-xs text-[#A8A5A5] italic">No active partners found.</p>
                ) : (
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-black/10 focus:border-[#D92D50] focus:ring-1 focus:ring-[#D92D50] outline-none bg-white cursor-pointer"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.organisation} · {p.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Portal Toggle Card */}
          <div className="p-4 rounded-2xl bg-[#FBFBFB] border border-black/5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#111111]">Create Client Portal</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE9ED] text-[#D92D50]">
                  Default ON
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                Initialises a secured client workspace with the 12-item onboarding checklist
                (Logo, GBP access, doctor bios, DNS, and sign-offs).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={createPortal}
                onChange={(e) => setCreatePortal(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D92D50]" />
            </label>
          </div>

          {/* Login Credentials Section */}
          <LoginSection
            loginId={loginId}
            onLoginIdChange={setLoginId}
            password={password}
            onPasswordChange={setPassword}
            loginIdLabel="Portal Login Email / Username"
            loginIdPlaceholder={email || 'principal@clinic.ie'}
            helpText="Client will use this login to sign into their white-labeled client portal."
          />

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-black/5">
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
              className="px-5 py-2.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Onboarding...</span>
              ) : (
                <>
                  <span>Create Client & Portal</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {createdCredModal && (
        <GeneratedCredentialModal
          isOpen={true}
          onClose={() => {
            const info = createdCredModal;
            setCreatedCredModal(null);
            onClientCreated(info.clientId, info.businessName);
            onClose();
          }}
          loginId={createdCredModal.loginId}
          plaintextPassword={createdCredModal.plaintext}
          roleLabel="Client Portal Access"
          entityName={createdCredModal.businessName}
        />
      )}
    </div>
  );
};
