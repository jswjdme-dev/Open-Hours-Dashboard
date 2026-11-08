import {
  LeadScore,
  LeadScoreCriteria,
  LeadDisqualifiers,
  SuppressionEntry,
  LeadStage,
  LostReason,
  Client,
  Project,
  Request,
  Ticket,
  Payment,
  PartnerReferralTerms,
  RequestType,
} from '../types/index.ts';

/**
 * Calculates lead score and band based on 7 criteria (each 0-2, max 14).
 */
export function calculateLeadScore(
  criteria: LeadScoreCriteria,
  disqualifiers: LeadDisqualifiers
): LeadScore {
  const total =
    criteria.privateServices +
    criteria.googleReviews +
    criteria.websiteGap +
    criteria.gbpGaps +
    criteria.ownerAccessibility +
    criteria.recentActivity +
    criteria.scaleFit;

  const isDisqualified = disqualifiers.corporateChain || disqualifiers.fullyPublicFunded;

  let band: 'HOT' | 'WARM' | 'COLD' = 'COLD';
  if (!isDisqualified && total >= 10) {
    band = 'HOT';
  } else if (!isDisqualified && total >= 7) {
    band = 'WARM';
  } else {
    band = 'COLD';
  }

  return {
    criteria,
    disqualifiers,
    total,
    band,
    isDisqualified,
  };
}

/**
 * Checks if a given contact value is on the suppression list.
 */
export function checkIsSuppressed(
  value: string,
  suppressionList: SuppressionEntry[]
): { suppressed: boolean; matchedEntry?: SuppressionEntry } {
  if (!value) return { suppressed: false };
  const cleanVal = value.trim().toLowerCase();

  for (const entry of suppressionList) {
    if (entry.archivedAt) continue;
    const target = entry.contactValue.trim().toLowerCase();

    if (entry.type === 'domain') {
      if (cleanVal.includes(target) || (cleanVal.includes('@') && cleanVal.split('@')[1] === target)) {
        return { suppressed: true, matchedEntry: entry };
      }
    } else if (cleanVal === target) {
      return { suppressed: true, matchedEntry: entry };
    }
  }

  return { suppressed: false };
}

/**
 * Validates stage transition rules.
 */
export function validateStageTransition(
  toStage: LeadStage,
  details?: { lostReason?: LostReason; notNowUntil?: string }
): { isValid: boolean; error?: string } {
  if (toStage === 'Lost' && !details?.lostReason) {
    return {
      isValid: false,
      error: 'A reason is required when moving a lead to Lost.',
    };
  }

  if (toStage === 'Not Now' && !details?.notNowUntil) {
    return {
      isValid: false,
      error: 'A follow-up date is required when moving a lead to Not Now.',
    };
  }

  return { isValid: true };
}

/**
 * Funnel Bottleneck calculation.
 */
export function calculateFunnelBottleneck(stageCounts: Record<LeadStage, number>): {
  stage: LeadStage;
  nextStage: LeadStage;
  conversionRate: number;
  message: string;
} | null {
  const funnelOrder: LeadStage[] = [
    'New Lead',
    'Contacted',
    'Replied',
    'Audit Sent',
    'Concept Shown',
    'Interested',
    'Proposal Sent',
    'Won',
  ];

  let lowestRate = 1.0;
  let bottleneck: { stage: LeadStage; nextStage: LeadStage; conversionRate: number; message: string } | null = null;

  for (let i = 0; i < funnelOrder.length - 1; i++) {
    const from = funnelOrder[i];
    const to = funnelOrder[i + 1];
    const fromCount = stageCounts[from] || 0;
    const toCount = stageCounts[to] || 0;

    if (fromCount > 0) {
      const rate = toCount / fromCount;
      if (rate < lowestRate) {
        lowestRate = rate;
        bottleneck = {
          stage: from,
          nextStage: to,
          conversionRate: Math.round(rate * 100),
          message: `Bottleneck detected at ${from} → ${to} (${Math.round(rate * 100)}% transition). Prioritise fixing this early drop-off before optimising later steps.`,
        };
      }
    }
  }

  return bottleneck;
}

// ==========================================
// PHASE 3 LOGIC & ALGORITHMS
// ==========================================

export interface HealthScoreContext {
  daysBlockedOnClient: number;
  daysSinceLastMeeting: number | null;
  hasOpenComplaintTicket: boolean;
  overdueRequestsCount: number;
  hasOverduePayment: boolean;
}

/**
 * Computes client health score (0-100):
 * Start 100
 * - minus 15 if blocked on client > 7 days
 * - minus 15 if no meeting in 45 days (Live/Care only)
 * - minus 20 if an open Complaint ticket
 * - minus 10 per overdue request (max 20)
 * - minus 15 if a payment is overdue
 * Clamped 0-100.
 */
export function computeClientHealthScore(
  client: Pick<Client, 'status'>,
  ctx: HealthScoreContext
): { score: number; deductions: Array<{ reason: string; points: number }> } {
  let score = 100;
  const deductions: Array<{ reason: string; points: number }> = [];

  if (ctx.daysBlockedOnClient > 7) {
    score -= 15;
    deductions.push({ reason: 'Blocked on client for > 7 days', points: 15 });
  }

  if ((client.status === 'Live' || client.status === 'Care') && ctx.daysSinceLastMeeting !== null && ctx.daysSinceLastMeeting > 45) {
    score -= 15;
    deductions.push({ reason: 'No strategy meeting in 45+ days', points: 15 });
  }

  if (ctx.hasOpenComplaintTicket) {
    score -= 20;
    deductions.push({ reason: 'Active unresolved complaint ticket', points: 20 });
  }

  if (ctx.overdueRequestsCount > 0) {
    const reqDeduction = Math.min(ctx.overdueRequestsCount * 10, 20);
    score -= reqDeduction;
    deductions.push({ reason: `${ctx.overdueRequestsCount} overdue client request(s)`, points: reqDeduction });
  }

  if (ctx.hasOverduePayment) {
    score -= 15;
    deductions.push({ reason: 'Payment overdue', points: 15 });
  }

  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, deductions };
}

/**
 * Computes Ball-in-court:
 * "Client" if any Pending or Needs Changes request exists with assignedToClient = true,
 * or the stage is Waiting on client / Pending approval; otherwise "Us".
 */
export function computeBallInCourt(
  currentStageStatus: string,
  clientRequests: Array<Pick<Request, 'status' | 'assignedToClient'>>
): 'Us' | 'Client' {
  if (currentStageStatus === 'Waiting on client' || currentStageStatus === 'Pending approval') {
    return 'Client';
  }

  const hasClientPending = clientRequests.some(
    (r) => (r.status === 'Pending' || r.status === 'Needs Changes') && r.assignedToClient
  );

  return hasClientPending ? 'Client' : 'Us';
}

/**
 * Computes MRR from active clients' latest monthly care / retainer payments:
 * Sum of the latest monthly care/management payments per active client, normalised to EUR.
 */
export function computeMRRFromPayments(
  activeClients: Array<{ id: string; status: string; monthlyFeeEUR: number }>,
  payments: Payment[]
): { mrrEUR: number; contributingPayments: Payment[] } {
  const activeIds = new Set(
    activeClients.filter((c) => c.status === 'Live' || c.status === 'Care' || c.status === 'Onboarding').map((c) => c.id)
  );

  const contributingPayments: Payment[] = [];
  let mrrEUR = 0;

  for (const clientId of activeIds) {
    // Find latest monthly care or setup payment
    const clientPayments = payments
      .filter((p) => p.clientId === clientId && p.status === 'Paid' && (p.kind === 'Monthly care' || p.kind === 'Setup'))
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    if (clientPayments.length > 0) {
      const latest = clientPayments[0];
      contributingPayments.push(latest);
      mrrEUR += latest.amountEUR;
    } else {
      // Fallback to client agreed monthly fee if no payment yet recorded in onboarding
      const client = activeClients.find((c) => c.id === clientId);
      if (client && client.monthlyFeeEUR) {
        mrrEUR += client.monthlyFeeEUR;
      }
    }
  }

  return { mrrEUR, contributingPayments };
}

/**
 * Computes BDT from foreign currency and fx rate.
 */
export function computeBDT(amount: number, fxRate: number): number {
  return Math.round(amount * fxRate * 100) / 100;
}

/**
 * Computes partner referral fee.
 */
export function computePartnerReferralFee(
  paymentAmountEUR: number,
  terms: PartnerReferralTerms
): number {
  if (terms.type === 'Percentage') {
    return Math.round((paymentAmountEUR * terms.amount) / 100);
  }
  if (terms.type === 'Fixed fee') {
    return terms.amount;
  }
  return 0;
}

/**
 * Checks file name for sensitive health or patient patterns.
 */
export function checkRestrictedFileName(filename: string): {
  isBlocked: boolean;
  matchedPattern?: string;
} {
  const lower = filename.toLowerCase();
  const restricted = ['patient', 'x-ray', 'scan', 'xray', 'record', 'medical-history', 'diagnosis'];
  for (const pattern of restricted) {
    if (lower.includes(pattern)) {
      return { isBlocked: true, matchedPattern: pattern };
    }
  }
  return { isBlocked: false };
}

/**
 * The 12 standard clinic onboarding requests template.
 */
export const CLINIC_ONBOARDING_REQUESTS_TEMPLATE = [
  {
    type: 'Logo' as RequestType,
    title: 'Practice Logo (Vector SVG or High-Res PNG)',
    description: 'Provide the primary vector mark or transparent PNG logo file for header and footer use.',
    exampleHelpText: 'SVG, AI, or transparent PNG at least 1200px wide.',
    assignedToClient: true,
  },
  {
    type: 'Information' as RequestType,
    title: 'Brand Colours & Style Preferences',
    description: 'Provide primary hex codes or design palette preferences used across clinic stationery.',
    exampleHelpText: 'e.g. Navy #0A192F, Sage green #4A7C59.',
    assignedToClient: true,
  },
  {
    type: 'Photos' as RequestType,
    title: 'Practice & Premises Photos (Staff and Facilities Only)',
    description: 'Upload high-resolution photography of exterior entrance, reception, surgery rooms, and team.',
    exampleHelpText: 'Notice: Premises and consenting staff only. Do not upload photos showing patients.',
    assignedToClient: true,
  },
  {
    type: 'Copy/Text' as RequestType,
    title: 'Team Bios & Practitioner Qualifications',
    description: 'Names, roles, clinic registrations (e.g. Irish Dental Council / Medical Council), and short bios.',
    exampleHelpText: 'Brief 3-4 sentence background per clinician.',
    assignedToClient: true,
  },
  {
    type: 'Copy/Text' as RequestType,
    title: 'Treatment List & Service Descriptions',
    description: 'Full menu of private treatments and consultation fees you wish published.',
    exampleHelpText: 'Include consultation pricing or "From €X" guidelines.',
    assignedToClient: true,
  },
  {
    type: 'Information' as RequestType,
    title: 'Opening Hours & Emergency Rota',
    description: 'Standard practice operating hours and out-of-hours emergency guidance.',
    exampleHelpText: 'Mon-Fri 08:30 - 18:00, Sat by appointment.',
    assignedToClient: true,
  },
  {
    type: 'Information' as RequestType,
    title: 'Contact Details, Phone Lines & Clinic Address',
    description: 'Official phone number, enquiry email, Eircode/postcode, and parking guidance.',
    exampleHelpText: 'Main reception phone line and directions for arriving patients.',
    assignedToClient: true,
  },
  {
    type: 'GBP access' as RequestType,
    title: 'Google Business Profile Manager Access',
    description: 'Grant manager permissions for Open Hours team to manage local SEO citations and categories.',
    exampleHelpText: 'Invite agency@openhours.clinic as Manager in GBP settings.',
    assignedToClient: true,
  },
  {
    type: 'Domain access' as RequestType,
    title: 'Domain Registrar Access or DNS Confirmation',
    description: 'DNS delegation or registrar credentials to connect the new clinic website upon launch.',
    exampleHelpText: 'Blacknight, GoDaddy, Cloudflare, or Namecheap credentials/delegate link.',
    assignedToClient: true,
  },
  {
    type: 'Information' as RequestType,
    title: 'Existing Booking System Link or Widget',
    description: 'Integration URL for current patient management software (e.g. Exact, Cliniko, Jane, Pabau).',
    exampleHelpText: 'Direct portal link to embed on primary booking CTA buttons.',
    assignedToClient: true,
  },
  {
    type: 'Information' as RequestType,
    title: 'Privacy Policy & Legal Practice Registration',
    description: 'Registered business entity name, registration number, and clinic GDPR data controller contact.',
    exampleHelpText: 'Official legal entity name in Ireland / Malta.',
    assignedToClient: true,
  },
  {
    type: 'Approval' as RequestType,
    title: 'Final Website Copy & Layout Approval',
    description: 'Sign-off on website content, clinical claims, and local service pages prior to deployment.',
    exampleHelpText: 'Review staged preview link and confirm accuracy.',
    assignedToClient: true,
  },
];
