import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Send,
  Handshake,
  Settings,
  Building2,
  KanbanSquare,
  CalendarDays,
  LifeBuoy,
  Wallet,
  Globe,
} from 'lucide-react';
import { LogoMark } from '../common/LogoMark.tsx';
import { getTaskCountDue, getDeliveryBlockedCount, getOpenTicketCount } from '../../data/repo.ts';

interface IconRailProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenShortcuts: () => void;
}

export const IconRail: React.FC<IconRailProps> = ({
  activeTab,
  onSelectTab,
  onOpenShortcuts,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [taskCount, setTaskCount] = useState<number>(0);
  const [deliveryBlockedCount, setDeliveryBlockedCount] = useState<number>(0);
  const [ticketCount, setTicketCount] = useState<number>(0);

  useEffect(() => {
    getTaskCountDue().then((counts) => {
      setTaskCount(counts.dueToday + counts.overdue);
    });
    getDeliveryBlockedCount().then(setDeliveryBlockedCount);
    getOpenTicketCount().then(setTicketCount);
  }, [activeTab]);

  const navButtons = [
    {
      id: 'reports-growth',
      label: 'Growth report (Dashboard)',
      icon: LayoutDashboard,
      action: () => onSelectTab('reports-growth'),
      activeCondition: (tab: string) =>
        tab === 'reports-growth' || tab.startsWith('dashboard'),
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: Users,
      action: () => onSelectTab('leads'),
      activeCondition: (tab: string) => tab === 'leads' || tab.startsWith('lead-'),
    },
    {
      id: 'pipeline',
      label: 'Pipeline (Kanban)',
      icon: Kanban,
      action: () => onSelectTab('pipeline'),
      activeCondition: (tab: string) => tab === 'pipeline',
    },
    {
      id: 'tasks',
      label: 'Tasks & Follow-ups',
      icon: CheckSquare,
      action: () => onSelectTab('tasks'),
      badgeCount: taskCount,
      activeCondition: (tab: string) => tab === 'tasks',
    },
    {
      id: 'outreach',
      label: 'Outreach',
      icon: Send,
      action: () => onSelectTab('outreach'),
      activeCondition: (tab: string) => tab === 'outreach',
    },
    {
      id: 'partnerships',
      label: 'Partnerships',
      icon: Handshake,
      action: () => onSelectTab('partnerships'),
      activeCondition: (tab: string) => tab === 'partnerships' || tab.startsWith('partner-'),
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Building2,
      action: () => onSelectTab('clients'),
      activeCondition: (tab: string) => tab === 'clients' || tab.startsWith('client-'),
    },
    {
      id: 'delivery',
      label: 'Delivery & Projects',
      icon: KanbanSquare,
      action: () => onSelectTab('delivery'),
      badgeCount: deliveryBlockedCount,
      activeCondition: (tab: string) => tab === 'delivery',
    },
    {
      id: 'studio-projects',
      label: 'Website Studio',
      icon: Globe,
      action: () => onSelectTab('studio-projects'),
      activeCondition: (tab: string) => tab.startsWith('studio-'),
    },
    {
      id: 'meetings',
      label: 'Meetings & Calls',
      icon: CalendarDays,
      action: () => onSelectTab('meetings'),
      activeCondition: (tab: string) => tab === 'meetings',
    },
    {
      id: 'tickets',
      label: 'Tickets (Helpdesk)',
      icon: LifeBuoy,
      action: () => onSelectTab('tickets'),
      badgeCount: ticketCount,
      activeCondition: (tab: string) => tab === 'tickets',
    },
    {
      id: 'business-payments',
      label: 'Business & Finance',
      icon: Wallet,
      action: () => onSelectTab('business-payments'),
      activeCondition: (tab: string) => tab.startsWith('business'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      action: () => onSelectTab('settings'),
      activeCondition: (tab: string) => tab.startsWith('settings'),
    },
  ];

  return (
    <aside
      className="w-14 flex flex-col items-center justify-between py-5 shrink-0 select-none z-10"
      aria-label="Primary navigation rail"
    >
      {/* Top: Circular black logo tile */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => onSelectTab('reports-growth')}
          className="w-13 h-13 rounded-full bg-[#111111] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none"
          aria-label="Open Hours Home"
        >
          <LogoMark size={20} />
        </button>

        {/* Circular action buttons */}
        <nav className="flex flex-col items-center gap-2.5 mt-1" aria-label="Icon actions">
          {navButtons.map((btn) => {
            const Icon = btn.icon;
            const isActive = btn.activeCondition(activeTab);

            return (
              <div key={btn.id} className="relative group">
                <button
                  type="button"
                  onClick={btn.action}
                  onMouseEnter={() => setHoveredItem(btn.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none relative ${
                    isActive
                      ? 'bg-[#D92D50] text-white shadow-md shadow-[#D92D50]/30'
                      : 'bg-white text-[#6B6B6B] hover:text-[#111111] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5'
                  }`}
                  aria-label={btn.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.2 : 1.9} />

                  {/* Badge for Tasks (number due today + overdue) */}
                  {btn.badgeCount && btn.badgeCount > 0 ? (
                    <span
                      className={`absolute -top-1 -right-1 px-1.5 min-w-[18px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs ${
                        isActive
                          ? 'bg-[#111111] text-white'
                          : 'bg-[#D92D50] text-white'
                      }`}
                    >
                      {btn.badgeCount}
                    </span>
                  ) : null}
                </button>

                {/* Floating Tooltip */}
                {hoveredItem === btn.id && (
                  <div
                    role="tooltip"
                    className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#111111] text-white text-[12px] font-medium rounded-md whitespace-nowrap shadow-lg z-50 pointer-events-none transition-opacity"
                  >
                    {btn.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User initials circle with notification dot */}
      <div className="relative group pt-2">
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className="w-10 h-10 rounded-full bg-white text-[#111111] text-xs font-bold flex items-center justify-center border border-black/10 shadow-sm hover:scale-105 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] focus-visible:outline-none"
          aria-label="User profile: Founder (Admin)"
        >
          <span>OH</span>
        </button>
        <span
          className="absolute top-2 right-0 w-2.5 h-2.5 bg-[#D92D50] border-2 border-[#F1EFEF] rounded-full"
          aria-label="Active status"
        />
        <div
          role="tooltip"
          className="absolute left-12 bottom-1 hidden group-hover:block px-2.5 py-1 bg-[#111111] text-white text-[12px] font-medium rounded-md whitespace-nowrap shadow-lg z-50 pointer-events-none"
        >
          Founder (Admin)
        </div>
      </div>
    </aside>
  );
};
