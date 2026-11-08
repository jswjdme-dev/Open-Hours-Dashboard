import React, { useState } from 'react';
import {
  ExplainerConfig,
  ExplainerIconKey,
  ExplainerStep,
  Client,
} from '../../types/index.ts';
import {
  BoardExplainer,
  BoardExplainerTokens,
  renderExplainerSvgIcon,
} from './BoardExplainer.tsx';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  RotateCcw,
  Copy,
  Eye,
  Check,
} from 'lucide-react';

interface ExplainerEditorProps {
  value: ExplainerConfig;
  onChange: (updated: ExplainerConfig) => void;
  defaultConfig?: ExplainerConfig;
  availableClients?: Client[];
  sampleTokens?: BoardExplainerTokens;
  title?: string;
  subtitle?: string;
  onResetToDefault?: () => void;
  onCopyFromClient?: () => void;
}

const AVAILABLE_ICONS: Array<{ key: ExplainerIconKey; label: string }> = [
  { key: 'person', label: 'Person' },
  { key: 'link', label: 'Link' },
  { key: 'website', label: 'Website' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'arrow', label: 'Arrow' },
  { key: 'gift', label: 'Gift' },
  { key: 'check', label: 'Check' },
  { key: 'lock', label: 'Lock' },
  { key: 'star', label: 'Star' },
  { key: 'chat', label: 'Chat' },
  { key: 'chart', label: 'Chart' },
  { key: 'shield', label: 'Shield' },
];

const FORBIDDEN_GUARANTEE_TERMS = [
  'guarantee',
  'guaranteed',
  '100%',
  'risk-free',
  'risk free',
  'instant cash',
  'no matter what',
  'unlimited free',
  'we promise',
];

export const checkExplainerWording = (config: ExplainerConfig): string[] => {
  const warnings: string[] = [];
  const textCorpus = [
    ...config.steps.map((s) => `${s.title} ${s.caption}`),
    config.description?.heading || '',
    ...(config.description?.bullets || []),
    config.description?.footnote || '',
  ]
    .join(' ')
    .toLowerCase();

  for (const term of FORBIDDEN_GUARANTEE_TERMS) {
    if (textCorpus.includes(term)) {
      warnings.push(`Avoid guarantee language or speculative promises: "${term}"`);
    }
  }

  return warnings;
};

export const ExplainerEditor: React.FC<ExplainerEditorProps> = ({
  value,
  onChange,
  defaultConfig,
  availableClients = [],
  sampleTokens = {
    months_you: 1,
    months_friend: 1,
    savings_price: '€450 / month',
    next_reward: '1 more referral = 1 month',
    max_months: 6,
  },
  title = 'Visual Explainer Editor',
  subtitle = 'Customize the hand-drawn sequence and structured explainer copy.',
  onResetToDefault,
  onCopyFromClient,
}) => {
  const [selectedClientToCopy, setSelectedClientToCopy] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const wordingWarnings = checkExplainerWording(value);

  // Step operations
  const handleUpdateStep = (idx: number, patch: Partial<ExplainerStep>) => {
    const newSteps = [...value.steps];
    newSteps[idx] = { ...newSteps[idx], ...patch };
    onChange({ ...value, steps: newSteps });
  };

  const handleAddStep = () => {
    if (value.steps.length >= 5) return;
    const newStep: ExplainerStep = {
      id: `step_${Date.now()}`,
      iconKey: 'check',
      title: 'New step',
      caption: 'Explain this step clearly in under 90 characters.',
    };
    onChange({ ...value, steps: [...value.steps, newStep] });
  };

  const handleRemoveStep = (idx: number) => {
    if (value.steps.length <= 3) return;
    const newSteps = value.steps.filter((_, i) => i !== idx);
    onChange({ ...value, steps: newSteps });
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= value.steps.length) return;
    const newSteps = [...value.steps];
    const temp = newSteps[idx];
    newSteps[idx] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    onChange({ ...value, steps: newSteps });
  };

  // Description operations
  const handleUpdateHeading = (heading: string) => {
    onChange({
      ...value,
      description: {
        ...value.description,
        heading,
      },
    });
  };

  const handleUpdateFootnote = (footnote: string) => {
    onChange({
      ...value,
      description: {
        ...value.description,
        footnote,
      },
    });
  };

  const handleUpdateBullet = (bIdx: number, text: string) => {
    const newBullets = [...(value.description?.bullets || [])];
    newBullets[bIdx] = text;
    onChange({
      ...value,
      description: {
        ...value.description,
        bullets: newBullets,
      },
    });
  };

  const handleAddBullet = () => {
    const current = value.description?.bullets || [];
    if (current.length >= 5) return;
    onChange({
      ...value,
      description: {
        ...value.description,
        bullets: [...current, 'Point highlighting verified credit application and qualification.'],
      },
    });
  };

  const handleRemoveBullet = (bIdx: number) => {
    const current = value.description?.bullets || [];
    if (current.length <= 3) return;
    onChange({
      ...value,
      description: {
        ...value.description,
        bullets: current.filter((_, i) => i !== bIdx),
      },
    });
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (onResetToDefault) {
      onResetToDefault();
      setCopiedNotification('Reset to defaults');
      setTimeout(() => setCopiedNotification(null), 2500);
      return;
    }
    if (defaultConfig) {
      onChange(JSON.parse(JSON.stringify(defaultConfig)));
      setCopiedNotification('Reset to defaults');
      setTimeout(() => setCopiedNotification(null), 2500);
    }
  };

  // Copy from another client
  const handleCopyFromClient = (targetClientId: string) => {
    if (!targetClientId) return;
    const targetClient = availableClients.find((c) => c.id === targetClientId);
    if (!targetClient) return;
    const clientExplainer =
      targetClient.referralClientExplainer || defaultConfig;
    onChange(JSON.parse(JSON.stringify(clientExplainer)));
    setSelectedClientToCopy('');
    setCopiedNotification(`Copied from ${targetClient.businessName}`);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Editor Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">{title}</h3>
          <p className="text-xs text-[#6B6B6B]">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Copy from client selector */}
          {availableClients.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedClientToCopy}
                onChange={(e) => {
                  setSelectedClientToCopy(e.target.value);
                  handleCopyFromClient(e.target.value);
                }}
                className="h-8 px-2.5 text-xs bg-white border border-black/10 rounded-lg text-[#333333] focus:outline-none focus:border-[#D92D50] cursor-pointer"
              >
                <option value="">Copy from client...</option>
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onCopyFromClient && (
            <button
              type="button"
              onClick={onCopyFromClient}
              className="h-8 px-3 rounded-lg border border-black/10 hover:bg-black/5 text-[#555555] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy from client explainer"
            >
              <Copy size={12} />
              <span>Copy from client</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetToDefault}
            className="h-8 px-3 rounded-lg border border-black/10 hover:bg-black/5 text-[#555555] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset to default explainer"
          >
            <RotateCcw size={12} />
            <span>Reset to default</span>
          </button>

          {copiedNotification && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fade-in">
              <Check size={13} />
              <span>{copiedNotification}</span>
            </span>
          )}
        </div>
      </div>

      {/* Wording Guard Warning Banner */}
      {wordingWarnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Wording Guard Advisory:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11.5px] text-amber-800">
              {wordingWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Steps Form List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Sequence Steps (3 to 5 steps)
          </label>
          <button
            type="button"
            onClick={handleAddStep}
            disabled={value.steps.length >= 5}
            className="text-xs font-bold text-[#D92D50] hover:text-[#B0203E] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Step ({value.steps.length}/5)</span>
          </button>
        </div>

        <div className="space-y-3">
          {value.steps.map((step, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === value.steps.length - 1;

            return (
              <div
                key={step.id || `step_edit_${idx}`}
                className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#111111] text-white font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-[#111111]">
                      Step {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'up')}
                      disabled={isFirst}
                      className="p-1.5 rounded-md hover:bg-black/5 text-[#666666] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'down')}
                      disabled={isLast}
                      className="p-1.5 rounded-md hover:bg-black/5 text-[#666666] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      disabled={value.steps.length <= 3}
                      className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Remove Step (Minimum 3)"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Icon Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#666666] mb-1">
                      Icon
                    </label>
                    <div className="relative">
                      <select
                        value={step.iconKey}
                        onChange={(e) =>
                          handleUpdateStep(idx, { iconKey: e.target.value as ExplainerIconKey })
                        }
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-black/10 bg-white text-xs font-medium text-[#111111] focus:outline-none focus:border-[#D92D50] cursor-pointer"
                      >
                        {AVAILABLE_ICONS.map((ic) => (
                          <option key={ic.key} value={ic.key}>
                            {ic.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute left-2.5 top-2 pointer-events-none text-[#111111]">
                        {renderExplainerSvgIcon(step.iconKey, 18, '#111111')}
                      </div>
                    </div>
                  </div>

                  {/* Title (max 40) */}
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#666666]">
                        Title
                      </label>
                      <span
                        className={`text-[10px] ${
                          step.title.length > 40 ? 'text-rose-600 font-bold' : 'text-[#888888]'
                        }`}
                      >
                        {step.title.length}/40
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={40}
                      value={step.title}
                      onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                      placeholder="e.g. You share your link"
                      className="w-full h-9 px-3 rounded-xl border border-black/10 bg-white text-xs text-[#111111] focus:outline-none focus:border-[#D92D50]"
                    />
                  </div>
                </div>

                {/* Caption (max 90) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#666666]">
                      Caption
                    </label>
                    <span
                      className={`text-[10px] ${
                        step.caption.length > 90 ? 'text-rose-600 font-bold' : 'text-[#888888]'
                      }`}
                    >
                      {step.caption.length}/90
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={90}
                    value={step.caption}
                    onChange={(e) => handleUpdateStep(idx, { caption: e.target.value })}
                    placeholder="Short description under 90 characters..."
                    className="w-full h-9 px-3 rounded-xl border border-black/10 bg-white text-xs text-[#111111] focus:outline-none focus:border-[#D92D50]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Description Block Editor */}
      <div className="space-y-4 pt-3 border-t border-black/5">
        <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
          Structured Description Block
        </label>

        {/* Heading */}
        <div>
          <label className="block text-[11px] font-semibold text-[#666666] mb-1">
            Section Heading
          </label>
          <input
            type="text"
            value={value.description?.heading || ''}
            onChange={(e) => handleUpdateHeading(e.target.value)}
            placeholder="e.g. How the referral programme works"
            className="w-full h-9 px-3 rounded-xl border border-black/10 bg-white text-xs text-[#111111] focus:outline-none focus:border-[#D92D50]"
          />
        </div>

        {/* Bullets (3 to 5 bullets, max 120 chars each) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-[#666666]">
              Key Bullet Points (3 to 5 items, max 120 chars each)
            </label>
            <button
              type="button"
              onClick={handleAddBullet}
              disabled={(value.description?.bullets?.length || 0) >= 5}
              className="text-[11.5px] font-bold text-[#D92D50] hover:text-[#B0203E] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Bullet ({(value.description?.bullets?.length || 0)}/5)</span>
            </button>
          </div>

          {(value.description?.bullets || []).map((bullet, bIdx) => (
            <div key={bIdx} className="flex items-center gap-2">
              <span className="text-xs text-[#888888] font-mono shrink-0 w-4">{bIdx + 1}.</span>
              <div className="flex-1 relative">
                <input
                  type="text"
                  maxLength={120}
                  value={bullet}
                  onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                  placeholder="Clear benefit or condition (max 120 chars)..."
                  className="w-full h-9 pl-3 pr-14 rounded-xl border border-black/10 bg-white text-xs text-[#111111] focus:outline-none focus:border-[#D92D50]"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] text-[#888888] pointer-events-none">
                  {bullet.length}/120
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveBullet(bIdx)}
                disabled={(value.description?.bullets?.length || 0) <= 3}
                className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Remove bullet"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <div>
          <label className="block text-[11px] font-semibold text-[#666666] mb-1">
            Footnote / Terms Note (optional)
          </label>
          <input
            type="text"
            value={value.description?.footnote || ''}
            onChange={(e) => handleUpdateFootnote(e.target.value)}
            placeholder="e.g. Rewards are applied after verified qualification. No cash alternatives."
            className="w-full h-9 px-3 rounded-xl border border-black/10 bg-white text-xs text-[#111111] focus:outline-none focus:border-[#D92D50]"
          />
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="space-y-3 pt-3 border-t border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-[#111111]" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Live Preview
            </span>
          </div>
          <span className="text-[11px] text-[#777777]">
            Tokens filled with sample values ({sampleTokens.savings_price})
          </span>
        </div>

        <BoardExplainer
          steps={value.steps}
          description={value.description}
          tokens={sampleTokens}
          replayable={true}
        />
      </div>
    </div>
  );
};
