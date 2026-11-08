import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Check,
  Building,
  Mail,
  Phone,
  Link2,
  Flame,
  ArrowUpDown,
  Archive,
  RefreshCw,
  Download,
  Star,
} from 'lucide-react';
import { Lead, LeadStage, ClinicSpecialty, LeadCustomFieldDefinition } from '../types/index.ts';
import {
  getLeads,
  moveLeadStage,
  archiveLead,
  updateLead,
  seedDevExtraLeads,
  getLeadCustomFieldDefinitions,
} from '../data/repo.ts';
import { LeadDrawer } from '../components/leads/LeadDrawer.tsx';
import { AddLeadModal } from '../components/leads/AddLeadModal.tsx';
import { CsvImportModal } from '../components/leads/CsvImportModal.tsx';
import { LostReasonModal } from '../components/pipeline/LostReasonModal.tsx';
import { NotNowModal } from '../components/pipeline/NotNowModal.tsx';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [customFieldDefs, setCustomFieldDefs] = useState<LeadCustomFieldDefinition[]>([]);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [scoreBandFilter, setScoreBandFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'Score' | 'Created' | 'Last activity' | 'Stage'>('Score');
  const [viewMode, setViewMode] = useState<'Table' | 'Cards'>('Table');
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('openhours_table_density') as 'comfortable' | 'compact') || 'compact';
  });

  const handleDensityChange = (d: 'comfortable' | 'compact') => {
    setDensity(d);
    localStorage.setItem('openhours_table_density', d);
  };

  // Bulk Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStage, setBulkStage] = useState<string>('');
  const [bulkAssignee, setBulkAssignee] = useState<string>('');

  // Modals & Drawer
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Stage change modal state
  const [pendingStageChange, setPendingStageChange] = useState<{
    lead: Lead;
    targetStage: LeadStage;
  } | null>(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [notNowModalOpen, setNotNowModalOpen] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    let data = await getLeads({
      search,
      country: countryFilter,
      specialty: specialtyFilter,
      stage: stageFilter,
      scoreBand: scoreBandFilter,
      source: sourceFilter,
      assignedTo: assignedFilter,
      showArchived,
      sort: sortBy,
    });
    if (cityFilter !== 'all') {
      data = data.filter((l) => (l.city || '').toLowerCase() === cityFilter.toLowerCase());
    }
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    getLeadCustomFieldDefinitions().then((defs) => {
      setCustomFieldDefs(defs.filter((d) => !d.archived));
    });
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [
    search,
    countryFilter,
    cityFilter,
    specialtyFilter,
    stageFilter,
    scoreBandFilter,
    sourceFilter,
    assignedFilter,
    showArchived,
    sortBy,
  ]);

  // Unique cities list for filter
  const uniqueCities = Array.from(new Set(leads.map((l) => l.city).filter(Boolean))).sort();

  // Export CSV handler
  const handleExportCsv = () => {
    const listFields = customFieldDefs.filter((d) => d.showInList);
    const headers = [
      'id',
      'businessName',
      'niche',
      'city',
      'country',
      'ownerName',
      'ownerRole',
      'stage',
      'score_total',
      'score_band',
      'googleRating',
      'googleReviewCount',
      'hasWebsite',
      'assignedTo',
      'email',
      'phone',
      ...listFields.map((f) => f.key),
    ];
    const rows = [headers.join(',')];
    leads.forEach((l) => {
      const email = l.channels.find((c) => c.type === 'Email')?.value || '';
      const phone = l.channels.find((c) => c.type === 'Phone')?.value || '';
      const customVals = listFields.map((f) => `"${String(l.customFields?.[f.key] ?? '').replace(/"/g, '""')}"`);
      const row = [
        `"${l.id}"`,
        `"${(l.businessName || '').replace(/"/g, '""')}"`,
        `"${(l.specialty || l.niche || '').replace(/"/g, '""')}"`,
        `"${(l.city || '').replace(/"/g, '""')}"`,
        `"${(l.country || '').replace(/"/g, '""')}"`,
        `"${(l.ownerName || '').replace(/"/g, '""')}"`,
        `"${(l.ownerRole || '').replace(/"/g, '""')}"`,
        `"${l.stage}"`,
        l.score.total,
        `"${l.score.band}"`,
        l.googleRating,
        l.googleReviewCount,
        `"${l.hasWebsite}"`,
        `"${l.assignedTo}"`,
        `"${email}"`,
        `"${phone}"`,
        ...customVals,
      ];
      rows.push(row.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openhours-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stage change trigger with rules
  const handleStageChangeRequest = (lead: Lead, targetStage: LeadStage) => {
    if (targetStage === 'Lost') {
      setPendingStageChange({ lead, targetStage });
      setLostModalOpen(true);
    } else if (targetStage === 'Not Now') {
      setPendingStageChange({ lead, targetStage });
      setNotNowModalOpen(true);
    } else {
      executeStageChange(lead.id, targetStage);
    }
  };

  const executeStageChange = async (
    id: string,
    toStage: LeadStage,
    details?: { lostReason?: any; notNowUntil?: string }
  ) => {
    const res = await moveLeadStage(id, toStage, details);
    if (res.success) {
      fetchLeads();
      setPendingStageChange(null);
    }
  };

  // Bulk Actions
  const handleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const handleBulkStageChange = async (newStage: LeadStage) => {
    for (const id of selectedLeadIds) {
      await moveLeadStage(id, newStage);
    }
    setSelectedLeadIds([]);
    setBulkStage('');
    fetchLeads();
  };

  const handleBulkAssign = async (assignee: string) => {
    for (const id of selectedLeadIds) {
      await updateLead(id, { assignedTo: assignee });
    }
    setSelectedLeadIds([]);
    setBulkAssignee('');
    fetchLeads();
  };

  const handleBulkArchive = async () => {
    if (confirm(`Archive ${selectedLeadIds.length} selected leads?`)) {
      for (const id of selectedLeadIds) {
        await archiveLead(id);
      }
      setSelectedLeadIds([]);
      fetchLeads();
    }
  };

  const handleDevSeed200 = async () => {
    const total = await seedDevExtraLeads();
    alert(`Dev helper: Populated repository to ${total} leads.`);
    fetchLeads();
  };

  return (
    <div className="w-full space-y-6">
      {/* Title & Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold text-[#101828] tracking-tight leading-tight select-none">
              Leads
            </h1>
            <span className="px-2.5 py-0.5 text-[12px] font-semibold bg-[#F8F9FB] text-[#667085] rounded-full border border-[#ECEEF2]">
              Demo data
            </span>
          </div>
          <p className="text-[14px] font-medium text-[#475467] mt-0.5">
            {leads.length} business{leads.length === 1 ? '' : 'es'} in pipeline
          </p>
        </div>

        {/* Action Buttons (Height 36px, radius 10px) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDevSeed200}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 h-[36px] rounded-[10px] bg-white text-[13px] font-medium text-[#475467] border border-[#D0D5DD] hover:bg-[#F2F4F7] transition-all cursor-pointer shadow-2xs"
            title="Seed extra sample leads up to 200 for smoothness stress test"
          >
            <RefreshCw size={12} />
            <span>Dev: 200 Leads</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-[10px] bg-white text-[14px] font-semibold text-[#344054] border border-[#D0D5DD] hover:bg-[#F2F4F7] transition-all cursor-pointer shadow-2xs"
            title="Export filtered leads to CSV"
          >
            <Download size={14} className="text-[#667085]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-[10px] bg-white text-[14px] font-semibold text-[#344054] border border-[#D0D5DD] hover:bg-[#F2F4F7] transition-all cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-[#667085]" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-[10px] bg-[#D92D50] hover:bg-[#B82340] text-white text-[14px] font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={14} />
            <span>+ Add lead</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Pill Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-3.5 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input pill & Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads, city, owner..."
              className="h-8 pl-8 pr-3 w-40 text-xs bg-white rounded-full border border-black/5 focus:outline-none focus:border-[#D92D50] shadow-2xs placeholder-[#A8A5A5]"
            />
          </div>

          {/* Country filter */}
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Countries</option>
            <option value="Ireland">Ireland</option>
            <option value="Malta">Malta</option>
          </select>

          {/* City filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Cities</option>
            {uniqueCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Specialty filter */}
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Niches</option>
            <option value="Design & Branding">Design & Branding</option>
            <option value="Legal Services">Legal Services</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Architecture">Architecture</option>
            <option value="Financial Consulting">Financial Consulting</option>
            <option value="IT & Cloud">IT & Cloud</option>
            <option value="Professional Services">Professional Services</option>
            <option value="Other">Other</option>
          </select>

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Stages</option>
            <option value="New Lead">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Replied">Replied</option>
            <option value="Audit Sent">Audit Sent</option>
            <option value="Concept Shown">Concept Shown</option>
            <option value="Interested">Interested</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Won">Won</option>
            <option value="Not Now">Not Now</option>
            <option value="Lost">Lost</option>
          </select>

          {/* Score Band filter */}
          <select
            value={scoreBandFilter}
            onChange={(e) => setScoreBandFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Scores</option>
            <option value="HOT">HOT (10-14)</option>
            <option value="WARM">WARM (7-9)</option>
            <option value="COLD">COLD (0-6)</option>
          </select>

          {/* Assigned filter */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Team</option>
            <option value="Founder">Founder</option>
            <option value="Sarah">Sarah M.</option>
            <option value="Liam">Liam O.</option>
          </select>

          {/* Show archived toggle */}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showArchived
                ? 'bg-[#111111] text-white border-black'
                : 'bg-white text-[#6B6B6B] border-black/5 hover:text-[#111111]'
            }`}
          >
            <Archive size={12} />
            <span>Archived</span>
          </button>

          {/* Density Toggle (Comfortable / Compact) */}
          <div className="flex items-center p-0.5 bg-white rounded-full border border-black/5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleDensityChange('comfortable')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors cursor-pointer ${
                density === 'comfortable'
                  ? 'bg-[#111111] text-white shadow-2xs font-bold'
                  : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              Comfortable
            </button>
            <button
              type="button"
              onClick={() => handleDensityChange('compact')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors cursor-pointer ${
                density === 'compact'
                  ? 'bg-[#111111] text-white shadow-2xs font-bold'
                  : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              Compact
            </button>
          </div>
        </div>

        {/* Right: Sort & View Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Sort By */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#A8A5A5] font-semibold hidden md:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 px-2.5 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="Score">Score (Highest)</option>
              <option value="Created">Created (Newest)</option>
              <option value="Last activity">Last Activity</option>
              <option value="Stage">Stage</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-0.5 bg-white rounded-full border border-black/5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('Table')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'Table' ? 'bg-[#111111] text-white' : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
              aria-label="Table view"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('Cards')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'Cards' ? 'bg-[#111111] text-white' : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
              aria-label="Cards view"
            >
              <LayoutGrid size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when rows selected) */}
      {selectedLeadIds.length > 0 && (
        <div className="bg-[#111111] text-white rounded-2xl p-3 px-4 flex items-center justify-between flex-wrap gap-3 shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
              {selectedLeadIds.length} selected
            </span>
            <span>Bulk actions:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkStage}
              onChange={(e) => {
                if (e.target.value) handleBulkStageChange(e.target.value as LeadStage);
              }}
              className="text-xs bg-white/10 text-white border border-white/20 rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="" className="text-black">Change Stage...</option>
              <option value="New Lead" className="text-black">New Lead</option>
              <option value="Contacted" className="text-black">Contacted</option>
              <option value="Audit Sent" className="text-black">Audit Sent</option>
              <option value="Won" className="text-black">Won</option>
            </select>

            <select
              value={bulkAssignee}
              onChange={(e) => {
                if (e.target.value) handleBulkAssign(e.target.value);
              }}
              className="text-xs bg-white/10 text-white border border-white/20 rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="" className="text-black">Assign to...</option>
              <option value="Founder" className="text-black">Founder</option>
              <option value="Sarah M." className="text-black">Sarah M.</option>
              <option value="Liam O." className="text-black">Liam O.</option>
            </select>

            <button
              type="button"
              onClick={handleBulkArchive}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Archive
            </button>

            <button
              type="button"
              onClick={() => setSelectedLeadIds([])}
              className="text-xs text-white/70 hover:text-white ml-2"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      {leads.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#6B6B6B] bg-white rounded-[24px] border border-black/5">
          No leads match these filters.
        </div>
      ) : viewMode === 'Table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8F7F7] text-[#6B6B6B] font-bold border-b border-black/5 select-none text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length === leads.length && leads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded accent-[#D92D50] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Business</th>
                  <th className="py-2.5 px-3">Niche</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Channels</th>
                  <th className="py-2.5 px-3">Reviews</th>
                  <th className="py-2.5 px-3">Website</th>
                  <th className="py-2.5 px-3">Owner</th>
                  <th className="py-2.5 px-3">Assigned</th>
                  {customFieldDefs
                    .filter((d) => d.showInList)
                    .map((f) => (
                      <th key={f.id} className="py-2.5 px-3">
                        {f.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {leads.map((l) => {
                  const isSelected = selectedLeadIds.includes(l.id);
                  const isCompact = density === 'compact';
                  const cellPadding = isCompact ? 'py-1.5' : 'py-3';
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setDrawerLeadId(l.id)}
                      className={`hover:bg-[#FCE9ED]/40 transition-all cursor-pointer group hover:-translate-y-[0.5px] ${
                        isSelected ? 'bg-[#FCE9ED]/60' : ''
                      } ${isCompact ? 'h-[50px]' : ''}`}
                    >
                      <td className={`${cellPadding} px-3.5`} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedLeadIds(selectedLeadIds.filter((id) => id !== l.id));
                            } else {
                              setSelectedLeadIds([...selectedLeadIds, l.id]);
                            }
                          }}
                          className="rounded accent-[#D92D50] cursor-pointer"
                        />
                      </td>

                      {/* Business */}
                      <td className={`${cellPadding} px-3`}>
                        <div className="flex items-center gap-2 max-w-[240px]">
                          <span
                            className="font-bold text-[#111111] group-hover:text-[#D92D50] transition-colors truncate"
                            title={l.businessName}
                          >
                            {l.businessName}
                          </span>
                          <span
                            className="text-[11px] text-[#A8A5A5] truncate hidden sm:inline shrink-0"
                            title={`${l.city ? `${l.city}, ` : ''}${l.country}`}
                          >
                            · {l.city ? `${l.city}, ` : ''}{l.country}
                          </span>
                        </div>
                      </td>

                      {/* Specialty / Niche */}
                      <td className={`${cellPadding} px-3 font-medium text-[#111111] max-w-[130px] truncate`} title={l.specialty || l.niche}>
                        {l.specialty || l.niche}
                      </td>

                      {/* Score Badge */}
                      <td className={`${cellPadding} px-3`}>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            l.score.isDisqualified
                              ? 'bg-gray-100 text-gray-600'
                              : l.score.band === 'HOT'
                              ? 'bg-[#FCE9ED] text-[#D92D50]'
                              : l.score.band === 'WARM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {!l.score.isDisqualified && l.score.band === 'HOT' && (
                            <Flame size={11} className="fill-[#D92D50]" />
                          )}
                          <span>
                            {l.score.isDisqualified ? 'Disqualified' : l.score.band} ({l.score.total})
                          </span>
                        </span>
                      </td>

                      {/* Stage Pill */}
                      <td className={`${cellPadding} px-3`}>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            l.stage === 'Won'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.stage === 'Proposal Sent'
                              ? 'bg-blue-100 text-blue-800'
                              : l.stage === 'Contacted' || l.stage === 'Replied'
                              ? 'bg-purple-100 text-purple-800'
                              : l.stage === 'Lost'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-[#F1EFEF] text-[#6B6B6B]'
                          }`}
                        >
                          {l.stage}
                        </span>
                      </td>

                      {/* Channels (small tinted icons) */}
                      <td className={`${cellPadding} px-3`}>
                        <div className="flex items-center gap-1">
                          {l.channels.map((c) => (
                            <span
                              key={c.id}
                              title={`${c.type}: ${c.value} (${c.status})`}
                              className={`w-5 h-5 rounded-md flex items-center justify-center ${
                                c.status === 'Replied'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : c.status === 'Contacted'
                                  ? 'bg-blue-100 text-blue-700'
                                  : c.status === 'Opted out'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {c.type === 'Email' ? (
                                <Mail size={11} />
                              ) : c.type === 'Phone' ? (
                                <Phone size={11} />
                              ) : (
                                <Link2 size={11} />
                              )}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Reviews */}
                      <td className={`${cellPadding} px-3 font-mono text-[11px] text-[#111111]`}>
                        <span className="inline-flex items-center gap-1">
                          <Star size={11} className="text-amber-500 fill-amber-500" />
                          <span>{l.googleRating}</span>
                          <span className="text-[#6B6B6B]">({l.googleReviewCount})</span>
                        </span>
                      </td>

                      {/* Website */}
                      <td className={`${cellPadding} px-3 text-[#6B6B6B] capitalize text-[11px]`}>
                        {l.hasWebsite.replace('-', ' ')}
                      </td>

                      {/* Owner */}
                      <td className={`${cellPadding} px-3 text-[#111111] font-medium max-w-[120px] truncate`} title={l.ownerName}>
                        {l.ownerName}
                      </td>

                      {/* Assigned */}
                      <td className={`${cellPadding} px-3 text-[#6B6B6B]`}>
                        {l.assignedTo}
                      </td>

                      {/* Custom fields */}
                      {customFieldDefs
                        .filter((d) => d.showInList)
                        .map((f) => {
                          const val = l.customFields?.[f.key];
                          return (
                            <td
                              key={f.id}
                              className={`${cellPadding} px-3 text-[#111111] truncate max-w-[140px]`}
                              title={val !== undefined ? String(val) : ''}
                            >
                              {val !== undefined && val !== null ? (
                                String(val)
                              ) : (
                                <span className="text-[#A8A5A5]">—</span>
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map((l) => (
            <div
              key={l.id}
              onClick={() => setDrawerLeadId(l.id)}
              className="bg-white rounded-[20px] p-4.5 border border-black/5 shadow-xs hover:shadow-md hover:border-black/15 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#A8A5A5] block">
                      {l.specialty || l.niche} · {l.city ? `${l.city}, ` : ''}{l.country}
                    </span>
                    <h3 className="font-bold text-sm text-[#111111] group-hover:text-[#D92D50] transition-colors">
                      {l.businessName}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      l.score.isDisqualified
                        ? 'bg-gray-100 text-gray-600'
                        : l.score.band === 'HOT'
                        ? 'bg-[#FCE9ED] text-[#D92D50]'
                        : l.score.band === 'WARM'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {l.score.isDisqualified ? 'Disqualified' : l.score.band} ({l.score.total})
                  </span>
                </div>

                <div className="text-xs text-[#6B6B6B] mb-3">
                  Owner: <span className="font-semibold text-[#111111]">{l.ownerName}</span> ({l.ownerRole})
                </div>

                <div className="flex items-center gap-3 text-xs text-[#A8A5A5] mb-3">
                  <span className="inline-flex items-center gap-1 text-[#111111]">
                    <Star size={11} className="text-amber-500 fill-amber-500" />
                    <span>{l.googleRating} ({l.googleReviewCount})</span>
                  </span>
                  <span>·</span>
                  <span className="capitalize">{l.hasWebsite.replace('-', ' ')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-black/5 text-xs">
                <span className="px-2 py-0.5 bg-[#F1EFEF] rounded-full font-bold text-[10px] text-[#6B6B6B]">
                  {l.stage}
                </span>

                <div className="flex items-center gap-1">
                  {l.channels.map((c) => (
                    <span
                      key={c.id}
                      className="w-5 h-5 rounded-md bg-[#F4F2F2] flex items-center justify-center text-[10px] text-[#6B6B6B]"
                    >
                      {c.type === 'Email' ? <Mail size={10} /> : <Phone size={10} />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-out Drawer */}
      <LeadDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onLeadUpdated={fetchLeads}
        onStageChangeRequested={handleStageChangeRequest}
      />

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onLeadCreated={fetchLeads}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImportComplete={fetchLeads}
      />

      {/* Lost Reason Modal */}
      {pendingStageChange && (
        <LostReasonModal
          isOpen={lostModalOpen}
          leadName={pendingStageChange.lead.businessName}
          onConfirm={(reason, notes) => {
            executeStageChange(pendingStageChange.lead.id, 'Lost', { lostReason: reason });
            setLostModalOpen(false);
          }}
          onCancel={() => {
            setLostModalOpen(false);
            setPendingStageChange(null);
          }}
        />
      )}

      {/* Not Now Modal */}
      {pendingStageChange && (
        <NotNowModal
          isOpen={notNowModalOpen}
          leadName={pendingStageChange.lead.businessName}
          onConfirm={(date, notes) => {
            executeStageChange(pendingStageChange.lead.id, 'Not Now', { notNowUntil: date });
            setNotNowModalOpen(false);
          }}
          onCancel={() => {
            setNotNowModalOpen(false);
            setPendingStageChange(null);
          }}
        />
      )}
    </div>
  );
};
