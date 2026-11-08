import React from 'react';
import {
  ShieldCheck,
  User,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';
import { Role } from '../types/index.ts';
import { normalizeRole } from '../config/navigation.ts';

interface TeamRolesPageProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
}

export const TeamRolesPage: React.FC<TeamRolesPageProps> = ({
  currentRole,
  onRoleChange,
}) => {
  const roles: Array<{
    name: Role;
    desc: string;
    level: string;
    permissions: string[];
  }> = [
    {
      name: 'Admin',
      desc: 'Solo founder executive access. Unrestricted permission to all financials, settings, sequences, and exports.',
      level: 'Superuser',
      permissions: ['All Modules', 'Financial Ledger & Pricing', 'Database Backup & Restore', 'Suppression & Sequence Governance'],
    },
    {
      name: 'Account Manager',
      desc: 'Client management and delivery execution. Full access to Clients, Tickets, Delivery, and Meetings.',
      level: 'Operations',
      permissions: ['Client Workspaces', 'Delivery Stages & Requests', 'Helpdesk Tickets', 'Lead Progression (Read/Write)'],
    },
    {
      name: 'Developer',
      desc: 'Technical operations. Code adjustments and ticket resolution. Financial and sequence fees restricted.',
      level: 'Technical',
      permissions: ['Delivery Tasks', 'Technical Tickets', 'File Uploads', 'Financials Hidden'],
    },
    {
      name: 'Ads Manager',
      desc: 'Performance marketing specialist. Outreach campaign analysis and reporting.',
      level: 'Marketing',
      permissions: ['Growth Reports', 'Niche & Source Analysis', 'Outreach Metrics', 'Financials Hidden'],
    },
    {
      name: 'Client',
      desc: 'External clinic partner viewpoint. Restricted strictly to their own client portal workspace.',
      level: 'External',
      permissions: ['Own Workspace Only', 'Asset Uploads', 'Ticket Submission', 'Internal Console Hidden'],
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Team & Roles
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Governance
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Solo-founder permissions matrix and active viewpoint switcher for preview testing.
          </p>
        </div>

        {/* Active Role Indicator */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-full border border-black/10 text-xs shadow-2xs">
          <span className="text-[#A8A5A5] pl-2 font-semibold">Active Role:</span>
          <span className="font-bold text-[#D92D50] pr-2">{normalizeRole(currentRole)}</span>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((r) => {
          const isActive = normalizeRole(currentRole) === r.name;

          return (
            <div
              key={r.name}
              className={`rounded-[24px] p-6 border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-[#D92D50] shadow-md shadow-[#D92D50]/5 ring-1 ring-[#D92D50]'
                  : 'bg-white border-black/5 shadow-xs hover:border-black/15'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A5A5]">
                    {r.level}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D92D50] text-white">
                      Active View
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-[#111111]">{r.name}</h2>
                <p className="text-xs text-[#6B6B6B] mt-1.5 line-clamp-3">{r.desc}</p>

                <div className="mt-4 pt-3 border-t border-black/5 space-y-1.5 text-xs">
                  {r.permissions.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-[#444444]">
                      <CheckCircle2 size={13} className="text-[#D92D50] shrink-0" />
                      <span className="text-[11px] font-medium">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-black/5">
                <div
                  className={`w-full py-2 rounded-full text-xs font-bold text-center select-none ${
                    isActive
                      ? 'bg-[#111111] text-white shadow-2xs'
                      : 'bg-[#F4F2F2] text-[#888888]'
                  }`}
                >
                  {isActive ? 'Your Active Role' : 'Role Definition'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
