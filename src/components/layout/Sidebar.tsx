import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  LayoutDashboard,
  TrendingUp,
  LineChart,
  Filter,
  ArrowLeftRight,
  Users,
  Kanban,
  CheckSquare,
  Send,
  ShieldAlert,
  Handshake,
  Compass,
  GitPullRequestDraft,
  Target,
  BookOpen,
  FlaskConical,
  Building2,
  KanbanSquare,
  Inbox,
  FolderOpen,
  CalendarDays,
  LifeBuoy,
  CreditCard,
  FileText,
  Coins,
  Receipt,
  ShieldCheck,
  Clock,
  Database,
  Settings,
  ChevronRight,
  Award,
  Sliders,
  FileCode,
  Layers,
  Globe,
  Layout,
  PanelLeftClose,
  PanelLeft,
  X,
  Gift,
} from 'lucide-react';
import { LogoMark } from '../common/LogoMark.tsx';
import {
  NAVIGATION_CONFIG,
  NavGroupConfig,
  NavItemConfig,
  normalizeRole,
  getVisibleNavGroups,
} from '../../config/navigation.ts';
import { Role, TeamMemberProfile } from '../../types/index.ts';
import {
  getTaskCountDue,
  getDeliveryBlockedCount,
  getOpenTicketCount,
  getLeads,
} from '../../data/repo.ts';
import { getSidebarMrrProgress } from '../../lib/metrics.ts';

// Icon map linking string names to Lucide icons (rendered at 18px)
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  Filter,
  ArrowLeftRight,
  Users,
  Kanban,
  CheckSquare,
  Send,
  ShieldAlert,
  Handshake,
  Compass,
  GitPullRequestDraft,
  Target,
  BookOpen,
  FlaskConical,
  Building2,
  KanbanSquare,
  Inbox,
  FolderOpen,
  CalendarDays,
  LifeBuoy,
  CreditCard,
  FileText,
  Coins,
  Receipt,
  ShieldCheck,
  Clock,
  Database,
  Settings,
  Award,
  Sliders,
  FileCode,
  Layers,
  Globe,
  Layout,
  Gift,
};

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string, label: string) => void;
  onOpenCommandPalette: () => void;
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  previewMember?: TeamMemberProfile | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isLoading?: boolean;
}

const STORAGE_KEY = 'open_hours_nav_collapsed_groups_v1';

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenCommandPalette,
  currentRole,
  onRoleChange,
  previewMember,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  isLoading = false,
}) => {
  // Real counts for badges
  const [badgeCounts, setBadgeCounts] = useState<{
    tasks: number;
    tickets: number;
    blockedClients: number;
  }>({ tasks: 0, tickets: 0, blockedClients: 0 });

  // MRR progress data for pinned card
  const [mrrData, setMrrData] = useState<{
    currentMrr: number;
    goalMrr: number;
    progressPct: number;
  }>({ currentMrr: 9400, goalMrr: 10000, progressPct: 94 });

  // Total leads count for Experiments conditional visibility (needs 100+)
  const [totalLeadsCount, setTotalLeadsCount] = useState<number>(0);

  // Group expansion state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // safe fallback
    }
    return {};
  });

  // Fetch badges and MRR progress
  useEffect(() => {
    const updateBadges = () => {
      Promise.all([
        getTaskCountDue(),
        getOpenTicketCount(),
        getDeliveryBlockedCount(),
        getSidebarMrrProgress(),
        getLeads(),
      ]).then(([taskCounts, tickets, blocked, mrr, leads]) => {
        setBadgeCounts({
          tasks: taskCounts.dueToday + taskCounts.overdue,
          tickets,
          blockedClients: blocked,
        });
        setMrrData(mrr);
        setTotalLeadsCount(leads.length);
      });
    };

    updateBadges();

    const handleEvent = () => {
      updateBadges();
    };

    window.addEventListener('domainEventEmitted', handleEvent);
    return () => {
      window.removeEventListener('domainEventEmitted', handleEvent);
    };
  }, [currentView]);

  // Save collapsed groups state
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  };

  // Determine active group and auto-expand it
  useEffect(() => {
    NAVIGATION_CONFIG.groups.forEach((group) => {
      const containsActive = group.items.some((item) => {
        if (item.id === currentView) return true;
        if (currentView.startsWith('client-') && (item.id === 'clients' || item.id === 'delivery')) return true;
        if (currentView.startsWith('partner-') && item.id === 'partnerships') return true;
        if (currentView.startsWith('lead-') && (item.id === 'leads' || item.id === 'pipeline')) return true;
        if (currentView.startsWith('settings-') && (item.id === currentView || item.id === 'settings')) return true;
        return false;
      });

      if (containsActive && collapsedGroups[group.id]) {
        setCollapsedGroups((prev) => {
          const next = { ...prev, [group.id]: false };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    });
  }, [currentView]);

  // Effective role: when previewing a member, use the member's normalized role only.
  // Otherwise, use the user's normalized current role.
  const effectiveRole = useMemo(() => {
    return normalizeRole(previewMember ? previewMember.role : currentRole);
  }, [previewMember, currentRole]);

  // Pure function computation with all dependencies included
  const visibleGroups = useMemo(() => {
    return getVisibleNavGroups(effectiveRole, previewMember?.permissions, {
      totalLeadsCount,
    });
  }, [effectiveRole, previewMember?.permissions, totalLeadsCount]);

  const OverviewIcon = ICON_MAP[NAVIGATION_CONFIG.overview.icon] || LayoutDashboard;
  const isOverviewActive = currentView === 'overview';

  const handleItemClick = (id: string, label: string) => {
    onNavigate(id, label);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#0F2A47]/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Desktop spacer to preserve layout width in flex flow */}
      <div
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          isCollapsed ? 'w-[76px]' : 'w-[248px]'
        }`}
        aria-hidden="true"
      />

      <aside
        className={`bg-[#0F2A47] text-[#E6EDF5] border-r-0 flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-40 ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 w-[248px] shadow-2xl bg-[#0F2A47] z-50'
            : isCollapsed
            ? 'hidden lg:flex fixed inset-y-0 left-0 w-[76px] h-screen shadow-[4px_0_24px_rgba(15,42,71,0.18)]'
            : 'hidden lg:flex fixed inset-y-0 left-0 w-[248px] h-screen shadow-[4px_0_24px_rgba(15,42,71,0.18)]'
        }`}
        aria-label="Main sidebar navigation"
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-3">
          {/* Workspace Brand / Header */}
          <div className="flex items-center justify-between px-2 pt-2 pb-3 mb-2 border-b border-white/12">
            <div className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-9 h-9 rounded-[10px] bg-white/12 text-white flex items-center justify-center shrink-0 border border-white/10">
                <LogoMark size={16} />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="font-semibold text-[15px] text-white tracking-tight leading-tight truncate">
                    Open Hours
                  </div>
                  <div className="text-[11px] text-[#9DB2C8] font-medium leading-none mt-0.5 truncate">
                    Console
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden w-8 h-8 rounded-lg hover:bg-[#17375A] text-[#9DB2C8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* OVERVIEW (Single top-level item) */}
          <div className="mb-1">
            <button
              type="button"
              onClick={() => handleItemClick(NAVIGATION_CONFIG.overview.id, NAVIGATION_CONFIG.overview.label)}
              title={isCollapsed ? NAVIGATION_CONFIG.overview.label : undefined}
              className={`w-full h-[44px] flex items-center rounded-[10px] text-[15px] transition-all cursor-pointer relative ${
                isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                isOverviewActive
                  ? 'bg-[#1D4373] text-white font-medium after:content-[\'\'] after:absolute after:right-0 after:top-1.5 after:bottom-1.5 after:w-[3px] after:bg-[var(--accent)] after:rounded-l'
                  : 'text-[#E6EDF5] hover:bg-[#17375A] hover:text-white font-normal'
              }`}
            >
              <OverviewIcon
                size={20}
                className={isOverviewActive ? 'text-white shrink-0' : 'text-[#E6EDF5] shrink-0'}
              />
              {!isCollapsed && <span className="truncate">{NAVIGATION_CONFIG.overview.label}</span>}
            </button>
          </div>

          {/* Collapsible Groups or Loading Skeleton */}
          <nav className="space-y-1 flex-1" aria-label="Navigation groups">
            {isLoading ? (
              <div className="space-y-3 px-1 py-2 animate-pulse" aria-label="Loading navigation skeleton">
                <div className="space-y-2">
                  <div className="h-3 bg-white/10 rounded w-16 mx-2" />
                  <div className="h-10 bg-white/5 rounded-[10px] w-full" />
                  <div className="h-10 bg-white/5 rounded-[10px] w-full" />
                </div>
              </div>
            ) : (
              visibleGroups.map((group) => {
                const isGroupCollapsed = Boolean(collapsedGroups[group.id]);

                return (
                  <div key={group.id} className="space-y-0.5 pt-1">
                    {/* Group Header with chevron and small uppercase muted label */}
                    {!isCollapsed ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-[#9DB2C8] uppercase hover:text-white transition-colors cursor-pointer group"
                        aria-expanded={!isGroupCollapsed}
                      >
                        <span className="truncate">{group.label}</span>
                        <ChevronDown
                          size={13}
                          className={`text-[#9DB2C8] transition-transform duration-200 group-hover:text-white ${
                            isGroupCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="h-px bg-white/12 my-2" />
                    )}

                    {/* Items List */}
                    {(!isGroupCollapsed || isCollapsed) && (
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = ICON_MAP[item.icon] || LayoutDashboard;

                          // Check if item is active
                          const isActive =
                            currentView === item.id ||
                            (item.id === 'clients' && currentView.startsWith('client-')) ||
                            (item.id === 'partnerships' && currentView.startsWith('partner-')) ||
                            (item.id === 'settings' && currentView === 'settings-sequence');

                          // Badge count computation
                          const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleItemClick(item.id, item.label)}
                              title={isCollapsed ? item.label : undefined}
                              className={`w-full h-[44px] flex items-center justify-between rounded-[10px] text-[15px] transition-all cursor-pointer relative ${
                                isCollapsed ? 'justify-center px-0' : 'px-3'
                              } ${
                                isActive
                                  ? 'bg-[#1D4373] text-white font-medium after:content-[\'\'] after:absolute after:right-0 after:top-1.5 after:bottom-1.5 after:w-[3px] after:bg-[var(--accent)] after:rounded-l'
                                  : 'text-[#E6EDF5] hover:bg-[#17375A] hover:text-white font-normal'
                              }`}
                            >
                              <div className={`flex items-center gap-3 truncate ${isCollapsed ? 'justify-center' : ''}`}>
                                <Icon
                                  size={20}
                                  className={isActive ? 'text-white shrink-0' : 'text-[#E6EDF5] shrink-0'}
                                />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                              </div>

                              {!isCollapsed && badgeValue > 0 && (
                                <span
                                  className={`px-2 min-w-[20px] h-5 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                                    item.badgeKey === 'tasks'
                                      ? 'bg-[var(--accent)] text-white'
                                      : 'bg-[#DC2626] text-white'
                                  }`}
                                >
                                  {badgeValue}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </nav>

          {/* Bottom Pinned Area: MRR target progress card + Role Switcher + Collapse Control */}
          <div className="pt-2.5 space-y-2 mt-2 border-t border-white/12 shrink-0">
            {!isCollapsed && (
              <>
                {/* Pinned Card: MRR target progress (translucent navy card rgba(255,255,255,0.08)) */}
                <div
                  onClick={() => handleItemClick('mrr', 'MRR Roadmap')}
                  className="bg-white/[0.08] border border-white/10 rounded-[12px] p-3.5 hover:bg-white/[0.12] transition-all cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleItemClick('mrr', 'MRR Roadmap')}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#9DB2C8] text-[11.5px] font-medium">
                      MRR Target Progress
                    </span>
                    <span className="text-white text-[11.5px] font-semibold tabular-nums">
                      {mrrData.progressPct}%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-[14px] font-semibold text-white tabular-nums">
                      €{mrrData.currentMrr.toLocaleString()}
                    </div>
                    <div className="text-[12px] font-medium text-[#9DB2C8] tabular-nums">
                      Goal: €{mrrData.goalMrr.toLocaleString()}
                    </div>
                  </div>

                  {/* Progress bar: slim rounded bar filled with accent blue */}
                  <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${mrrData.progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Role Indicator */}
                <div className="flex items-center justify-between px-1 text-[11.5px] text-[#9DB2C8]">
                  <span className="font-medium text-[#9DB2C8]">Role:</span>
                  <span className="font-semibold text-white">
                    {effectiveRole}
                  </span>
                </div>
              </>
            )}

            {/* Collapse Control at bottom (icon + label) */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`w-full h-11 flex items-center rounded-[10px] text-[14px] text-[#9DB2C8] hover:text-white hover:bg-[#17375A] transition-colors cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : 'px-3 gap-2.5'
                }`}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <PanelLeft size={20} strokeWidth={1.75} />
                ) : (
                  <>
                    <PanelLeftClose size={20} strokeWidth={1.75} />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

