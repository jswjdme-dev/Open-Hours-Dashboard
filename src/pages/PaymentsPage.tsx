import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  CreditCard,
  Building,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Euro,
  Coins,
} from 'lucide-react';
import { Payment, PaymentMethod, PaymentStatus, PaymentKind, Client } from '../types/index.ts';
import { getPayments, getClients, createPayment } from '../data/repo.ts';

interface PaymentsPageProps {
  onOpenClientWorkspace?: (clientId: string, clientName: string) => void;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ onOpenClientWorkspace }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [amountEUR, setAmountEUR] = useState(1200);
  const [paymentKind, setPaymentKind] = useState<PaymentKind>('Monthly care');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank transfer');
  const [referenceNote, setReferenceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exchange rate EUR to BDT: ~130.5
  const EUR_TO_BDT_RATE = 130.5;

  const loadData = async () => {
    setLoading(true);
    const [pays, clis] = await Promise.all([getPayments(), getClients()]);
    setPayments(pays);

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

  const totalCollectedEUR = payments
    .filter((p) => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amountEUR, 0);

  const totalCollectedBDT = payments
    .filter((p) => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amountBDT, 0);

  const pendingAmountEUR = payments
    .filter((p) => p.status === 'Pending')
    .reduce((sum, p) => sum + p.amountEUR, 0);

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (methodFilter !== 'all' && p.method !== methodFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const clientName = p.clientName || clients[p.clientId]?.businessName || '';
      const ref = p.referenceNote || '';
      return (
        ref.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        p.kind.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    setIsSubmitting(true);
    const calcBDT = Math.round(amountEUR * EUR_TO_BDT_RATE);
    const client = clients[selectedClientId];
    const clientName = client?.businessName || 'Client Practice';

    await createPayment({
      clientId: selectedClientId,
      clientName,
      kind: paymentKind,
      originalCurrency: 'EUR',
      originalAmount: amountEUR,
      fxRateToBDT: EUR_TO_BDT_RATE,
      amountEUR,
      amountBDT: calcBDT,
      method: paymentMethod,
      referenceNote: referenceNote || `REF-${Date.now().toString(36).toUpperCase()}`,
      status: 'Paid',
      paidAt: new Date().toISOString().split('T')[0],
    });

    setIsSubmitting(false);
    setIsModalOpen(false);
    setSelectedClientId('');
    setReferenceNote('');
    loadData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold text-[#101828] leading-tight tracking-tight">
              Payments
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-[#ECEEF2] text-[12px] font-semibold text-[#667085] bg-[#F8F9FB]">
              Demo data
            </span>
          </div>
          <p className="text-[14px] font-medium text-[#475467] mt-0.5">
            Reconciliation ledger of client retainer settlements, setup fees, and multi-currency payouts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 h-[36px] rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[14px] font-semibold transition-all cursor-pointer shadow-2xs"
        >
          <Plus size={14} />
          <span>Log payment</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected EUR */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">
              Total Collected (EUR)
            </span>
            <div className="w-7 h-7 rounded-[8px] bg-[rgba(217,45,80,0.08)] text-[#D92D50] flex items-center justify-center">
              <Euro size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[28px] font-bold text-[#101828] tabular-nums leading-tight">
              €{totalCollectedEUR.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[#E7F8EF] text-[#12B76A]">
                Completed
              </span>
              <span className="text-[13px] font-medium text-[#667085]">client transactions</span>
            </div>
          </div>
        </div>

        {/* Total Collected BDT */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">
              BDT Equivalent
            </span>
            <div className="w-7 h-7 rounded-[8px] bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[28px] font-bold text-[#101828] tabular-nums leading-tight">
              ৳{totalCollectedBDT.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[13px] font-medium text-[#667085]">
              Rate: 1 EUR ≈ ৳{EUR_TO_BDT_RATE}
            </div>
          </div>
        </div>

        {/* Pending Settlements */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">
              Pending Payouts
            </span>
            <div className="w-7 h-7 rounded-[8px] bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[28px] font-bold text-[#101828] tabular-nums leading-tight">
              €{pendingAmountEUR.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[13px] font-medium text-[#667085]">
              {payments.filter((p) => p.status === 'Pending').length} payments processing
            </div>
          </div>
        </div>

        {/* Settlement Channels */}
        <div className="bg-white rounded-[16px] p-5 border border-[#ECEEF2] shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#475467]">
              Primary Rail
            </span>
            <div className="w-7 h-7 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[22px] font-bold text-[#101828] leading-tight">
              Wise & Bank Wire
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[13px] font-medium text-[#667085]">
              Direct SEPA Euro settlements
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
              placeholder="Search reference, client, or kind..."
              className="w-full bg-[#F4F2F2] rounded-full pl-9 pr-4 py-2 text-xs text-[#111111] placeholder-[#A8A5A5] focus:outline-none focus:ring-1 focus:ring-[#D92D50]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F4F2F2] p-1 rounded-full text-xs">
            {(['all', 'Paid', 'Pending', 'Failed'] as const).map((st) => (
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

        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="bg-[#F4F2F2] text-xs font-medium text-[#111111] rounded-full px-3 py-1.5 border-none focus:ring-1 focus:ring-[#D92D50] cursor-pointer"
          >
            <option value="all">All payment rails</option>
            <option value="Bank transfer">Bank Transfer (SEPA)</option>
            <option value="Wise">Wise</option>
            <option value="Card">Card / Stripe</option>
            <option value="Payoneer">Payoneer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#6B6B6B]">Loading payments ledger...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#6B6B6B]">
            No payment records found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFAFA] text-[#6B6B6B] font-semibold">
                  <th className="py-3 px-5">Client / Practice</th>
                  <th className="py-3 px-4">Kind</th>
                  <th className="py-3 px-4">Amount (EUR)</th>
                  <th className="py-3 px-4">Amount (BDT)</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Settlement Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredPayments.map((payment) => {
                  const client = clients[payment.clientId];
                  const isPaid = payment.status === 'Paid';

                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-[#F9F9F9] transition-colors group cursor-default"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#F1EFEF] flex items-center justify-center text-[#111111] font-bold text-[11px] shrink-0">
                            {payment.clientName ? payment.clientName.charAt(0) : 'C'}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111111]">
                              {payment.clientName || client?.businessName || 'Unknown Practice'}
                            </div>
                            <div className="text-[11px] text-[#A8A5A5]">
                              {client?.city}, {client?.country} · {client?.package}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#6B6B6B]">
                        {payment.kind}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#111111]">
                        €{payment.amountEUR.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#6B6B6B]">
                        ৳{payment.amountBDT.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-[#F4F2F2] text-[#111111] font-medium text-[11px]">
                          {payment.method}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : payment.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPaid
                                ? 'bg-emerald-500'
                                : payment.status === 'Pending'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {payment.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#6B6B6B]">
                        {payment.referenceNote || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-[#6B6B6B]">
                        {payment.paidAt}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {onOpenClientWorkspace && client && (
                          <button
                            type="button"
                            onClick={() => onOpenClientWorkspace(client.id, client.businessName)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B6B6B] hover:text-[#D92D50] transition-colors cursor-pointer"
                          >
                            <span>Workspace</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Payment Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center font-bold">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111111]">Log Client Payment</h3>
                  <p className="text-xs text-[#6B6B6B]">Record incoming retainer or milestone transfer.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Client Practice
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    const selected = clients[e.target.value];
                    if (selected && selected.monthlyFeeEUR) {
                      setAmountEUR(selected.monthlyFeeEUR);
                    }
                  }}
                  className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                >
                  <option value="">Select clinic...</option>
                  {Object.values(clients).map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.businessName} ({cli.city} · {cli.package})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Payment Kind
                </label>
                <select
                  value={paymentKind}
                  onChange={(e) => setPaymentKind(e.target.value as PaymentKind)}
                  className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                >
                  <option value="Monthly care">Monthly care (Retainer)</option>
                  <option value="Setup">Setup fee</option>
                  <option value="Ads management">Ads management</option>
                  <option value="Add-on">Custom Add-on</option>
                  <option value="Other">Other</option>
                </select>
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
                    value={amountEUR}
                    onChange={(e) => setAmountEUR(Number(e.target.value))}
                    className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs font-bold text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B6B6B] mb-1">
                    BDT Equivalent (Auto)
                  </label>
                  <div className="w-full bg-[#EAE8E8] rounded-xl px-3 py-2 text-xs font-bold text-[#444444]">
                    ৳{Math.round(amountEUR * EUR_TO_BDT_RATE).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Payment Rail
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                >
                  <option value="Bank transfer">Bank Transfer (SEPA)</option>
                  <option value="Wise">Wise</option>
                  <option value="Card">Card / Stripe</option>
                  <option value="Payoneer">Payoneer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Reference Note / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. STRIPE-CH-98124 or SEPA-2026-004"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  className="w-full bg-[#F4F2F2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:ring-1 focus:ring-[#D92D50] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-black/10 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-[#D92D50] hover:bg-[#c22444] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Logging...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
