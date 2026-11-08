import React, { useState, useEffect } from 'react';
import {
  Kanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Project, ProjectStageKey, Client } from '../types/index.ts';
import { getProjects, getClients, updateProject } from '../data/repo.ts';

interface DeliveryPageProps {
  onOpenClientWorkspace: (clientId: string, clientName: string) => void;
}

const STAGES: ProjectStageKey[] = [
  'Kickoff',
  'Content Collection',
  'Design',
  'Client Review',
  'Development',
  'QA',
  'Launch',
  '30-Day Optimisation',
  'Care',
];

export const DeliveryPage: React.FC<DeliveryPageProps> = ({ onOpenClientWorkspace }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [ballFilter, setBallFilter] = useState<'all' | 'Us' | 'Client'>('all');

  const loadData = async () => {
    setLoading(true);
    const [projs, clis] = await Promise.all([getProjects(), getClients()]);
    setProjects(projs);

    const clientMap: Record<string, Client> = {};
    clis.forEach((c) => {
      clientMap[c.id] = c;
    });
    setClients(clientMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBallInCourt = async (projectId: string, currentBall: 'Us' | 'Client') => {
    const next = currentBall === 'Us' ? 'Client' : 'Us';
    await updateProject(projectId, { ballInCourt: next });
    loadData();
  };

  const filteredProjects = projects.filter((p) => {
    if (ballFilter !== 'all' && p.ballInCourt !== ballFilter) return false;
    return true;
  });

  const waitingOnClientCount = projects.filter((p) => p.ballInCourt === 'Client').length;
  const actionOnUsCount = projects.filter((p) => p.ballInCourt === 'Us').length;

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold text-[#101828] tracking-tight leading-none select-none">
            Delivery
          </h1>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
            Demo data
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B6B6B] font-semibold">
            {projects.length} clinic builds tracked
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#A8A5A5] block mb-1">
            Active Builds
          </span>
          <span className="text-2xl font-bold text-[#111111] tabular-nums">
            {projects.length}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 block mb-1">
            Waiting on Client
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-700 tabular-nums">
              {waitingOnClientCount}
            </span>
            <span className="text-[11px] text-[#A8A5A5]">Assets / Approvals</span>
          </div>
        </div>

        <div className="bg-[#111111] text-white rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-semibold text-white/70 block mb-1">
            Action on Us (Open Hours)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums">
              {actionOnUsCount}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">In production</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2.5 border border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'Us', 'Client'] as const).map((filterVal) => (
            <button
              key={filterVal}
              type="button"
              onClick={() => setBallFilter(filterVal)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                ballFilter === filterVal
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'bg-white text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              {filterVal === 'all'
                ? 'All Builds'
                : filterVal === 'Us'
                ? 'Action on Us'
                : 'Waiting on Client'}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Matrix Table */}
      <div className="bg-white rounded-[24px] border border-black/5 p-4 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
              <tr>
                <th className="py-3 px-3.5">Clinic Client</th>
                <th className="py-3 px-3">Current Stage</th>
                <th className="py-3 px-3">Pipeline Progress</th>
                <th className="py-3 px-3">Ball in Court</th>
                <th className="py-3 px-3">Target Launch</th>
                <th className="py-3 px-3 text-right">Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredProjects.map((proj) => {
                const client = clients[proj.clientId];
                const stageIndex = STAGES.indexOf(proj.currentStageKey);
                const progressPercent = Math.round(((stageIndex + 1) / STAGES.length) * 100);

                return (
                  <tr
                    key={proj.id}
                    onClick={() =>
                      client && onOpenClientWorkspace(client.id, client.businessName)
                    }
                    className="hover:bg-[#F8F7F7] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3.5">
                      <div className="font-bold text-[#111111] group-hover:text-[#D92D50] transition-colors">
                        {client ? client.businessName : proj.clientId}
                      </div>
                      <div className="text-[11px] text-[#A8A5A5]">
                        {client ? `${client.city}, ${client.country} · ${client.specialty}` : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FCE9ED] text-[#D92D50] font-bold text-[11px]">
                        {proj.currentStageKey}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[#F1EFEF] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${progressPercent}%` }}
                            className="h-full bg-[#111111] rounded-full"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[#111111] tabular-nums">
                          {stageIndex + 1}/9 ({progressPercent}%)
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBallInCourt(proj.id, proj.ballInCourt);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                          proj.ballInCourt === 'Client'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-[#111111] text-white'
                        }`}
                      >
                        {proj.ballInCourt === 'Client' ? 'Client' : 'Us'}
                      </button>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-xs text-[#111111] tabular-nums">
                        {proj.targetLaunchDate}
                      </div>
                      <div className="text-[10px] text-[#A8A5A5]">Planned live date</div>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (client) onOpenClientWorkspace(client.id, client.businessName);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F1EFEF] hover:bg-[#111111] hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>Workspace</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
