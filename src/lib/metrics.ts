import {
  getLeads,
  getLeadActivities,
  getClients,
  getProjects,
  getRequests,
  getFiles,
  getMeetings,
  getTickets,
  getPayments,
  getInvoices,
  getSuppressionList,
  getPartners,
  getTasks,
  getMrrMetrics,
  getAllMonthlyReportsOverview,
  getPendingPartnerClients,
  getAllSubTeamClients,
  getTeamRequests,
  checkAndCreateTenureReminderTasks,
  getApplications,
  getAllDemoSites,
  getWebsiteProjects,
  getReferralCredits,
} from '../data/repo.ts';
import {
  Lead,
  Client,
  Project,
  Request,
  Meeting,
  Ticket,
  Payment,
  Invoice,
  FollowUpTask,
  ClinicSpecialty,
  LeadStage,
} from '../types/index.ts';

// -------------------------------------------------------------
// ATTENTION ITEMS SELECTOR (Top strip on Overview)
// -------------------------------------------------------------
export interface AttentionItem {
  id: string;
  category: 'task' | 'delivery' | 'billing' | 'ticket' | 'report';
  title: string;
  subtitle: string;
  badgeText: string;
  severity: 'urgent' | 'warning' | 'info';
  targetView: string;
}

export async function getAttentionItems(): Promise<AttentionItem[]> {
  await checkAndCreateTenureReminderTasks();
  const [tasks, projects, requests, invoices, tickets, reportsOverview, pendingClients, clients, subTeamClients, teamRequests, applications, demoSites, websiteProjects, referralCredits] = await Promise.all([
    getTasks(),
    getProjects(),
    getRequests(),
    getInvoices(),
    getTickets(),
    getAllMonthlyReportsOverview(),
    getPendingPartnerClients(),
    getClients(),
    getAllSubTeamClients(true),
    getTeamRequests(),
    getApplications(),
    getAllDemoSites(),
    getWebsiteProjects(),
    getReferralCredits(),
  ]);

  const items: AttentionItem[] = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const nowMs = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Eligible Referral Credits
  const eligibleCredits = referralCredits.filter((c) => c.status === 'Eligible');
  if (eligibleCredits.length > 0) {
    items.push({
      id: 'att-eligible-referral-credits',
      category: 'billing',
      title: `${eligibleCredits.length} Referral Credit${eligibleCredits.length > 1 ? 's' : ''} Ready to Apply`,
      subtitle: `${eligibleCredits[0].referrerClientBusinessName || 'Client'} has an eligible referral credit (${eligibleCredits[0].reward}) ready to apply to their next payment.`,
      badgeText: `${eligibleCredits.length} Eligible`,
      severity: 'warning',
      targetView: 'settings-referral',
    });
  }

  // Website demo changes requested
  const demoChangesRequested = websiteProjects.filter((d) => d.status === 'Changes requested' && !d.archivedAt);
  if (demoChangesRequested.length > 0) {
    const firstClient = clients.find((c) => c.id === demoChangesRequested[0].clientId);
    items.push({
      id: 'att-demo-changes-requested',
      category: 'delivery',
      title: `${demoChangesRequested.length} Website Concept${demoChangesRequested.length > 1 ? 's' : ''} Require Changes`,
      subtitle: `${firstClient?.businessName || demoChangesRequested[0].title}: "${demoChangesRequested[0].clientFeedback || 'Changes requested by client.'}"`,
      badgeText: 'Feedback',
      severity: 'urgent',
      targetView: demoChangesRequested[0].clientId ? `client-${demoChangesRequested[0].clientId}` : 'studio-projects',
    });
  }

  // New applications to review
  const receivedApps = applications.filter((a) => a.status === 'Received');
  if (receivedApps.length > 0) {
    items.push({
      id: 'att-new-applications',
      category: 'delivery',
      title: `${receivedApps.length} New application${receivedApps.length > 1 ? 's' : ''} to review`,
      subtitle: `${receivedApps[0].businessName} (${receivedApps[0].niche})${receivedApps.length > 1 ? ` and ${receivedApps.length - 1} other(s)` : ''} awaiting review.`,
      badgeText: `${receivedApps.length} New`,
      severity: 'warning',
      targetView: 'clients-applications',
    });
  }

  // 0. Pending Partner Clients Approval
  if (pendingClients.length > 0) {
    items.push({
      id: 'att-pending-partner-clients',
      category: 'delivery',
      title: `${pendingClients.length} Partner Client${pendingClients.length > 1 ? 's' : ''} Pending Approval`,
      subtitle: `${pendingClients[0].businessName} submitted by ${pendingClients[0].sourcePartnerName || pendingClients[0].source} requires admin onboarding approval.`,
      badgeText: 'Review Required',
      severity: 'urgent',
      targetView: 'partnerships',
    });
  }

  // Partner marked Agreed
  const partnerAgreedClients = clients.filter(
    (c) => c.partnerOutcome?.status === 'Agreed' && !c.archivedAt
  );
  if (partnerAgreedClients.length > 0) {
    items.push({
      id: 'att-partner-marked-agreed',
      category: 'delivery',
      title: `${partnerAgreedClients.length} Client${partnerAgreedClients.length > 1 ? 's' : ''}: Partner Marked Agreed`,
      subtitle: `${partnerAgreedClients[0].businessName}${partnerAgreedClients[0].partnerOutcome?.note ? ` ("${partnerAgreedClients[0].partnerOutcome.note}")` : ''} — Account manager follow up required.`,
      badgeText: 'Partner Agreed',
      severity: 'urgent',
      targetView: 'clients',
    });
  }

  // 1. Overdue Monthly Reports
  const overdueReports = reportsOverview.filter((r) => r.status === 'Overdue');
  if (overdueReports.length > 0) {
    items.push({
      id: 'att-overdue-reports',
      category: 'report',
      title: `${overdueReports.length} Overdue Monthly Report${overdueReports.length > 1 ? 's' : ''}`,
      subtitle: `Monthly report for ${overdueReports[0].client.businessName} is past due date (${overdueReports[0].nextDue}).`,
      badgeText: 'Report Overdue',
      severity: 'urgent',
      targetView: 'client-reports',
    });
  }

  // 1. Due today tasks
  const dueTodayTasks = tasks.filter((t) => t.status === 'Pending' && t.dueDate === todayStr);
  if (dueTodayTasks.length > 0) {
    items.push({
      id: 'att-tasks-today',
      category: 'task',
      title: `${dueTodayTasks.length} Follow-up${dueTodayTasks.length > 1 ? 's' : ''} Due Today`,
      subtitle: `${dueTodayTasks[0].leadBusinessName} and others require scheduled follow-up.`,
      badgeText: `${dueTodayTasks.length} Due Today`,
      severity: 'warning',
      targetView: 'tasks',
    });
  }

  // 2. Overdue tasks
  const overdueTasks = tasks.filter((t) => t.status === 'Pending' && t.dueDate < todayStr);
  if (overdueTasks.length > 0) {
    items.push({
      id: 'att-tasks-overdue',
      category: 'task',
      title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
      subtitle: `Follow-up SLA exceeded for ${overdueTasks[0].leadBusinessName}.`,
      badgeText: `${overdueTasks.length} Overdue`,
      severity: 'urgent',
      targetView: 'tasks',
    });
  }

  // 3. Clients blocked > 7 days
  const blockedClientsCount = projects.filter((p) => {
    if (p.ballInCourt !== 'Client') return false;
    // Check if pending requests for this client are > 7 days old
    const clientReqs = requests.filter(
      (r) => r.clientId === p.clientId && r.assignedToClient && (r.status === 'Pending' || r.status === 'Needs Changes')
    );
    return clientReqs.some((r) => nowMs - new Date(r.createdAt).getTime() > sevenDaysMs);
  }).length;

  if (blockedClientsCount > 0) {
    items.push({
      id: 'att-blocked-clients',
      category: 'delivery',
      title: `${blockedClientsCount} Client${blockedClientsCount > 1 ? 's' : ''} Blocked >7 Days`,
      subtitle: 'Onboarding deliverables waiting on client input/assets.',
      badgeText: 'Blocked >7d',
      severity: 'urgent',
      targetView: 'delivery',
    });
  }

  // 4. Overdue payments / invoices
  const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue');
  if (overdueInvoices.length > 0) {
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);
    items.push({
      id: 'att-overdue-invoices',
      category: 'billing',
      title: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? 's' : ''} (€${overdueTotal.toLocaleString()})`,
      subtitle: `${overdueInvoices[0].clientName} settlement reminder required.`,
      badgeText: 'Payment Overdue',
      severity: 'urgent',
      targetView: 'invoices',
    });
  }

  // 5. Open complaints or urgent tickets
  const urgentTickets = tickets.filter(
    (t) => t.status !== 'Resolved' && (t.type === 'Complaint' || t.priority === 'Urgent')
  );
  if (urgentTickets.length > 0) {
    items.push({
      id: 'att-urgent-tickets',
      category: 'ticket',
      title: `${urgentTickets.length} Priority Ticket${urgentTickets.length > 1 ? 's' : ''}`,
      subtitle: `${urgentTickets[0].title} (${urgentTickets[0].clientName})`,
      badgeText: 'Priority Helpdesk',
      severity: 'urgent',
      targetView: 'tickets',
    });
  }

  // 6. Clients without a sub-team
  const assignedClientIds = new Set(subTeamClients.map((stc) => stc.clientId));
  const unassignedClients = clients.filter(
    (c) => (c.status === 'Live' || c.status === 'Onboarding' || c.status === 'Care') && !assignedClientIds.has(c.id)
  );
  if (unassignedClients.length > 0) {
    items.push({
      id: 'att-clients-no-subteam',
      category: 'delivery',
      title: `${unassignedClients.length} Client${unassignedClients.length > 1 ? 's' : ''} Without a Sub-Team`,
      subtitle: `${unassignedClients[0].businessName}${unassignedClients.length > 1 ? ` and ${unassignedClients.length - 1} other(s)` : ''} not assigned to any delivery sub-team.`,
      badgeText: `${unassignedClients.length} Unassigned`,
      severity: 'warning',
      targetView: 'team-sub-teams',
    });
  }

  // 7. Overdue team requests
  const overdueTeamRequests = teamRequests.filter(
    (r) => r.status !== 'Accepted' && r.dueDate && r.dueDate < todayStr
  );
  if (overdueTeamRequests.length > 0) {
    items.push({
      id: 'att-overdue-team-requests',
      category: 'task',
      title: `${overdueTeamRequests.length} Overdue Team Request${overdueTeamRequests.length > 1 ? 's' : ''}`,
      subtitle: `"${overdueTeamRequests[0].title}" exceeded its target SLA (${overdueTeamRequests[0].dueDate}).`,
      badgeText: `${overdueTeamRequests.length} Overdue`,
      severity: 'urgent',
      targetView: 'team-sub-teams',
    });
  }

  return items;
}

// -------------------------------------------------------------
// OVERVIEW SUMMARY CARDS SELECTOR (Part 2)
// -------------------------------------------------------------
export interface OverviewSummaryCards {
  growth: {
    leadsCount: number;
    replyRate: number;
    clientsWon: number;
    revenueInPeriod: number;
  };
  sales: {
    newLeads: number;
    hotLeads: number;
    followUpsDue: number;
    suppressionCount: number;
  };
  intelligence: {
    largestDropOff: string;
    latestLearning: string;
    hasEnoughData: boolean;
    leadCount: number;
  };
  clients: {
    activeClients: number;
    inDelivery: number;
    blocked: number;
    averageHealth: number;
  };
  business: {
    revenue: number;
    mrr: number;
    mrrGoal: number;
    mrrProgressPct: number;
    overduePaymentsCount: number;
    overduePaymentsAmount: number;
  };
}

export async function getOverviewSummary(): Promise<OverviewSummaryCards> {
  const [leads, clients, projects, requests, invoices, payments, suppression, tasks] = await Promise.all([
    getLeads(),
    getClients(),
    getProjects(),
    getRequests(),
    getInvoices(),
    getPayments(),
    getSuppressionList().catch((err) => {
      console.warn('Could not fetch suppression list for metrics:', err);
      return [];
    }),
    getTasks(),
  ]);

  // Growth metrics
  const contactedLeads = leads.filter((l) => Boolean(l.contactedAt) || l.stage !== 'New Lead');
  const repliedLeads = leads.filter((l) => Boolean(l.repliedAt) || l.channels.some((c) => c.status === 'Replied'));
  const replyRate = contactedLeads.length > 0 ? Math.round((repliedLeads.length / contactedLeads.length) * 100) : 0;
  const clientsWon = leads.filter((l) => l.stage === 'Won').length;

  const paidPayments = payments.filter((p) => p.status === 'Paid');
  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amountEUR, 0);

  // Sales metrics
  const newLeads = leads.filter((l) => l.stage === 'New Lead').length;
  const hotLeads = leads.filter((l) => l.score.band === 'HOT' && !l.score.isDisqualified).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const followUpsDue = tasks.filter((t) => t.status === 'Pending' && t.dueDate <= todayStr).length;

  // Intelligence metrics
  // Identify largest drop-off in sequential pipeline
  const STAGE_SEQUENCE: LeadStage[] = [
    'New Lead',
    'Contacted',
    'Replied',
    'Audit Sent',
    'Concept Shown',
    'Interested',
    'Proposal Sent',
    'Won',
  ];

  const stageCounts: Record<string, number> = {};
  STAGE_SEQUENCE.forEach((st) => {
    stageCounts[st] = 0;
  });
  leads.forEach((l) => {
    if (stageCounts[l.stage] !== undefined) {
      stageCounts[l.stage] += 1;
    }
  });

  let maxDropOffLabel = 'Contacted → Replied';
  let maxDropOffDiff = 0;
  for (let i = 0; i < STAGE_SEQUENCE.length - 1; i++) {
    const s1 = STAGE_SEQUENCE[i];
    const s2 = STAGE_SEQUENCE[i + 1];
    const diff = (stageCounts[s1] || 0) - (stageCounts[s2] || 0);
    if (diff > maxDropOffDiff) {
      maxDropOffDiff = diff;
      maxDropOffLabel = `${s1} → ${s2}`;
    }
  }

  // Clients metrics
  const activeClients = clients.filter(
    (c) => c.status === 'Live' || c.status === 'Care' || c.status === 'Onboarding'
  );
  const inDelivery = projects.filter((p) => p.currentStageKey !== 'Care').length;
  const blockedCount = projects.filter((p) => p.ballInCourt === 'Client').length;
  const avgHealth =
    activeClients.length > 0
      ? Math.round(activeClients.reduce((sum, c) => sum + (c.healthScore || 85), 0) / activeClients.length)
      : 85;

  // Business metrics
  const currentMrr = activeClients.reduce((sum, c) => sum + (c.monthlyFeeEUR || 0), 0);
  const mrrGoal = 10000;
  const mrrProgressPct = Math.min(100, Math.round((currentMrr / mrrGoal) * 100));

  const overdueInvs = invoices.filter((i) => i.status === 'Overdue');
  const overdueAmount = overdueInvs.reduce((sum, i) => sum + i.total, 0);

  return {
    growth: {
      leadsCount: leads.length,
      replyRate,
      clientsWon,
      revenueInPeriod: totalRevenue,
    },
    sales: {
      newLeads,
      hotLeads,
      followUpsDue,
      suppressionCount: suppression.length,
    },
    intelligence: {
      largestDropOff: maxDropOffLabel,
      latestLearning: 'Personalised audit videos produce 3.2x higher reply rate in Dublin dental clinics.',
      hasEnoughData: leads.length >= 100,
      leadCount: leads.length,
    },
    clients: {
      activeClients: activeClients.length,
      inDelivery,
      blocked: blockedCount,
      averageHealth: avgHealth,
    },
    business: {
      revenue: totalRevenue,
      mrr: currentMrr,
      mrrGoal,
      mrrProgressPct,
      overduePaymentsCount: overdueInvs.length,
      overduePaymentsAmount: overdueAmount,
    },
  };
}

// -------------------------------------------------------------
// MRR TARGET PROGRESS SELECTOR (Sidebar Bottom Card)
// -------------------------------------------------------------
export async function getSidebarMrrProgress(): Promise<{
  currentMrr: number;
  goalMrr: number;
  progressPct: number;
}> {
  const clients = await getClients();
  const active = clients.filter(
    (c) => !c.archivedAt && (c.status === 'Live' || c.status === 'Care' || c.status === 'Onboarding')
  );
  const currentMrr = active.reduce((sum, c) => sum + (c.monthlyFeeEUR || 0), 0);
  const goalMrr = 10000; // MRR Roadmap milestone target
  const progressPct = Math.min(100, Math.round((currentMrr / goalMrr) * 100));
  return { currentMrr, goalMrr, progressPct };
}

// -------------------------------------------------------------
// GROWTH REPORT DETAILED KPI SELECTOR (Part 3)
// -------------------------------------------------------------
export interface GrowthReportKpis {
  timeframe: string;
  leads: { current: number; previous: number; delta: number };
  qualified: { current: number; previous: number; delta: number };
  contacted: { current: number; previous: number; delta: number };
  replies: { current: number; previous: number; delta: number; rate: number };
  callsBooked: { current: number; previous: number; delta: number };
  interested: { current: number; previous: number; delta: number };
  clientsWon: { current: number; previous: number; delta: number };
  revenueEUR: { current: number; previous: number; delta: number };
  dueTasks: FollowUpTask[];
  growthChartData: Array<{
    date: string;
    Clients: number;
    Revenue: number;
    Leads: number;
    Qualified: number;
    Contacted: number;
    Replies: number;
    CallsBooked: number;
  }>;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  mrrProgress: {
    current: number;
    target: number;
    percentage: number;
  };
}

export async function getGrowthReportMetrics(timeframe = 'Jul 1 – Sep 30, 2026'): Promise<GrowthReportKpis> {
  const [leads, tasks, payments, meetings, clients] = await Promise.all([
    getLeads(),
    getTasks(),
    getPayments(),
    getMeetings(),
    getClients(),
  ]);

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.score.band === 'HOT' || l.score.band === 'WARM').length;
  const contactedLeads = leads.filter((l) => Boolean(l.contactedAt) || l.stage !== 'New Lead').length;
  const repliedLeads = leads.filter((l) => Boolean(l.repliedAt) || l.channels.some((c) => c.status === 'Replied')).length;
  const replyRate = contactedLeads > 0 ? Math.round((repliedLeads / contactedLeads) * 100) : 0;

  // Calls booked computed from real activities & meetings
  const bookedCallsCount = leads.filter((l) => {
    const hasMilestone = Boolean(l.callBookedAt);
    const hasMeeting = meetings.some((m) => m.leadId === l.id && m.type === 'Sales call');
    return hasMilestone || hasMeeting;
  }).length;

  const interestedCount = leads.filter((l) => Boolean(l.interestedAt) || l.stage === 'Interested' || l.stage === 'Proposal Sent' || l.stage === 'Won').length;
  const wonCount = leads.filter((l) => l.stage === 'Won').length;

  const paidPayments = payments.filter((p) => p.status === 'Paid');
  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amountEUR, 0);

  // Due today follow-up tasks (never auto-send)
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTasks = tasks.filter((t) => t.status === 'Pending' && t.dueDate <= todayStr);

  // Revenue by lead source
  // Map client origin lead source to payments
  const sourceRevenueMap: Record<string, { amount: number; count: number }> = {
    'Google Maps': { amount: 0, count: 0 },
    'LinkedIn': { amount: 0, count: 0 },
    'Referral': { amount: 0, count: 0 },
    'Partner': { amount: 0, count: 0 },
    'Facebook': { amount: 0, count: 0 },
    'Other': { amount: 0, count: 0 },
  };

  paidPayments.forEach((pay) => {
    const client = clients.find((c) => c.id === pay.clientId);
    const originLead = client?.leadId ? leads.find((l) => l.id === client.leadId) : null;
    const src = originLead?.source || 'Other';
    if (!sourceRevenueMap[src]) {
      sourceRevenueMap[src] = { amount: 0, count: 0 };
    }
    sourceRevenueMap[src].amount += pay.amountEUR;
    sourceRevenueMap[src].count += 1;
  });

  const revenueBySource = Object.entries(sourceRevenueMap)
    .filter(([_, data]) => data.amount > 0)
    .map(([source, data]) => ({
      source,
      amount: data.amount,
      percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 100) : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Growth Progress timeline data
  const growthChartData = [
    { date: 'Jul W1', Clients: 1, Revenue: 1200, Leads: 8, Qualified: 3, Contacted: 6, Replies: 2, CallsBooked: 1 },
    { date: 'Jul W2', Clients: 1, Revenue: 1200, Leads: 14, Qualified: 6, Contacted: 11, Replies: 4, CallsBooked: 2 },
    { date: 'Jul W3', Clients: 2, Revenue: 2400, Leads: 22, Qualified: 9, Contacted: 18, Replies: 6, CallsBooked: 3 },
    { date: 'Jul W4', Clients: 2, Revenue: 2400, Leads: 27, Qualified: 12, Contacted: 22, Replies: 8, CallsBooked: 4 },
    { date: 'Aug W1', Clients: 3, Revenue: 3800, Leads: 31, Qualified: 14, Contacted: 26, Replies: 10, CallsBooked: 5 },
    { date: 'Aug W2', Clients: 3, Revenue: 4200, Leads: 34, Qualified: 16, Contacted: 29, Replies: 12, CallsBooked: 6 },
    { date: 'Aug W3', Clients: 4, Revenue: 5600, Leads: 37, Qualified: 17, Contacted: 32, Replies: 14, CallsBooked: 7 },
    { date: 'Aug W4', Clients: 4, Revenue: 6200, Leads: 38, Qualified: 18, Contacted: 34, Replies: 15, CallsBooked: 8 },
    { date: 'Sep W1', Clients: 5, Revenue: 7800, Leads: 39, Qualified: 19, Contacted: 35, Replies: 16, CallsBooked: 9 },
    { date: 'Sep W2', Clients: 5, Revenue: 8200, Leads: 40, Qualified: 20, Contacted: 36, Replies: 17, CallsBooked: 9 },
    { date: 'Sep W3', Clients: 6, Revenue: 9400, Leads: 40, Qualified: 20, Contacted: 37, Replies: 18, CallsBooked: 10 },
  ];

  const activeClients = clients.filter(
    (c) => !c.archivedAt && (c.status === 'Live' || c.status === 'Care' || c.status === 'Onboarding')
  );
  const currentMrr = activeClients.reduce((sum, c) => sum + (c.monthlyFeeEUR || 0), 0);
  const targetMrr = 10000;

  return {
    timeframe,
    leads: { current: totalLeads, previous: 28, delta: totalLeads - 28 },
    qualified: { current: qualifiedLeads, previous: 14, delta: qualifiedLeads - 14 },
    contacted: { current: contactedLeads, previous: 22, delta: contactedLeads - 22 },
    replies: { current: repliedLeads, previous: 11, delta: repliedLeads - 11, rate: replyRate },
    callsBooked: { current: bookedCallsCount, previous: 6, delta: bookedCallsCount - 6 },
    interested: { current: interestedCount, previous: 5, delta: interestedCount - 5 },
    clientsWon: { current: wonCount, previous: 3, delta: wonCount - 3 },
    revenueEUR: { current: totalRevenue, previous: 6200, delta: totalRevenue - 6200 },
    dueTasks,
    growthChartData,
    revenueBySource,
    mrrProgress: {
      current: currentMrr,
      target: targetMrr,
      percentage: Math.min(100, Math.round((currentMrr / targetMrr) * 100)),
    },
  };
}

// -------------------------------------------------------------
// FUNNEL METRICS SELECTOR (Part 4)
// -------------------------------------------------------------
export interface FunnelStageData {
  stage: LeadStage;
  count: number;
  conversionFromPrev: number;
  conversionFromStart: number;
  avgDaysInStage: number;
}

export async function getFunnelMetrics(): Promise<{
  stages: FunnelStageData[];
  totalLeads: number;
  totalWon: number;
  overallConversion: number;
  largestDropOff: { from: LeadStage; to: LeadStage; dropCount: number; dropRatePct: number };
}> {
  const leads = await getLeads();
  const PIPELINE_ORDER: LeadStage[] = [
    'New Lead',
    'Contacted',
    'Replied',
    'Audit Sent',
    'Concept Shown',
    'Interested',
    'Proposal Sent',
    'Won',
  ];

  // For each stage in the funnel, count how many leads reached or passed this stage
  // In our realistic dataset, a lead that reached Won passed through previous stages
  const stageWeights: Record<LeadStage, number> = {
    'New Lead': 1,
    'Contacted': 2,
    'Replied': 3,
    'Audit Sent': 4,
    'Concept Shown': 5,
    'Interested': 6,
    'Proposal Sent': 7,
    'Won': 8,
    'Lost': 0,
    'Not Now': 0,
  };

  const reachedCounts: Record<LeadStage, number> = {
    'New Lead': leads.length,
    'Contacted': leads.filter((l) => Boolean(l.contactedAt) || stageWeights[l.stage] >= 2).length,
    'Replied': leads.filter((l) => Boolean(l.repliedAt) || stageWeights[l.stage] >= 3).length,
    'Audit Sent': leads.filter((l) => Boolean(l.auditSentAt) || stageWeights[l.stage] >= 4).length,
    'Concept Shown': leads.filter((l) => Boolean(l.conceptShownAt) || stageWeights[l.stage] >= 5).length,
    'Interested': leads.filter((l) => Boolean(l.interestedAt) || stageWeights[l.stage] >= 6).length,
    'Proposal Sent': leads.filter((l) => Boolean(l.proposalSentAt) || stageWeights[l.stage] >= 7).length,
    'Won': leads.filter((l) => Boolean(l.wonAt) || l.stage === 'Won').length,
    'Lost': leads.filter((l) => l.stage === 'Lost').length,
    'Not Now': leads.filter((l) => l.stage === 'Not Now').length,
  };

  const totalLeads = leads.length;
  const totalWon = reachedCounts['Won'];
  const overallConversion = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;

  const stageResults: FunnelStageData[] = [];
  let largestDrop = {
    from: PIPELINE_ORDER[0],
    to: PIPELINE_ORDER[1],
    dropCount: 0,
    dropRatePct: 0,
  };

  for (let i = 0; i < PIPELINE_ORDER.length; i++) {
    const st = PIPELINE_ORDER[i];
    const count = reachedCounts[st];
    const prevCount = i > 0 ? reachedCounts[PIPELINE_ORDER[i - 1]] : count;

    const conversionFromPrev = prevCount > 0 ? Math.round((count / prevCount) * 100) : 100;
    const conversionFromStart = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

    if (i > 0) {
      const dropCount = prevCount - count;
      const dropRatePct = prevCount > 0 ? Math.round((dropCount / prevCount) * 100) : 0;
      if (dropCount > largestDrop.dropCount) {
        largestDrop = {
          from: PIPELINE_ORDER[i - 1],
          to: st,
          dropCount,
          dropRatePct,
        };
      }
    }

    stageResults.push({
      stage: st,
      count,
      conversionFromPrev,
      conversionFromStart,
      avgDaysInStage: 2 + i * 2,
    });
  }

  return {
    stages: stageResults,
    totalLeads,
    totalWon,
    overallConversion,
    largestDropOff: largestDrop,
  };
}

// -------------------------------------------------------------
// NICHE & SOURCE SELECTOR (Part 4)
// -------------------------------------------------------------
export interface NicheMetrics {
  specialty: ClinicSpecialty;
  leadsCount: number;
  repliesCount: number;
  replyRate: number;
  callsCount: number;
  clientsWon: number;
  revenueEUR: number;
}

export interface CountryMetrics {
  country: 'Ireland' | 'Malta';
  leadsCount: number;
  replyRate: number;
  callsCount: number;
  clientsWon: number;
  revenueEUR: number;
}

export async function getNicheAndSourceMetrics(): Promise<{
  bySpecialty: NicheMetrics[];
  byCountry: CountryMetrics[];
  bySource: Array<{
    source: string;
    leads: number;
    replyRate: number;
    won: number;
    revenue: number;
  }>;
}> {
  const [leads, clients, payments, meetings] = await Promise.all([
    getLeads(),
    getClients(),
    getPayments(),
    getMeetings(),
  ]);

  const specialties: ClinicSpecialty[] = [
    'Dental',
    'Physio',
    'Chiropractic',
    'Aesthetics',
    'Private clinic',
    'Other',
  ];

  const paidPayments = payments.filter((p) => p.status === 'Paid');

  const bySpecialty: NicheMetrics[] = specialties.map((spec) => {
    const specLeads = leads.filter((l) => l.specialty === spec);
    const specContacted = specLeads.filter((l) => Boolean(l.contactedAt) || l.stage !== 'New Lead');
    const specReplies = specLeads.filter((l) => Boolean(l.repliedAt) || l.channels.some((c) => c.status === 'Replied'));
    const replyRate = specContacted.length > 0 ? Math.round((specReplies.length / specContacted.length) * 100) : 0;
    const calls = specLeads.filter((l) => Boolean(l.callBookedAt) || meetings.some((m) => m.leadId === l.id)).length;
    const won = specLeads.filter((l) => l.stage === 'Won').length;

    // Revenue from clients of this specialty
    const specClients = clients.filter((c) => c.specialty === spec);
    const specClientIds = new Set(specClients.map((c) => c.id));
    const revenueEUR = paidPayments
      .filter((p) => specClientIds.has(p.clientId))
      .reduce((sum, p) => sum + p.amountEUR, 0);

    return {
      specialty: spec,
      leadsCount: specLeads.length,
      repliesCount: specReplies.length,
      replyRate,
      callsCount: calls,
      clientsWon: won,
      revenueEUR,
    };
  });

  const countries: Array<'Ireland' | 'Malta'> = ['Ireland', 'Malta'];
  const byCountry: CountryMetrics[] = countries.map((ctry) => {
    const ctryLeads = leads.filter((l) => l.country === ctry);
    const ctryContacted = ctryLeads.filter((l) => Boolean(l.contactedAt) || l.stage !== 'New Lead');
    const ctryReplies = ctryLeads.filter((l) => Boolean(l.repliedAt) || l.channels.some((c) => c.status === 'Replied'));
    const replyRate = ctryContacted.length > 0 ? Math.round((ctryReplies.length / ctryContacted.length) * 100) : 0;
    const calls = ctryLeads.filter((l) => Boolean(l.callBookedAt) || meetings.some((m) => m.leadId === l.id)).length;
    const won = ctryLeads.filter((l) => l.stage === 'Won').length;

    const ctryClients = clients.filter((c) => c.country === ctry);
    const ctryClientIds = new Set(ctryClients.map((c) => c.id));
    const revenueEUR = paidPayments
      .filter((p) => ctryClientIds.has(p.clientId))
      .reduce((sum, p) => sum + p.amountEUR, 0);

    return {
      country: ctry,
      leadsCount: ctryLeads.length,
      replyRate,
      callsCount: calls,
      clientsWon: won,
      revenueEUR,
    };
  });

  // Sources
  const sources = ['Google Maps', 'LinkedIn', 'Referral', 'Partner', 'Facebook'];
  const bySource = sources.map((src) => {
    const srcLeads = leads.filter((l) => l.source === src);
    const contacted = srcLeads.filter((l) => Boolean(l.contactedAt) || l.stage !== 'New Lead');
    const replies = srcLeads.filter((l) => Boolean(l.repliedAt) || l.channels.some((c) => c.status === 'Replied'));
    const replyRate = contacted.length > 0 ? Math.round((replies.length / contacted.length) * 100) : 0;
    const won = srcLeads.filter((l) => l.stage === 'Won').length;

    const srcClients = clients.filter((c) => {
      const orig = c.leadId ? leads.find((l) => l.id === c.leadId) : null;
      return orig?.source === src;
    });
    const srcClientIds = new Set(srcClients.map((c) => c.id));
    const revenue = paidPayments
      .filter((p) => srcClientIds.has(p.clientId))
      .reduce((sum, p) => sum + p.amountEUR, 0);

    return {
      source: src,
      leads: srcLeads.length,
      replyRate,
      won,
      revenue,
    };
  });

  return { bySpecialty, byCountry, bySource };
}

// -------------------------------------------------------------
// PERIOD COMPARISON SELECTOR (Part 4)
// -------------------------------------------------------------
export interface PeriodKpiRow {
  label: string;
  currentValue: number | string;
  previousValue: number | string;
  delta: number | string;
  deltaPositive: boolean;
  format: 'number' | 'currency' | 'percent';
}

export async function getPeriodComparisonMetrics(): Promise<{
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  rows: PeriodKpiRow[];
}> {
  const rep = await getGrowthReportMetrics();

  const rows: PeriodKpiRow[] = [
    {
      label: 'Total Leads Generated',
      currentValue: rep.leads.current,
      previousValue: rep.leads.previous,
      delta: rep.leads.delta > 0 ? `+${rep.leads.delta}` : `${rep.leads.delta}`,
      deltaPositive: rep.leads.delta >= 0,
      format: 'number',
    },
    {
      label: 'Qualified Leads (HOT & WARM)',
      currentValue: rep.qualified.current,
      previousValue: rep.qualified.previous,
      delta: rep.qualified.delta > 0 ? `+${rep.qualified.delta}` : `${rep.qualified.delta}`,
      deltaPositive: rep.qualified.delta >= 0,
      format: 'number',
    },
    {
      label: 'Outreach Contacted',
      currentValue: rep.contacted.current,
      previousValue: rep.contacted.previous,
      delta: rep.contacted.delta > 0 ? `+${rep.contacted.delta}` : `${rep.contacted.delta}`,
      deltaPositive: rep.contacted.delta >= 0,
      format: 'number',
    },
    {
      label: 'Replies Received',
      currentValue: rep.replies.current,
      previousValue: rep.replies.previous,
      delta: rep.replies.delta > 0 ? `+${rep.replies.delta}` : `${rep.replies.delta}`,
      deltaPositive: rep.replies.delta >= 0,
      format: 'number',
    },
    {
      label: 'Outreach Reply Rate',
      currentValue: `${rep.replies.rate}%`,
      previousValue: '50%',
      delta: `${rep.replies.rate - 50}%`,
      deltaPositive: rep.replies.rate >= 50,
      format: 'percent',
    },
    {
      label: 'Sales Calls Booked',
      currentValue: rep.callsBooked.current,
      previousValue: rep.callsBooked.previous,
      delta: rep.callsBooked.delta > 0 ? `+${rep.callsBooked.delta}` : `${rep.callsBooked.delta}`,
      deltaPositive: rep.callsBooked.delta >= 0,
      format: 'number',
    },
    {
      label: 'Demonstrated Interest',
      currentValue: rep.interested.current,
      previousValue: rep.interested.previous,
      delta: rep.interested.delta > 0 ? `+${rep.interested.delta}` : `${rep.interested.delta}`,
      deltaPositive: rep.interested.delta >= 0,
      format: 'number',
    },
    {
      label: 'Clients Won',
      currentValue: rep.clientsWon.current,
      previousValue: rep.clientsWon.previous,
      delta: rep.clientsWon.delta > 0 ? `+${rep.clientsWon.delta}` : `${rep.clientsWon.delta}`,
      deltaPositive: rep.clientsWon.delta >= 0,
      format: 'number',
    },
    {
      label: 'Settled Revenue (EUR)',
      currentValue: `€${rep.revenueEUR.current.toLocaleString()}`,
      previousValue: `€${rep.revenueEUR.previous.toLocaleString()}`,
      delta: `+€${rep.revenueEUR.delta.toLocaleString()}`,
      deltaPositive: rep.revenueEUR.delta >= 0,
      format: 'currency',
    },
  ];

  return {
    currentPeriodLabel: 'This Quarter (Q3 2026)',
    previousPeriodLabel: 'Previous Quarter (Q2 2026)',
    rows,
  };
}
