import React, { useState } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { MessageTemplate } from '../../types/index.ts';
import { updateMessageTemplate } from '../../data/repo.ts';

interface TemplateEditorModalProps {
  isOpen: boolean;
  template: MessageTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  template,
  onClose,
  onSaved,
}) => {
  if (!isOpen || !template) return null;

  const [title, setTitle] = useState(template.title);
  const [content, setContent] = useState(template.content);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Enforce opt-out line for email templates
    let finalContent = content;
    if (template.channel === 'Email' && !finalContent.includes('STOP')) {
      finalContent += `\n\n(reply STOP and I won't contact you again)`;
    }

    await updateMessageTemplate(template.id, finalContent, title);
    setSubmitting(false);
    onSaved();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F1EFEF] text-[#111111] flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <h3 id="template-editor-title" className="text-base font-bold text-[#111111]">
                Edit Template & Create Version v{template.version + 1}
              </h3>
              <span className="text-[11px] text-[#A8A5A5]">
                Channel: {template.channel} · Old logs retain version v{template.version}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A8A5A5] hover:text-[#111111] p-1 rounded-full"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Template Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-black/10"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#111111]">
                Message Content
              </label>
              <span className="text-[10px] text-[#A8A5A5]">
                Tokens: {'{{ownerName}}'}, {'{{businessName}}'}, {'{{city}}'}, {'{{specialty}}'}
              </span>
            </div>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none font-sans leading-relaxed"
              required
            />
          </div>

          <div className="p-3 bg-[#F4F2F2] rounded-xl text-[11px] text-[#6B6B6B]">
            🛡️ <strong>Compliance Safeguard:</strong> All cold outreach templates must end with a clear opt-out sentence: <em>&ldquo;reply STOP and I won&rsquo;t contact you again&rdquo;</em>.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6B6B6B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-colors"
            >
              {submitting ? 'Saving Version...' : `Save as v${template.version + 1}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
