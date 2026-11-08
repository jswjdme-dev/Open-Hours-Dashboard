import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { PackagesSettings, PackageTierConfig } from '../../types/index.ts';
import {
  getPackagesSettings,
  updatePackagesSettings,
  contentGuardCheck,
} from '../../data/repo.ts';

interface PackagesSettingsManagerProps {
  currentRole: string;
}

export const PackagesSettingsManager: React.FC<PackagesSettingsManagerProps> = ({
  currentRole,
}) => {
  const [settings, setSettings] = useState<PackagesSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Wording guard check for package names & feature lists
  const [wordingWarning, setWordingWarning] = useState<string[]>([]);
  const [wordingConfirmed, setWordingConfirmed] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getPackagesSettings();
      setSettings(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load package settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const runWordingCheckOnSettings = (pkgs: PackageTierConfig[]) => {
    const textBlob = pkgs
      .map((p) => `${p.name} ${p.featureList.join(' ')}`)
      .join(' ');
    const check = contentGuardCheck('Package Settings', textBlob);
    if (check.hasWarning) {
      setWordingWarning(check.flaggedWords);
    } else {
      setWordingWarning([]);
      setWordingConfirmed(false);
    }
  };

  const handleUpdatePackageField = (
    index: number,
    field: keyof PackageTierConfig,
    value: any
  ) => {
    if (!settings) return;
    const updatedPkgs = [...settings.packages];
    updatedPkgs[index] = {
      ...updatedPkgs[index],
      [field]: value,
    };
    setSettings({ ...settings, packages: updatedPkgs });
    runWordingCheckOnSettings(updatedPkgs);
  };

  const handleAddFeature = (pkgIndex: number) => {
    if (!settings) return;
    const updatedPkgs = [...settings.packages];
    const features = [...updatedPkgs[pkgIndex].featureList, 'New feature item'];
    updatedPkgs[pkgIndex] = { ...updatedPkgs[pkgIndex], featureList: features };
    setSettings({ ...settings, packages: updatedPkgs });
  };

  const handleRemoveFeature = (pkgIndex: number, featureIndex: number) => {
    if (!settings) return;
    const updatedPkgs = [...settings.packages];
    const features = updatedPkgs[pkgIndex].featureList.filter((_, idx) => idx !== featureIndex);
    updatedPkgs[pkgIndex] = { ...updatedPkgs[pkgIndex], featureList: features };
    setSettings({ ...settings, packages: updatedPkgs });
    runWordingCheckOnSettings(updatedPkgs);
  };

  const handleFeatureChange = (
    pkgIndex: number,
    featureIndex: number,
    val: string
  ) => {
    if (!settings) return;
    const updatedPkgs = [...settings.packages];
    const features = [...updatedPkgs[pkgIndex].featureList];
    features[featureIndex] = val;
    updatedPkgs[pkgIndex] = { ...updatedPkgs[pkgIndex], featureList: features };
    setSettings({ ...settings, packages: updatedPkgs });
    runWordingCheckOnSettings(updatedPkgs);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // Wording guard validation
    const textBlob = settings.packages
      .map((p) => `${p.name} ${p.featureList.join(' ')}`)
      .join(' ');
    const check = contentGuardCheck('Package Settings', textBlob);
    if (check.hasWarning && !wordingConfirmed) {
      setWordingWarning(check.flaggedWords);
      setErrorMsg('Wording guard notice: Please review flagged terms and check the confirmation box before saving.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updatePackagesSettings(settings, currentRole);
      setSettings(updated);
      setSuccessMsg('Package tiers, starting prices, and feature lists saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save package settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="bg-white rounded-[24px] p-8 border border-black/5 text-center">
        <div className="w-8 h-8 border-2 border-[#D92D50] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-[#6B6B6B] font-semibold">Loading packages configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center font-bold">
                <Package size={18} />
              </span>
              <h2 className="text-base font-bold text-[#111111]">
                Service Packages & Starting Pricing
              </h2>
            </div>
            <p className="text-xs text-[#6B6B6B]">
              Configure standard package names, feature lists, and baseline starting prices. These define the defaults available in Website Studio proposals and partner client intakes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#6B6B6B] bg-[#F8F7F7] px-3 py-1.5 rounded-full border border-black/5">
            <span>Labelled:</span>
            <strong className="text-[#111111] font-bold">&ldquo;Starting from&rdquo;</strong>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {settings.packages.map((pkg, pIdx) => (
              <div
                key={pkg.id}
                className="p-5 rounded-2xl bg-[#FAFAFA] border border-black/5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#D92D50] bg-[#FCE9ED] px-2 py-0.5 rounded-md">
                      Tier {pIdx + 1}
                    </span>
                    <span className="text-[10px] text-[#A8A5A5] font-mono">
                      ID: {pkg.id}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">
                      Package Name
                    </label>
                    <input
                      type="text"
                      required
                      value={pkg.name}
                      onChange={(e) => handleUpdatePackageField(pIdx, 'name', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">
                      Starting Price (EUR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-[#A8A5A5] font-bold">
                        €
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={25}
                        required
                        value={pkg.startingPriceEUR}
                        onChange={(e) =>
                          handleUpdatePackageField(
                            pIdx,
                            'startingPriceEUR',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50] font-mono font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-[#A8A5A5] mt-1 block">
                      Displayed as &ldquo;Starting from €{pkg.startingPriceEUR.toLocaleString()}&rdquo;
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#111111]">
                        Short Feature List
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAddFeature(pIdx)}
                        className="text-[11px] font-bold text-[#D92D50] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add feature</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {pkg.featureList.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            required
                            value={feature}
                            onChange={(e) => handleFeatureChange(pIdx, fIdx, e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-black/10 rounded-lg focus:outline-none focus:border-[#D92D50]"
                          />
                          {pkg.featureList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(pIdx, fIdx)}
                              className="text-[#A8A5A5] hover:text-[#D92D50] p-1 cursor-pointer"
                              title="Remove feature"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Wording Guard Notice */}
          {wordingWarning.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle size={15} className="text-amber-700" />
                <span>Wording Guard Notice: Promotional or Guarantee Terms Detected</span>
              </div>
              <p className="text-[11px] text-amber-800">
                The following words were flagged: <strong className="text-amber-950">{wordingWarning.join(', ')}</strong>. Client-visible templates and packages must use neutral wording without promotional promises or fabricated numbers.
              </p>
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wordingConfirmed}
                  onChange={(e) => setWordingConfirmed(e.target.checked)}
                  className="rounded text-[#D92D50] focus:ring-[#D92D50] mt-0.5"
                />
                <span className="text-[11px] font-semibold text-amber-950">
                  I confirm this copy is compliant, neutral across niches, and accurately describes our service scope.
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-[#A8A5A5]">
              Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleDateString() : 'Never'} by {settings.updatedBy || 'System'}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Packages Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
