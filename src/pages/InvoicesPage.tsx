import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Building,
  Calendar,
  Euro,
  X,
  Eye,
} from 'lucide-react';
import { Invoice, InvoiceStatus, InvoiceLineItem, Client } from '../types/index.ts';
import { getInvoices, getClients, createInvoice, updateInvoice } from '../data/repo.ts';

interface InvoicesPageProps {
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onOpenClientWorkspace }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  // Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Create Invoice Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [lineItemDesc, setLineItemDesc] = useState('Monthly Open Hours Retainer');
  const [lineItemAmount, setLineItemAmount] = useState(1200);
  const [vatRate, setVatRate] = useState(23); // Default Ireland VAT
  const [vatNote, setVatNote] = useState('VAT treatment: Standard Ireland 23% B2B rate applied');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [invs, clis] = await Promise.all([getInvoices(), getClients()]);
    setInvoices(invs);

    const clientMap: Record<string, Client> = {};
    clis.forEach((c) => {
      clientMap[c.id] = c;
    });
    setClients(clientMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = invoices
    .filter((inv) => inv.status === 'Sent' || inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.total, 0);
  const overdueCount = invoices.filter((inv) => inv.status === 'Overdue').length;

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    setIsSubmitting(true);
    const client = clients[selectedClientId];
    const clientName = client?.businessName || 'Client Practice';

    const vatAmount = Math.round(lineItemAmount * (vatRate / 100));
    const total = lineItemAmount + vatAmount;

    const issueDate = new Date().toISOString().split('T')[0];
    const dueDateObj = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const nextNum = `OH-2026-${String(invoices.length + 1).padStart(4, '0')}`;

    const lineItem: InvoiceLineItem = {
      id: `item_${Date.now().toString(36)}`,
      description: lineItemDesc,
      quantity: 1,
      unitPriceEUR: lineItemAmount,
      totalEUR: lineItemAmount,
    };

    await createInvoice({
      number: nextNum,
      clientId: selectedClientId,
      clientName,
      issueDate,
      dueDate,
      subtotal: lineItemAmount,
      vatNote: vatNote || (vatRate === 0 ? 'Reverse charge applies' : `${vatRate}% VAT applied`),
      total,
      currency: 'EUR',
      status: 'Sent',
      lineItems: [lineItem],
    });

    setIsSubmitting(false);
    setIsCreateOpen(false);
    setSelectedClientId('');
    loadData();
  };

  const handleMarkPaid = async (invId: string) => {
    await updateInvoice(invId, { status: 'Paid', paidAt: new Date().toISOString().split('T')[0] });
    loadData();
    if (previewInvoice?.id === invId) {
      setPreviewInvoice((prev) => (prev ? { ...prev, status: 'Paid' } : null));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Invoices
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Demo data
            </span>
          </div>
          <p className="text-sm text-[#6B6B6B] mt-1">
            B2B clinic billing, cross-border VAT reconciliation, and payment status lifecycle.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D92D50] hover:bg-[#c22444] text-white text-xs font-bold tracking-wide transition-all shadow-sm shadow-[#D92D50]/20 cursor-pointer active:scale-95"
        >
          <Plus size={15} />
          <span>Create invoice</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced (Black feature card) */}
        <div className="bg-[#111111] text-white rounded-[24px] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/70 text-xs font-medium">
            <span>Total Invoiced</span>
            <Euro size={16} className="text-[#D92D50]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold tracking-tight">
              €{totalInvoiced.toLocaleString()}
            </div>
            <div className="text-[11px] text-white/60 mt-1">
              {invoices.length} invoices generated this quarter
            </div>
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B6B6B] text-xs font-medium">
            <span>Paid Revenue</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#111111]">
              €{totalPaid.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              {Math.round((totalPaid / (totalInvoiced || 1)) * 100)}% collection efficiency
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B6B6B] text-xs font-medium">
            <span>Outstanding</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#111111]">
              €{totalOutstanding.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#6B6B6B] mt-1">
              Awaiting standard settlement window
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-[24px] p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B6B6B] text-xs font-medium">
            <span>Overdue Status</span>
            <AlertTriangle size={16} className={overdueCount > 0 ? 'text-[#D92D50]' : 'text-emerald-500'} />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#111111]">
              {overdueCount}
            </div>
            <div className="text-[11px] text-[#6B6B6B] mt-1">
              {overdueCount === 0 ? 'Zero overdue accounts' : 'Requires follow-up reminder'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-[24px] p-4 border border-black/5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice number or practice..."
              className="w-full bg-[#F4F2F2] rounded-full pl-9 pr-4 py-2 text-xs text-[#111111] placeholder-[#A8A5A5] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F4F2F2] p-1 rounded-full text-xs">
            {(['all', 'Draft', 'Sent', 'Paid', 'Overdue'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {st === 'all' ? 'All statuses' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#6B6B6B]">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#6B6B6B]">
            No invoices found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                  <th className="py-3 px-5">Invoice #</th>
                  <th className="py-3 px-4">Client / Practice</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Total (EUR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredInvoices.map((inv) => {
                  const client = clients[inv.clientId];
                  const isPaid = inv.status === 'Paid';
                  const isOverdue = inv.status === 'Overdue';

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#F9F9F9] transition-colors group cursor-default"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-[#111111]">
                        {inv.number}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#111111]">{inv.clientName}</div>
                        <div className="text-[11px] text-[#A8A5A5]">
                          {client ? `${client.city}, ${client.country}` : 'Active Client'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#6B6B6B]">{inv.issueDate}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-medium ${
                            isOverdue ? 'text-[#D92D50] font-bold' : 'text-[#6B6B6B]'
                          }`}
                        >
                          {inv.dueDate}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#6B6B6B]">
                        €{inv.subtotal.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#111111]">
                        €{inv.total.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          {inv.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="p-1 rounded-md text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F1EFEF] transition-colors cursor-pointer"
                            title="Preview Invoice"
                          >
                            <Eye size={15} />
                          </button>

                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(inv.id)}
                              className="px-2.5 py-1 rounded-full bg-[#FCE9ED] text-[#D92D50] font-bold text-[10px] hover:bg-[#D92D50] hover:text-white transition-colors cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          )}

                          {onOpenClientWorkspace && client && (
                            <button
                              type="button"
                              onClick={() => onOpenClientWorkspace(client.id, client.businessName)}
                              className="text-[11px] font-medium text-[#6B6B6B] hover:text-[#D92D50] p-1 cursor-pointer"
                              title="Client Workspace"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl border border-black/10 space-y-6">
            <div className="flex items-start justify-between border-b border-black/5 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D92D50]">
                  Official Invoice
                </span>
                <h3 className="text-2xl font-black text-[#111111] font-mono mt-0.5">
                  {previewInvoice.number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    previewInvoice.status === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {previewInvoice.status}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(null)}
                  className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Bill to / From details */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <div className="font-bold text-[#A8A5A5] uppercase tracking-wider mb-1">Billed To</div>
                <div className="font-bold text-sm text-[#111111]">{previewInvoice.clientName}</div>
                <div className="text-[#6B6B6B] mt-0.5">Healthcare Practice Partner</div>
                <div className="text-[#6B6B6B]">VAT Note: {previewInvoice.vatNote}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#A8A5A5] uppercase tracking-wider mb-1">Invoice Details</div>
                <div className="text-[#111111]"><strong>Issued:</strong> {previewInvoice.issueDate}</div>
                <div className="text-[#111111]"><strong>Due:</strong> {previewInvoice.dueDate}</div>
                {previewInvoice.paidAt && (
                  <div className="text-emerald-600 font-semibold">
                    <strong>Settled:</strong> {previewInvoice.paidAt}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-black/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-black/5 text-[#6B6B6B]">
                    <th className="py-2.5 px-4 font-semibold">Description</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Qty</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Unit Price</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {previewInvoice.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4 font-medium text-[#111111]">{item.description}</td>
                      <td className="py-3 px-3 text-center text-[#6B6B6B]">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-[#6B6B6B]">€{item.unitPriceEUR.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#111111]">€{item.totalEUR.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end text-xs">
              <div className="w-56 space-y-1.5">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Subtotal</span>
                  <span>€{previewInvoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>VAT Note</span>
                  <span className="text-[11px] text-[#A8A5A5]">{previewInvoice.vatNote}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-[#111111] pt-2 border-t border-black/10">
                  <span>Total Due</span>
                  <span>€{previewInvoice.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-[#A8A5A5]">
                Open Hours Console · Fictional Billing Engine
              </span>
              <div className="flex items-center gap-2">
                {previewInvoice.status !== 'Paid' && (
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(previewInvoice.id)}
                    className="px-4 py-2 rounded-full bg-[#D92D50] hover:bg-[#c22444] text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Mark as Paid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(null)}
                  className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111111]">Create Client Invoice</h3>
                  <p className="text-xs text-[#6B6B6B]">Generate standard B2B recurring retainer invoice.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Recipient Practice
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    const selected = clients[e.target.value];
                    if (selected && selected.monthlyFeeEUR) {
                      setLineItemAmount(selected.monthlyFeeEUR);
                      setLineItemDesc(`${selected.package} Package Monthly Retainer`);
                    }
                  }}
                  className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                >
                  <option value="">Select clinic...</option>
                  {Object.values(clients).map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.businessName} ({cli.city}, {cli.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Line Item Description
                </label>
                <input
                  type="text"
                  required
                  value={lineItemDesc}
                  onChange={(e) => setLineItemDesc(e.target.value)}
                  className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Amount (EUR €)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={lineItemAmount}
                    onChange={(e) => setLineItemAmount(Number(e.target.value))}
                    className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs font-bold text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    VAT Rate
                  </label>
                  <select
                    value={vatRate}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setVatRate(v);
                      setVatNote(v === 0 ? 'Reverse charge applies (EU B2B)' : `${v}% VAT applied`);
                    }}
                    className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  >
                    <option value={23}>23% (Ireland Standard)</option>
                    <option value={18}>18% (Malta Standard)</option>
                    <option value={0}>0% (EU Reverse Charge B2B)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  VAT Treatment Note
                </label>
                <input
                  type="text"
                  value={vatNote}
                  onChange={(e) => setVatNote(e.target.value)}
                  className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-[#D92D50] hover:bg-[#c22444] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
