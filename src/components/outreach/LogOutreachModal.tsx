import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, Search } from 'lucide-react';
import { ChannelType, MessageTemplate, Lead } from '../../types/index.ts';
import { getLeads, getMessageTemplates, logOutreach } from '../../data/repo.ts';

interface LogOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogged: () => void;
}

export const LogOutreachModal: React.FC<LogOutreachModalProps> = ({
  isOpen,
  onClose,
  onLogged,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [channel, setChannel] = useState<ChannelType>('Email');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [status, setStatus] = useState<'Sent' | 'Delivered' | 'Replied' | 'Bounced' | 'Opted out'>('Sent');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      getLeads({ showArchived: false }).then(setLeads);
      getMessageTemplates().then(setTemplates);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const lead = leads.find((l) => l.id === selectedLeadId);
    if (!lead) {
      setError('Please choose a practice lead.');
      return;
    }

    setSubmitting(true);
    const template = templates.find((t) => t.id === selectedTemplateId);

    const res = await logOutreach({
      leadId: lead.id,
      leadBusinessName: lead.businessName,
      channel,
      templateId: template?.id,
      templateTitle: template?.title,
      status,
      sentBy: 'Founder',
      notes,
    });

    setSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Failed to log outreach.');
      return;
    }

    onLogged();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-outreach-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-black/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center">
              <Send size={15} />
            </div>
            <h3 id="log-outreach-title" className="text-lg font-bold text-[#111111]">
              Log Practice Outreach
            </h3>
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

        {error && (
          <div className="mb-4 p-3 bg-[#FCE9ED] border border-[#D92D50]/20 rounded-xl text-xs text-[#D92D50] font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Practice Select */}
          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Select Practice Lead <span className="text-[#D92D50]">*</span>
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
              required
            >
              <option value="">Choose a lead...</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.businessName} ({l.city} · {l.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelType)}
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
              >
                <option value="Email">Email</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
              >
                <option value="Sent">Sent</option>
                <option value="Delivered">Delivered</option>
                <option value="Replied">Replied</option>
                <option value="Bounced">Bounced</option>
                <option value="Opted out">Opted out</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">
              Template Used (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-[#F1EFEF]"
            >
              <option value="">Custom message / no template</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title} (v{tpl.version} · {tpl.channel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111111] block mb-1">Notes / Subject</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent personalized Loom video link to principal dentist."
              className="w-full text-xs p-2.5 rounded-xl border border-black/10"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
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
              className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Auditing...' : 'Confirm & Log Outreach'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
