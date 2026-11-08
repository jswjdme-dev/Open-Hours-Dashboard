import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Clock,
  Euro,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserX,
  Sliders,
  Mail,
  Calendar,
  Eye,
  X,
  ArrowRight,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import {
  TeamMemberProfile,
  MemberPermissions,
  Role,
  AccessLevel,
} from '../../types/index.ts';
import { normalizeRole } from '../../config/navigation.ts';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deactivateTeamMember,
  getTimeEntries,
  getTasks,
  createUserCredential,
} from '../../data/repo.ts';
import { getRolePermissionDefaults } from '../../lib/team.ts';
import { NAVIGATION_CONFIG } from '../../config/navigation.ts';
import { hashPassword } from '../../lib/authCrypto.ts';
import { LoginSection } from '../../components/auth/LoginSection.tsx';
import { GeneratedCredentialModal } from '../../components/auth/GeneratedCredentialModal.tsx';
import { ManageCredentialModal } from '../../components/auth/ManageCredentialModal.tsx';

interface TeamMembersPageProps {
  currentRole: Role;
  onViewAsMember?: (member: TeamMemberProfile) => void;
}

export const TeamMembersPage: React.FC<TeamMembersPageProps> = ({
  currentRole,
  onViewAsMember,
}) => {
  const [members, setMembers] = useState<TeamMemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Hours this week & open tasks map
  const [hoursThisWeekMap, setHoursThisWeekMap] = useState<Record<string, number>>({});
  const [openTasksMap, setOpenTasksMap] = useState<Record<string, number>>({});

  // Modals
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberProfile | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<Role>('Account Manager');
  const [formCostRate, setFormCostRate] = useState(35);
  const [formCostCurrency, setFormCostCurrency] = useState<'EUR' | 'BDT'>('EUR');
  const [formCapacityHours, setFormCapacityHours] = useState(35);
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formPermissions, setFormPermissions] = useState<MemberPermissions>(
    getRolePermissionDefaults('Account Manager')
  );
  const [formLoginId, setFormLoginId] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formHideFromClients, setFormHideFromClients] = useState(false);
  const [createdCredModal, setCreatedCredModal] = useState<{
    loginId: string;
    plaintext: string;
    name: string;
    role: string;
  } | null>(null);
  const [manageCredMember, setManageCredMember] = useState<TeamMemberProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [memList, entries, tasks] = await Promise.all([
      getTeamMembers(),
      getTimeEntries(),
      getTasks(),
    ]);

    setMembers(memList);

    // Compute hours this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const hoursMap: Record<string, number> = {};
    entries.forEach((e) => {
      if (new Date(e.startTime) >= startOfWeek) {
        const mins = e.durationMinutes || 30;
        hoursMap[e.memberId] = (hoursMap[e.memberId] || 0) + mins / 60;
      }
    });
    setHoursThisWeekMap(hoursMap);

    // Compute open tasks
    const tasksMap: Record<string, number> = {};
    tasks.forEach((t) => {
      if (t.status === 'Pending' && t.assignedTo) {
        tasksMap[t.assignedTo] = (tasksMap[t.assignedTo] || 0) + 1;
      }
    });
    setOpenTasksMap(tasksMap);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRolePresetChange = (selectedRole: Role) => {
    setFormRole(selectedRole);
    setFormPermissions(getRolePermissionDefaults(selectedRole));
  };

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('Account Manager');
    setFormCostRate(35);
    setFormCostCurrency('EUR');
    setFormCapacityHours(35);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormPermissions(getRolePermissionDefaults('Account Manager'));
    setFormLoginId('');
    setFormPassword('');
    setFormHideFromClients(false);
    setFormError(null);
    setEditingMember(null);
    setAddMemberModalOpen(true);
  };

  const handleOpenEditModal = (member: TeamMemberProfile) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role as Role);
    setFormCostRate(member.costRatePerHour);
    setFormCostCurrency(member.costCurrency);
    setFormCapacityHours(member.weeklyCapacityHours);
    setFormStartDate(member.startDate);
    setFormPermissions(member.permissions);
    setFormLoginId(member.email);
    setFormPassword('');
    setFormHideFromClients(Boolean(member.hideFromClients));
    setFormError(null);
    setAddMemberModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Please provide name and email.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (editingMember) {
        await updateTeamMember(editingMember.id, {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          costRatePerHour: formCostRate,
          costCurrency: formCostCurrency,
          weeklyCapacityHours: formCapacityHours,
          startDate: formStartDate,
          permissions: formPermissions,
          hideFromClients: formHideFromClients,
        });
      } else {
        const newMember = await createTeamMember({
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          costRatePerHour: formCostRate,
          costCurrency: formCostCurrency,
          weeklyCapacityHours: formCapacityHours,
          startDate: formStartDate,
          permissions: formPermissions,
          hideFromClients: formHideFromClients,
        });

        // If credentials specified, hash with Web Crypto PBKDF2 and save
        if (formPassword.trim()) {
          const activeLoginId = formLoginId.trim() || formEmail.trim();
          const { hashHex, saltHex, iterations } = await hashPassword(formPassword.trim());
          await createUserCredential({
            loginId: activeLoginId,
            passwordHashHex: hashHex,
            saltHex,
            iterations,
            role: formRole,
            targetEntityId: newMember.id,
            targetEntityName: newMember.name,
            mustChangeOnFirstLogin: true,
          });

          // Show generated credential modal once
          setCreatedCredModal({
            loginId: activeLoginId,
            plaintext: formPassword.trim(),
            name: newMember.name,
            role: formRole,
          });
          setAddMemberModalOpen(false);
          await loadData();
          return;
        }
      }

      setAddMemberModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this team member?')) return;
    await deactivateTeamMember(memberId);
    await loadData();
  };

  const filteredMembers = members.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    return true;
  });

  const isAdmin = normalizeRole(currentRole) === 'Admin';

  return (
    <div className="w-full space-y-6">
      {/* Mock Auth Notice Banner */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/70 text-xs text-amber-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Lock size={15} className="shrink-0 text-amber-700" />
          <span>
            <strong>Notice:</strong> Mock auth: do not give access to real people until Supabase is
            live.
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded-full">
          Demo Stage
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-[#101828] leading-tight tracking-tight">
              Team Members
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-black/10 text-[11px] font-medium text-[#6B6B6B] bg-white">
              Governance
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Solo-founder team capacity, cost rates, granular permission matrices, and role governance.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Add new member</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#F4F2F2] rounded-[24px] p-3 border border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A5A5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, email..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white rounded-full border border-black/10 focus:outline-none focus:border-[#D92D50] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-white border border-black/5 text-[#111111] focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Account Manager">Account Manager</option>
            <option value="Developer">Developer</option>
            <option value="Ads Manager">Ads Manager</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-[24px] border border-black/5 p-4 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F7F7] text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider border-b border-black/5">
              <tr>
                <th className="py-3 px-3.5">Member</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                {isAdmin && <th className="py-3 px-3">Cost Rate</th>}
                <th className="py-3 px-3">Hours This Week</th>
                <th className="py-3 px-3">Open Tasks</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#A8A5A5]">
                    Loading team members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#A8A5A5]">
                    No members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const hoursThisWeek = Math.round((hoursThisWeekMap[m.id] || 0) * 10) / 10;
                  const openTasks = openTasksMap[m.id] || openTasksMap[m.name] || 0;

                  return (
                    <tr key={m.id} className="hover:bg-black/1 transition-colors">
                      {/* Name & Initials */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                            {m.avatarInitials}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#111111]">{m.name}</div>
                            <div className="text-[11px] text-[#A8A5A5]">{m.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-xs text-[#111111]">{m.role}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.status === 'Invited'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      {/* Cost Rate (Admin Only) */}
                      {isAdmin && (
                        <td className="py-3 px-3 font-semibold text-[#111111] tabular-nums">
                          {m.costCurrency === 'EUR' ? `€${m.costRatePerHour}` : `${m.costRatePerHour} BDT`}
                          /hr
                        </td>
                      )}

                      {/* Hours This Week */}
                      <td className="py-3 px-3 font-semibold text-[#111111] tabular-nums">
                        {hoursThisWeek} hrs{' '}
                        <span className="text-[10px] text-[#A8A5A5]">/ {m.weeklyCapacityHours}h</span>
                      </td>

                      {/* Open Tasks */}
                      <td className="py-3 px-3 font-semibold text-[#111111] tabular-nums">
                        {openTasks > 0 ? (
                          <span className="text-[#D92D50] font-bold">{openTasks} tasks</span>
                        ) : (
                          <span className="text-[#A8A5A5]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(m)}
                                className="px-2.5 py-1 rounded-full bg-white border border-black/10 hover:border-black/25 text-xs font-semibold text-[#111111] transition-all cursor-pointer shadow-2xs"
                              >
                                Permissions
                              </button>
                              <button
                                type="button"
                                onClick={() => setManageCredMember(m)}
                                className="px-2.5 py-1 rounded-full bg-white border border-black/10 hover:border-black/25 text-xs font-semibold text-[#111111] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                              >
                                <KeyRound size={11} />
                                <span>Credentials</span>
                              </button>
                              {onViewAsMember && (
                                <button
                                  type="button"
                                  onClick={() => onViewAsMember(m)}
                                  className="px-2.5 py-1 rounded-full bg-[#FCE9ED] text-[#D92D50] hover:bg-[#F9D5DC] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  <span>View as</span>
                                </button>
                              )}
                              {m.status !== 'Deactivated' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(m.id)}
                                  title="Deactivate member"
                                  className="w-7 h-7 rounded-full hover:bg-black/5 text-[#A8A5A5] hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <UserX size={14} />
                                </button>
                              )}
                            </>
                          )}
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

      {/* ADD / EDIT MEMBER & PERMISSIONS MODAL */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-[28px] border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  {editingMember ? `Edit Member: ${editingMember.name}` : 'Add New Team Member'}
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Configure role presets, hourly cost rates, and granular navigation permissions.
                </p>
              </div>
              <button
                onClick={() => setAddMemberModalOpen(false)}
                className="text-[#6B6B6B] hover:text-[#111111]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. john@openhours.io"
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:border-[#D92D50] outline-none"
                  />
                </div>
              </div>

              {/* Role Preset */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Role Preset
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRolePresetChange(e.target.value as Role)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 bg-white"
                  >
                    <option value="Admin">Admin (Founder)</option>
                    <option value="Account Manager">Account Manager</option>
                    <option value="Developer">Developer</option>
                    <option value="Ads Manager">Ads Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Weekly Capacity Hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={formCapacityHours}
                    onChange={(e) => setFormCapacityHours(parseInt(e.target.value) || 35)}
                    className="w-full text-xs p-2.5 rounded-xl border border-black/10 outline-none"
                  />
                </div>
              </div>

              {/* Cost Rate (Visible to Admin only) */}
              {isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-2xl bg-[#FAFAFA] border border-black/5">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
                      Cost Rate Per Hour
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formCostRate}
                      onChange={(e) => setFormCostRate(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-2 rounded-xl border border-black/10 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">Currency</label>
                    <select
                      value={formCostCurrency}
                      onChange={(e) => setFormCostCurrency(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-xl border border-black/10 bg-white"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="BDT">BDT (৳)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Login Credentials Section (When creating new member) */}
              {!editingMember && (
                <LoginSection
                  loginId={formLoginId || formEmail}
                  onLoginIdChange={setFormLoginId}
                  password={formPassword}
                  onPasswordChange={setFormPassword}
                  loginIdLabel="Team Member Login ID (Email or Username)"
                  loginIdPlaceholder={formEmail || 'member@openhours.ie'}
                  helpText="Member uses this login to sign into their dashboard and view assigned tasks."
                />
              )}

              {/* Special Permission Toggles */}
              <div className="space-y-2 pt-2 border-t border-black/5">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Special Access Permissions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FAFAFA] border border-black/5">
                    <input
                      type="checkbox"
                      checked={formPermissions.canSeeRevenuePayments}
                      onChange={(e) =>
                        setFormPermissions({
                          ...formPermissions,
                          canSeeRevenuePayments: e.target.checked,
                        })
                      }
                      className="rounded text-[#D92D50]"
                    />
                    <span>Can see revenue & payments</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FAFAFA] border border-black/5">
                    <input
                      type="checkbox"
                      checked={formPermissions.canSeeCostRates}
                      onChange={(e) =>
                        setFormPermissions({
                          ...formPermissions,
                          canSeeCostRates: e.target.checked,
                        })
                      }
                      className="rounded text-[#D92D50]"
                    />
                    <span>Can see cost rates</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FAFAFA] border border-black/5">
                    <input
                      type="checkbox"
                      checked={formPermissions.canExportData}
                      onChange={(e) =>
                        setFormPermissions({
                          ...formPermissions,
                          canExportData: e.target.checked,
                        })
                      }
                      className="rounded text-[#D92D50]"
                    />
                    <span>Can export data (JSON)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FAFAFA] border border-black/5">
                    <input
                      type="checkbox"
                      checked={formPermissions.canSeeClientContactDetails}
                      onChange={(e) =>
                        setFormPermissions({
                          ...formPermissions,
                          canSeeClientContactDetails: e.target.checked,
                        })
                      }
                      className="rounded text-[#D92D50]"
                    />
                    <span>Can see client contact details</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FAFAFA] border border-black/5">
                    <input
                      type="checkbox"
                      checked={formHideFromClients}
                      onChange={(e) => setFormHideFromClients(e.target.checked)}
                      className="rounded text-[#D92D50]"
                    />
                    <div>
                      <span className="font-semibold text-[#111111]">Hide from clients</span>
                      <span className="text-[10px] text-[#6B6B6B] block">Do not show in client portal team card</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Granular Section & Item Permissions Matrix */}
              <div className="space-y-2 pt-2 border-t border-black/5">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Navigation Access Matrix
                </h4>
                <div className="border border-black/10 rounded-2xl overflow-hidden divide-y divide-black/5 text-xs max-h-48 overflow-y-auto custom-scrollbar">
                  {NAVIGATION_CONFIG.groups.map((group) => (
                    <div key={group.id} className="p-3 bg-white">
                      <div className="font-bold text-[11px] text-[#A8A5A5] uppercase tracking-wider mb-2">
                        {group.label}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.items.map((item) => {
                          const currentLevel: AccessLevel =
                            formPermissions.navigationAccess[item.id] || 'none';

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-[#FAFAFA] border border-black/5"
                            >
                              <span className="font-medium text-xs text-[#111111] truncate">
                                {item.label}
                              </span>
                              <select
                                value={currentLevel}
                                onChange={(e) => {
                                  const lvl = e.target.value as AccessLevel;
                                  setFormPermissions({
                                    ...formPermissions,
                                    navigationAccess: {
                                      ...formPermissions.navigationAccess,
                                      [item.id]: lvl,
                                    },
                                  });
                                }}
                                className="text-[11px] font-semibold bg-white border border-black/10 rounded-lg p-1 outline-none"
                              >
                                <option value="none">No access</option>
                                <option value="view">View</option>
                                <option value="edit">Edit</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-black cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : editingMember ? 'Update Member' : 'Create & Invite Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time Credential display modal */}
      {createdCredModal && (
        <GeneratedCredentialModal
          isOpen={true}
          onClose={() => setCreatedCredModal(null)}
          loginId={createdCredModal.loginId}
          plaintextPassword={createdCredModal.plaintext}
          roleLabel={`Team Member (${createdCredModal.role})`}
          entityName={createdCredModal.name}
        />
      )}

      {/* Manage Credentials Modal */}
      {manageCredMember && (
        <ManageCredentialModal
          isOpen={true}
          onClose={() => setManageCredMember(null)}
          loginId={manageCredMember.email}
          entityName={manageCredMember.name}
          roleLabel={`Role: ${manageCredMember.role}`}
          onCredentialUpdated={loadData}
        />
      )}
    </div>
  );
};
