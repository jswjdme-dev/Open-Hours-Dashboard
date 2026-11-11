import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar.tsx';
import { CommandPalette } from '../CommandPalette.tsx';
import { RemoveDemoDataModal } from '../common/RemoveDemoDataModal.tsx';
import { Role, InAppNotification, TeamMemberProfile } from '../../types/index.ts';
import {
  hasAnyDemoData,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from '../../data/repo.ts';
import { Trash2, CheckCircle2, Bell, LogIn, Search, Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { normalizeRole } from '../../config/navigation.ts';

interface AppShellProps {
  currentView: string;
  onNavigate: (viewId: string, label: string) => void;
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  previewMember?: TeamMemberProfile | null;
  onExitMemberPreview?: () => void;
  onOpenMockLogin?: () => void;
  onOpenSupabaseLogin?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  currentRole,
  onRoleChange,
  previewMember,
  onExitMemberPreview,
  onOpenMockLogin,
  onOpenSupabaseLogin,
  isLoading = false,
  children,
}) => {
  const { isSupabaseAuth, user, profile, signOut } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [removeDemoModalOpen, setRemoveDemoModalOpen] = useState(false);
  const [hasDemo, setHasDemo] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sidebar responsive & collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // In-app notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const loadNotifications = async () => {
    const [list, count] = await Promise.all([
      getNotifications(),
      getUnreadNotificationCount(),
    ]);
    setNotifications(list);
    setUnreadCount(count);
  };

  useEffect(() => {
    loadNotifications();
  }, [currentView]);

  useEffect(() => {
    const checkDemo = () => {
      hasAnyDemoData().then((res) => setHasDemo(res));
    };
    checkDemo();

    window.addEventListener('demoDataStateChanged', checkDemo);
    return () => window.removeEventListener('demoDataStateChanged', checkDemo);
  }, []);

  // Shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#F3F4F6] flex text-[#0A0A0A] font-sans antialiased overflow-x-hidden">
      {/* 1. APP SHELL: Sidebar (240px wide, no right border) */}
      <Sidebar
        currentView={currentView}
        onNavigate={(id, label) => onNavigate(id, label)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        currentRole={currentRole}
        onRoleChange={onRoleChange}
        previewMember={previewMember}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isLoading={isLoading}
      />

      {/* Main Column: Light Canvas Background (#F3F4F6) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#F3F4F6]">
        {/* 2. TOP BAR: Transparent row directly on the content canvas */}
        <header className="h-[64px] bg-transparent px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
          {/* Left: Mobile hamburger & search pill (white pill with ⌘K keycap) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-full bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#4B5563] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>

            {/* White search pill with keycap hint */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-48 sm:w-64 md:w-[320px] h-[36px] bg-white hover:bg-[#F9FAFB] rounded-full px-3.5 flex items-center justify-between text-[#4B5563] transition-colors cursor-pointer border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
              aria-label="Open search dialog"
            >
              <div className="flex items-center gap-2.5 text-xs truncate">
                <Search size={14} className="text-[#6B7280] shrink-0" />
                <span className="truncate text-[13px] font-normal text-[#4B5563]">Search anything...</span>
              </div>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-[#F3F4F6] text-[#4B5563] rounded border border-[#E5E7EB]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Actions, notifications, and avatar as 36px outlined pills/icon buttons */}
          <div className="flex items-center gap-2.5">
            {/* Remove Demo Data Outline Pill for Admin only */}
            {normalizeRole(currentRole) === 'Admin' && hasDemo && (
              <button
                type="button"
                onClick={() => setRemoveDemoModalOpen(true)}
                className="h-[36px] px-3.5 rounded-full bg-white border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[#FEECEB] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Remove demonstration data"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Remove demo data</span>
              </button>
            )}

            {/* Authenticated User Status Chip */}
            {profile && (
              <div className="hidden md:flex items-center gap-2 h-[36px] px-3.5 bg-white border border-[#E5E7EB] rounded-full text-xs font-medium text-[#111827] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <span className="max-w-[160px] truncate">{profile.display_name}</span>
                <span className="text-[11px] text-[#6B7280]">({normalizeRole(profile.role)})</span>
              </div>
            )}

            {/* Always Visible Sign Out Pill Button */}
            <button
              type="button"
              onClick={() => signOut()}
              className="h-[36px] px-3.5 rounded-full bg-white border border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Sign out of console"
            >
              <LogOut size={13} className="text-[#6B7280]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Notification Bell (36px icon button) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-full bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer relative shadow-2xs"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--crimson)] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 top-11 w-80 md:w-96 bg-white rounded-[12px] shadow-lg border border-[#E5E7EB] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 bg-[#FAFBFD] border-b border-[#E5E7EB] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-[#111827]">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEECEB] text-[var(--crimson)]">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          await markAllNotificationsRead();
                          loadNotifications();
                        }}
                        className="text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#F3F4F6]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#6B7280]">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={async () => {
                            if (!notif.read) {
                              await markNotificationRead(notif.id);
                              loadNotifications();
                            }
                            setNotificationsOpen(false);
                            if (notif.taskId) {
                              onNavigate('team-my-work', 'My Work');
                            } else if (notif.clientId) {
                              onNavigate(`client-${notif.clientId}`, 'Client Workspace');
                            }
                          }}
                          className={`p-3 text-xs cursor-pointer transition-colors hover:bg-[#F9FAFB] flex items-start justify-between gap-3 ${
                            notif.read ? 'bg-white text-[#6B7280]' : 'bg-[var(--accent)]/[0.04] text-[#111827]'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-1.5">
                              {!notif.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                              )}
                              <span>{notif.title}</span>
                            </div>
                            <p className="text-[12px] text-[#4B5563] leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[11px] font-normal text-[#6B7280] block">
                              {notif.createdAt}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu Trigger & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-semibold shadow-2xs select-none hover:ring-2 hover:ring-[var(--accent)]/30 transition-all cursor-pointer"
                title={`User menu: ${profile?.display_name || currentRole}`}
                aria-label="Open user menu"
              >
                {profile?.display_name
                  ? profile.display_name.slice(0, 2).toUpperCase()
                  : previewMember
                  ? previewMember.name.slice(0, 2).toUpperCase()
                  : currentRole.slice(0, 2).toUpperCase()}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-64 bg-white rounded-[12px] shadow-lg border border-[#E5E7EB] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-3">
                  <div className="px-2 py-1.5 border-b border-[#F3F4F6] mb-2">
                    <div className="font-semibold text-xs text-[#111827] truncate">
                      {profile?.display_name || 'Authenticated User'}
                    </div>
                    {user?.email && (
                      <div className="text-[11px] text-[#6B7280] truncate mt-0.5">
                        {user.email}
                      </div>
                    )}
                    <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] mt-1.5">
                      {normalizeRole(profile?.role || currentRole)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full h-9 rounded-[8px] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Member Preview Sticky Banner (if active) */}
        {previewMember && (
          <div className="sticky top-[64px] z-20 bg-[#0F2A47] text-white px-6 py-2.5 flex items-center justify-between text-xs shadow-2xs border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>
                Previewing as <strong className="font-semibold text-white">{previewMember.name}</strong> ({previewMember.role})
              </span>
              <span className="text-[#9DB2C8] text-[12px] font-normal hidden sm:inline">
                · Filtered to permitted modules & assigned work
              </span>
            </div>
            <button
              type="button"
              onClick={onExitMemberPreview}
              className="px-3.5 py-1 rounded-[8px] bg-white/15 hover:bg-white text-white hover:text-[#0F2A47] font-medium text-xs transition-colors cursor-pointer"
            >
              Exit preview
            </button>
          </div>
        )}

        {/* 3. CONTENT AREA: Max-width 1440px on light canvas */}
        <main
          className="flex-1 px-4 sm:px-6 lg:px-8 pb-10 max-w-[1440px] w-full mx-auto"
          id="main-content"
        >
          {children}
        </main>
      </div>

      {/* Remove Demo Data 2-Step Modal */}
      <RemoveDemoDataModal
        isOpen={removeDemoModalOpen}
        onClose={() => setRemoveDemoModalOpen(false)}
        onSuccess={(removedCounts) => {
          setHasDemo(false);
          const parts = Object.entries(removedCounts)
            .filter(([_, count]) => count > 0)
            .map(([entity, count]) => `${count} ${entity}`);
          setToastMsg(`Demo data removed: ${parts.slice(0, 4).join(', ')}`);
          setTimeout(() => setToastMsg(null), 4500);
        }}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#101828] text-white px-4 py-3 rounded-[12px] shadow-lg flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelect={(targetId, label) => {
          onNavigate(targetId, label);
        }}
      />
    </div>
  );
};
