import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building,
  Eye,
  Handshake,
  FileText,
} from 'lucide-react';
import type { Client, Partner } from '../types/index.ts';
import { getClients, getRequests, getPartners, getApplications } from '../data/repo.ts';
import { AddClientWizardModal } from '../components/clients/AddClientWizardModal.tsx';
import { ApplicationsManager } from '../components/clients/ApplicationsManager.tsx';

interface ClientsPageProps {
  initialTab?: 'clients' | 'applications';
  onOpenClientWorkspace: (clientId: string, clientName: string) => void;
  onOpenPortalPreview?: (clientId: string) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
  initialTab = 'clients',
  onOpenClientWorkspace,
  onOpenPortalPreview,
}) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'applications'>(initialTab);
  const [receivedAppsCount, setReceivedAppsCount] = useState<number>(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [openRequestsByClient, setOpenRequestsByClient] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('openhours_table_density') as 'comfortable' | 'compact') || 'compact';
  });

  const handleDensityChange = (d: 'comfortable' | 'compact') => {
    setDensity(d);
    localStorage.setItem('openhours_table_density', d);
  };

  const loadData = async () => {
    setLoading(true);
    const [clientData, partnerData, allRequests, allApps] = await Promise.all([
      getClients(),
      getPartners(),
      getRequests(),
      getApplications(),
    ]);
    setClients(clientData);
    setPartners(partnerData);
    setReceivedAppsCount(allApps.filter((a) => a.status === 'Received').length);

    // Fetch requests to compute open requests count
    const reqCounts: Record<string, number> = {};
    allRequests.forEach((req) => {
      if (req.status === 'Pending' || req.status === 'Needs Changes') {
        reqCounts[req.clientId] = (reqCounts[req.clientId] || 0) + 1;
      }
    });
    setOpenRequestsByClient(reqCounts);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClients = clients.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        c.businessName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.specialty.toLowerCase().includes(q) ||
        (c.source && c.source.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (countryFilter !== 'all' && c.country !== countryFilter) return false;
    if (packageFilter !== 'all' && c.package !== packageFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (specialtyFilter !== 'all' && c.specialty !== specialtyFilter) return false;
    if (partnerFilter !== 'all') {
      if (partnerFilter === 'direct') {
        if (c.sourcePartnerId || (c.source && c.source !== 'Direct')) return false;
      } else {
        const partnerObj = partners.find((p) => p.id === partnerFilter);
        const match =
          c.sourcePartnerId === partnerFilter ||
          (partnerObj && c.source === partnerObj.name) ||
          c.sourcePartnerName === partnerObj?.name;
        if (!match) return false;
      }
    }
    return true;
  });

  // Key KPI stats
  const totalActive = clients.filter((c) => c.status === 'Live' || c.status === 'Care').length;
  const totalOnboarding = clients.filter((c) => c.status === 'Onboarding').length;
  const totalMrr = clients
    .filter((c) => c.status === 'Live' || c.status === 'Care' || c.status === 'Onboarding')
    .reduce((sum, c) => sum + (c.monthlyFeeEUR || 0), 0);
  const avgHealth =
    clients.length > 0
      ? Math.round(clients.reduce((sum, c) => sum + (c.healthScore || 85), 0) / clients.length)
      : 90;

  return (
    <div className="w-full space-y-6">
      {/* Tab Switcher: Clients | Applications */}
      <div className="flex items-center gap-2 border-b border-[#ECEEF2] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer ${
            activeTab === 'clients'
              ? 'bg-[#101828] text-white shadow-2xs'
              : 'text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7]'
          }`}
        >
          <Building size={15} />
          <span>Clients</span>
          <span
            className={`px-2 py-0.2 rounded-full text-xs font-medium ${
              activeTab === 'clients' ? 'bg-white/20 text-white' : 'bg-[#F2F4F7] text-[#475467]'
            }`}
          >
            {clients.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-[#101828] text-white shadow-2xs'
              : 'text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7]'
          }`}
        >
          <FileText size={15} />
          <span>Applications</span>
          {receivedAppsCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D92D50] text-white animate-pulse">
              {receivedAppsCount}
            </span>
          ) : (
            <span
              className={`px-2 py-0.2 rounded-full text-xs font-medium ${
                activeTab === 'applications' ? 'bg-white/20 text-white' : 'bg-[#F2F4F7] text-[#475467]'
              }`}
            >
              0
            </span>
          )}
        </button>
      </div>

      {activeTab === 'applications' ? (
        <ApplicationsManager
          onClientCreated={loadData}
          onOpenClientWorkspace={onOpenClientWorkspace}
        />
      ) : (
        <>
          {/* Title Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#E3E3E6]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[36px] font-semibold text-[#0A0A0A] tracking-[-0.02em] leading-tight">
              Clients
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-medium bg-[#F3F3F5] text-[#606066] rounded-full border border-[#E3E3E6]">
              Demo data
            </span>
          </div>
          <p className="text-[20px] font-semibold text-[#B4B4B9] tracking-[-0.02em] mt-0.5">
            {clients.length} retained clinic practices in Ireland & Malta
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="btn-primary-pill"
          >
            <Plus size={14} />
            <span>Add new client</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Deterministic 4-style cycling: Ink, Deep Blue, Grey, White) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Subscriptions (Ink) */}
        <div className="kpi-card-ink">
          <div className="flex items-center justify-between">
            <span className="kpi-pill-on-dark">
              Active Subscriptions
            </span>
            <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center">
              <Building size={14} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[36px] font-semibold text-white font-tabular leading-tight">
              {totalActive}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white">
                Live accounts
              </span>
              <span className="text-[12px] font-medium text-white/70">retained accounts</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Onboarding Builds (Deep Blue) */}
        <div className="kpi-card-blue">
          <div className="flex items-center justify-between">
            <span className="kpi-pill-on-dark">
              Onboarding Builds
            </span>
            <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[36px] font-semibold text-white font-tabular leading-tight">
              {totalOnboarding}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F7F06A] text-[#0A0A0A]">
                Delivery phase
              </span>
              <span className="text-[12px] font-medium text-white/70">in flight</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Retainer MRR (Neutral Grey) */}
        <div className="kpi-card-grey">
          <div className="flex items-center justify-between">
            <span className="section-pill-label !bg-transparent !border-[#0A0A0A]">
              Retainer MRR
            </span>
            <div className="w-7 h-7 rounded-full bg-black/10 text-[#0A0A0A] flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[36px] font-semibold text-[#0A0A0A] font-tabular leading-tight">
              €{totalMrr.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-[#0A0A0A] border border-[#0A0A0A]/20">
                Recurring
              </span>
              <span className="text-[12px] font-medium text-[#404046]">monthly base</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Average Health Score (White) */}
        <div className="kpi-card-white">
          <div className="flex items-center justify-between">
            <span className="section-pill-label">
              Average Health Score
            </span>
            <div className="w-7 h-7 rounded-full bg-[#E7F8EF] text-[#12B76A] flex items-center justify-center">
              <ShieldCheck size={14} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[36px] font-semibold text-[#0A0A0A] font-tabular leading-tight">
              {avgHealth}%
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F8EF] text-[#12B76A]">
                High retention
              </span>
              <span className="text-[12px] font-medium text-[#606066]">portfolio index</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-[20px] p-3 border border-[#E3E3E6] flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name, city, contact..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white rounded-full border border-black/10 focus:outline-none focus:border-[#D92D50] shadow-2xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Country */}
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Countries</option>
            <option value="Ireland">Ireland</option>
            <option value="Malta">Malta</option>
          </select>

          {/* Package */}
          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Packages</option>
            <option value="Regular">Regular (€1,200)</option>
            <option value="Advanced">Advanced (€1,800)</option>
            <option value="Premium">Premium (€2,800)</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Statuses</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Live">Live</option>
            <option value="Care">Care</option>
            <option value="Paused">Paused</option>
            <option value="Churned">Churned</option>
          </select>

          {/* Source / Partner Filter */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Sources</option>
            <option value="direct">Direct</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                Partner: {p.name}
              </option>
            ))}
          </select>

          {/* Density Toggle (Comfortable / Compact) */}
          <div className="flex items-center p-0.5 bg-[#F4F2F2] rounded-full border border-black/5">
            <button
              type="button"
              onClick={() => handleDensityChange('comfortable')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors cursor-pointer ${
                density === 'comfortable'
                  ? 'bg-white text-[#111111] shadow-2xs font-bold'
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
                  ? 'bg-white text-[#111111] shadow-2xs font-bold'
                  : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-[20px] border border-[#E3E3E6] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="console-table">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-left">Business Name</th>
                <th className="py-2.5 px-3 text-left">Location</th>
                <th className="py-2.5 px-3 text-left">Source</th>
                <th className="py-2.5 px-3 text-left">Package</th>
                <th className="py-2.5 px-3 text-left">Status</th>
                <th className="py-2.5 px-3 text-left">Health</th>
                <th className="py-2.5 px-3 text-right">Monthly Retainer</th>
                <th className="py-2.5 px-3 text-left">Account Lead</th>
                <th className="py-2.5 px-3 text-left">Open Requests</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#8A8A90]">
                    No clients match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const openReqCount = openRequestsByClient[client.id] || 0;
                  const isCompact = density === 'compact';

                  return (
                    <tr
                      key={client.id}
                      onClick={() => onOpenClientWorkspace(client.id, client.businessName)}
                      className={`hover:bg-[#F8F7F7] transition-colors cursor-pointer group ${
                        isCompact ? 'h-[52px]' : ''
                      }`}
                    >
                      {/* Business Info */}
                      <td className={`px-4 ${isCompact ? 'py-1.5' : 'py-3'}`}>
                        {isCompact ? (
                          <div
                            className="flex items-center gap-1.5 truncate max-w-[240px]"
                            title={`${client.businessName} — ${client.ownerName} (${client.ownerRole})`}
                          >
                            <span className="font-bold text-[#111111] group-hover:text-[#D92D50] transition-colors truncate">
                              {client.businessName}
                            </span>
                            <span className="text-[11px] text-[#A8A5A5] truncate shrink-0">
                              · {client.ownerName}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-[#111111] group-hover:text-[#D92D50] transition-colors">
                              {client.businessName}
                            </div>
                            <div className="text-[11px] text-[#A8A5A5]">
                              {client.ownerName} ({client.ownerRole})
                            </div>
                            {(client.sourcePartnerId || (client.source && client.source !== 'Direct')) && (
                              <div className="text-[10px] text-[#D92D50] font-semibold mt-0.5 flex items-center gap-1">
                                <Handshake size={10} />
                                <span>Brought by {client.sourcePartnerName || client.source}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Location & Specialty */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'}`}>
                        {isCompact ? (
                          <div
                            className="flex items-center gap-1.5 truncate max-w-[190px]"
                            title={`${client.city}, ${client.country} · ${client.specialty || client.niche}`}
                          >
                            <span className="font-medium text-[#111111] truncate">
                              {client.city}, {client.country}
                            </span>
                            <span className="text-[11px] text-[#A8A5A5] truncate shrink-0">
                              · {client.specialty || client.niche}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-[#111111]">
                              {client.city}, {client.country}
                            </div>
                            <div className="text-[11px] text-[#6B6B6B]">{client.specialty || client.niche}</div>
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'}`}>
                        {client.sourcePartnerId || (client.source && client.source !== 'Direct') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FCE9ED] text-[#D92D50] border border-[#FCE9ED]">
                            <Handshake size={10} className="shrink-0" />
                            <span className="truncate max-w-[100px]">
                              {client.sourcePartnerName || client.source || 'Partner'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#6B6B6B] font-medium text-[11px]">Direct</span>
                        )}
                      </td>

                      {/* Package */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'}`}>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            client.package === 'Premium'
                              ? 'bg-[#111111] text-white shadow-2xs'
                              : client.package === 'Advanced'
                              ? 'bg-[#FCE9ED] text-[#D92D50]'
                              : 'bg-gray-100 text-[#111111]'
                          }`}
                        >
                          {client.package}
                        </span>
                      </td>

                      {/* Status */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'}`}>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            client.status === 'Live'
                              ? 'bg-emerald-100 text-emerald-800'
                              : client.status === 'Onboarding'
                              ? 'bg-amber-100 text-amber-800'
                              : client.status === 'Care'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-[#6B6B6B]'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>

                      {/* Health Score */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-1.5 bg-[#F1EFEF] rounded-full overflow-hidden">
                            <div
                              style={{ width: `${client.healthScore}%` }}
                              className={`h-full rounded-full ${
                                client.healthScore >= 90
                                  ? 'bg-emerald-500'
                                  : client.healthScore >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-[#D92D50]'
                              }`}
                            />
                          </div>
                          <span className="font-bold text-xs text-[#111111] tabular-nums">
                            {client.healthScore}%
                          </span>
                        </div>
                      </td>

                      {/* Monthly Fee */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'} text-right`}>
                        <div className="font-bold text-xs text-[#111111] tabular-nums">
                          €{client.monthlyFeeEUR?.toLocaleString()}
                        </div>
                        {!isCompact && (
                          <div className="text-[10px] text-[#A8A5A5]">
                            +€{client.setupFeeEUR?.toLocaleString()} setup
                          </div>
                        )}
                      </td>

                      {/* Account Lead */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'} text-xs text-[#6B6B6B] capitalize font-medium`}>
                        {client.accountManagerId === 'sarah'
                          ? 'Sarah M.'
                          : client.accountManagerId === 'liam'
                          ? 'Liam O.'
                          : 'Founder'}
                      </td>

                      {/* Open Requests Badge */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'}`}>
                        {openReqCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#D92D50] text-white text-[10px] font-bold inline-flex items-center gap-1">
                            <span>{openReqCount} pending</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#A8A5A5]">All complete</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className={`px-3 ${isCompact ? 'py-1.5' : 'py-3'} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenPortalPreview && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPortalPreview(client.id);
                              }}
                              title="View portal as client"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#FCE9ED] border border-black/10 hover:border-[#D92D50]/30 text-xs font-semibold text-[#111111] hover:text-[#D92D50] transition-all cursor-pointer shadow-2xs"
                            >
                              <Eye size={12} className="text-[#D92D50]" />
                              <span className="hidden md:inline">Portal</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenClientWorkspace(client.id, client.businessName);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1EFEF] hover:bg-[#111111] hover:text-white text-xs font-bold text-[#111111] transition-all cursor-pointer shadow-2xs"
                          >
                            <span>Workspace</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Add Client Wizard Modal */}
      <AddClientWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onClientCreated={(id, name) => {
          loadData();
          onOpenClientWorkspace(id, name);
        }}
      />
    </div>
  );
};
