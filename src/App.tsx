import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Role } from './types/index.ts';
import { AppShell } from './components/layout/AppShell.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { GrowthReportPage } from './pages/GrowthReportPage.tsx';
import { GrowthTrendPage } from './pages/GrowthTrendPage.tsx';
import { FunnelPage } from './pages/FunnelPage.tsx';
import { PeriodComparisonPage } from './pages/PeriodComparisonPage.tsx';
import { LeadsPage } from './pages/LeadsPage.tsx';
import { PipelinePage } from './pages/PipelinePage.tsx';
import { TasksPage } from './pages/TasksPage.tsx';
import { OutreachPage } from './pages/OutreachPage.tsx';
import { SuppressionListPage } from './pages/SuppressionListPage.tsx';
import { PartnershipsPage } from './pages/PartnershipsPage.tsx';
import { NicheSourcePage } from './pages/NicheSourcePage.tsx';
import { BottleneckPage } from './pages/BottleneckPage.tsx';
import { ScoreCalibrationPage } from './pages/ScoreCalibrationPage.tsx';
import { LearningLogPage } from './pages/LearningLogPage.tsx';
import { PerformancePage } from './pages/PerformancePage.tsx';
import { ClientsPage } from './pages/ClientsPage.tsx';
import { ClientWorkspacePage } from './pages/ClientWorkspacePage.tsx';
import { WebsiteProjectsPage } from './pages/WebsiteProjectsPage.tsx';
import { WebsiteTemplatesPage } from './pages/WebsiteTemplatesPage.tsx';
import { ClientReportsPage } from './pages/ClientReportsPage.tsx';
import { DeliveryPage } from './pages/DeliveryPage.tsx';
import { RequestsPage } from './pages/RequestsPage.tsx';
import { FilesPage } from './pages/FilesPage.tsx';
import { MeetingsPage } from './pages/MeetingsPage.tsx';
import { TicketsPage } from './pages/TicketsPage.tsx';
import { PaymentsPage } from './pages/PaymentsPage.tsx';
import { InvoicesPage } from './pages/InvoicesPage.tsx';
import { MrrPage } from './pages/MrrPage.tsx';
import { PartnerFeesPage } from './pages/PartnerFeesPage.tsx';
import { TeamRolesPage } from './pages/TeamRolesPage.tsx';
import { AuditLogPage } from './pages/AuditLogPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { PlaceholderPage } from './pages/PlaceholderPage.tsx';
import { ClientPortalPreview } from './pages/ClientPortalPreview.tsx';
import { PartnerPortalView } from './pages/partner-portal/PartnerPortalView.tsx';
import { TeamMembersPage } from './pages/team/TeamMembersPage.tsx';
import { SubTeamsPage } from './pages/team/SubTeamsPage.tsx';
import { MyWorkPage } from './pages/team/MyWorkPage.tsx';
import { TimeTrackerPage } from './pages/team/TimeTrackerPage.tsx';
import { TeamPerformancePage } from './pages/team/TeamPerformancePage.tsx';
import { TeamSettingsPage } from './pages/team/TeamSettingsPage.tsx';
import { ChannelSettingsPage } from './pages/ChannelSettingsPage.tsx';
import { FollowUpSettingsPage } from './pages/FollowUpSettingsPage.tsx';
import { ConsistencyCheckPage } from './pages/ConsistencyCheckPage.tsx';
import { PublicApplyPage } from './pages/PublicApplyPage.tsx';
import { PublicPreviewPage } from './pages/PublicPreviewPage.tsx';
import { GuestPortalPage } from './pages/GuestPortalPage.tsx';
import { SignInPage } from './components/auth/SignInPage.tsx';
import { NeutralLoadingScreen } from './components/auth/NeutralLoadingScreen.tsx';
import { AppNotConfiguredPage } from './components/auth/AppNotConfiguredPage.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { TeamMemberProfile } from './types/index.ts';
import { normalizeRole, canAccessView } from './config/navigation.ts';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const { isConfigured, isSupabaseAuth, profile, loading: authLoading, error: authError, clearError } = useAuth();
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('openhours_current_view');
      if (saved && saved.length > 0 && saved !== 'partner-fees') return saved;
      const path = window.location.pathname.replace(/^\//, '');
      if (path && path.length > 0 && path !== 'partner-fees') return path;
    }
    return 'overview';
  });
  const [currentViewTitle, setCurrentViewTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('openhours_current_view_title');
      if (saved && saved.length > 0 && saved !== 'Partner Fees') return saved;
    }
    return 'Overview';
  });
  const [currentRole, setCurrentRole] = useState<Role>('Admin');
  const [previewPortalClientId, setPreviewPortalClientId] = useState<string | null>(null);
  const [previewPartnerId, setPreviewPartnerId] = useState<string | null>(null);
  const [previewMember, setPreviewMember] = useState<TeamMemberProfile | null>(null);
  const lastAuthUserIdRef = useRef<string | null>(null);

  // Effective role: when previewing a member, use the member's normalized role only.
  // Otherwise, use normalized currentRole.
  const effectiveRole = useMemo(() => {
    return normalizeRole(previewMember ? previewMember.role : currentRole);
  }, [previewMember, currentRole]);

  // Sync Supabase authenticated role when logged in
  useEffect(() => {
    if (isSupabaseAuth && profile) {
      const normalized = normalizeRole(profile.role);
      setCurrentRole(normalized);

      // Only perform initial role-based redirect when account switches or upon first sign-in.
      // Never reset view on tab switches, visibility change, or background token refreshes.
      if (lastAuthUserIdRef.current !== profile.id) {
        lastAuthUserIdRef.current = profile.id;
        const savedView = typeof window !== 'undefined' ? window.localStorage.getItem('openhours_current_view') : null;
        const savedTitle = typeof window !== 'undefined' ? window.localStorage.getItem('openhours_current_view_title') : null;

        if (savedView && savedView !== 'partner-fees' && canAccessView(savedView, normalized)) {
          setCurrentView(savedView);
          if (savedTitle) setCurrentViewTitle(savedTitle);
        } else {
          if (normalized === 'Client') {
            setCurrentView('client-overview');
            setCurrentViewTitle('Client Portal');
          } else if (normalized === 'Partner') {
            setCurrentView('partner-portal');
            setCurrentViewTitle('Partner Portal');
          } else if (normalized === 'Account Manager' || normalized === 'Developer' || normalized === 'Ads Manager') {
            setCurrentView('team-my-work');
            setCurrentViewTitle('My Work');
          } else {
            setCurrentView('overview');
            setCurrentViewTitle('Overview');
          }
        }
      }
    } else if (!isSupabaseAuth) {
      lastAuthUserIdRef.current = null;
    }
  }, [isSupabaseAuth, profile]);

  const handleRoleChange = (role: Role) => {
    const normalized = normalizeRole(role);
    setPreviewMember(null);
    setCurrentRole(normalized);

    // If current view is restricted for the new role, redirect
    if (!canAccessView(currentView, normalized)) {
      let targetView = 'overview';
      let targetTitle = 'Overview';
      if (normalized === 'Client') {
        targetView = 'client-overview';
        targetTitle = 'Client Portal';
      } else if (normalized === 'Partner') {
        targetView = 'partner-portal';
        targetTitle = 'Partner Portal';
      } else if (normalized === 'Developer' || normalized === 'Ads Manager') {
        targetView = 'team-my-work';
        targetTitle = 'My Work';
      }
      setCurrentView(targetView);
      setCurrentViewTitle(targetTitle);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('openhours_current_view', targetView);
        window.localStorage.setItem('openhours_current_view_title', targetTitle);
      }
    }
  };

  const handleNavigate = (viewId: string, label: string) => {
    // Clients and Partners have zero access to console navigation
    if (effectiveRole === 'Client' || effectiveRole === 'Partner') {
      return;
    }

    // If selecting a lead from command palette
    if (viewId.startsWith('lead-')) {
      setCurrentView('leads');
      setCurrentViewTitle('Leads');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('openhours_current_view', 'leads');
        window.localStorage.setItem('openhours_current_view_title', 'Leads');
      }
      return;
    }

    // If selecting a partner from command palette
    if (viewId.startsWith('partner-')) {
      setCurrentView('partnerships');
      setCurrentViewTitle('Partnerships');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('openhours_current_view', 'partnerships');
        window.localStorage.setItem('openhours_current_view_title', 'Partnerships');
      }
      return;
    }

    // If selecting a client from command palette or workspace list
    if (viewId.startsWith('client-') && viewId !== 'client-requests' && viewId !== 'client-files') {
      setCurrentView(viewId);
      setCurrentViewTitle(label || 'Client Workspace');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('openhours_current_view', viewId);
        window.localStorage.setItem('openhours_current_view_title', label || 'Client Workspace');
      }
      return;
    }

    // Old goals merged into MRR Roadmap
    if (viewId === 'goals') {
      if (!canAccessView('mrr', effectiveRole, previewMember?.permissions)) return;
      setCurrentView('mrr');
      setCurrentViewTitle('MRR Roadmap');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('openhours_current_view', 'mrr');
        window.localStorage.setItem('openhours_current_view_title', 'MRR Roadmap');
      }
      return;
    }

    // Removed partner-fees redirect to overview
    if (viewId === 'partner-fees') {
      setCurrentView('overview');
      setCurrentViewTitle('Overview');
      return;
    }

    // Route guard on navigation
    if (!canAccessView(viewId, effectiveRole, previewMember?.permissions)) {
      return;
    }

    setCurrentView(viewId);
    setCurrentViewTitle(label);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('openhours_current_view', viewId);
      window.localStorage.setItem('openhours_current_view_title', label);
    }
  };

  const renderContent = () => {
    // Route guard check: verify permission for currentView
    if (!canAccessView(currentView, effectiveRole, previewMember?.permissions)) {
      return (
        <div className="bg-white rounded-[16px] p-8 border border-[#ECEEF2] text-center max-w-md mx-auto my-12 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#FEECEB] text-[#D92D50] flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-[18px] font-bold text-[#101828] mb-1">Access Restricted</h2>
          <p className="text-[13px] text-[#475467] mb-6">
            Your active role (<strong className="text-[#101828]">{effectiveRole}</strong>) does not have permission to view {currentViewTitle || currentView}.
          </p>
          <button
            type="button"
            onClick={() => {
              const fallback = effectiveRole === 'Developer' || effectiveRole === 'Ads Manager' ? 'team-my-work' : 'overview';
              const label = effectiveRole === 'Developer' || effectiveRole === 'Ads Manager' ? 'My Work' : 'Overview';
              setCurrentView(fallback);
              setCurrentViewTitle(label);
            }}
            className="px-4 py-2 bg-[#101828] text-white text-[13px] font-semibold rounded-[10px] hover:bg-[#1D2939] transition-colors cursor-pointer"
          >
            {effectiveRole === 'Developer' || effectiveRole === 'Ads Manager' ? 'Go to My Work' : 'Return to Overview'}
          </button>
        </div>
      );
    }

    // If client workspace (e.g. client-client_01)
    if (currentView.startsWith('client-') && currentView !== 'client-requests' && currentView !== 'client-files') {
      const clientId = currentView.replace('client-', '');
      return (
        <ClientWorkspacePage
          clientId={clientId}
          onBackToClients={() => handleNavigate('clients', 'Clients')}
          onOpenPortalPreview={(id) => setPreviewPortalClientId(id)}
          onOpenWebsiteStudio={(projectId) => {
            handleNavigate('studio-projects', 'Website Projects');
          }}
        />
      );
    }

    switch (currentView) {
      // OVERVIEW
      case 'overview':
        return <OverviewPage onNavigate={handleNavigate} />;

      // GROWTH
      case 'reports-growth':
      case 'growth-report':
        return (
          <GrowthReportPage
            onNavigateToTasks={() => handleNavigate('tasks', 'Tasks & Reminders')}
            onNavigateToMrr={() => handleNavigate('mrr', 'MRR Roadmap')}
          />
        );
      case 'growth-trend':
        return <GrowthTrendPage />;
      case 'growth-funnel':
        return <FunnelPage />;
      case 'growth-comparison':
        return <PeriodComparisonPage />;

      // SALES
      case 'leads':
        return <LeadsPage />;
      case 'pipeline':
        return (
          <PipelinePage
            onNavigateToChannelSettings={() =>
              handleNavigate('channel-settings', 'Channel Settings')
            }
          />
        );
      case 'tasks':
        return (
          <TasksPage
            onNavigateToChannelSettings={() =>
              handleNavigate('channel-settings', 'Channel Settings')
            }
            onNavigateToFollowUpSettings={() =>
              handleNavigate('follow-up-settings', 'Follow-up Settings')
            }
            onNavigateToSequenceSettings={() =>
              handleNavigate('follow-up-settings', 'Follow-up Settings')
            }
          />
        );
      case 'channel-settings':
      case 'settings-channels':
        return (
          <ChannelSettingsPage
            onNavigateToTasks={() => handleNavigate('tasks', 'Tasks & Reminders')}
            onNavigateToFollowUpSettings={() =>
              handleNavigate('follow-up-settings', 'Follow-up Settings')
            }
          />
        );
      case 'follow-up-settings':
      case 'settings-sequence':
        return (
          <FollowUpSettingsPage
            onNavigateToTasks={() => handleNavigate('tasks', 'Tasks & Reminders')}
            onNavigateToChannelSettings={() =>
              handleNavigate('channel-settings', 'Channel Settings')
            }
          />
        );
      case 'outreach':
        return <OutreachPage />;
      case 'suppression':
        return <SuppressionListPage />;
      case 'partnerships':
        return (
          <PartnershipsPage
            userRole={effectiveRole}
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
            onViewAsPartner={(id) => setPreviewPartnerId(id)}
          />
        );

      // INTELLIGENCE
      case 'intelligence-performance':
        return <PerformancePage onNavigate={handleNavigate} />;
      case 'intelligence-niche':
        return <NicheSourcePage />;
      case 'intelligence-bottleneck':
        return <BottleneckPage />;
      case 'intelligence-score':
        return <ScoreCalibrationPage />;
      case 'intelligence-learning':
        return <LearningLogPage />;

      // CLIENTS
      case 'clients':
      case 'clients-applications':
        return (
          <ClientsPage
            initialTab={currentView === 'clients-applications' ? 'applications' : 'clients'}
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
            onOpenPortalPreview={(id) => setPreviewPortalClientId(id)}
          />
        );
      case 'delivery':
        return (
          <DeliveryPage
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'client-reports':
        return (
          <ClientReportsPage
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
            onOpenPortalPreview={(id) => setPreviewPortalClientId(id)}
          />
        );
      case 'client-requests':
        return (
          <RequestsPage
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'client-files':
        return <FilesPage />;
      case 'meetings':
        return <MeetingsPage />;
      case 'tickets':
        return <TicketsPage />;

      // WEBSITE STUDIO
      case 'studio-projects':
      case 'website-projects':
        return (
          <WebsiteProjectsPage
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'studio-templates':
      case 'website-templates':
        return <WebsiteTemplatesPage />;

      // BUSINESS
      case 'payments':
      case 'business-payments':
        return (
          <PaymentsPage
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'invoices':
      case 'business-invoices':
        return (
          <InvoicesPage
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'mrr':
      case 'business-mrr':
      case 'goals':
        return (
          <MrrPage
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'partner-fees':
        return <PartnerFeesPage />;

      // TEAM
      case 'team-my-work':
        return (
          <MyWorkPage
            currentRole={effectiveRole}
            previewMember={previewMember}
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'team-members':
        return (
          <TeamMembersPage
            currentRole={effectiveRole}
            onViewAsMember={(m) => {
              const norm = normalizeRole(m.role);
              setPreviewMember(m);
              setCurrentRole(norm);
              setCurrentView('team-my-work');
              setCurrentViewTitle('My Work');
            }}
          />
        );
      case 'team-sub-teams':
        return (
          <SubTeamsPage
            currentRole={effectiveRole}
            previewMember={previewMember}
            onOpenClientWorkspace={(id, name) =>
              handleNavigate(`client-${id}`, name)
            }
          />
        );
      case 'team-time-tracker':
        return <TimeTrackerPage />;
      case 'team-performance':
        return <TeamPerformancePage currentRole={effectiveRole} />;
      case 'team-settings':
        return <TeamSettingsPage />;

      // SETTINGS
      case 'settings-team':
        return (
          <TeamMembersPage
            currentRole={effectiveRole}
            onViewAsMember={(m) => {
              const norm = normalizeRole(m.role);
              setPreviewMember(m);
              setCurrentRole(norm);
              setCurrentView('team-my-work');
              setCurrentViewTitle('My Work');
            }}
          />
        );
      case 'settings-consistency':
        return <ConsistencyCheckPage />;
      case 'settings-audit':
        return <AuditLogPage />;
      case 'settings-backup':
        return (
          <SettingsPage
            initialSubTab="backup"
            currentRole={effectiveRole}
            onRoleChange={handleRoleChange}
          />
        );
      case 'settings':
      case 'settings-sequence':
        return (
          <SettingsPage
            initialSubTab="sequence"
            currentRole={effectiveRole}
            onRoleChange={handleRoleChange}
          />
        );
      case 'settings-suppression':
        return (
          <SettingsPage
            initialSubTab="suppression"
            currentRole={effectiveRole}
            onRoleChange={handleRoleChange}
          />
        );
      case 'settings-referral':
      case 'referral-programme':
        return (
          <SettingsPage
            initialSubTab="referral"
            currentRole={effectiveRole}
            onRoleChange={handleRoleChange}
          />
        );
      case 'settings-packages':
      case 'packages':
        return (
          <SettingsPage
            initialSubTab="packages"
            currentRole={effectiveRole}
            onRoleChange={handleRoleChange}
          />
        );

      default:
        return (
          <PlaceholderPage
            title={currentViewTitle}
            category={currentView.startsWith('client-') ? 'Client Workspace' : 'Module'}
            onBackToGrowthReport={() => handleNavigate('overview', 'Overview')}
          />
        );
    }
  };

  // EXPLICIT EXCEPTIONS TO LOGIN GATE:
  // 1. /apply (Public application)
  // 2. /apply/status/<token> (Public application status)
  // 3. /preview/<token> (Public website demo preview via reveal token)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isApplyRoute =
    pathname === '/apply' ||
    pathname.startsWith('/apply/') ||
    currentView === 'apply' ||
    currentView.startsWith('apply/');

  if (isApplyRoute) {
    return <PublicApplyPage onNavigateHome={() => setCurrentView('overview')} />;
  }

  const isPreviewRoute =
    pathname.startsWith('/preview/') ||
    currentView.startsWith('preview/');

  if (isPreviewRoute) {
    const previewToken = pathname.startsWith('/preview/')
      ? pathname.replace('/preview/', '').split('/')[0]
      : currentView.replace('preview/', '').split('/')[0];
    return <PublicPreviewPage token={previewToken} />;
  }

  // 4. /welcome (Public guest temporary portal with referral code)
  const isWelcomeRoute =
    pathname === '/welcome' ||
    pathname.startsWith('/welcome/') ||
    currentView === 'welcome' ||
    currentView.startsWith('welcome/');

  if (isWelcomeRoute) {
    return (
      <GuestPortalPage
        onNavigateApply={(refCode) => {
          if (refCode) {
            window.location.href = `/apply?ref=${encodeURIComponent(refCode)}`;
          } else {
            setCurrentView('apply');
          }
        }}
      />
    );
  }

  // 1. If Supabase is not configured (missing env vars), show full-screen AppNotConfiguredPage
  if (!isConfigured) {
    return <AppNotConfiguredPage />;
  }

  // 2. While session is loading, show neutral loading screen with zero content flashes
  if (authLoading) {
    return <NeutralLoadingScreen />;
  }

  // 3. If there is no active session or active profile, render ONLY the full-screen centered SignInPage
  if (!isSupabaseAuth || !profile) {
    return <SignInPage authError={authError} />;
  }

  // 4. Role-based landing: Client lands strictly in Client Portal only
  if (effectiveRole === 'Client') {
    const clientId = profile.client_id || profile.target_entity_id || 'client_01';
    return (
      <ClientPortalPreview
        clientId={clientId}
        isPreview={false}
        onExitPreview={() => {}}
      />
    );
  }

  // 5. Role-based landing: Partner lands strictly in Partner Portal only
  if (effectiveRole === 'Partner') {
    const partnerId = profile.partner_id || profile.target_entity_id || 'part_01';
    return (
      <PartnerPortalView
        partnerId={partnerId}
        isPreview={false}
        onExitPreview={() => {}}
      />
    );
  }

  // 6. Admin previewing partner or client portal
  if (previewPartnerId) {
    return (
      <PartnerPortalView
        partnerId={previewPartnerId}
        isPreview={true}
        onExitPreview={() => setPreviewPartnerId(null)}
      />
    );
  }

  if (previewPortalClientId) {
    return (
      <ClientPortalPreview
        clientId={previewPortalClientId}
        isPreview={true}
        onExitPreview={() => setPreviewPortalClientId(null)}
      />
    );
  }

  // 7. Console for admin / account_manager / developer / ads_manager with existing nav & permission matrix
  return (
    <>
      {authError && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-[#FEECEB] border border-[#FECDCA] text-[#D92D50] p-4 rounded-2xl shadow-xl flex items-start gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex-1">
            <strong className="block font-semibold">Access Restriction</strong>
            <span>{authError}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-[#D92D50] hover:text-[#912018] p-1 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <AppShell
        currentView={currentView}
        onNavigate={handleNavigate}
        currentRole={effectiveRole}
        onRoleChange={handleRoleChange}
        previewMember={previewMember}
        onExitMemberPreview={() => {
          setPreviewMember(null);
          setCurrentRole('Admin');
        }}
        isLoading={authLoading}
      >
        {renderContent()}
      </AppShell>
    </>
  );
}
