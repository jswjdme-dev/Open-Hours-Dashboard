import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Star,
  History,
  Plus,
  FolderOpen,
  Sliders,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getClients,
  getRequests,
  getDeliveryBlockedCount,
  getOpenTicketCount,
} from '../../data/repo.ts';

interface TreeNavProps {
  currentView: string;
  onNavigate: (viewId: string, label: string) => void;
}

export const TreeNav: React.FC<TreeNavProps> = ({ currentView, onNavigate }) => {
  const [clientsOpen, setClientsOpen] = useState(true);
  const [businessOpen, setBusinessOpen] = useState(true);
  const [sharedReportsOpen, setSharedReportsOpen] = useState(true);
  const [myReportsOpen, setMyReportsOpen] = useState(true);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const [clientList, setClientList] = useState<Array<{ id: string; label: string; badge: string | null }>>([]);
  const [deliveryBlocked, setDeliveryBlocked] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    Promise.all([
      getClients(),
      getRequests(),
      getDeliveryBlockedCount(),
      getOpenTicketCount(),
    ]).then(([clis, reqs, blocked, ticks]) => {
      const openByClient: Record<string, number> = {};
      reqs.forEach((r) => {
        if (r.assignedToClient && (r.status === 'Pending' || r.status === 'Needs Changes')) {
          openByClient[r.clientId] = (openByClient[r.clientId] || 0) + 1;
        }
      });

      const list = clis.map((c) => ({
        id: `client-${c.id}`,
        label: c.businessName,
        badge: openByClient[c.id] ? String(openByClient[c.id]) : null,
      }));
      setClientList(list);
      setDeliveryBlocked(blocked);
      setTicketCount(ticks);
    });
  }, [currentView]);

  return (
    <nav
      className="w-60 flex flex-col justify-between py-5 pr-4 pl-1 text-[13.5px] select-none text-[#111111]"
      aria-label="Workspace tree navigation"
    >
      <div className="flex flex-col">
        {/* Workspace Switcher Header */}
        <div className="relative mb-4 px-2">
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="flex items-center gap-1.5 font-bold text-[17px] text-[#111111] hover:text-black tracking-tight group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D92D50] rounded-md px-1 py-0.5"
            aria-expanded={workspaceMenuOpen}
            aria-label="Switch workspace: Open Hours"
          >
            <span>Open Hours</span>
            <ChevronDown
              size={15}
              className={`text-[#6B6B6B] transition-transform duration-200 group-hover:text-black ${
                workspaceMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Workspace dropdown menu */}
          <AnimatePresence>
            {workspaceMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-2 top-8 w-56 bg-white rounded-xl shadow-lg border border-black/5 p-2 z-40 text-xs"
              >
                <div className="px-2 py-1 text-[11px] text-[#A8A5A5] uppercase tracking-wider font-semibold">
                  Workspaces
                </div>
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen(false)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#FCE9ED] text-[#D92D50] font-semibold"
                >
                  <span>Open Hours (Dublin & Sliema)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D92D50]" />
                </button>
                <div className="mt-1 pt-1 border-t border-black/5">
                  <div className="px-2 py-1 text-[11px] text-[#A8A5A5]">Solo Founder Ops · Ireland & Malta</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Utilities: Starred & Recent */}
        <div className="flex items-center gap-4 px-3 mb-3 text-[#6B6B6B]">
          <button
            type="button"
            onClick={() => onNavigate('starred', 'Starred Items')}
            className="flex items-center gap-1.5 hover:text-[#111111] transition-colors py-0.5 cursor-pointer focus-visible:ring-1 focus-visible:ring-[#D92D50] rounded"
          >
            <Star size={13} className="text-[#A8A5A5]" />
            <span className="font-medium text-[13px]">Starred</span>
          </button>
          <span className="text-black/15 text-xs">|</span>
          <button
            type="button"
            onClick={() => onNavigate('recent', 'Recent Activity')}
            className="flex items-center gap-1.5 hover:text-[#111111] transition-colors py-0.5 cursor-pointer focus-visible:ring-1 focus-visible:ring-[#D92D50] rounded"
          >
            <History size={13} className="text-[#A8A5A5]" />
            <span className="font-medium text-[13px]">Recent</span>
          </button>
        </div>

        {/* Core Phase 2 Pipeline & Growth Navigation */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 mb-4 text-[#111111] border-b border-black/5 pb-3">
          <button
            type="button"
            onClick={() => onNavigate('leads', 'Leads')}
            className={`font-semibold text-[13.5px] hover:text-[#D92D50] transition-colors cursor-pointer py-0.5 ${
              currentView === 'leads' ? 'text-[#D92D50] font-bold' : 'text-[#111111]'
            }`}
          >
            Leads
          </button>
          <span className="text-black/20 text-xs">|</span>
          <button
            type="button"
            onClick={() => onNavigate('pipeline', 'Pipeline')}
            className={`font-semibold text-[13.5px] hover:text-[#D92D50] transition-colors cursor-pointer py-0.5 ${
              currentView === 'pipeline' ? 'text-[#D92D50] font-bold' : 'text-[#111111]'
            }`}
          >
            Pipeline
          </button>
          <span className="text-black/20 text-xs">|</span>
          <button
            type="button"
            onClick={() => onNavigate('tasks', 'Tasks & Follow-ups')}
            className={`font-semibold text-[13.5px] hover:text-[#D92D50] transition-colors cursor-pointer py-0.5 ${
              currentView === 'tasks' ? 'text-[#D92D50] font-bold' : 'text-[#111111]'
            }`}
          >
            Tasks
          </button>
          <span className="text-black/20 text-xs">|</span>
          <button
            type="button"
            onClick={() => onNavigate('outreach', 'Outreach')}
            className={`font-semibold text-[13.5px] hover:text-[#D92D50] transition-colors cursor-pointer py-0.5 ${
              currentView === 'outreach' ? 'text-[#D92D50] font-bold' : 'text-[#111111]'
            }`}
          >
            Outreach
          </button>
          <span className="text-black/20 text-xs">|</span>
          <button
            type="button"
            onClick={() => onNavigate('partnerships', 'Partnerships')}
            className={`font-semibold text-[13.5px] hover:text-[#D92D50] transition-colors cursor-pointer py-0.5 ${
              currentView === 'partnerships' ? 'text-[#D92D50] font-bold' : 'text-[#111111]'
            }`}
          >
            Partnerships
          </button>
          <span className="text-black/20 text-xs">|</span>
          <button
            type="button"
            onClick={() => onNavigate('goals', 'Goals')}
            className={`font-semibold text-[13.5px] hover:text-[#D92D50] transition-colors cursor-pointer py-0.5 ${
              currentView === 'goals' ? 'text-[#D92D50] font-bold' : 'text-[#111111]'
            }`}
          >
            Goals
          </button>
        </div>

        {/* SECTION: Dashboard */}
        <div className="mb-3">
          <div className="flex items-center justify-between px-3 py-1 text-[#111111]">
            <span className="font-bold text-[14px]">
              Dashboard
            </span>
            <button
              type="button"
              onClick={() => onNavigate('dashboard-overview', 'Dashboard Overview')}
              className="w-5 h-5 rounded-full border border-black/15 flex items-center justify-center text-[#6B6B6B] hover:text-black hover:border-black/30 transition-colors"
              aria-label="Add dashboard view"
            >
              <Plus size={11} />
            </button>
          </div>

          <div className="relative ml-4 pl-3 mt-1 border-l border-black/10 flex flex-col gap-1">
            {/* Overview */}
            <div className="relative flex items-center py-0.5">
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => onNavigate('dashboard-overview', 'Overview')}
                className={`text-left w-full pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                  currentView === 'dashboard-overview' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                }`}
              >
                Overview
              </button>
            </div>

            {/* Clients group (Phase 3 placeholder) */}
            <div className="relative py-0.5">
              <span className="absolute -left-3 top-2.5 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => setClientsOpen(!clientsOpen)}
                className="flex items-center justify-between w-full pl-1 text-left hover:text-[#D92D50] transition-colors cursor-pointer text-xs text-[#111111]"
                aria-expanded={clientsOpen}
              >
                <span className="font-medium">Clients</span>
                {clientsOpen ? (
                  <ChevronDown size={13} className="text-[#6B6B6B]" />
                ) : (
                  <ChevronRight size={13} className="text-[#6B6B6B]" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {clientsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden ml-2 pl-3 border-l border-black/10 mt-1 flex flex-col gap-1"
                  >
                    {clientList.map((client) => {
                      const isActive = currentView === client.id;
                      return (
                        <div key={client.id} className="relative flex items-center justify-between py-0.5">
                          <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                          <button
                            type="button"
                            onClick={() => onNavigate(client.id, client.label)}
                            className={`text-left text-xs truncate max-w-[130px] pl-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                              isActive ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                            }`}
                          >
                            {client.label}
                          </button>
                          {client.badge && (
                            <span className="px-1.5 py-0.2 bg-[#D92D50] text-white text-[10px] font-bold rounded-full leading-none flex items-center justify-center h-4 min-w-[16px]">
                              {client.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Delivery (Phase 3) */}
            <div className="relative flex items-center justify-between py-0.5">
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => onNavigate('delivery', 'Delivery & Stages')}
                className={`text-left pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                  currentView === 'delivery' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                }`}
              >
                Delivery
              </button>
              {deliveryBlocked > 0 && (
                <span className="px-1.5 py-0.2 bg-[#D92D50] text-white text-[10px] font-bold rounded-full leading-none flex items-center justify-center h-4 min-w-[16px]">
                  {deliveryBlocked}
                </span>
              )}
            </div>

            {/* Meetings (Phase 3) */}
            <div className="relative flex items-center py-0.5">
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => onNavigate('meetings', 'Meetings & Calls')}
                className={`text-left w-full pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                  currentView === 'meetings' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                }`}
              >
                Meetings
              </button>
            </div>

            {/* Tickets (Phase 3) */}
            <div className="relative flex items-center justify-between py-0.5">
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => onNavigate('tickets', 'Tickets Helpdesk')}
                className={`text-left pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                  currentView === 'tickets' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                }`}
              >
                Tickets
              </button>
              {ticketCount > 0 && (
                <span className="px-1.5 py-0.2 bg-[#D92D50] text-white text-[10px] font-bold rounded-full leading-none flex items-center justify-center h-4 min-w-[16px]">
                  {ticketCount}
                </span>
              )}
            </div>

            {/* Growth Report (Phase 1 Home page) */}
            <div className="relative flex items-center py-0.5">
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => onNavigate('reports-growth', 'Growth report')}
                className={`text-left w-full pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                  currentView === 'reports-growth' ? 'text-[#D92D50] font-bold' : 'text-[#6B6B6B]'
                }`}
              >
                Growth report
              </button>
            </div>
          </div>
        </div>

        {/* SECTION: Business (Phase 3) */}
        <div className="mb-3">
          <div className="flex items-center justify-between px-3 py-1 text-[#111111]">
            <button
              type="button"
              onClick={() => setBusinessOpen(!businessOpen)}
              className="flex items-center gap-1 font-bold text-[14px] hover:text-[#D92D50] transition-colors cursor-pointer text-left"
            >
              <span>Business</span>
              {businessOpen ? (
                <ChevronDown size={13} className="text-[#6B6B6B]" />
              ) : (
                <ChevronRight size={13} className="text-[#6B6B6B]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('business-payments', 'Payments')}
              className="w-5 h-5 rounded-full border border-black/15 flex items-center justify-center text-[#6B6B6B] hover:text-black hover:border-black/30 transition-colors"
              aria-label="Add transaction"
            >
              <Plus size={11} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {businessOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden ml-4 pl-3 mt-1 border-l border-black/10 flex flex-col gap-1"
              >
                <div className="relative flex items-center py-0.5">
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                  <button
                    type="button"
                    onClick={() => onNavigate('business-payments', 'Payments')}
                    className={`text-left w-full pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                      currentView === 'business-payments' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                    }`}
                  >
                    Payments
                  </button>
                </div>

                <div className="relative flex items-center py-0.5">
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                  <button
                    type="button"
                    onClick={() => onNavigate('business-invoices', 'Invoices')}
                    className={`text-left w-full pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                      currentView === 'business-invoices' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                    }`}
                  >
                    Invoices
                  </button>
                </div>

                <div className="relative flex items-center py-0.5">
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                  <button
                    type="button"
                    onClick={() => onNavigate('business-mrr', 'MRR Roadmap')}
                    className={`text-left w-full pl-1 transition-colors hover:text-[#D92D50] cursor-pointer text-xs ${
                      currentView === 'business-mrr' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                    }`}
                  >
                    MRR roadmap
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION: Reports */}
        <div className="mb-3">
          <div className="flex items-center justify-between px-3 py-1 text-[#111111]">
            <span className="font-bold text-[14px]">
              Reports
            </span>
            <button
              type="button"
              onClick={() => onNavigate('reports-summary', 'Reports Summary')}
              className="w-5 h-5 rounded-full border border-black/15 flex items-center justify-center text-[#6B6B6B] hover:text-black hover:border-black/30 transition-colors"
              aria-label="Add report"
            >
              <Plus size={11} />
            </button>
          </div>

          <div className="relative ml-4 pl-3 mt-1 border-l border-black/10 flex flex-col gap-1">
            {/* Shared with me */}
            <div className="relative py-0.5">
              <span className="absolute -left-3 top-2.5 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => setSharedReportsOpen(!sharedReportsOpen)}
                className="flex items-center justify-between w-full pl-1 text-left hover:text-[#D92D50] transition-colors cursor-pointer text-xs text-[#111111]"
                aria-expanded={sharedReportsOpen}
              >
                <span className="font-medium">Shared with me</span>
                {sharedReportsOpen ? (
                  <ChevronDown size={13} className="text-[#6B6B6B]" />
                ) : (
                  <ChevronRight size={13} className="text-[#6B6B6B]" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {sharedReportsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden ml-2 pl-3 border-l border-black/10 mt-1 flex flex-col gap-1"
                  >
                    <div className="relative flex items-center py-0.5">
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                      <button
                        type="button"
                        onClick={() => onNavigate('reports-funnel', 'Funnel')}
                        className={`text-left text-xs pl-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                          currentView === 'reports-funnel' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                        }`}
                      >
                        Funnel
                      </button>
                    </div>
                    <div className="relative flex items-center py-0.5">
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                      <button
                        type="button"
                        onClick={() => onNavigate('reports-reply-rate', 'Reply rate')}
                        className={`text-left text-xs pl-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                          currentView === 'reports-reply-rate' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                        }`}
                      >
                        Reply rate
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* My reports */}
            <div className="relative py-0.5">
              <span className="absolute -left-3 top-2.5 w-2.5 h-[1px] bg-black/15" />
              <button
                type="button"
                onClick={() => setMyReportsOpen(!myReportsOpen)}
                className="flex items-center justify-between w-full pl-1 text-left hover:text-[#D92D50] transition-colors cursor-pointer text-xs text-[#111111]"
                aria-expanded={myReportsOpen}
              >
                <span className="font-medium">My reports</span>
                {myReportsOpen ? (
                  <ChevronDown size={13} className="text-[#6B6B6B]" />
                ) : (
                  <ChevronRight size={13} className="text-[#6B6B6B]" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {myReportsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden ml-2 pl-3 border-l border-black/10 mt-1 flex flex-col gap-1"
                  >
                    <div className="relative flex items-center py-0.5">
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                      <button
                        type="button"
                        onClick={() => onNavigate('reports-emails-sent', 'Emails sent')}
                        className={`text-left text-xs pl-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                          currentView === 'reports-emails-sent' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                        }`}
                      >
                        Emails sent
                      </button>
                    </div>

                    <div className="relative flex items-center py-0.5">
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                      <button
                        type="button"
                        onClick={() => onNavigate('reports-lost-reasons', 'Lost reasons')}
                        className={`text-left text-xs pl-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                          currentView === 'reports-lost-reasons' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                        }`}
                      >
                        Lost reasons
                      </button>
                    </div>

                    {/* Analytics with red badge: 7 */}
                    <div className="relative flex items-center justify-between py-0.5">
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-black/15" />
                      <button
                        type="button"
                        onClick={() => onNavigate('reports-analytics', 'Analytics')}
                        className={`text-left text-xs pl-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                          currentView === 'reports-analytics' ? 'text-[#D92D50] font-semibold' : 'text-[#6B6B6B]'
                        }`}
                      >
                        Analytics
                      </button>
                      <span className="px-1.5 py-0.2 bg-[#D92D50] text-white text-[10px] font-bold rounded-full leading-none flex items-center justify-center h-4 min-w-[16px]">
                        7
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* SECTION: Settings shortcuts in Tree panel */}
        <div className="mt-2 pt-2 border-t border-black/5">
          <div className="px-3 py-1 text-[11px] font-semibold text-[#A8A5A5] uppercase tracking-wider">
            Governance & Rules
          </div>
          <div className="flex flex-col gap-0.5 px-3">
            <button
              type="button"
              onClick={() => onNavigate('settings-suppression', 'Suppression List')}
              className={`text-left text-xs py-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                currentView === 'settings-suppression' ? 'text-[#D92D50] font-bold' : 'text-[#6B6B6B]'
              }`}
            >
              Suppression list
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings-sequence', 'Follow-up Sequence')}
              className={`text-left text-xs py-1 transition-colors hover:text-[#D92D50] cursor-pointer ${
                currentView === 'settings-sequence' ? 'text-[#D92D50] font-bold' : 'text-[#6B6B6B]'
              }`}
            >
              Follow-up sequence
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Manage folders with folder icon */}
      <div className="pt-3 px-2 border-t border-black/5">
        <button
          type="button"
          onClick={() => onNavigate('manage-folders', 'Manage folders')}
          className="flex items-center gap-2 text-xs font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer py-1"
        >
          <FolderOpen size={14} className="text-[#A8A5A5]" />
          <span>Manage folders</span>
        </button>
      </div>
    </nav>
  );
};
