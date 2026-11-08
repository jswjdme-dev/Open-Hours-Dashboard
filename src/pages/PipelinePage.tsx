import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  Filter,
  Flame,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Send,
  Users,
} from 'lucide-react';
import {
  Lead,
  LeadStage,
  OutreachChannel,
  ChannelPipelineStage,
  StageType,
} from '../types/index.ts';
import {
  getLeads,
  getOutreachChannels,
  getChannelStages,
  moveLeadStage,
  moveLeadChannelStage,
  getChannelPipelineSummary,
} from '../data/repo.ts';
import { calculateFunnelBottleneck } from '../lib/logic.ts';
import { KanbanColumn } from '../components/pipeline/KanbanColumn.tsx';
import { LeadDrawer } from '../components/leads/LeadDrawer.tsx';
import { LostReasonModal } from '../components/pipeline/LostReasonModal.tsx';
import { NotNowModal } from '../components/pipeline/NotNowModal.tsx';
import { ConvertToClientModal } from '../components/pipeline/ConvertToClientModal.tsx';

export const PipelinePage: React.FC<{
  onNavigateToChannelSettings?: () => void;
}> = ({ onNavigateToChannelSettings }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [channels, setChannels] = useState<OutreachChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [channelStages, setChannelStages] = useState<ChannelPipelineStage[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [countryFilter, setCountryFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [scoreBandFilter, setScoreBandFilter] = useState('all');

  // Collapsed lanes for Not Now & Lost (if not shown in main board)
  const [collapsedLanesOpen, setCollapsedLanesOpen] = useState(false);

  // Drawer & Modals
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null);

  // Stage transition modals
  const [pendingMove, setPendingMove] = useState<{
    leadId: string;
    leadName: string;
    toStageName: string;
    stageType?: StageType;
    requiresReason?: boolean;
    requiresDate?: boolean;
  } | null>(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [notNowModalOpen, setNotNowModalOpen] = useState(false);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchPipelineData = async () => {
    setLoading(true);
    const [allLeads, allChans, summary] = await Promise.all([
      getLeads({
        country: countryFilter,
        specialty: specialtyFilter,
        assignedTo: ownerFilter,
        scoreBand: scoreBandFilter,
        showArchived: false,
      }),
      getOutreachChannels(),
      getChannelPipelineSummary(),
    ]);

    setLeads(allLeads);
    setChannels(allChans);
    setSummaryData(summary);

    if (selectedChannelId !== 'all') {
      const stgs = await getChannelStages(selectedChannelId);
      setChannelStages(stgs);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPipelineData();
  }, [countryFilter, specialtyFilter, ownerFilter, scoreBandFilter]);

  const handleSelectChannel = async (chanId: string) => {
    setSelectedChannelId(chanId);
    if (chanId === 'all') {
      const summary = await getChannelPipelineSummary();
      setSummaryData(summary);
    } else {
      const stgs = await getChannelStages(chanId);
      setChannelStages(stgs);
    }
  };

  // Drag End handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const targetStageIdentifier = over.id as string;
    const targetLead = leads.find((l) => l.id === leadId);

    if (!targetLead) return;

    // Find the target stage object in the selected channel
    const targetStageObj = channelStages.find(
      (s) => s.id === targetStageIdentifier || s.name === targetStageIdentifier
    );
    const targetStageName = targetStageObj ? targetStageObj.name : targetStageIdentifier;

    if (targetLead.stage === targetStageName) return;

    const isLost = targetStageObj ? targetStageObj.type === 'Lost' || targetStageObj.requiresReason : targetStageName === 'Lost';
    const isNotNow = targetStageObj ? targetStageObj.type === 'NotNow' || targetStageObj.requiresDate : targetStageName === 'Not Now';
    const isWon = targetStageObj ? targetStageObj.type === 'Won' : targetStageName === 'Won';

    if (isLost) {
      setPendingMove({
        leadId,
        leadName: targetLead.businessName,
        toStageName: targetStageName,
        stageType: 'Lost',
        requiresReason: true,
      });
      setLostModalOpen(true);
    } else if (isNotNow) {
      setPendingMove({
        leadId,
        leadName: targetLead.businessName,
        toStageName: targetStageName,
        stageType: 'NotNow',
        requiresDate: true,
      });
      setNotNowModalOpen(true);
    } else if (isWon) {
      setConvertModalLead(targetLead);
    } else {
      await executeMove(leadId, targetStageName);
    }
  };

  const executeMove = async (
    leadId: string,
    toStageName: string,
    details?: { lostReason?: any; notNowUntil?: string }
  ) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: toStageName as LeadStage } : l))
    );

    const channelIdToUse = selectedChannelId !== 'all' ? selectedChannelId : 'chan_cold_email';
    const res = await moveLeadChannelStage(leadId, channelIdToUse, toStageName, details);
    if (!res.success) {
      alert(res.error || 'Failed to move lead');
      fetchPipelineData();
    } else {
      fetchPipelineData();
    }
  };

  // Filter leads for the currently active channel view
  const currentChannelLeads = selectedChannelId === 'all'
    ? leads
    : leads.filter((l) => {
        // Match channelId or lead having a channel of that channelId
        if (l.channelId === selectedChannelId) return true;
        if (l.channels?.some((c) => c.channelId === selectedChannelId)) return true;
        return false;
      });

  // Group leads for the active channel's stages
  const activeStagesToRender = selectedChannelId === 'all'
    ? []
    : channelStages.filter((s) => s.type !== 'Lost' && s.type !== 'NotNow');

  const sideStagesToRender = selectedChannelId === 'all'
    ? []
    : channelStages.filter((s) => s.type === 'Lost' || s.type === 'NotNow');

  // Group leads by stage name
  const stageGroups: Record<string, Lead[]> = {};
  channelStages.forEach((stg) => {
    stageGroups[stg.name] = [];
  });

  currentChannelLeads.forEach((l) => {
    if (stageGroups[l.stage]) {
      stageGroups[l.stage].push(l);
    } else {
      // If lead stage matches a stage name
      const matchingStage = channelStages.find((s) => s.name.toLowerCase() === l.stage.toLowerCase());
      if (matchingStage) {
        if (!stageGroups[matchingStage.name]) stageGroups[matchingStage.name] = [];
        stageGroups[matchingStage.name].push(l);
      }
    }
  });

  // Metrics
  const activeLeadsCount = currentChannelLeads.length;
  const selectedChannelObj = channels.find((c) => c.id === selectedChannelId);

  return (
    <div className="w-full space-y-5">
      {/* Title & Board Summary */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
            Pipeline
          </h1>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase bg-[#E7E2E2] text-[#6B6B6B] rounded-full border border-black/5">
            Outreach Funnel
          </span>
        </div>

        {/* Action / Channel Settings shortcut */}
        {onNavigateToChannelSettings && (
          <button
            type="button"
            onClick={onNavigateToChannelSettings}
            className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Configure stages in Channel settings</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Channel Selector Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-2.5 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#6B7280] px-2">Channel:</span>

          {/* All channels tab */}
          <button
            type="button"
            onClick={() => handleSelectChannel('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              selectedChannelId === 'all'
                ? 'bg-[#111111] text-white shadow-2xs'
                : 'bg-white text-[#4B5563] hover:text-[#111111] border border-black/5'
            }`}
          >
            <Layers size={13} />
            <span>All channels (Overview)</span>
          </button>

          {/* Per-channel tabs */}
          {channels.map((chan) => (
            <button
              key={chan.id}
              type="button"
              onClick={() => handleSelectChannel(chan.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                selectedChannelId === chan.id
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'bg-white text-[#4B5563] hover:text-[#111111] border border-black/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chan.color }} />
              <span>{chan.name}</span>
            </button>
          ))}
        </div>

        {selectedChannelObj && (
          <div className="flex items-center gap-2 text-xs text-[#6B7280] ml-auto">
            <span>Daily cap: <strong className="text-[#111111]">{selectedChannelObj.dailyCap || 'None'}</strong></span>
            <span>•</span>
            <span>Stages: <strong className="text-[#111111]">{channelStages.length}</strong></span>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-3 border border-black/5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-[#F9FAFB] border border-black/5 text-[#111111] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Countries</option>
            <option value="Ireland">Ireland</option>
            <option value="Malta">Malta</option>
          </select>

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-[#F9FAFB] border border-black/5 text-[#111111] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Specialties</option>
            <option value="Dental">Dental</option>
            <option value="Physio">Physio</option>
            <option value="Chiropractic">Chiropractic</option>
            <option value="Aesthetics">Aesthetics</option>
            <option value="Private clinic">Private clinic</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-[#F9FAFB] border border-black/5 text-[#111111] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Owners</option>
            <option value="Founder">Founder</option>
            <option value="Sarah">Sarah M.</option>
            <option value="Liam">Liam O.</option>
          </select>

          <select
            value={scoreBandFilter}
            onChange={(e) => setScoreBandFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-[#F9FAFB] border border-black/5 text-[#111111] focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Score Bands</option>
            <option value="HOT">🔥 HOT (10-14)</option>
            <option value="WARM">WARM (7-9)</option>
            <option value="COLD">COLD (0-6)</option>
          </select>
        </div>

        {selectedChannelId !== 'all' && sideStagesToRender.length > 0 && (
          <button
            type="button"
            onClick={() => setCollapsedLanesOpen(!collapsedLanesOpen)}
            className="h-8 px-3.5 rounded-full text-xs font-semibold bg-[#F9FAFB] border border-black/5 text-[#6B6B6B] hover:text-[#111111] flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
          >
            <span>
              Side Lanes ({sideStagesToRender.reduce((acc, s) => acc + (stageGroups[s.name]?.length || 0), 0)})
            </span>
            {collapsedLanesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* VIEW A: "All channels" READ-ONLY OVERVIEW */}
      {selectedChannelId === 'all' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs flex items-center justify-between gap-3 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-[#2563EB] shrink-0" />
              <span>
                <strong>All Channels Read-Only Overview:</strong> This matrix aggregates active leads across every configured outreach channel and stage. To drag and drop leads into new stages, select a specific channel above.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryData.map((item) => (
              <div
                key={item.channel.id}
                className="bg-white rounded-3xl p-5 border border-black/10 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-black/5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.channel.color }}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-[#111111] leading-tight">
                        {item.channel.name}
                      </h3>
                      <span className="text-[11px] text-[#9CA3AF]">
                        {item.totalLeads} total lead(s)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectChannel(item.channel.id)}
                    className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open board</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                {/* Stages list */}
                <div className="space-y-2">
                  {item.stages.map((stg: any) => (
                    <div
                      key={stg.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#F9FAFB] border border-black/5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-white text-[10px] font-bold text-[#6B7280] flex items-center justify-center border border-black/5">
                          {stg.order + 1}
                        </span>
                        <span className="font-semibold text-[#111111] truncate">{stg.name}</span>
                        <span className="text-[10px] text-[#9CA3AF]">({stg.type})</span>
                      </div>
                      <span className="font-bold text-[#111111] bg-white px-2 py-0.5 rounded-full border border-black/5">
                        {stg.leadCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW B: Selected Channel KANBAN BOARD */}
      {selectedChannelId !== 'all' && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex items-start gap-4 min-w-max">
              {activeStagesToRender.map((stg) => (
                <KanbanColumn
                  key={stg.id}
                  stage={stg.name}
                  stageType={stg.type}
                  leads={stageGroups[stg.name] || []}
                  totalLeadsCount={activeLeadsCount}
                  onOpenDrawer={(id) => setDrawerLeadId(id)}
                  onConvertClick={(lead) => setConvertModalLead(lead)}
                />
              ))}
            </div>
          </div>

          {/* Collapsed side lanes (Lost & Not Now) */}
          {collapsedLanesOpen && sideStagesToRender.length > 0 && (
            <div className="pt-4 border-t border-black/5 animate-in fade-in duration-200">
              <div className="text-xs font-bold text-[#A8A5A5] uppercase tracking-wider mb-3">
                {selectedChannelObj?.name} Paused &amp; Closed Lanes
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sideStagesToRender.map((stg) => (
                  <KanbanColumn
                    key={stg.id}
                    stage={stg.name}
                    stageType={stg.type}
                    leads={stageGroups[stg.name] || []}
                    totalLeadsCount={activeLeadsCount}
                    onOpenDrawer={(id) => setDrawerLeadId(id)}
                    onConvertClick={(lead) => setConvertModalLead(lead)}
                  />
                ))}
              </div>
            </div>
          )}
        </DndContext>
      )}

      {/* Lead Drawer */}
      <LeadDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onLeadUpdated={fetchPipelineData}
        onStageChangeRequested={(lead, targetStage) => {
          if (targetStage === 'Lost') {
            setPendingMove({ leadId: lead.id, leadName: lead.businessName, toStageName: targetStage });
            setLostModalOpen(true);
          } else if (targetStage === 'Not Now') {
            setPendingMove({ leadId: lead.id, leadName: lead.businessName, toStageName: targetStage });
            setNotNowModalOpen(true);
          } else {
            executeMove(lead.id, targetStage);
          }
        }}
      />

      {/* Convert to Client Modal */}
      {convertModalLead && (
        <ConvertToClientModal
          isOpen={Boolean(convertModalLead)}
          lead={convertModalLead}
          onClose={() => setConvertModalLead(null)}
          onConverted={() => {
            setConvertModalLead(null);
            fetchPipelineData();
          }}
        />
      )}

      {/* Lost Reason Modal */}
      {pendingMove && (
        <LostReasonModal
          isOpen={lostModalOpen}
          leadName={pendingMove.leadName}
          onConfirm={(reason) => {
            executeMove(pendingMove.leadId, pendingMove.toStageName, { lostReason: reason });
            setLostModalOpen(false);
            setPendingMove(null);
          }}
          onCancel={() => {
            setLostModalOpen(false);
            setPendingMove(null);
          }}
        />
      )}

      {/* Not Now Modal */}
      {pendingMove && (
        <NotNowModal
          isOpen={notNowModalOpen}
          leadName={pendingMove.leadName}
          onConfirm={(date) => {
            executeMove(pendingMove.leadId, pendingMove.toStageName, { notNowUntil: date });
            setNotNowModalOpen(false);
            setPendingMove(null);
          }}
          onCancel={() => {
            setNotNowModalOpen(false);
            setPendingMove(null);
          }}
        />
      )}
    </div>
  );
};
