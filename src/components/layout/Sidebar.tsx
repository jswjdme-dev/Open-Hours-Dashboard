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
          className="fixed inset-0 bg-[#101828]/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-[#F3F3F5] border-r-0 flex flex-col justify-between shrink-0 select-none text-[#0A0A0A] transition-all duration-200 z-50 ${
          // Mobile drawer vs Desktop
          isMobileOpen
            ? 'fixed inset-y-0 left-0 w-[240px] shadow-2xl bg-white'
            : isCollapsed
            ? 'hidden lg:flex w-[68px]'
            : 'hidden lg:flex w-[240px]'
        }`}
        aria-label="Main sidebar navigation"
      >
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-3">
          {/* Workspace Brand / Header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-3 mb-2 border-b border-[#E3E3E6]">
            <div className={`flex items-center gap-2.5 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <LogoMark size={15} />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="font-semibold text-[14px] text-[#0A0A0A] tracking-tight leading-tight truncate">
                    Open Hours
                  </div>
                  <div className="text-[11px] text-[#73737A] font-medium leading-none mt-0.5 truncate">
                    Console
                  </div>
                </div>
              )}
            </div>

            {/* Desktop collapse toggle button */}
            {!isCollapsed && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex w-8 h-8 rounded-full hover:bg-[#E9E9EC] text-[#73737A] hover:text-[#0A0A0A] items-center justify-center transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            )}

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden w-8 h-8 rounded-full hover:bg-[#E9E9EC] text-[#73737A] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Desktop Expand Button when collapsed */}
          {isCollapsed && onToggleCollapse && (
            <div className="flex justify-center pb-2">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-8 h-8 rounded-full hover:bg-[#E9E9EC] text-[#73737A] hover:text-[#0A0A0A] flex items-center justify-center transition-colors cursor-pointer"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeft size={16} />
              </button>
            </div>
          )}

          {/* OVERVIEW (Single top-level item) */}
          <div className="mb-1">
            <button
              type="button"
              onClick={() => handleItemClick(NAVIGATION_CONFIG.overview.id, NAVIGATION_CONFIG.overview.label)}
              title={isCollapsed ? NAVIGATION_CONFIG.overview.label : undefined}
              className={`w-full h-10 flex items-center rounded-full text-[14px] transition-all cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3.5'
              } ${
                isOverviewActive
                  ? 'bg-[#E9E9EC] text-[#0A0A0A] font-semibold shadow-2xs'
                  : 'text-[#4A4A4F] hover:bg-[#E9E9EC]/70 hover:text-[#0A0A0A] font-medium'
              }`}
            >
              <OverviewIcon
                size={18}
                className={isOverviewActive ? 'text-[#0A0A0A] shrink-0' : 'text-[#73737A] shrink-0'}
              />
              {!isCollapsed && <span className="truncate">{NAVIGATION_CONFIG.overview.label}</span>}
            </button>
          </div>

          {/* Collapsible Groups or Loading Skeleton */}
          <nav className="space-y-2 flex-1" aria-label="Navigation groups">
            {isLoading ? (
              <div className="space-y-3 px-1 py-2 animate-pulse" aria-label="Loading navigation skeleton">
                <div className="space-y-2">
                  <div className="h-3 bg-[#E3E3E6] rounded w-16 mx-2" />
                  <div className="h-10 bg-[#E9E9EC] rounded-full w-full" />
                  <div className="h-10 bg-[#E9E9EC] rounded-full w-full" />
                  <div className="h-10 bg-[#E9E9EC] rounded-full w-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-[#E3E3E6] rounded w-20 mx-2" />
                  <div className="h-10 bg-[#E9E9EC] rounded-full w-full" />
                  <div className="h-10 bg-[#E9E9EC] rounded-full w-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-[#E3E3E6] rounded w-14 mx-2" />
                  <div className="h-10 bg-[#E9E9EC] rounded-full w-full" />
                  <div className="h-10 bg-[#E9E9EC] rounded-full w-full" />
                </div>
              </div>
            ) : (
              visibleGroups.map((group) => {
                const isGroupCollapsed = Boolean(collapsedGroups[group.id]);

                return (
                  <div key={group.id} className="space-y-0.5">
                    {/* Group Header with chevron and small uppercase muted label */}
                    {!isCollapsed ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-[#73737A] uppercase hover:text-[#0A0A0A] transition-colors cursor-pointer group"
                        aria-expanded={!isGroupCollapsed}
                      >
                        <span className="truncate">{group.label}</span>
                        <ChevronDown
                          size={12}
                          className={`text-[#73737A] transition-transform duration-200 group-hover:text-[#0A0A0A] ${
                            isGroupCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                      </button>
                    ) : (
                      <div className="h-px bg-[#E3E3E6] my-1" />
                    )}

                    {/* Items List */}
                    {(!isGroupCollapsed || isCollapsed) && (
                      <div className="space-y-1">
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
                              className={`w-full h-10 flex items-center justify-between rounded-full text-[14px] transition-all cursor-pointer ${
                                isCollapsed ? 'justify-center px-0' : 'px-3.5'
                              } ${
                                isActive
                                  ? 'bg-[#E9E9EC] text-[#0A0A0A] font-semibold shadow-2xs'
                                  : 'text-[#4A4A4F] hover:bg-[#E9E9EC]/70 hover:text-[#0A0A0A] font-medium'
                              }`}
                            >
                              <div className={`flex items-center gap-2.5 truncate ${isCollapsed ? 'justify-center' : ''}`}>
                                <Icon
                                  size={18}
                                  className={isActive ? 'text-[#0A0A0A] shrink-0' : 'text-[#73737A] shrink-0'}
                                />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                              </div>

                              {!isCollapsed && badgeValue > 0 && (
                                <span
                                  className={`px-2 min-w-[20px] h-5 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                                    item.badgeKey === 'tasks'
                                      ? 'bg-[#E7F8EF] text-[#027A48]'
                                      : 'bg-[#FEECEB] text-[#B42318]'
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

          {/* Bottom Pinned Area: MRR target progress card + Role Switcher */}
          {!isCollapsed && (
            <div className="pt-2.5 space-y-2 mt-2 border-t border-[#E3E3E6] shrink-0">
              {/* Pinned Card: MRR target progress (soft grey rounded card) */}
              <div
                onClick={() => handleItemClick('mrr', 'MRR Roadmap')}
                className="bg-[#E9E9EC] rounded-[16px] p-3.5 hover:bg-[#E3E3E6] transition-all cursor-pointer shadow-2xs"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleItemClick('mrr', 'MRR Roadmap')}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#73737A] text-[11.5px] font-medium">
                    MRR Target Progress
                  </span>
                  <span className="text-[#0A0A0A] text-[11.5px] font-semibold">
                    {mrrData.progressPct}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-[14px] font-bold text-[#0A0A0A] tabular-nums">
                    €{mrrData.currentMrr.toLocaleString()}
                  </div>
                  <div className="text-[12px] font-medium text-[#73737A] tabular-nums">
                    Goal: €{mrrData.goalMrr.toLocaleString()}
                  </div>
                </div>

                {/* Progress bar: 8px tall rounded, filled part deep blue #1627E8 */}
                <div className="w-full h-2 rounded-full bg-[#C9C9CC] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1627E8] transition-all duration-500"
                    style={{ width: `${mrrData.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Role Indicator */}
              <div className="flex items-center justify-between px-1 text-[11.5px] text-[#73737A]">
                <span className="font-medium text-[#73737A]">Role:</span>
                <span className="font-semibold text-[#0A0A0A]">
                  {effectiveRole}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

