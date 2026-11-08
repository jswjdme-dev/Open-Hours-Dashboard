import {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deactivateTeamMember,
  getTimeEntries,
  getActiveRunningTimer,
  startTimer,
  stopTimer,
  logManualTimeEntry,
  getTeamSettings,
  updateTeamSettings,
  getTeamManagementOverview,
  getTeamPerformanceScores,
  getSubTeams,
  getAllSubTeams,
  getSubTeamById,
  createSubTeam,
  updateSubTeam,
  archiveSubTeam,
  getSubTeamMembers,
  getAllSubTeamMembers,
  addMemberToSubTeam,
  updateSubTeamMemberRoleLabel,
  removeMemberFromSubTeam,
  getSubTeamClients,
  getAllSubTeamClients,
  getActiveSubTeamForClient,
  assignClientToSubTeam,
  unassignClientFromSubTeam,
  getTeamRequests,
  getTeamRequestById,
  createTeamRequest,
  respondToTeamRequest,
  reviewTeamRequest,
  triggerSubTeamCheckIn,
  runAllDueSubTeamCheckIns,
  getSubTeamOverviewMetrics,
  SubTeamOverviewMetrics,
  getClients,
} from '../data/repo.ts';
import {
  TeamMemberProfile,
  TimeEntry,
  TeamSettingsConfig,
  MemberPerformanceScore,
  TeamPerformanceWeights,
  MemberPermissions,
  AccessLevel,
  Role,
  SubTeam,
  SubTeamMember,
  SubTeamClient,
  TeamRequest,
  TeamRequestType,
  TeamRequestPriority,
  TeamRequestStatus,
  TeamRequestResponseFile,
} from '../types/index.ts';

// Re-export selectors for convenience
export {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deactivateTeamMember,
  getTimeEntries,
  getActiveRunningTimer,
  startTimer,
  stopTimer,
  logManualTimeEntry,
  getTeamSettings,
  updateTeamSettings,
  getTeamManagementOverview,
  getTeamPerformanceScores,
  getSubTeams,
  getAllSubTeams,
  getSubTeamById,
  createSubTeam,
  updateSubTeam,
  archiveSubTeam,
  getSubTeamMembers,
  getAllSubTeamMembers,
  addMemberToSubTeam,
  updateSubTeamMemberRoleLabel,
  removeMemberFromSubTeam,
  getSubTeamClients,
  getAllSubTeamClients,
  getActiveSubTeamForClient,
  assignClientToSubTeam,
  unassignClientFromSubTeam,
  getTeamRequests,
  getTeamRequestById,
  createTeamRequest,
  respondToTeamRequest,
  reviewTeamRequest,
  triggerSubTeamCheckIn,
  runAllDueSubTeamCheckIns,
  getSubTeamOverviewMetrics,
  getClients,
};
export type { SubTeamOverviewMetrics };

// ==========================================
// SUB-TEAM SCOPE CHECKS & RLS MIRROR SELECTORS
// ==========================================

/**
 * Checks whether an actor is the designated manager of a given sub-team.
 * "Sub-team manager" is a flag/relationship on the membership, NOT a new global role.
 */
export function isSubTeamManager(memberId: string | undefined, subTeam: SubTeam): boolean {
  if (!memberId) return false;
  return subTeam.managerMemberId === memberId;
}

/**
 * Checks whether an actor can view a sub-team dashboard.
 * - Admin can view all sub-teams.
 * - Non-admin can only view sub-teams where they are the manager or an active member.
 */
export function canActorAccessSubTeam(
  userRole: Role | string,
  memberId: string | undefined,
  subTeam: SubTeam,
  subTeamMembers: SubTeamMember[] = []
): boolean {
  if (userRole === 'Admin') return true;
  if (!memberId) return false;
  if (subTeam.managerMemberId === memberId) return true;
  return subTeamMembers.some(
    (m) => m.subTeamId === subTeam.id && m.memberId === memberId
  );
}

/**
 * Checks whether an actor can manage a sub-team (edit, archive, assign clients, trigger check-ins).
 * - Admin: true
 * - Designated sub-team manager: true
 * - Other members: false
 */
export function canActorManageSubTeam(
  userRole: Role | string,
  memberId: string | undefined,
  subTeam: SubTeam
): boolean {
  if (userRole === 'Admin') return true;
  if (!memberId) return false;
  return subTeam.managerMemberId === memberId;
}

/**
 * Filters a list of sub-teams based on actor scope.
 * Mirrors RLS:
 * - Admin sees all active sub-teams.
 * - Sub-team manager / member sees only their own sub-teams.
 */
export function filterSubTeamsForActor(
  subTeams: SubTeam[],
  userRole: Role | string,
  memberId?: string,
  allSubTeamMembers: SubTeamMember[] = []
): SubTeam[] {
  if (userRole === 'Admin') return subTeams;
  if (!memberId) return [];

  const memberTeamIds = new Set(
    allSubTeamMembers.filter((m) => m.memberId === memberId).map((m) => m.subTeamId)
  );

  return subTeams.filter(
    (st) => st.managerMemberId === memberId || memberTeamIds.has(st.id)
  );
}

/**
 * Filters TeamRequests based on actor scope.
 * - Admin sees all requests.
 * - Manager sees all requests for their managed sub-team(s).
 * - Regular members see ONLY requests sent to them or created by them.
 */
export function filterRequestsForActor(
  requests: TeamRequest[],
  userRole: Role | string,
  memberId?: string,
  managedSubTeamIds: string[] = []
): TeamRequest[] {
  if (userRole === 'Admin') return requests;
  if (!memberId) return [];

  const managedSet = new Set(managedSubTeamIds);

  return requests.filter((r) => {
    // Manager sees all requests for their managed sub-team
    if (managedSet.has(r.subTeamId)) return true;
    // Member sees only their own requests (assigned to them or from them)
    return r.toMemberId === memberId || r.fromMemberId === memberId;
  });
}


// Preset permissions generator by Role
export function getRolePermissionDefaults(role: Role | string): MemberPermissions {
  const allNavKeys = [
    'overview',
    'reports-growth',
    'growth-trend',
    'growth-funnel',
    'growth-comparison',
    'leads',
    'pipeline',
    'tasks',
    'outreach',
    'suppression',
    'partnerships',
    'intelligence-niche',
    'intelligence-bottleneck',
    'intelligence-score',
    'intelligence-learning',
    'clients',
    'delivery',
    'client-requests',
    'client-files',
    'meetings',
    'tickets',
    'payments',
    'invoices',
    'mrr',
    'partner-fees',
    'team-members',
    'team-sub-teams',
    'team-time-tracker',
    'team-performance',
    'team-settings',
    'settings-audit',
    'settings-backup',
    'settings',
  ];

  const access: Record<string, AccessLevel> = {};

  if (role === 'Admin') {
    allNavKeys.forEach((k) => {
      access[k] = 'edit';
    });
    return {
      navigationAccess: access,
      canSeeRevenuePayments: true,
      canSeeCostRates: true,
      canExportData: true,
      canSeeClientContactDetails: true,
    };
  }

  if (role === 'Account Manager') {
    allNavKeys.forEach((k) => {
      if (['payments', 'mrr', 'partner-fees', 'settings-backup', 'team-settings'].includes(k)) {
        access[k] = 'none';
      } else if (['invoices', 'settings-audit', 'team-performance'].includes(k)) {
        access[k] = 'view';
      } else {
        access[k] = 'edit';
      }
    });
    return {
      navigationAccess: access,
      canSeeRevenuePayments: false,
      canSeeCostRates: false,
      canExportData: false,
      canSeeClientContactDetails: true,
    };
  }

  if (role === 'Developer') {
    allNavKeys.forEach((k) => {
      if (
        [
          'delivery',
          'client-requests',
          'client-files',
          'tickets',
          'tasks',
          'team-time-tracker',
        ].includes(k)
      ) {
        access[k] = 'edit';
      } else if (['overview', 'clients', 'meetings', 'team-members', 'settings'].includes(k)) {
        access[k] = 'view';
      } else {
        access[k] = 'none';
      }
    });
    return {
      navigationAccess: access,
      canSeeRevenuePayments: false,
      canSeeCostRates: false,
      canExportData: false,
      canSeeClientContactDetails: false,
    };
  }

  if (role === 'Ads Manager') {
    allNavKeys.forEach((k) => {
      if (
        [
          'reports-growth',
          'growth-trend',
          'growth-funnel',
          'growth-comparison',
          'outreach',
          'intelligence-niche',
          'team-time-tracker',
        ].includes(k)
      ) {
        access[k] = 'edit';
      } else if (['overview', 'leads', 'clients', 'team-members', 'settings'].includes(k)) {
        access[k] = 'view';
      } else {
        access[k] = 'none';
      }
    });
    return {
      navigationAccess: access,
      canSeeRevenuePayments: false,
      canSeeCostRates: false,
      canExportData: false,
      canSeeClientContactDetails: false,
    };
  }

  // Fallback (e.g. custom or client)
  allNavKeys.forEach((k) => {
    access[k] = 'view';
  });
  return {
    navigationAccess: access,
    canSeeRevenuePayments: false,
    canSeeCostRates: false,
    canExportData: false,
    canSeeClientContactDetails: false,
  };
}
