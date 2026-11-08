import { Role, MemberPermissions } from '../types/index.ts';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: string;
  badgeKey?: 'tasks' | 'tickets' | 'blockedClients';
  built: boolean;
  minLeadsRequired?: number;
  allowedRoles?: Role[];
}

export interface NavGroupConfig {
  id: string;
  label: string;
  items: NavItemConfig[];
  allowedRoles?: Role[];
}

export interface NavigationConfig {
  overview: NavItemConfig;
  groups: NavGroupConfig[];
}

export const NAVIGATION_CONFIG: NavigationConfig = {
  overview: {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    built: true,
  },
  groups: [
    {
      id: 'growth',
      label: 'GROWTH',
      items: [
        {
          id: 'reports-growth',
          label: 'Growth Report',
          icon: 'TrendingUp',
          built: true,
        },
        {
          id: 'growth-trend',
          label: 'Growth Trend',
          icon: 'LineChart',
          built: true,
        },
        {
          id: 'growth-funnel',
          label: 'Funnel',
          icon: 'Filter',
          built: true,
        },
        {
          id: 'growth-comparison',
          label: 'Period Comparison',
          icon: 'ArrowLeftRight',
          built: true,
        },
      ],
    },
    {
      id: 'sales',
      label: 'SALES',
      items: [
        {
          id: 'leads',
          label: 'Leads',
          icon: 'Users',
          built: true,
        },
        {
          id: 'pipeline',
          label: 'Pipeline',
          icon: 'Kanban',
          built: true,
        },
        {
          id: 'tasks',
          label: 'Tasks & Reminders',
          icon: 'CheckSquare',
          badgeKey: 'tasks',
          built: true,
        },
        {
          id: 'channel-settings',
          label: 'Channel Settings',
          icon: 'Sliders',
          built: true,
        },
        {
          id: 'follow-up-settings',
          label: 'Follow-up Settings',
          icon: 'Clock',
          built: true,
        },
        {
          id: 'outreach',
          label: 'Outreach',
          icon: 'Send',
          built: true,
        },
        {
          id: 'suppression',
          label: 'Suppression List',
          icon: 'ShieldAlert',
          built: true,
        },
        {
          id: 'partnerships',
          label: 'Partnerships',
          icon: 'Handshake',
          built: true,
        },
      ],
    },
    {
      id: 'intelligence',
      label: 'INTELLIGENCE',
      items: [
        {
          id: 'intelligence-performance',
          label: 'Performance',
          icon: 'TrendingUp',
          allowedRoles: ['Admin', 'Account Manager'],
          built: true,
        },
        {
          id: 'intelligence-niche',
          label: 'Niche & Source',
          icon: 'Compass',
          built: true,
        },
        {
          id: 'intelligence-bottleneck',
          label: 'Bottleneck',
          icon: 'GitPullRequestDraft',
          built: true,
        },
        {
          id: 'intelligence-score',
          label: 'Score Calibration',
          icon: 'Target',
          built: true,
        },
        {
          id: 'intelligence-learning',
          label: 'Learning Log',
          icon: 'BookOpen',
          built: true,
        },
        {
          id: 'intelligence-experiments',
          label: 'Experiments',
          icon: 'FlaskConical',
          built: false, // Hidden until 100+ leads exist
          minLeadsRequired: 100,
        },
      ],
    },
    {
      id: 'clients',
      label: 'CLIENTS',
      items: [
        {
          id: 'clients',
          label: 'Clients',
          icon: 'Building2',
          built: true,
        },
        {
          id: 'delivery',
          label: 'Delivery',
          icon: 'KanbanSquare',
          badgeKey: 'blockedClients',
          built: true,
        },
        {
          id: 'client-reports',
          label: 'Reports',
          icon: 'FileText',
          built: true,
        },
        {
          id: 'client-requests',
          label: 'Requests',
          icon: 'Inbox',
          built: true,
        },
        {
          id: 'client-files',
          label: 'Files',
          icon: 'FolderOpen',
          built: true,
        },
        {
          id: 'meetings',
          label: 'Meetings',
          icon: 'CalendarDays',
          built: true,
        },
        {
          id: 'tickets',
          label: 'Tickets',
          icon: 'LifeBuoy',
          badgeKey: 'tickets',
          built: true,
        },
      ],
    },
    {
      id: 'website-studio',
      label: 'WEBSITE STUDIO',
      allowedRoles: ['Admin', 'Account Manager', 'Developer'],
      items: [
        {
          id: 'studio-projects',
          label: 'Projects',
          icon: 'Globe',
          built: true,
          allowedRoles: ['Admin', 'Account Manager', 'Developer'],
        },
        {
          id: 'studio-templates',
          label: 'Templates',
          icon: 'Layout',
          built: true,
          allowedRoles: ['Admin', 'Account Manager', 'Developer'],
        },
      ],
    },
    {
      id: 'business',
      label: 'BUSINESS',
      allowedRoles: ['Admin', 'Account Manager'],
      items: [
        {
          id: 'payments',
          label: 'Payments',
          icon: 'CreditCard',
          built: true,
          allowedRoles: ['Admin', 'Account Manager'],
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: 'FileText',
          built: true,
          allowedRoles: ['Admin', 'Account Manager'],
        },
        {
          id: 'mrr',
          label: 'MRR Roadmap',
          icon: 'Coins',
          built: true,
          allowedRoles: ['Admin', 'Account Manager'],
        },
      ],
    },
    {
      id: 'team',
      label: 'TEAM',
      allowedRoles: ['Admin', 'Account Manager', 'Developer', 'Ads Manager'],
      items: [
        {
          id: 'team-my-work',
          label: 'My Work',
          icon: 'CheckSquare',
          built: true,
        },
        {
          id: 'team-members',
          label: 'Members',
          icon: 'Users',
          built: true,
        },
        {
          id: 'team-sub-teams',
          label: 'Sub-teams',
          icon: 'Layers',
          built: true,
          allowedRoles: ['Admin', 'Account Manager'],
        },
        {
          id: 'team-time-tracker',
          label: 'Time Tracker',
          icon: 'Clock',
          built: true,
        },
        {
          id: 'team-performance',
          label: 'Performance',
          icon: 'Award',
          built: true,
        },
        {
          id: 'team-settings',
          label: 'Team Settings',
          icon: 'Sliders',
          built: true,
          allowedRoles: ['Admin'],
        },
      ],
    },
    {
      id: 'settings',
      label: 'SETTINGS',
      allowedRoles: ['Admin', 'Account Manager', 'Developer'],
      items: [
        {
          id: 'settings-audit',
          label: 'Audit Log',
          icon: 'FileCode',
          built: true,
          allowedRoles: ['Admin', 'Account Manager'],
        },
        {
          id: 'settings-backup',
          label: 'Data Backup',
          icon: 'Database',
          built: true,
          allowedRoles: ['Admin'],
        },
        {
          id: 'settings-consistency',
          label: 'Consistency Check',
          icon: 'ShieldCheck',
          built: true,
          allowedRoles: ['Admin'],
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: 'Settings',
          built: true,
        },
      ],
    },
  ],
};

/**
 * Normalizes any role representation into the canonical application Role.
 * "Founder" is an alias of "Admin".
 */
export function normalizeRole(rawRole: string | null | undefined): Role {
  if (!rawRole) return 'Admin';
  const normalized = rawRole.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'founder' || normalized === 'admin') return 'Admin';
  if (normalized === 'accountmanager') return 'Account Manager';
  if (normalized === 'developer') return 'Developer';
  if (normalized === 'adsmanager') return 'Ads Manager';
  if (normalized === 'client') return 'Client';
  if (normalized === 'partner') return 'Partner';
  return 'Admin';
}

/**
 * Pure function to compute visible groups and items based on role, permissions, and flags.
 * Includes no caching outside of standard React dependencies.
 * Developer and Ads Manager must NEVER see Payments, Invoices, MRR Roadmap, or Partner Fees.
 */
export function getVisibleNavGroups(
  rawRole: string | null | undefined,
  permissions?: MemberPermissions,
  options?: { totalLeadsCount?: number }
): NavGroupConfig[] {
  const role = normalizeRole(rawRole);
  const totalLeads = options?.totalLeadsCount ?? 0;

  // Client and Partner roles have zero access to console navigation groups
  if (role === 'Client' || role === 'Partner') {
    return [];
  }

  return NAVIGATION_CONFIG.groups
    .filter((group) => {
      // Role check on group
      if (group.allowedRoles && !group.allowedRoles.includes(role)) {
        return false;
      }
      // Business group: Developer and Ads Manager must never see it
      if (group.id === 'business') {
        if (role === 'Developer' || role === 'Ads Manager') {
          return false;
        }
        if (permissions && permissions.canSeeRevenuePayments === false) {
          return false;
        }
      }
      return true;
    })
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (!item.built) return false;
        if (item.minLeadsRequired && totalLeads < item.minLeadsRequired) return false;

        // Role check on item
        if (item.allowedRoles && !item.allowedRoles.includes(role)) {
          return false;
        }

        // Strict role restrictions: Developer and Ads Manager must never see Payments, Invoices, MRR, Partner Fees
        if (
          (item.id === 'payments' || item.id === 'invoices' || item.id === 'mrr' || item.id === 'partner-fees') &&
          (role === 'Developer' || role === 'Ads Manager')
        ) {
          return false;
        }

        // Granular permissions check if member permissions provided
        if (permissions) {
          if (
            (item.id === 'payments' || item.id === 'invoices' || item.id === 'mrr' || item.id === 'partner-fees') &&
            permissions.canSeeRevenuePayments === false
          ) {
            return false;
          }
          if (permissions.navigationAccess && permissions.navigationAccess[item.id] === 'none') {
            return false;
          }
        }

        return true;
      });

      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => group.items.length > 0);
}

/**
 * Pure route guard checking whether a given view ID is accessible.
 * Client and Partner roles must NEVER open console routes.
 */
export function canAccessView(
  rawViewId: string,
  rawRole: string | null | undefined,
  permissions?: MemberPermissions,
  options?: { totalLeadsCount?: number }
): boolean {
  const role = normalizeRole(rawRole);
  const viewId = rawViewId.replace(/^\//, '');

  // Clients and Partners have zero access to console routes
  if (role === 'Client' || role === 'Partner') {
    return false;
  }

  // Overview is accessible to internal roles
  if (viewId === 'overview' || viewId === '') {
    return true;
  }

  // Client workspace detail views
  if (viewId.startsWith('client-') && viewId !== 'client-requests' && viewId !== 'client-files') {
    return true;
  }

  // Strict check: Developer and Ads Manager must NEVER see payments, invoices, mrr, partner-fees
  if (
    (viewId === 'payments' ||
      viewId === 'business-payments' ||
      viewId === 'invoices' ||
      viewId === 'business-invoices' ||
      viewId === 'mrr' ||
      viewId === 'business-mrr' ||
      viewId === 'goals' ||
      viewId === 'partner-fees') &&
    (role === 'Developer' || role === 'Ads Manager')
  ) {
    return false;
  }

  // If permissions explicitly disallow revenue/payments
  if (
    (viewId === 'payments' ||
      viewId === 'business-payments' ||
      viewId === 'invoices' ||
      viewId === 'business-invoices' ||
      viewId === 'mrr' ||
      viewId === 'business-mrr' ||
      viewId === 'goals' ||
      viewId === 'partner-fees') &&
    permissions?.canSeeRevenuePayments === false
  ) {
    return false;
  }

  // Check against visible nav groups
  const visibleGroups = getVisibleNavGroups(role, permissions, options);
  for (const group of visibleGroups) {
    for (const item of group.items) {
      if (item.id === viewId) return true;
      if (item.id === 'clients' && viewId.startsWith('client-')) return true;
      if (item.id === 'partnerships' && viewId.startsWith('partner-')) return true;
      if (item.id === 'leads' && viewId.startsWith('lead-')) return true;
      if (item.id === 'pipeline' && viewId.startsWith('lead-')) return true;
      if (
        item.id === 'settings' &&
        (viewId === 'settings-sequence' ||
          viewId === 'settings-suppression' ||
          viewId === 'settings-backup' ||
          viewId === 'settings-audit' ||
          viewId === 'settings-consistency' ||
          viewId === 'settings-referral' ||
          viewId === 'referral-programme' ||
          viewId === 'settings-packages' ||
          viewId === 'packages')
      ) {
        return true;
      }
      if (item.id === 'channel-settings' && viewId === 'settings-channels') return true;
      if (item.id === 'follow-up-settings' && viewId === 'settings-sequence') return true;
      if (item.id === 'reports-growth' && viewId === 'growth-report') return true;
      if (item.id === 'team-members' && viewId === 'settings-team') return true;
      if (item.id === 'mrr' && (viewId === 'goals' || viewId === 'business-mrr')) return true;
      if (item.id === 'payments' && viewId === 'business-payments') return true;
      if (item.id === 'invoices' && viewId === 'business-invoices') return true;
    }
  }

  return false;
}

