export type Role = 'Admin' | 'Account Manager' | 'Developer' | 'Ads Manager' | 'Client' | 'Partner';

export interface Organization {
  id: string;
  name: string;
  country: 'Ireland' | 'Malta';
  slug: string;
  currency: 'EUR';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  avatarUrl?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  revenue: number;
  replies: number;
  messagesSent: number;
  highlightBadge?: string;
}

export type ClinicSpecialty =
  | 'Dental'
  | 'Physio'
  | 'Chiropractic'
  | 'Aesthetics'
  | 'Private clinic'
  | 'Design & Branding'
  | 'Legal Services'
  | 'Digital Marketing'
  | 'Architecture'
  | 'Financial Consulting'
  | 'IT & Cloud'
  | 'Professional Services'
  | 'Other';

export type LeadStage =
  | 'New Lead'
  | 'Contacted'
  | 'Replied'
  | 'Audit Sent'
  | 'Concept Shown'
  | 'Interested'
  | 'Proposal Sent'
  | 'Won'
  | 'Lost'
  | 'Not Now';

export type LostReason =
  | 'Price'
  | 'Trust'
  | 'No need'
  | 'Existing agency'
  | 'No reply'
  | 'Other';

export type ChannelType =
  | 'Email'
  | 'LinkedIn'
  | 'Facebook'
  | 'Instagram'
  | 'Phone'
  | 'WhatsApp';

export type ChannelStatus =
  | 'Not contacted'
  | 'Contacted'
  | 'Replied'
  | 'Bounced'
  | 'Opted out';

export interface LeadChannel {
  id: string;
  type: ChannelType;
  value: string;
  status: ChannelStatus;
  lastContactedAt?: string;
  channelId?: string;
  stageId?: string;
}

export interface OutreachChannel {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  throttlingNote?: string;
  dailyCap?: number | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export type StageType = 'Open' | 'Replied' | 'Won' | 'Lost' | 'NotNow';

export interface ChannelPipelineStage {
  id: string;
  channelId: string;
  name: string;
  type: StageType;
  order: number;
  requiresReason?: boolean;
  requiresDate?: boolean;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface ChannelSequenceStep {
  stepNumber: number;
  delayValue: number;
  delayUnit: 'hours' | 'days';
  titleTemplate: string;
  noteTemplate?: string;
  priority?: 'Normal' | 'High' | 'Urgent';
}

export interface ChannelSequence {
  id: string;
  channelId: string;
  stageId: string;
  stageName?: string;
  versionNumber: number;
  name: string;
  isActive: boolean;
  steps: ChannelSequenceStep[];
  timezone: string;
  skipWeekends: boolean;
  createdAt: string;
  createdBy: string;
  isDemo?: boolean;
}

export interface LeadScoreCriteria {
  privateServices: 0 | 1 | 2;
  googleReviews: 0 | 1 | 2;
  websiteGap: 0 | 1 | 2;
  gbpGaps: 0 | 1 | 2;
  ownerAccessibility: 0 | 1 | 2;
  recentActivity: 0 | 1 | 2;
  scaleFit: 0 | 1 | 2;
}

export interface LeadDisqualifiers {
  corporateChain: boolean;
  fullyPublicFunded: boolean;
}

export interface LeadScore {
  criteria: LeadScoreCriteria;
  disqualifiers: LeadDisqualifiers;
  total: number;
  band: 'HOT' | 'WARM' | 'COLD';
  isDisqualified: boolean;
}

export type LeadActivityType =
  | 'created'
  | 'stage_changed'
  | 'message_sent'
  | 'reply_received'
  | 'note'
  | 'task_done'
  | 'score_changed'
  | 'converted_to_client'
  | 'call_booked';

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  channel?: ChannelType;
  fromStage?: LeadStage;
  toStage?: LeadStage;
  text: string;
  createdAt: string;
  createdBy: string;
}

export type CustomFieldType =
  | 'text'
  | 'long text'
  | 'number'
  | 'url'
  | 'date'
  | 'yes/no'
  | 'single select';

export interface LeadCustomFieldDefinition {
  id: string;
  label: string;
  key: string;
  type: CustomFieldType;
  options?: string[];
  required: boolean;
  showInList: boolean;
  searchable: boolean;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  businessName: string;
  specialty: ClinicSpecialty;
  niche?: string;
  country: string;
  city: string;
  hasWebsite: 'none' | 'facebook-only' | 'basic' | 'good';
  googleReviewCount: number;
  googleRating: number;
  gbpStatus: 'missing' | 'incomplete' | 'complete';
  ownerName: string;
  ownerRole: string;
  source: 'Google Maps' | 'LinkedIn' | 'Facebook' | 'Referral' | 'Partner' | 'Other';
  sourcePartnerId?: string;
  stage: LeadStage;
  lostReason?: LostReason;
  notNowUntil?: string; // YYYY-MM-DD
  score: LeadScore;
  channels: LeadChannel[];
  channelId?: string;
  channelStageId?: string;
  customFields?: Record<string, any>;
  notes: string;
  assignedTo: string;
  createdAt: string;
  contactedAt?: string;
  repliedAt?: string;
  auditSentAt?: string;
  conceptShownAt?: string;
  interestedAt?: string;
  proposalSentAt?: string;
  wonAt?: string;
  callBookedAt?: string;
  clientId?: string;
  archivedAt?: string | null;
  lastActivityAt?: string;
  isDemo?: boolean;
}

export interface FollowUpTask {
  id: string;
  leadId: string;
  leadBusinessName: string;
  taskText: string;
  channelType?: ChannelType;
  channelId?: string;
  channelName?: string;
  stageId?: string;
  stageName?: string;
  note?: string;
  dueDate: string; // YYYY-MM-DD
  priority: 'Normal' | 'High' | 'Urgent';
  sourceTag: string; // 'Manual' | 'Sequence step 1' | 'Not Now date'
  status: 'Pending' | 'Completed' | 'Cancelled';
  sequenceVersionId?: string;
  sequenceStepNumber?: number;
  completedAt?: string;
  createdAt: string;
  assignedTo?: string;
  isDemo?: boolean;
}

export interface SequenceStep {
  stepNumber: number;
  title: string;
  delayHours: number;
  channel: ChannelType;
  templateId?: string;
}

export interface SequenceVersion {
  id: string;
  versionNumber: number;
  name: string;
  steps: SequenceStep[];
  createdAt: string;
  isActive: boolean;
}

export interface MessageTemplate {
  id: string;
  title: string;
  channel: ChannelType;
  version: number;
  content: string;
  replyRate: number;
  timesUsed: number;
  createdAt: string;
  description?: string;
}

export interface OutreachLog {
  id: string;
  leadId: string;
  leadBusinessName: string;
  channel: ChannelType;
  templateId?: string;
  templateTitle?: string;
  status: 'Sent' | 'Delivered' | 'Replied' | 'Bounced' | 'Opted out';
  sentAt: string;
  sentBy: string;
  notes?: string;
}

export type SuppressionType = 'email' | 'domain' | 'phone' | 'social_handle' | 'business_name';
export type SuppressionReason = 'Asked to stop' | 'Bounced' | 'Complained' | 'Other';

export interface SuppressionEntry {
  id: string;
  contactValue: string;
  type: SuppressionType;
  reason: SuppressionReason;
  dateAdded: string;
  addedBy: string;
  notes?: string;
  archivedAt?: string | null;
  isDemo?: boolean;
}

export type PartnerType =
  | 'GDPR consultant'
  | 'Marketing freelancer'
  | 'Clinic supplier'
  | 'Local agency'
  | 'Accountant'
  | 'Other'
  | string;

export type PartnerStage =
  | 'Identified'
  | 'Contacted'
  | 'Conversation'
  | 'Proposal'
  | 'Active'
  | 'Inactive';

export interface PartnerReferralTerms {
  type: 'None' | 'Fixed fee' | 'Percentage';
  amount: number;
}

export type DealModel =
  | 'Revenue share % per client'
  | 'Fixed fee per client'
  | 'One-time referral fee'
  | 'Custom';

export type DealAppliesTo = 'Setup fees' | 'Monthly fees' | 'Both';

export type DealCurrency = 'EUR' | 'BDT';

export interface PartnerDealTerms {
  dealSummary: string; // free text: what we agreed
  dealModel: DealModel;
  sharePercentage?: number; // 0-100
  fixedAmount?: number;
  appliesTo: DealAppliesTo;
  cashBasis: boolean; // share applies on payments RECEIVED (cash basis)
  currency: DealCurrency;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  documentLink?: string; // optional document URL
}

export interface PartnerDealVersion {
  id: string;
  version: number;
  terms: PartnerDealTerms;
  changedAt: string;
  changedBy: string;
  summaryOfChange?: string;
}

export type PartnerPortalType =
  | 'No portal'
  | 'Standard partner portal (Open Hours branding)'
  | 'Branded partner portal (partner logo, name, colours)';

export interface PartnerPortalBranding {
  logoUrl?: string;
  brandName?: string;
  primaryColor?: string;
}

export interface PartnerClientVisibility {
  enabled: boolean; // default false
  businessName: boolean;
  projectStage: boolean;
  monthlyReportSummary: boolean;
  contactName: boolean;
}

export interface Partner {
  id: string;
  name: string;
  organisation: string;
  type: PartnerType;
  country: string;
  city: string;
  contactChannels: Array<{ type: string; value: string }>;
  email?: string;
  stage: PartnerStage;
  referralTerms: PartnerReferralTerms;
  notes: string;
  owner: string;
  referralsCount: number;
  feesOwed: number;
  feesPaid: number;
  archivedAt?: string | null;
  createdAt: string;
  isDemo?: boolean;

  // Structured deal terms & version history
  dealTerms?: PartnerDealTerms;
  dealHistory?: PartnerDealVersion[];

  // Partner portal & visibility configuration
  portalType?: PartnerPortalType;
  portalBranding?: PartnerPortalBranding;
  clientVisibility?: PartnerClientVisibility;
  portalLoginEmail?: string;
  inviteSentAt?: string;
  poweredByOpenHours?: boolean;
  allowDemoRevealSharing?: boolean;
}

export interface PartnerActivity {
  id: string;
  partnerId: string;
  type: 'created' | 'stage_changed' | 'message_sent' | 'reply_received' | 'note' | 'fee_paid';
  fromStage?: PartnerStage;
  toStage?: PartnerStage;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface Referral {
  id: string;
  partnerId: string;
  partnerName: string;
  leadId: string;
  leadName: string;
  clientId?: string;
  status: 'Pending' | 'Qualified' | 'Closed Won' | 'Lost';
  feeAmount: number;
  feeStatus: 'Pending' | 'Owed' | 'Paid';
  createdAt: string;
}

// ==========================================
// PHASE 3 MODELS: CLIENTS, DELIVERY & BUSINESS
// ==========================================

export type ClientPackage = 'Regular' | 'Advanced' | 'Premium';
export type ClientStatus = 'Onboarding' | 'Live' | 'Care' | 'Paused' | 'Churned' | 'Pending approval';

export interface ClientSecurityBasics {
  httpsEnabled?: { verified: boolean; verifiedDate?: string };
  privacyPolicyAdded?: { verified: boolean; verifiedDate?: string };
  cookieNoticeAdded?: { verified: boolean; verifiedDate?: string };
  contactFormTested?: { verified: boolean; verifiedDate?: string };
}

export interface Client {
  id: string;
  leadId?: string; // Origin lead id
  sourcePartnerId?: string;
  sourcePartnerName?: string;
  claimedPrice?: number;
  claimedCurrency?: 'EUR' | 'BDT';
  businessName: string;
  clinicName?: string; // for backward compatibility with Phase 1 components
  specialty: ClinicSpecialty;
  niche?: string;
  country: string;
  city: string;
  location?: 'Dublin' | 'Cork' | 'Galway' | 'Sliema' | 'Valletta';
  ownerName: string;
  ownerRole: string;
  package: ClientPackage;
  status: ClientStatus;
  startDate: string; // YYYY-MM-DD
  monthlyFeeEUR: number;
  setupFeeEUR: number;
  accountManagerId: string;
  healthScore: number; // 0-100 computed
  notes: string;
  archivedAt?: string | null;
  portalUserEmail?: string;
  baselineAverageValuePerNewCustomerEUR?: number;
  monthlyRetainer?: number; // alias for Phase 1
  unreadCount?: number;
  phone?: string;
  email?: string;
  isDemo?: boolean;
  // Source attribution (Direct or Partner)
  source?: string;
  // Report scheduling
  reportDayOfMonth?: number; // 1-28
  nextReportDue?: string; // YYYY-MM-DD
  lastReportPublishedAt?: string; // YYYY-MM-DD
  liveReportUrl?: string; // https:// only
  liveReportLabel?: string; // e.g. "Google Analytics" / "Looker Studio"
  googleReviewLink?: string; // https:// only
  securityBasics?: {
    httpsEnabled?: { verified: boolean; verifiedDate?: string };
    privacyPolicyAdded?: { verified: boolean; verifiedDate?: string };
    cookieNoticeAdded?: { verified: boolean; verifiedDate?: string };
    contactFormTested?: { verified: boolean; verifiedDate?: string };
  };
  showPlanPriceInPortal?: boolean;
  roiEstimatorEnabled?: boolean;
  welcomeMomentDismissed?: boolean;
  referralCode?: string;
  referralOverrideEnabled?: boolean;
  referralOverrideMode?: 'use_default' | 'on' | 'off';
  referralCustomMilestoneRows?: ReferralMilestoneRow[];
  referralFriendRewardMonths?: number;
  savingsPriceAmount?: number;
  savingsPriceCurrency?: string;
  savingsPricePeriod?: string;
  referralClientExplainer?: ExplainerConfig;
  referralGuestExplainer?: ExplainerConfig;
  referralGuestFeatureAccess?: Partial<Record<PortalFeatureKey, 'locked' | 'hidden' | 'open'>>;
  receivedFreeMonthsFromReferral?: number;
  portalFeatureOverrides?: Partial<Record<PortalFeatureKey, 'on' | 'off' | 'default'>>;
  portalPresetId?: string;
  showTeamToClient?: boolean;
  partnerOutcome?: PartnerClientOutcome;
}

export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type ProjectStageKey =
  | 'Kickoff'
  | 'Content Collection'
  | 'Design'
  | 'Client Review'
  | 'Development'
  | 'QA'
  | 'Launch'
  | '30-Day Optimisation'
  | 'Care'
  | string;

export type StageStatus =
  | 'Not started'
  | 'In progress'
  | 'Waiting on client'
  | 'Pending approval'
  | 'Done';

export interface ProjectStageChecklistItem {
  id: string;
  title: string;
  done: boolean;
  required: boolean;
  priority?: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  assignedBy?: string;
  assignedAt?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  stageKey?: string;
  clientId?: string;
  clientName?: string;
}

export interface ProjectStage {
  id?: string;
  key: string; // name of the stage
  name?: string; // display name
  status: StageStatus;
  order?: number;
  dueDate?: string; // YYYY-MM-DD
  visibleToClient?: boolean;
  archived?: boolean; // soft delete
  plannedStart: string; // YYYY-MM-DD
  plannedEnd: string; // YYYY-MM-DD
  actualStart?: string;
  actualEnd?: string;
  ownerId: string;
  checklist: ProjectStageChecklistItem[];
}

export interface Project {
  id: string;
  clientId: string;
  currentStageKey: string;
  stages: ProjectStage[];
  ballInCourt: 'Us' | 'Client';
  targetLaunchDate: string;
  isDemo?: boolean;
}

export type RequestType =
  | 'Logo'
  | 'Photos'
  | 'Copy/Text'
  | 'GBP access'
  | 'Domain access'
  | 'Information'
  | 'Approval';

export type RequestStatus = 'Pending' | 'Submitted' | 'Approved' | 'Needs Changes';

export interface RequestComment {
  id: string;
  authorName: string;
  authorRole: 'admin' | 'client';
  text: string;
  createdAt: string;
}

export interface RequestAttachment {
  name: string;
  sizeBytes: number;
  mime: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface Request {
  id: string;
  clientId: string;
  projectId?: string;
  partnerId?: string;
  type: RequestType;
  title: string;
  description: string;
  exampleHelpText?: string;
  deadline: string; // YYYY-MM-DD
  status: RequestStatus;
  assignedToClient: boolean;
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  reminderSchedule: string[];
  comments: RequestComment[];
  submittedContent?: string;
  submittedFiles?: string[];
  attachments?: RequestAttachment[];
  isDemo?: boolean;
}

export type FileFolder = 'Brand' | 'Photos' | 'Content' | 'Legal' | 'Reports' | 'Deliverables';

export interface FileItem {
  id: string;
  clientId: string;
  requestId?: string;
  folder: FileFolder;
  name: string;
  sizeBytes: number;
  mime: string;
  direction: 'From client' | 'From us';
  uploadedBy: string;
  uploadedAt: string;
  storageRef: string;
  dataUrl?: string;
  archivedAt?: string | null;
  isDemo?: boolean;
}

export type MeetingType =
  | 'Kickoff'
  | 'Review'
  | 'Strategy'
  | 'Sales call'
  | 'Partner call'
  | 'Support';

export interface Meeting {
  id: string;
  clientId?: string;
  leadId?: string;
  partnerId?: string;
  type: MeetingType;
  title: string;
  startsAt: string; // ISO string or YYYY-MM-DDTHH:mm
  durationMin: number;
  timezone: string;
  link: string;
  agenda: string;
  attendees: string[];
  summary?: string;
  actionItems: string[];
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  date?: string; // Phase 1 compatibility
  time?: string; // Phase 1 compatibility
  clinicName?: string;
  hostName?: string;
  isDemo?: boolean;
}

export type TicketType = 'Change' | 'Bug' | 'Question' | 'Complaint';
export type TicketStatus = 'Received' | 'In progress' | 'Resolved';
export type TicketScope = 'In package' | 'Extra cost';

export interface TicketComment {
  id: string;
  authorName: string;
  authorRole: 'admin' | 'client';
  text: string;
  isInternalOnly?: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  clientId: string;
  clientName: string;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  scope: TicketScope;
  extraCostEUR?: number;
  priority: 'Normal' | 'High' | 'Urgent';
  promisedResponseBy: string; // ISO string
  firstResponseAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  comments: TicketComment[];
  createdAt: string;
  isDemo?: boolean;
}

export type PaymentKind = 'Setup' | 'Monthly care' | 'Ads management' | 'Add-on' | 'Other';
export type PaymentCurrency = 'EUR' | 'GBP' | 'USD' | 'BDT';
export type PaymentMethod = 'Wise' | 'Payoneer' | 'Bank transfer' | 'Card' | 'Other';
export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  invoiceId?: string;
  kind: PaymentKind;
  originalCurrency: PaymentCurrency;
  originalAmount: number;
  fxRateToBDT: number;
  amountBDT: number; // computed
  amountEUR: number; // computed / base
  paidAt: string; // YYYY-MM-DD
  method: PaymentMethod;
  status: PaymentStatus;
  referenceNote?: string;
  notes?: string;
  date?: string; // Phase 1 compatibility
  amount?: number; // Phase 1 compatibility
  isDemo?: boolean;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceEUR: number;
  totalEUR: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  number: string; // OH-YYYY-NNNN
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatNote: string; // "VAT treatment: NEEDS PROFESSIONAL ADVICE"
  total: number;
  currency: 'EUR';
  status: InvoiceStatus;
  paidAt?: string;
  isDemo?: boolean;
}

export interface CompanyProfile {
  legalName: string;
  address: string;
  taxNumber: string;
  bankDetails: string;
  contactEmail: string;
}

export interface GrowthReportData {
  timeframeLabel: string;
  timeframeRange: string;
  selectedMemberId: string;
  hero: {
    revenue: number;
    previousRevenue: number;
    growthPercent: number;
    growthDiff: number;
    topChannel: {
      replies: number;
      name: string;
      code: string;
    };
    bestDeal: {
      amount: number;
      clientName: string;
    };
    leads: {
      total: number;
      hot: number;
    };
  };
  shareSegments: Array<{
    id: string;
    label: string;
    tooltip: string;
    amount: number;
    percentage: number;
    icon: 'mail' | 'link' | 'handshake' | 'phone';
  }>;
  revenueBySource: Array<{
    id: string;
    label: string;
    amount: number;
    percentage: number;
    shareOfTotal: number;
    icon: 'mail' | 'link' | 'handshake' | 'phone';
  }>;
  clientsBySpecialty: Array<{
    id: string;
    specialty: ClinicSpecialty;
    count: number;
    percentage: number;
    isHatched: boolean;
    icon: 'smile' | 'activity' | 'sparkles' | 'stethoscope';
  }>;
  teamPerformance: Array<{
    id: string;
    name: string;
    initials: string;
    revenue: number;
    replies: number;
    messagesSent: number;
  }>;
  channelCards: Array<{
    id: string;
    title: string;
    percentage: number;
    revenue: number;
  }>;
  channelValue: {
    channelName: string;
    stats: {
      revenue: number;
      leadsTotal: number;
      leadsQualified: number;
      leadsClosed: number;
      winLoss: string;
    };
    monthlyBars: Array<{
      month: string;
      value: number;
      isHatched: boolean;
      tooltipPill?: string;
    }>;
  };
  pipelineDynamic: {
    weeklyData: Array<{
      week: string;
      current: number;
      previous: number;
    }>;
  };
}

export interface GrowthReportFilter {
  memberId?: string;
  timeframe?: string;
  channelValueMetric?: 'Revenue' | 'Leads' | 'Win/Loss';
}

// ==========================================
// CLIENT PORTAL MODELS
// ==========================================

export type PortalSectionKey =
  | 'projectProgress'
  | 'requests'
  | 'files'
  | 'meetings'
  | 'tickets'
  | 'monthlyReport';

export type MetricSource = 'GA4' | 'Google Business Profile' | 'Manual';

export interface MonthlyReportMetric {
  value: number;
  source: MetricSource;
}

export type MonthlyReportStatus = 'Draft' | 'Published';

export interface MonthlyReportCorrection {
  version: number;
  editedAt: string;
  editedBy: string;
  reason?: string;
  snapshot: any;
}

export interface ClientMonthlyReport {
  id: string;
  clientId: string;
  clientName?: string;
  month: string; // YYYY-MM
  monthLabel: string; // e.g. "September 2026"
  status: MonthlyReportStatus;
  visitors: MonthlyReportMetric;
  enquiries: MonthlyReportMetric;
  profileViews: MonthlyReportMetric;
  calls: MonthlyReportMetric;
  directionRequests: MonthlyReportMetric;
  bookings?: MonthlyReportMetric;
  topPages: string;
  whatWeDid: string[];
  nextMonthPlan: string[];
  shortNote: string;
  estimatedRoiMultiplier?: number;
  publishedAt?: string;
  publishedBy?: string;
  version: number;
  history?: MonthlyReportCorrection[];
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface InAppNotification {
  id: string;
  recipientId: string; // memberId or 'all'
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
  clientId?: string;
  link?: string;
  isDemo?: boolean;
}

// ==========================================
// PORTAL EXPERIENCE & ONBOARDING MODELS
// ==========================================

export type WeeklySnapshotMetricSource = 'GA4' | 'Google Business Profile' | 'PageSpeed Insights' | 'Manual';

export interface WeeklySnapshotMetric {
  id?: string;
  label: string;
  value: string;
  source: WeeklySnapshotMetricSource;
  asOfDate: string; // YYYY-MM-DD
  testDate?: string; // required if source === 'PageSpeed Insights'
}

export interface ClientWeeklySnapshot {
  id: string;
  clientId: string;
  weekLabel: string; // e.g. "Week of 12 Oct 2026"
  weekStartDate: string; // YYYY-MM-DD
  status: 'Draft' | 'Published';
  metrics: WeeklySnapshotMetric[]; // up to 3
  publishedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface PortalMilestoneConfig {
  id: string;
  label: string;
  order: number;
  mappedStageKeys: string[];
}

export interface PortalChecklistItemConfig {
  id: string;
  label: string;
  targetTab: 'home' | 'progress' | 'actions' | 'reports' | 'files_support';
  enabled: boolean;
  order: number;
  key: 'concept_ready' | 'upload_branding' | 'approve_design' | 'domain_access' | 'gbp_access';
}

export interface PortalExperienceConfig {
  milestones: PortalMilestoneConfig[];
  checklistItems: PortalChecklistItemConfig[];
  welcomeOfferEnabled: boolean;
  welcomeOfferTitle: string;
  welcomeOfferText: string;
  weeklySnapshotWeekday: number; // 1 = Monday, 5 = Friday
  bookingLink?: string;
}

export interface ClientOnboardingChecklistItem {
  id: string;
  label: string;
  isDone: boolean;
  targetTab: 'home' | 'progress' | 'actions' | 'reports' | 'files_support';
  targetRequestId?: string;
  order: number;
  isWelcomeOffer?: boolean;
  offerText?: string;
}

export interface ClientOnboardingChecklist {
  totalCount: number;
  doneCount: number;
  isAllDone: boolean;
  primaryNextAction: ClientOnboardingChecklistItem | null;
  items: ClientOnboardingChecklistItem[];
}

export interface ClientProgressTrackerMilestone {
  id: string;
  label: string;
  status: 'done' | 'in_progress' | 'next';
  order: number;
}

export interface ClientProgressTracker {
  milestones: ClientProgressTrackerMilestone[];
  currentMilestone: ClientProgressTrackerMilestone | null;
  ballInCourt: 'Us' | 'Client';
  expectedLaunchDate?: string;
}

export interface ClientPortal {
  id: string;
  clientId: string;
  portalEnabled: boolean;
  visibleSections: Record<PortalSectionKey, boolean>;
  liveReportUrl?: string;
  liveReportLabel?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type ReferralRewardType = 'EUR' | 'Months';

export interface ReferralMilestoneRow {
  id: string;
  qualifiedReferrals: number; // >= 1
  rewardMonths: number; // step 0.5, max 12
}

export type ExplainerIconKey =
  | 'person'
  | 'link'
  | 'website'
  | 'calendar'
  | 'arrow'
  | 'gift'
  | 'check'
  | 'lock'
  | 'star'
  | 'chat'
  | 'chart'
  | 'shield';

export interface ExplainerStep {
  id?: string;
  iconKey: ExplainerIconKey;
  title: string; // max 40
  caption: string; // max 90
}

export interface ExplainerDescription {
  heading: string;
  bullets: string[]; // 3-5 items, max 120 chars each
  footnote?: string;
}

export interface ExplainerConfig {
  steps: ExplainerStep[];
  description: ExplainerDescription;
}

export interface ReferralProgrammeConfig {
  enabled: boolean; // global default OFF
  milestoneRows: ReferralMilestoneRow[];
  maxRewardsPerClientPerYear: number;
  rewardWording: string; // free text
  shareMessageTemplate: string;
  friendRewardMonths?: number; // default 1, can be 0
  guestPortalFeatureAccess?: Record<PortalFeatureKey, 'locked' | 'hidden' | 'open'>;
  showReferrerNameInGuestPortal?: boolean; // default false
  defaultClientExplainer?: ExplainerConfig;
  defaultGuestExplainer?: ExplainerConfig;
  rewardType?: ReferralRewardType;
  rewardText?: string;
  rewardValue?: number;
}

export interface ReferralMonthEntry {
  id: string;
  clientId: string;
  type: 'earned' | 'applied' | 'adjustment';
  months: number;
  date: string;
  note?: string;
  createdBy?: string;
  isDemo?: boolean;
}

export interface ClientReferralReferredItem {
  id: string;
  businessName: string;
  status: 'Applied' | 'Approved' | 'Qualified' | 'Flagged';
  date: string;
  flagReason?: string;
  paymentAmountEUR?: number;
}

export interface ClientReferralAdminDetails {
  clientId: string;
  referralCode: string;
  shareUrl: string;
  overrideEnabled: boolean;
  overrideMode: 'use_default' | 'on' | 'off';
  customMilestoneRows?: ReferralMilestoneRow[];
  activeMilestoneRows: ReferralMilestoneRow[];
  friendRewardMonths: number;
  savingsPriceAmount?: number;
  savingsPriceCurrency?: string;
  savingsPricePeriod?: string;
  savingsPriceFormatted?: string;
  clientExplainer: ExplainerConfig;
  guestExplainer: ExplainerConfig;
  guestFeatureAccess: Record<PortalFeatureKey, 'locked' | 'hidden' | 'open'>;
  referredList: ClientReferralReferredItem[];
  counts: {
    applied: number;
    waiting: number;
    approved: number;
    qualified: number;
  };
  earnedMonths: number;
  appliedMonths: number;
  adjustmentMonths: number;
  remainingMonths: number;
  monthlyFeeEUR: number;
  estimatedCostEUR: number;
  ledgerEntries: ReferralMonthEntry[];
  nextReward?: {
    moreNeeded: number;
    rewardMonths: number;
  } | null;
}

export type PortalTabKey = 'home' | 'progress' | 'actions' | 'reports' | 'files_support';

export type PortalFeatureKey =
  // HOME
  | 'onboardingChecklist'
  | 'progressTracker'
  | 'needsAttention'
  | 'thisMonthSnapshot'
  | 'nextMeeting'
  | 'recommendedForYou'
  | 'shareWithFriend'
  // PROGRESS
  | 'stageTimeline'
  | 'websitePreview'
  | 'expectedLaunchDate'
  // ACTION ITEMS
  | 'requestsAndUploads'
  // REPORTS
  | 'monthlyReports'
  | 'weeklySnapshot'
  | 'growthOverview'
  | 'checkLiveButton'
  | 'roiEstimator'
  // FILES & SUPPORT
  | 'files'
  | 'meetings'
  | 'tickets'
  | 'invoices'
  | 'securityBasics'
  | 'reviewQrKit'
  | 'contactLine'
  | 'bookMeeting';

export interface PortalPreset {
  id: string;
  name: string;
  description?: string;
  features: Record<PortalFeatureKey, boolean>;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ReferralCreditStatus = 'Pending' | 'Eligible' | 'Applied' | 'Rejected';

export interface ReferralCredit {
  id: string;
  referrerClientId: string;
  referrerClientBusinessName?: string;
  referredClientId?: string;
  referredClientBusinessName?: string;
  applicationId: string;
  applicationReferenceCode?: string;
  status: ReferralCreditStatus;
  reward: string;
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  createdAt: string;
  isSelfReferralSuspected?: boolean;
  selfReferralReason?: string;
  isCapExceeded?: boolean;
  isDemo?: boolean;
}

export interface ClientPortalReferralSummary {
  enabled: boolean;
  referralCode: string;
  shareUrl: string;
  shareText: string;
  rewardTermsText: string;
  counts: {
    applied: number; // Friends who applied
    waiting: number; // Waiting
    approved: number; // Approved
    joined: number; // Joined (qualified)
    earnedMonths: number;
    usedMonths: number;
    remainingMonths: number;
    // Backward compatibility
    invited?: number;
    rewardApplied?: number;
  };
  summaryText?: string;
  savingsPriceFormatted?: string;
  clientExplainer?: ExplainerConfig;
  referralRows?: Array<{
    id?: string;
    status: 'Waiting' | 'Approved' | 'Credited';
    months?: number;
    date?: string;
  }>;
  receivedFreeMonthsText?: string;
  nextReward?: {
    moreNeeded: number;
    rewardMonths: number;
  } | null;
}

export type GuestPortalFeatureAccess = Record<PortalFeatureKey, 'locked' | 'hidden' | 'open'>;

export interface GuestPortalViewModel {
  valid: boolean;
  referralCode?: string;
  referrerName?: string;
  friendRewardMonths: number;
  guestExplainer: ExplainerConfig;
  featureAccess: Record<PortalFeatureKey, 'locked' | 'hidden' | 'open'>;
  savingsPriceFormatted?: string;
}

export interface ClientPortalViewModel {
  client: {
    id: string;
    businessName: string;
    specialty: ClinicSpecialty;
    country: string;
    city: string;
    ownerName: string;
    package: ClientPackage;
    status: ClientStatus;
    nextReportDue?: string;
    googleReviewLink?: string;
    monthlyFeeEUR?: number;
    showPlanPriceInPortal?: boolean;
    roiEstimatorEnabled?: boolean;
    welcomeMomentDismissed?: boolean;
  };
  portal: ClientPortal;
  rightNow: {
    currentStageName: string;
    ballInCourt: 'Us' | 'Client';
    nextStep: string;
    expectedLaunchDate: string;
  };
  onboardingChecklist: ClientOnboardingChecklist;
  progressTracker: ClientProgressTracker;
  securityBasics: {
    httpsEnabled: { verified: boolean; verifiedDate?: string };
    privacyPolicyAdded: { verified: boolean; verifiedDate?: string };
    cookieNoticeAdded: { verified: boolean; verifiedDate?: string };
    contactFormTested: { verified: boolean; verifiedDate?: string };
  };
  weeklySnapshots: ClientWeeklySnapshot[];
  visibleStages: Array<{
    id: string;
    key: string;
    name?: string;
    status: StageStatus;
    order: number;
    dueDate?: string;
    isDone: boolean;
    isInProgress: boolean;
  }>;
  attentionItems: Request[]; // max 3 open requests
  latestPublishedReport: ClientMonthlyReport | null;
  publishedReports: ClientMonthlyReport[];
  sixMonthTrend: Array<{
    month: string;
    visitors: number;
    enquiries: number;
    calls: number;
  }>;
  liveReport: {
    url?: string;
    label?: string;
  } | null;
  requests: Request[];
  files: FileItem[];
  meetings: Meeting[];
  tickets: Ticket[];
  recommendations?: ClientPortalSuggestionViewModel[];
  websiteDemo?: {
    id: string;
    version: number;
    renderedHtml: string;
    status: 'Shared' | 'Changes requested' | 'Approved';
    sharedAt?: string;
    clientFeedback?: string;
    decidedAt?: string;
    templateType?: WebsiteTemplateType;
    previewUrl?: string;
    reactConfig?: Record<string, any>;
  } | null;
  customWebsitePreview?: {
    projectId: string;
    mode: 'custom';
    currentVersion: {
      id: string;
      versionNumber: number;
      previewUrl: string;
      changelog: string[];
      status: 'Shared' | 'Changes requested' | 'Approved';
      sharedAt?: string;
      decidedAt?: string;
      clientFeedback?: string;
    };
    previousVersions: Array<{
      id: string;
      versionNumber: number;
      previewUrl: string;
      changelog: string[];
      status: CustomVersionStatus;
      sharedAt?: string;
      decidedAt?: string;
    }>;
  } | null;
  // Backwards compatibility for existing views
  project?: {
    id: string;
    currentStageKey: string;
    ballInCourt: 'Us' | 'Client';
    targetLaunchDate: string;
    stages: Array<{
      key: string;
      status: StageStatus;
      plannedStart: string;
      plannedEnd: string;
      checklist: Array<{ id: string; title: string; done: boolean; required: boolean }>;
    }>;
  } | null;
  monthlyReport?: {
    monthLabel: string;
    visitorsCount: number;
    enquiriesCount: number;
    profileViews: number;
    bookedCount: number;
    notBookedCount: number;
    estimatedRoiMultiplier: number;
    notes: string;
  };
  referral?: ClientPortalReferralSummary;
  assignedTeam?: Array<{ firstName: string; roleLabel: string; isLead?: boolean }>;
  bookingLink?: string | null;
}

export type PartnerClientOutcomeStatus = 'Interested' | 'Agreed' | 'Not interested' | 'Rejected';

export interface PartnerClientOutcome {
  status: PartnerClientOutcomeStatus;
  note?: string;
  updatedAt: string;
  partnerId?: string;
  actorName?: string;
}

export interface PartnerClientDemoInfo {
  id: string;
  title: string;
  status: WebsiteProjectStatus;
  expiresAt?: string;
  daysLeft?: number;
  isExpired?: boolean;
  shareToken?: string;
  previewUrl?: string;
}

export interface ScopedPartnerClientItem {
  id: string;
  businessName: string;
  package: string;
  status: ClientStatus;
  stage: string;
  ballInCourt: 'Us' | 'Client';
  portalStatus: 'Enabled' | 'Disabled';
  contactName?: string;
  email?: string;
  monthlyReportSummary?: string;
  claimedPrice?: number;
  claimedCurrency?: string;
  grossPaymentsEUR: number;
  partnerShareEUR: number;
  isPendingApproval?: boolean;
  demo?: PartnerClientDemoInfo | null;
  partnerOutcome?: PartnerClientOutcome;
}

export interface PartnerPortalViewModel {
  partner: {
    id: string;
    name: string;
    organisation: string;
    type: string;
    email?: string;
    country: string;
    city: string;
    portalType: PartnerPortalType;
    poweredByOpenHours: boolean;
  };
  branding: PartnerPortalBranding;
  dealTerms: PartnerDealTerms;
  visibility: PartnerClientVisibility;
  stats: {
    totalClients: number;
    activeClients: number;
    pendingClients: number;
    newClientsThisMonth: number;
    earningsThisMonthEUR: number;
    earningsToDateEUR: number;
    earningsPaidEUR: number;
    earningsOwedEUR: number;
  };
  growthChart: Array<{
    month: string;
    clients: number;
    earningsEUR: number;
  }>;
  clients: ScopedPartnerClientItem[];
  requests: Request[];
  canShareRevealLink: boolean;
  outcomeCounters: {
    interested: number;
    agreed: number;
    rejected: number;
    notInterested: number;
    total: number;
  };
}

// ==========================================
// TEAM, PERMISSIONS & TIME TRACKER MODELS
// ==========================================

export type MemberStatus = 'Active' | 'Invited' | 'Deactivated';
export type AccessLevel = 'none' | 'view' | 'edit';

export interface MemberPermissions {
  // Navigation items access: record of navItem id to access level
  navigationAccess: Record<string, AccessLevel>;
  // Special permissions
  canSeeRevenuePayments: boolean;
  canSeeCostRates: boolean;
  canExportData: boolean;
  canSeeClientContactDetails: boolean;
}

export interface TeamMemberProfile {
  id: string;
  name: string;
  email: string;
  role: Role | string;
  status: MemberStatus;
  costRatePerHour: number;
  costCurrency: 'EUR' | 'BDT';
  weeklyCapacityHours: number;
  startDate: string; // YYYY-MM-DD
  avatarInitials: string;
  avatarDataUrl?: string | null;
  permissions: MemberPermissions;
  invitedAt?: string;
  deactivatedAt?: string | null;
  hideFromClients?: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export type TimeEntrySource = 'timer' | 'manual';

export interface TimeEntry {
  id: string;
  memberId: string;
  clientId?: string;
  taskId?: string;
  deliveryItemTitle?: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string (undefined if currently running)
  durationMinutes: number;
  note?: string;
  manualReason?: string;
  source: TimeEntrySource;
  createdAt: string;
  isDemo?: boolean;
}

export interface TeamPerformanceWeights {
  onTimeCompletionWeight: number; // e.g. 0.35 (35%)
  lowRevisionWeight: number; // e.g. 0.20 (20%)
  turnaroundWeight: number; // e.g. 0.20 (20%)
  qaChecklistPassWeight: number; // e.g. 0.15 (15%)
  hoursConsistencyWeight: number; // e.g. 0.10 (10%)
}

export interface TeamSettingsConfig {
  showRankingToMembers: boolean;
  weights: TeamPerformanceWeights;
}

export interface MemberPerformanceScore {
  memberId: string;
  memberName: string;
  totalCompletedTasks: number;
  hasEnoughData: boolean; // >= 10 completed tasks
  score: number; // 0-100
  onTimeRate: number; // %
  lowRevisionRate: number; // %
  avgTurnaroundHours: number;
  qaPassRate: number; // %
  hoursConsistencyRate: number; // %
  totalLoggedHours: number;
}

// ==========================================
// PHASE 4: CREDENTIALS & MOCK AUTH
// ==========================================

export interface UserCredential {
  id: string;
  loginId: string; // unique email or username
  passwordHashHex: string; // PBKDF2 Web Crypto hash - NEVER PLAINTEXT
  saltHex: string; // Cryptographic salt
  iterations: number; // PBKDF2 iterations
  role: Role | 'Client' | 'Partner';
  targetEntityId?: string; // clientId, partnerId, or memberId
  targetEntityName?: string;
  mustChangeOnFirstLogin: boolean;
  loginDisabled: boolean;
  failedAttemptsCount: number;
  lockedUntil?: string | null; // ISO string if locked out after 5 attempts
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface ActiveAuthSession {
  credentialId: string;
  loginId: string;
  role: Role | 'Client' | 'Partner';
  targetEntityId?: string;
  targetEntityName?: string;
  mustChangeOnFirstLogin: boolean;
  loginTimestamp: string;
}

// ==========================================
// SUB-TEAMS & TEAM REQUESTS
// ==========================================

export interface SubTeam {
  id: string;
  name: string;
  color: string;
  managerMemberId: string;
  maxClients?: number;
  notes?: string;
  checkInDay?: number; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  checkInTemplate?: string;
  archivedAt?: string | null;
  isDemo?: boolean;
  createdAt: string;
}

export interface SubTeamMember {
  subTeamId: string;
  memberId: string;
  roleLabel: string; // FREE TEXT, e.g. "SEO expert"
  joinedAt: string;
  isDemo?: boolean;
}

export interface SubTeamClient {
  subTeamId: string;
  clientId: string;
  assignedAt: string;
  unassignedAt?: string | null; // history kept
  isDemo?: boolean;
}

export type TeamRequestType = 'Task' | 'Report request' | 'Progress update' | 'Question';
export type TeamRequestPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TeamRequestStatus = 'Open' | 'Submitted' | 'Accepted' | 'Needs changes';

export interface TeamRequestResponseFile {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface TeamRequest {
  id: string;
  subTeamId: string;
  fromMemberId: string;
  toMemberId: string;
  clientId?: string; // optional, must belong to the sub-team
  type: TeamRequestType;
  title: string;
  details: string;
  dueDate: string;
  priority: TeamRequestPriority;
  status: TeamRequestStatus;
  responseText?: string;
  responseFiles?: TeamRequestResponseFile[];
  managerComment?: string;
  weekIdentifier?: string; // e.g. '2026-W42' for idempotent check-ins
  createdAt: string;
  respondedAt?: string;
  reviewedAt?: string;
  isDemo?: boolean;
}

// ==========================================
// CLIENT SUGGESTIONS & SUGGESTION TEMPLATES
// ==========================================

export type SuggestionType = 'Package upgrade' | 'Add-on' | 'Improvement';
export type SuggestionStatus = 'Draft' | 'Shared' | 'Interested' | 'Not now' | 'Not for us' | 'Accepted';
export type SuggestionPriceKind = 'One-time' | 'Monthly';

export interface ClientSuggestion {
  id: string;
  clientId: string;
  title: string;
  summary: string;
  type: SuggestionType;
  targetPackage?: ClientPackage;
  benefits: string[]; // 1-8 bullets "What you'd get"
  whyWeSuggest?: string;
  priceAmount?: number;
  priceCurrency?: string;
  priceKind?: SuggestionPriceKind;
  validUntil?: string; // YYYY-MM-DD
  status: SuggestionStatus;
  visibleToClient: boolean;
  sharedAt?: string;
  respondedAt?: string;
  clientNote?: string;
  snoozedUntil?: string; // YYYY-MM-DD
  createdFromTemplateId?: string;
  archivedAt?: string | null;
  isDemo?: boolean;
  createdAt: string;
}

export interface SuggestionTemplate {
  id: string;
  title: string;
  summary: string;
  type: SuggestionType;
  targetPackage?: ClientPackage;
  benefits: string[];
  whyWeSuggest?: string;
  priceAmount?: number;
  priceCurrency?: string;
  priceKind?: SuggestionPriceKind;
  archivedAt?: string | null;
  isDemo?: boolean;
  createdAt: string;
}

export interface ClientPortalSuggestionViewModel {
  id: string;
  title: string;
  summary: string;
  type: SuggestionType;
  targetPackage?: ClientPackage;
  benefits: string[];
  whyWeSuggest?: string;
  priceAmount?: number;
  priceCurrency?: string;
  priceKind?: SuggestionPriceKind;
  validUntil?: string;
  status: SuggestionStatus;
}

// ==========================================
// PUBLIC APPLICATION & INTAKE
// ==========================================

export type ApplicationStatus = 'Received' | 'Under review' | 'Approved' | 'Rejected' | 'Spam';

export interface Application {
  id: string;
  token: string; // 24+ character random token for applicant public status view
  referenceCode: string; // Readable reference e.g. APP-2026-8491
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  niche: string;
  country?: string;
  currentWebsite?: string;
  needs?: string;
  source?: string;
  consentAt: string; // ISO date
  status: ApplicationStatus;
  internalNote?: string;
  decisionReason?: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  createdClientId?: string | null;
  referralCode?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ApplicationPublicStatus {
  referenceCode: string;
  status: 'Received' | 'Under review' | 'Approved' | 'Not accepted';
  submittedDate: string;
  message: string;
}

export interface ApplicationPageSettings {
  formEnabled: boolean;
  introText: string;
  privacyUrl: string;
  confirmationText: string;
  websiteUrl?: string;
}

// ==========================================
// WEBSITE STUDIO: TEMPLATES & PROJECTS
// ==========================================

export interface WebsiteTemplateSection {
  id: string;
  label: string;
  defaultOn: boolean;
}

export interface WebsiteTemplateVariantGroup {
  group: string;
  options: string[];
}

export interface TemplateSource {
  id: string;
  owner: string;
  repo: string;
  branch: string; // default "main"
  folder: string; // default "templates"
  lastScanAt?: string;
  lastCommitSha?: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WebsiteTemplateSource {
  sourceId: string;
  path: string;
  blobSha: string;
  commitSha: string;
  importedAt: string;
}

export type ManifestFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'select'
  | 'boolean'
  | 'image'
  | 'list';

export interface ManifestField {
  key: string;
  label: string;
  type: ManifestFieldType;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  options?: string[]; // for select
  maxLength?: number;
  maxSizeBytes?: number; // for image
  group?: 'details' | 'assets' | 'brand' | 'layout' | string;
  description?: string;
}

export interface ManifestListField {
  key: string;
  label: string;
  minItems?: number;
  maxItems?: number;
  itemFields: ManifestField[];
}

export interface ReactTemplateManifest {
  schemaVersion: 1;
  name: string;
  description?: string;
  previewUrl: string;
  fields: ManifestField[];
  lists?: ManifestListField[];
  sections?: WebsiteTemplateSection[];
  variants?: WebsiteTemplateVariantGroup[];
  tags?: string[];
  defaultConfig?: Record<string, any>;
}

export type WebsiteTemplateType = 'html' | 'react';

export interface WebsiteTemplateVersionHistory {
  version: number;
  html?: string;
  manifest?: ReactTemplateManifest;
  blobSha?: string;
  commitSha?: string;
  importedAt: string;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  nicheTags: string[];
  html: string; // single file, inline CSS
  sections: WebsiteTemplateSection[]; // detected: id, label, defaultOn
  variants: WebsiteTemplateVariantGroup[]; // detected: group, options[]
  thumbnailDataUrl?: string; // auto-generated or uploaded
  version: number;
  archivedAt: string | null; // soft-delete
  isDemo: boolean;
  createdAt: string;
  updatedAt?: string;
  source?: WebsiteTemplateSource;
  versionHistory?: WebsiteTemplateVersionHistory[];
  templateType?: WebsiteTemplateType; // default 'html'
  manifest?: ReactTemplateManifest;
  previewUrl?: string;
}

export type DemoSiteStatus = 'Draft' | 'Shared' | 'Changes requested' | 'Approved';

export interface DemoSiteService {
  title: string;
  text: string;
}

export interface DemoSiteTestimonial {
  quote: string;
  author: string;
  role?: string;
}

export interface DemoSiteImage {
  url: string;
  caption?: string;
}

export interface DemoSiteSocialLink {
  platform: string;
  url: string;
}

export interface DemoSiteDetails {
  businessName: string;
  tagline?: string;
  about?: string;
  services: DemoSiteService[]; // up to 8
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: string;
  ctaText?: string;
  ctaLink?: string; // https or tel/mailto
  socialLinks?: DemoSiteSocialLink[];
  testimonials?: DemoSiteTestimonial[]; // ONLY if client supplied them
  images?: DemoSiteImage[]; // optional PNG/JPG/WebP
}

export interface DemoSiteBrand {
  primaryColor: string;
  secondaryColor: string;
  fontStack: string;
  logoDataUrl?: string;
}

export interface DemoSite {
  id: string;
  clientId: string;
  templateId: string;
  templateVersion: number;
  details: DemoSiteDetails;
  brand: DemoSiteBrand;
  renderedHtml: string;
  version: number;
  status: DemoSiteStatus;
  visibleToClient: boolean;
  sharedAt?: string;
  clientFeedback?: string;
  decidedAt?: string;
  createdBy: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null; // soft-delete
}

export type WebsiteProjectStatus = 'Draft' | 'Shared' | 'Changes requested' | 'Approved' | 'Exported' | 'Expired';

export interface WebsiteProjectHistoryItem {
  version: number;
  status: WebsiteProjectStatus;
  changedAt: string;
  changedBy: string;
  note?: string;
}

export interface WebsiteProjectBrand extends DemoSiteBrand {
  radius: number; // 0-28px
  density: 'compact' | 'normal' | 'airy';
}

export interface WebsiteProjectVariation {
  sectionOrder: string[];
  sectionsOn: Record<string, boolean>;
  variants: Record<string, string>;
  seed: number | string;
}

export type WebsiteProjectMode = 'template' | 'custom';

export interface CustomProjectChecklist {
  repoCreated: boolean;
  aiStudioConnected: boolean;
  hostingLinked: boolean;
  previewWorking: boolean;
}

export interface CustomProjectSetup {
  repoName: string;
  repoOwner?: string;
  branch: string; // default "main"
  hostingProvider: string; // default "Vercel"
  productionUrl?: string; // optional, https
  notes?: string;
  checklist?: CustomProjectChecklist;
}

export type CustomVersionStatus = 'Draft' | 'Shared' | 'Superseded' | 'Changes requested' | 'Approved';

export interface CustomVersion {
  id: string;
  projectId: string;
  versionNumber: number; // auto-incrementing 1, 2, 3...
  previewUrl: string;
  commitSha?: string; // 7-40 hex chars
  changelog: string[]; // 1-10 bullets, max 200 chars each
  screenshotDataUrl?: string; // PNG/JPG/WebP max 1 MB, resized to max 1600px
  internalNote?: string; // internal note, client never sees
  status: CustomVersionStatus;
  sharedAt?: string;
  decidedAt?: string;
  clientFeedback?: string;
  createdBy: string;
  createdAt: string;
}

export interface WebsiteStudioSettings {
  templateRepo?: string; // owner/repo e.g. "openhours/starter-site"
  allowedPreviewDomains: string[];
  demoLifetimeDays?: number; // default 60
  revealIntroPrefix?: string; // default "Prepared for"
  revealIntroSuffix?: string; // default "by Open Hours"
}

export interface WebsiteProject {
  id: string;
  clientId?: string; // Optional: can exist without client for prospects
  title: string;
  templateId: string;
  templateVersion: number;
  details: DemoSiteDetails;
  brand: WebsiteProjectBrand;
  variation: WebsiteProjectVariation;
  renderedHtml: string;
  status: WebsiteProjectStatus;
  version: number;
  history: WebsiteProjectHistoryItem[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
  clientFeedback?: string;
  decidedAt?: string;
  sharedAt?: string;
  exportedAt?: string;
  isDemo: boolean;
  // Expiry & Retention
  expiresAt?: string;
  keepPermanently?: boolean;
  expiryExtensionReason?: string;
  // Part 4 Pitch & Proposal extensions
  kind?: 'client' | 'pitch';
  partnerId?: string;
  prospectName?: string;
  leadId?: string;
  prospectWebsiteUrl?: string;
  // Part 4 Reveal Sequence
  revealConfig?: ProjectRevealConfig;
  // Custom (AI Studio + GitHub) Mode
  mode?: WebsiteProjectMode;
  customSetup?: CustomProjectSetup;
  customVersions?: CustomVersion[];
  // React (config-driven) template extensions
  templateType?: WebsiteTemplateType;
  reactConfig?: Record<string, any>;
}

// ==========================================
// PACKAGES CONFIGURATION (Settings > Packages)
// ==========================================

export interface PackageTierConfig {
  id: string; // 'regular' | 'advanced' | 'premium'
  name: string;
  startingPriceEUR: number; // labelled "starting from"
  currency: string;
  featureList: string[];
  isStartingFrom: boolean;
}

export interface PackagesSettings {
  packages: PackageTierConfig[];
  updatedAt?: string;
  updatedBy?: string;
}

// ==========================================
// PROPOSALS & PITCHES
// ==========================================

export type ProposalStatus = 'Draft' | 'Shared' | 'Won' | 'Lost';

export interface ProposalItem {
  id: string;
  type: 'package' | 'custom';
  packageId?: string;
  title: string;
  name?: string;
  description?: string;
  price: number;
  currency: string;
  isStartingFrom?: boolean;
  features?: string[];
  claimedByPartner?: boolean; // Partner-entered custom price stays "claimed"
}

export interface Proposal {
  id: string;
  partnerId?: string;
  partnerName?: string;
  leadId?: string;
  prospectName: string;
  prospectWebsiteUrl?: string;
  projectId: string; // Linked WebsiteProject
  items: ProposalItem[];
  validUntil: string; // YYYY-MM-DD
  introText: string;
  status: ProposalStatus;
  lostReason?: string;
  sharedAt?: string;
  decidedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isDemo: boolean;
}

// ==========================================
// PIN FEEDBACK ON DEMO PREVIEWS
// ==========================================

export type PinDevicePreset = 'desktop' | 'tablet' | 'mobile';
export type PinStatus = 'Open' | 'Resolved';
export type PinAuthorRole = 'client' | 'admin';

export interface PinReply {
  id: string;
  pinId: string;
  authorRole: PinAuthorRole;
  authorName: string;
  comment: string; // max 500 chars
  createdAt: string;
}

export interface DemoPin {
  id: string;
  pinNumber: number;
  projectId: string;
  version: number;
  devicePreset: PinDevicePreset;
  xPercent: number; // 0-100 relative to rendered document
  yPercent: number; // 0-100 relative to rendered document
  sectionId?: string;
  snippet?: string; // short text snippet of the nearest element
  comment: string; // max 500 chars
  status: PinStatus;
  authorRole: PinAuthorRole;
  authorName: string;
  replies: PinReply[];
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  taskId?: string; // linked task ID if created
  readByAdmin: boolean;
  readByClient: boolean;
  isDemo?: boolean;
  archivedAt?: string | null;
}

// ==========================================
// REVEAL LINK (PUBLIC PREVIEW) & REVEAL SEQUENCE
// ==========================================

export type RevealStyle = 'Blur fade' | 'Curtain split';

export interface ProjectRevealConfig {
  enabled: boolean;
  style: RevealStyle;
  welcomeLine?: string;
}

export interface ProjectRevealToken {
  id: string;
  token: string; // random 24+ chars
  projectId: string;
  projectVersion: number;
  createdAt: string;
  expiresAt: string | null; // default 30 days
  revokedAt?: string | null;
  revokedBy?: string;
  createdBy: string;
  isDemo?: boolean;
}

export interface PublicPreviewData {
  title: string;
  version: number;
  renderedHtml: string;
  devicePreset?: PinDevicePreset;
  isExpired: boolean;
  isRevoked: boolean;
  notFound: boolean;
  notShared?: boolean;
  expiryDays?: number;
  websiteUrl?: string;
  // Part 4 Reveal extensions
  token?: string;
  businessName?: string;
  logoDataUrl?: string | null;
  revealConfig?: ProjectRevealConfig;
  projectStatus?: WebsiteProjectStatus;
  domainAccessStatus?: 'none' | 'pending' | 'submitted' | 'approved';
  revealIntroPrefix?: string;
  revealIntroSuffix?: string;
}
