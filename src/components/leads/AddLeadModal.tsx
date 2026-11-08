import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Building, Plus, Sliders } from 'lucide-react';
import { ChannelType, LeadCustomFieldDefinition, CustomFieldType, ClinicSpecialty } from '../../types/index.ts';
import {
  createLead,
  getLeadCustomFieldDefinitions,
  saveLeadCustomFieldDefinition,
} from '../../data/repo.ts';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
}

const COMMON_COUNTRIES = [
  'Ireland',
  'Malta',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Spain',
  'Italy',
];

const COMMON_CITIES = [
  'Dublin',
  'Cork',
  'Galway',
  'Limerick',
  'Waterford',
  'Valletta',
  'Sliema',
  'St. Julian\'s',
  'Birkirkara',
  'London',
  'Manchester',
  'Edinburgh',
  'Belfast',
];

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onLeadCreated,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [niche, setNiche] = useState('Professional Services');
  const [country, setCountry] = useState('Ireland');
  const [city, setCity] = useState('Dublin');
  const [ownerName, setOwnerName] = useState('');
  const [ownerRole, setOwnerRole] = useState('Business Owner');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteState, setWebsiteState] = useState<'none' | 'facebook-only' | 'basic' | 'good'>('basic');
  const [googleRating, setGoogleRating] = useState<number>(4.8);
  const [googleReviewCount, setGoogleReviewCount] = useState<number>(18);
  const [source, setSource] = useState<'Google Maps' | 'LinkedIn' | 'Facebook' | 'Referral' | 'Partner' | 'Other'>('Google Maps');
  const [assignedTo, setAssignedTo] = useState('Founder');

  // Custom fields
  const [customFieldDefs, setCustomFieldDefs] = useState<LeadCustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Quick field add modal
  const [isQuickAddFieldOpen, setIsQuickAddFieldOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomFields();
    }
  }, [isOpen]);

  const loadCustomFields = async () => {
    try {
      const defs = await getLeadCustomFieldDefinitions();
      setCustomFieldDefs(defs.filter((d) => !d.archived));
    } catch {
      // Non-blocking
    }
  };

  if (!isOpen) return null;

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuickAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;

    const slug = newFieldKey.trim() || newFieldLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    try {
      await saveLeadCustomFieldDefinition({
        label: newFieldLabel.trim(),
        key: slug,
        type: newFieldType,
        required: false,
        showInList: false,
        searchable: true,
      });
      setNewFieldLabel('');
      setNewFieldKey('');
      setNewFieldType('text');
      setIsQuickAddFieldOpen(false);
      await loadCustomFields();
    } catch (err: any) {
      setError(err?.message || 'Failed to add custom field.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!businessName.trim() || !city.trim() || !ownerName.trim()) {
      setError('Please provide business name, city, and decision maker name.');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setError('Please provide at least one business contact channel (email or phone).');
      return;
    }

    // Check required custom fields
    for (const def of customFieldDefs) {
      if (def.required && !customFieldValues[def.key]) {
        setError(`Please fill in required custom field "${def.label}".`);
        return;
      }
    }

    setSubmitting(true);

    const channels = [];
    if (email.trim()) {
      channels.push({
        id: `ch_email_${Date.now()}`,
        type: 'Email' as ChannelType,
        value: email.trim(),
        status: 'Not contacted' as const,
      });
    }
    if (phone.trim()) {
      channels.push({
        id: `ch_phone_${Date.now()}`,
        type: 'Phone' as ChannelType,
        value: phone.trim(),
        status: 'Not contacted' as const,
      });
    }
    if (websiteUrl.trim()) {
      channels.push({
        id: `ch_web_${Date.now()}`,
        type: 'Website' as ChannelType,
        value: websiteUrl.trim(),
        status: 'Not contacted' as const,
      });
    }

    const res = await createLead({
      businessName: businessName.trim(),
      specialty: niche.trim() as ClinicSpecialty,
      niche: niche.trim(),
      country: country.trim(),
      city: city.trim(),
      ownerName: ownerName.trim(),
      ownerRole: ownerRole.trim(),
      hasWebsite: websiteState,
      googleRating: Number(googleRating) || 5.0,
      googleReviewCount: Number(googleReviewCount) || 0,
      source,
      assignedTo,
      channels,
      stage: 'New Lead',
      customFields: customFieldValues,
    });

    setSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Failed to create lead.');
      return;
    }

    onLeadCreated();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-lead-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-black/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Datalists for autocomplete while supporting free text */}
        <datalist id="country-datalist">
          {COMMON_COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="city-datalist">
          {COMMON_CITIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center">
              <Building size={16} />
            </div>
            <h3 id="add-lead-title" className="text-lg font-bold text-[#111111]">
              Add New Lead
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A8A5A5] hover:text-[#111111] p-1 rounded-full cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[#FCE9ED] border border-[#D92D50]/20 rounded-xl text-xs text-[#D92D50] font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Business Name <span className="text-[#D92D50]">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Phoenix Advisory Group"
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Industry / Niche</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Financial Advisory, Legal, Design"
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Country (Free text)</label>
              <input
                type="text"
                list="country-datalist"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ireland, Malta, UK..."
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                City / Region <span className="text-[#D92D50]">*</span>
              </label>
              <input
                type="text"
                list="city-datalist"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dublin, Sliema, Galway..."
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Website State</label>
              <select
                value={websiteState}
                onChange={(e) => setWebsiteState(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
              >
                <option value="none">None</option>
                <option value="facebook-only">Social profile only</option>
                <option value="basic">Basic / Outdated</option>
                <option value="good">Modern & Responsive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Decision Maker / Owner <span className="text-[#D92D50]">*</span>
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Aidan Byrne"
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Role / Title</label>
              <input
                type="text"
                value={ownerRole}
                onChange={(e) => setOwnerRole(e.target.value)}
                placeholder="Managing Director / Owner"
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Business Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@phoenixadvisory.ie"
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Business Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+353 1 234 5678"
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">Website URL (Optional)</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none"
            />
          </div>

          {/* Reviews & Ratings */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#F8F7F7] border border-black/5">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Google Rating (1.0–5.0)</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={googleRating}
                onChange={(e) => setGoogleRating(parseFloat(e.target.value) || 5.0)}
                className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Review Count</label>
              <input
                type="number"
                min="0"
                value={googleReviewCount}
                onChange={(e) => setGoogleReviewCount(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Discovery Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
              >
                <option value="Google Maps">Google Maps</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Facebook">Facebook</option>
                <option value="Referral">Referral</option>
                <option value="Partner">Partner</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Assigned Specialist</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
              >
                <option value="Founder">Founder</option>
                <option value="Sarah M.">Sarah M.</option>
                <option value="Liam O.">Liam O.</option>
              </select>
            </div>
          </div>

          {/* Custom Fields Section */}
          <div className="p-4 rounded-2xl bg-[#FAF9F9] border border-black/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders size={13} className="text-[#D92D50]" />
                <span className="text-xs font-bold text-[#111111]">Custom Fields</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddFieldOpen(true)}
                className="text-[11px] font-bold text-[#D92D50] hover:underline cursor-pointer"
              >
                + Add field definition
              </button>
            </div>

            {customFieldDefs.length === 0 ? (
              <p className="text-[11px] text-[#A8A5A5]">
                No custom fields defined yet. Click &ldquo;+ Add field definition&rdquo; to add one.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customFieldDefs.map((def) => {
                  const val = customFieldValues[def.key] ?? '';

                  return (
                    <div key={def.id} className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#111111] block truncate">
                        {def.label} {def.required && <span className="text-[#D92D50]">*</span>}
                      </label>

                      {def.type === 'single select' ? (
                        <select
                          value={val}
                          onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white"
                        >
                          <option value="">Select option...</option>
                          {(def.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : def.type === 'yes/no' ? (
                        <select
                          value={val === true ? 'yes' : val === false ? 'no' : ''}
                          onChange={(e) => handleCustomFieldChange(def.key, e.target.value === 'yes')}
                          className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white"
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      ) : def.type === 'number' ? (
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => handleCustomFieldChange(def.key, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white focus:outline-none"
                        />
                      ) : def.type === 'date' ? (
                        <input
                          type="date"
                          value={val}
                          onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white focus:outline-none"
                        />
                      ) : def.type === 'url' ? (
                        <input
                          type="url"
                          value={val}
                          onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
                          placeholder="https://..."
                          className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white focus:outline-none"
                        />
                      ) : def.type === 'long text' ? (
                        <textarea
                          rows={2}
                          value={val}
                          onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
                          placeholder="Notes..."
                          className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleCustomFieldChange(def.key, e.target.value)}
                          placeholder={`Enter ${def.label}...`}
                          className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Add Field Mini Modal */}
          {isQuickAddFieldOpen && (
            <div className="p-3.5 bg-white border border-[#D92D50]/20 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111]">Quick Add Custom Field</span>
                <button
                  type="button"
                  onClick={() => setIsQuickAddFieldOpen(false)}
                  className="text-gray-400 hover:text-black text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="Field label..."
                  className="text-xs p-2 rounded-xl border border-black/10"
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                  className="text-xs p-2 rounded-xl border border-black/10 bg-white"
                >
                  <option value="text">Short Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="url">URL</option>
                  <option value="yes/no">Yes/No</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddFieldOpen(false)}
                  className="px-3 py-1 text-xs text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddField}
                  className="px-3 py-1 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold"
                >
                  Save Definition
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Creating...' : '+ Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
