import {
  Partner,
  Client,
  Payment,
  TimeEntry,
  TeamMemberProfile,
  DealModel,
  DealAppliesTo,
} from '../types/index.ts';

export interface ClientEarningsBreakdown {
  clientId: string;
  businessName: string;
  package: string;
  status: string;
  grossPaymentsEUR: number;
  partnerShareEUR: number;
  paymentCount: number;
  latestPaymentDate?: string;
  claimedValueEUR?: number; // Partner-submitted or quoted value
}

export interface PartnerEarningsComputation {
  partnerId: string;
  partnerName: string;
  dealModel: DealModel | string;
  dealSummary: string;
  currency: 'EUR' | 'BDT';
  sharePercentage?: number;
  fixedAmount?: number;
  appliesTo: DealAppliesTo;
  cashBasis: boolean;
  clientsBroughtCount: number;
  clientBreakdowns: ClientEarningsBreakdown[];
  // Key financial single-source-of-truth metrics
  grossClientPaymentsEUR: number;
  partnerShareEUR: number;
  netToOpenHoursEUR: number;
  earningsPaidEUR: number;
  balanceOwedEUR: number;
  // Team time tracking delivery metrics (only shown if time tracking exists)
  totalLoggedHours: number | null;
  deliveryCostEUR: number | null;
  effectiveHourlyRateEUR: number | null;
}

/**
 * Single source of truth calculation for partner earnings.
 * Based purely on deal terms and received Payment records (cash basis).
 *
 * Requirements:
 * - Partner earnings = f(deal terms, Payment records of that partner's clients)
 * - Single source of truth in src/lib/partners.ts
 * - Gross client payments, partner share, net to Open Hours
 * - Effective hourly rate (estimated from logged hours x cost rates, otherwise null to hide)
 * - Earnings paid from Partner Fee payout ledger
 * - Partner-submitted prices labeled as "Claimed", only Payment records count as revenue.
 */
export function computePartnerEarnings(
  partner: Partner,
  allClients: Client[],
  allPayments: Payment[],
  timeEntries?: TimeEntry[],
  teamMembers?: TeamMemberProfile[]
): PartnerEarningsComputation {
  const terms = partner.dealTerms;
  const dealModel: DealModel = (terms?.dealModel as DealModel) || 'Revenue share % per client';
  const sharePercentage = terms?.sharePercentage ?? (partner.referralTerms?.amount ?? 10);
  const fixedAmount = terms?.fixedAmount ?? 250;
  const appliesTo: DealAppliesTo = terms?.appliesTo || 'Monthly fees';
  const dealSummary = terms?.dealSummary || `${sharePercentage}% on client revenue`;
  const currency = terms?.currency || 'EUR';
  const cashBasis = terms?.cashBasis ?? true;

  // 1. Identify clients brought by this partner
  const partnerClients = allClients.filter(
    (c) => c.sourcePartnerId === partner.id || c.source === partner.name
  );
  const clientIds = new Set(partnerClients.map((c) => c.id));

  // 2. Identify received payments for these clients (only Paid status counts as cash basis revenue)
  const receivedPayments = allPayments.filter(
    (p) => clientIds.has(p.clientId) && p.status === 'Paid'
  );

  // Group received payments by client
  const paymentsByClient = new Map<string, Payment[]>();
  receivedPayments.forEach((p) => {
    const list = paymentsByClient.get(p.clientId) || [];
    list.push(p);
    paymentsByClient.set(p.clientId, list);
  });

  // 3. Compute per-client breakdowns
  let totalGrossEUR = 0;
  let totalPartnerShareEUR = 0;

  const clientBreakdowns: ClientEarningsBreakdown[] = partnerClients.map((client) => {
    const clientPayments = paymentsByClient.get(client.id) || [];
    const clientGross = clientPayments.reduce((sum, p) => sum + (p.amountEUR || 0), 0);
    totalGrossEUR += clientGross;

    let clientShare = 0;

    if (dealModel === 'Revenue share % per client' || dealModel === 'Custom') {
      // Calculate share on eligible payment kinds
      clientPayments.forEach((payment) => {
        let isEligible = false;
        if (appliesTo === 'Both') {
          isEligible = true;
        } else if (appliesTo === 'Setup fees') {
          isEligible = payment.kind === 'Setup';
        } else if (appliesTo === 'Monthly fees') {
          isEligible = payment.kind === 'Monthly care' || payment.kind === 'Other';
        }

        if (isEligible) {
          clientShare += (payment.amountEUR || 0) * (sharePercentage / 100);
        }
      });
    } else if (dealModel === 'Fixed fee per client') {
      // If client has made at least one received payment
      if (clientPayments.length > 0) {
        clientShare = fixedAmount;
      }
    } else if (dealModel === 'One-time referral fee') {
      if (clientPayments.length > 0) {
        clientShare = fixedAmount;
      }
    }

    totalPartnerShareEUR += clientShare;

    const latestPayment = clientPayments.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    )[0];

    // Claimed vs Real: Setup fee + 3 months retainer is the claimed pipeline value
    const claimedValueEUR = (client.setupFeeEUR || 0) + (client.monthlyFeeEUR || 1500) * 3;

    return {
      clientId: client.id,
      businessName: client.businessName,
      package: client.package,
      status: client.status,
      grossPaymentsEUR: Math.round(clientGross * 100) / 100,
      partnerShareEUR: Math.round(clientShare * 100) / 100,
      paymentCount: clientPayments.length,
      latestPaymentDate: latestPayment?.paidAt,
      claimedValueEUR,
    };
  });

  totalGrossEUR = Math.round(totalGrossEUR * 100) / 100;
  totalPartnerShareEUR = Math.round(totalPartnerShareEUR * 100) / 100;

  const netToOpenHoursEUR = Math.round((totalGrossEUR - totalPartnerShareEUR) * 100) / 100;
  const earningsPaidEUR = partner.feesPaid || 0;
  const balanceOwedEUR = Math.max(0, Math.round((totalPartnerShareEUR - earningsPaidEUR) * 100) / 100);

  // 4. Compute effective hourly rate from time tracking if exists
  let totalLoggedHours: number | null = null;
  let deliveryCostEUR: number | null = null;
  let effectiveHourlyRateEUR: number | null = null;

  if (timeEntries && timeEntries.length > 0) {
    const partnerClientTimeEntries = timeEntries.filter(
      (te) => te.clientId && clientIds.has(te.clientId)
    );

    if (partnerClientTimeEntries.length > 0) {
      const totalMinutes = partnerClientTimeEntries.reduce(
        (sum, te) => sum + (te.durationMinutes || 0),
        0
      );

      if (totalMinutes > 0) {
        const hours = totalMinutes / 60;
        totalLoggedHours = Math.round(hours * 10) / 10;

        // Calculate delivery cost based on team member rates
        const memberRateMap = new Map<string, number>();
        (teamMembers || []).forEach((tm) => {
          let eurRate = tm.costRatePerHour || 25;
          if (tm.costCurrency === 'BDT') {
            eurRate = eurRate / 130; // 130 BDT per EUR
          }
          memberRateMap.set(tm.id, eurRate);
        });

        let totalCost = 0;
        partnerClientTimeEntries.forEach((te) => {
          const rate = memberRateMap.get(te.memberId) || 25;
          totalCost += ((te.durationMinutes || 0) / 60) * rate;
        });

        deliveryCostEUR = Math.round(totalCost * 100) / 100;

        // Effective hourly rate for Open Hours
        // Net revenue after partner share and delivery cost, divided by hours worked
        if (totalLoggedHours > 0) {
          const profit = netToOpenHoursEUR - totalCost;
          effectiveHourlyRateEUR = Math.round((profit / totalLoggedHours) * 100) / 100;
        }
      }
    }
  }

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    dealModel,
    dealSummary,
    currency,
    sharePercentage,
    fixedAmount,
    appliesTo,
    cashBasis,
    clientsBroughtCount: partnerClients.length,
    clientBreakdowns,
    grossClientPaymentsEUR: totalGrossEUR,
    partnerShareEUR: totalPartnerShareEUR,
    netToOpenHoursEUR,
    earningsPaidEUR,
    balanceOwedEUR,
    totalLoggedHours,
    deliveryCostEUR,
    effectiveHourlyRateEUR,
  };
}
