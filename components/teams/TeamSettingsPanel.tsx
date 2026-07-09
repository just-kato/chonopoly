"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Plus, Trash2, Users, Building2, X, Pencil, AlertTriangle, Target } from "lucide-react";

interface TeamSettingsPanelProps {
  teamId: string;
  userId: string;
  onBack: () => void;
  onTeamDeleted?: () => void;
  onTeamLeft?: () => void;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  invited_by?: string | null;
  email?: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  invited_by?: string | null;
}

interface SharedAccount {
  plaid_item_id: string;
  institution_name: string | null;
}

interface PlaidItem {
  item_id: string;
  institution_name: string | null;
}

interface TeamData {
  id: string;
  name: string;
  description?: string | null;
  org_id?: string;
}

const ROLE_OPTIONS = [
  { value: "team_member",  label: "Member"  },
  { value: "team_manager", label: "Manager" },
  { value: "org_admin",    label: "Admin"   },
];

const ROLE_LABELS: Record<string, string> = {
  org_owner:    "Owner",
  org_admin:    "Admin",
  team_manager: "Manager",
  team_member:  "Member",
  viewer:       "Viewer",
};

function roleBadge(role: string) {
  switch (role) {
    case "org_owner":    return "bg-(--color-accent)/15 text-(--color-accent)";
    case "org_admin":    return "bg-purple-500/15 text-purple-400";
    case "team_manager": return "bg-blue-500/15 text-blue-400";
    default:             return "bg-(--color-border-subtle) text-(--color-text-secondary)";
  }
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const inputCls = "bg-(--color-elevated) border border-(--color-border-default) rounded-xl px-3 py-2 text-[13px] outline-none focus:border-(--color-accent)/60 text-(--color-text-primary) w-full placeholder:text-(--color-text-tertiary)";
const selectCls = "bg-(--color-elevated) border border-(--color-border-default) rounded-xl px-2 py-2 text-[12px] outline-none text-(--color-text-primary) shrink-0";
const sectionCls = "bg-(--color-surface) border border-(--color-border-default) rounded-2xl p-4 space-y-3";
const labelCls = "text-[10px] uppercase tracking-[0.1em] text-(--color-text-tertiary) font-medium";

// ─── Confirm dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string;
  detail?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

function ConfirmDialog({ message, detail, confirmLabel, onCancel, onConfirm, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-80 bg-black/50 px-4">
      <div className="bg-(--color-elevated) border border-(--color-border-default) rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-semibold text-(--color-text-primary)">{message}</p>
            {detail && <p className="text-[13px] text-(--color-text-secondary) mt-1">{detail}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-[13px] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors border border-(--color-border-default) rounded-xl">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors rounded-xl disabled:opacity-40"
          >
            {loading ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer ownership dialog ────────────────────────────────────────────────

interface TransferDialogProps {
  members: TeamMember[];
  currentUserId: string;
  onCancel: () => void;
  onConfirm: (newOwnerId: string) => void;
  loading: boolean;
}

function TransferDialog({ members, currentUserId, onCancel, onConfirm, loading }: TransferDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const eligible = members.filter(m => m.user_id !== currentUserId);
  const selected = eligible.find(m => m.user_id === selectedId);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-80 bg-black/50 px-4">
      <div className="bg-(--color-elevated) border border-(--color-border-default) rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        {step === 1 ? (
          <>
            <p className="text-[15px] font-semibold text-(--color-text-primary) mb-1">Transfer ownership</p>
            <p className="text-[13px] text-(--color-text-secondary) mb-4">Select a member to become the new owner.</p>
            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
              {eligible.map(m => (
                <label key={m.user_id} className="flex items-center gap-2.5 bg-(--color-surface) rounded-xl px-3 py-2.5 cursor-pointer border border-transparent hover:border-(--color-border-subtle) transition-colors">
                  <input
                    type="radio"
                    name="transfer-owner"
                    value={m.user_id}
                    checked={selectedId === m.user_id}
                    onChange={() => setSelectedId(m.user_id)}
                    className="accent-(--color-accent)"
                  />
                  <span className="text-[13px] text-(--color-text-primary) flex-1 truncate">
                    {m.email ?? `…${m.user_id.slice(-8)}`}
                  </span>
                  <span className={`text-[10px] rounded px-1.5 py-0.5 ${roleBadge(m.role)}`}>{ROLE_LABELS[m.role] ?? m.role}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="px-4 py-2 text-[13px] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors border border-(--color-border-default) rounded-xl">Cancel</button>
              <button
                disabled={!selectedId}
                onClick={() => setStep(2)}
                className="px-4 py-2 text-[13px] font-semibold rounded-xl disabled:opacity-30 transition-opacity"
                style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
              >
                Continue →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-(--color-text-primary)">Transfer ownership to {selected?.email ?? "this member"}?</p>
                <p className="text-[13px] text-(--color-text-secondary) mt-1">You will become a Manager. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-[13px] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors border border-(--color-border-default) rounded-xl">Back</button>
              <button
                onClick={() => selectedId && onConfirm(selectedId)}
                disabled={loading}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors rounded-xl disabled:opacity-40"
              >
                {loading ? "Transferring…" : "Transfer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function TeamSettingsPanel({ teamId, userId, onBack, onTeamDeleted, onTeamLeft }: TeamSettingsPanelProps) {
  const [team, setTeam]                   = useState<TeamData | null>(null);
  const [members, setMembers]             = useState<TeamMember[]>([]);
  const [invites, setInvites]             = useState<PendingInvite[]>([]);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [plaidItems, setPlaidItems]       = useState<PlaidItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  const myRole = members.find(m => m.user_id === userId)?.role ?? null;
  const isOwner = myRole === "org_owner";
  const isAdmin = myRole === "org_owner" || myRole === "org_admin";

  // Team name edit
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState("");
  const [nameSaving, setNameSaving]   = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState("team_member");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError]   = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Share account picker
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [shareSelected, setShareSelected]     = useState<Set<string>>(new Set());
  const [shareAdding, setShareAdding]         = useState(false);

  // Confirm dialogs
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<TeamMember | null>(null);
  const [confirmCancelInvite, setConfirmCancelInvite] = useState<PendingInvite | null>(null);
  const [confirmRemoveAccount, setConfirmRemoveAccount] = useState<SharedAccount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Danger zone
  const [showTransfer, setShowTransfer]     = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteNameInput, setDeleteNameInput]     = useState("");
  const [dangerLoading, setDangerLoading]         = useState(false);

  // Goal import modal (lazy import)
  const [showGoalImport, setShowGoalImport] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, invitesRes, accountsRes] = await Promise.all([
        fetch(`/api/teams/${teamId}`),
        fetch(`/api/teams/${teamId}/invites`),
        fetch(`/api/teams/${teamId}/accounts`),
      ]);
      if (!teamRes.ok) throw new Error("Failed to load team.");
      const teamData = await teamRes.json() as { team: TeamData; members: TeamMember[] };
      setTeam(teamData.team);
      setNameInput(teamData.team.name);
      setMembers(teamData.members ?? []);
      if (invitesRes.ok) {
        const d = await invitesRes.json() as { invites: PendingInvite[] };
        setInvites(d.invites ?? []);
      }
      if (accountsRes.ok) {
        const d = await accountsRes.json() as { accounts: SharedAccount[] };
        setSharedAccounts(d.accounts ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch plaid items for share picker (lazy)
  useEffect(() => {
    if (!showSharePicker || plaidItems.length > 0) return;
    fetch("/api/plaid/items")
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setPlaidItems(d.items ?? []))
      .catch(() => {});
  }, [showSharePicker, plaidItems.length]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function saveName() {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update team name.");
      setTeam(prev => prev ? { ...prev, name: nameInput.trim() } : prev);
      setEditingName(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save name.");
    } finally {
      setNameSaving(false);
    }
  }

  async function doRemoveMember(member: TeamMember) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${member.user_id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to remove member.");
      }
      setMembers(prev => prev.filter(m => m.user_id !== member.user_id));
      setConfirmRemoveMember(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member.");
      setConfirmRemoveMember(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function changeMemberRole(member: TeamMember, role: string) {
    try {
      await fetch(`/api/teams/${teamId}/members/${member.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setMembers(prev => prev.map(m => m.user_id === member.user_id ? { ...m, role } : m));
    } catch {
      setError("Failed to change role.");
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to send invite.");
      }
      setInviteEmail("");
      setInviteRole("team_member");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      // Refresh pending invites
      fetch(`/api/teams/${teamId}/invites`)
        .then(r => r.ok ? r.json() : { invites: [] })
        .then(d => setInvites(d.invites ?? []))
        .catch(() => {});
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invite.");
    } finally {
      setInviteSending(false);
    }
  }

  async function doCancelInvite(invite: PendingInvite) {
    setActionLoading(true);
    try {
      await fetch(`/api/teams/${teamId}/invites/${invite.id}`, { method: "DELETE" });
      setInvites(prev => prev.filter(i => i.id !== invite.id));
      setConfirmCancelInvite(null);
    } catch {
      setError("Failed to cancel invite.");
      setConfirmCancelInvite(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function doRemoveAccount(account: SharedAccount) {
    setActionLoading(true);
    try {
      await fetch(`/api/teams/${teamId}/accounts/${account.plaid_item_id}`, { method: "DELETE" });
      setSharedAccounts(prev => prev.filter(a => a.plaid_item_id !== account.plaid_item_id));
      setConfirmRemoveAccount(null);
    } catch {
      setError("Failed to remove account.");
      setConfirmRemoveAccount(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function doAddAccounts() {
    if (shareSelected.size === 0) { setShowSharePicker(false); return; }
    setShareAdding(true);
    try {
      await Promise.allSettled(
        [...shareSelected].map(itemId =>
          fetch(`/api/teams/${teamId}/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plaid_item_id: itemId }),
          })
        )
      );
      setShowSharePicker(false);
      setShareSelected(new Set());
      // Refresh accounts
      fetch(`/api/teams/${teamId}/accounts`)
        .then(r => r.ok ? r.json() : { accounts: [] })
        .then(d => setSharedAccounts(d.accounts ?? []))
        .catch(() => {});
    } catch {
      setError("Failed to add accounts.");
    } finally {
      setShareAdding(false);
    }
  }

  async function doTransferOwnership(newOwnerId: string) {
    setTransferLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_owner_id: newOwnerId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to transfer ownership.");
      }
      setShowTransfer(false);
      // Re-fetch to reflect new roles
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to transfer ownership.");
      setShowTransfer(false);
    } finally {
      setTransferLoading(false);
    }
  }

  async function doLeaveTeam() {
    setDangerLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to leave team.");
      }
      onTeamLeft?.();
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave team.");
      setShowLeaveConfirm(false);
    } finally {
      setDangerLoading(false);
    }
  }

  async function doDeleteTeam() {
    setDangerLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to delete team.");
      }
      onTeamDeleted?.();
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete team.");
      setShowDeleteConfirm(false);
    } finally {
      setDangerLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors mb-4">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const alreadySharedIds = new Set(sharedAccounts.map(a => a.plaid_item_id));
  const availableToShare = plaidItems.filter(i => !alreadySharedIds.has(i.item_id));

  return (
    <div className="p-5 space-y-4 overflow-y-auto pb-10">

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex items-center gap-2">
        <Users size={16} className="text-(--color-accent)" />
        <h1 className="text-[16px] font-semibold text-(--color-text-primary)">Team settings</h1>
      </div>

      {error && (
        <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </p>
      )}

      {/* ── Section 1: Team name ─────────────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={labelCls}>Team name</p>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className={inputCls}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameInput(team?.name ?? ""); } }}
            />
            <button onClick={saveName} disabled={nameSaving} className="text-green-400 hover:opacity-80 disabled:opacity-40 shrink-0"><Check size={15} /></button>
            <button onClick={() => { setEditingName(false); setNameInput(team?.name ?? ""); }} className="text-(--color-text-tertiary) hover:text-(--color-text-primary) shrink-0"><X size={14} /></button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-(--color-text-primary)">{team?.name}</span>
            {isAdmin && (
              <button onClick={() => setEditingName(true)} className="text-(--color-text-tertiary) hover:text-(--color-accent) transition-colors">
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Members ───────────────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={labelCls}>Members ({members.length})</p>
        {members.length === 0 ? (
          <p className="text-[13px] text-(--color-text-tertiary) italic">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const isSelf = m.user_id === userId;
              const canChangeRole = isAdmin && !isSelf && m.role !== "org_owner";
              const canRemove = (isAdmin && !isSelf && m.role !== "org_owner") || (isSelf && !isOwner);
              return (
                <div key={m.user_id} className="flex items-center justify-between gap-2 bg-(--color-elevated) rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-(--color-accent)/15 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-(--color-accent)">
                        {(m.email ?? m.user_id).slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-(--color-text-primary) truncate">{m.email ?? `…${m.user_id.slice(-8)}`}</p>
                      {isSelf && <p className="text-[10px] text-(--color-text-tertiary)">You</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canChangeRole ? (
                      <select
                        value={m.role}
                        onChange={e => changeMemberRole(m, e.target.value)}
                        className="bg-(--color-elevated) border border-(--color-border-subtle) rounded-lg px-1.5 py-1 text-[11px] outline-none text-(--color-text-secondary)"
                      >
                        {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${roleBadge(m.role)}`}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => setConfirmRemoveMember(m)}
                        className="text-(--color-text-tertiary) hover:text-red-400 transition-colors"
                        title={isSelf ? "Leave team" : "Remove member"}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invite form */}
        {isAdmin && (
          <div className="pt-2 border-t border-(--color-border-subtle)">
            {!showInviteForm ? (
              <button onClick={() => setShowInviteForm(true)} className="flex items-center gap-1.5 text-[12px] text-(--color-accent) hover:opacity-80 transition-opacity">
                <Plus size={13} /> Invite new member
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className={inputCls}
                    placeholder="email@example.com"
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendInvite(); if (e.key === "Escape") setShowInviteForm(false); }}
                  />
                  <select className={selectCls} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button
                    onClick={sendInvite}
                    disabled={inviteSending || !inviteEmail.trim()}
                    className="bg-(--color-accent) text-(--color-base) rounded-xl px-3 py-2 text-[12px] font-semibold shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {inviteSending ? "…" : "Send"}
                  </button>
                  <button onClick={() => setShowInviteForm(false)} className="text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
                {inviteError && <p className="text-[12px] text-red-400">{inviteError}</p>}
                {inviteSuccess && <p className="text-[12px] text-green-400 flex items-center gap-1"><Check size={12} /> Invite sent!</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 3: Pending invites ───────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={labelCls}>Pending invites</p>
        {invites.length === 0 ? (
          <p className="text-[13px] text-(--color-text-tertiary) italic">No pending invites.</p>
        ) : (
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between gap-2 bg-(--color-elevated) rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] text-(--color-text-primary) truncate">{inv.email}</p>
                  <p className="text-[10px] text-(--color-text-tertiary)">
                    <span className={`inline-block rounded px-1 py-0.5 mr-1 ${roleBadge(inv.role)}`}>{ROLE_LABELS[inv.role] ?? inv.role}</span>
                    Sent {fmt(inv.created_at)}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setConfirmCancelInvite(inv)}
                    className="text-[11px] text-(--color-text-tertiary) hover:text-red-400 transition-colors shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4: Shared accounts ───────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={labelCls}>Shared accounts</p>
        {sharedAccounts.length === 0 ? (
          <p className="text-[13px] text-(--color-text-tertiary) italic">No accounts shared yet.</p>
        ) : (
          <div className="space-y-2">
            {sharedAccounts.map(a => (
              <div key={a.plaid_item_id} className="flex items-center justify-between bg-(--color-elevated) rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={13} className="text-(--color-text-tertiary) shrink-0" />
                  <span className="text-[13px] text-(--color-text-primary) truncate">{a.institution_name ?? a.plaid_item_id}</span>
                </div>
                {isAdmin && (
                  <button onClick={() => setConfirmRemoveAccount(a)} className="text-(--color-text-tertiary) hover:text-red-400 transition-colors ml-2 shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="pt-2 border-t border-(--color-border-subtle)">
            {!showSharePicker ? (
              <button onClick={() => setShowSharePicker(true)} className="flex items-center gap-1.5 text-[12px] text-(--color-accent) hover:opacity-80 transition-opacity">
                <Plus size={13} /> Share an account
              </button>
            ) : (
              <div className="space-y-2">
                {availableToShare.length === 0 ? (
                  <p className="text-[12px] text-(--color-text-tertiary) italic">All accounts are already shared.</p>
                ) : (
                  <>
                    {availableToShare.map(item => (
                      <label key={item.item_id} className="flex items-center gap-2.5 bg-(--color-surface) rounded-xl px-3 py-2 cursor-pointer border border-transparent hover:border-(--color-border-subtle) transition-colors">
                        <input
                          type="checkbox"
                          checked={shareSelected.has(item.item_id)}
                          onChange={() => setShareSelected(prev => {
                            const next = new Set(prev);
                            next.has(item.item_id) ? next.delete(item.item_id) : next.add(item.item_id);
                            return next;
                          })}
                          className="accent-(--color-accent)"
                        />
                        <Building2 size={12} className="text-(--color-text-tertiary) shrink-0" />
                        <span className="text-[12px] text-(--color-text-primary) truncate">{item.institution_name ?? item.item_id}</span>
                      </label>
                    ))}
                    <div className="flex gap-2">
                      <button
                        onClick={doAddAccounts}
                        disabled={shareAdding || shareSelected.size === 0}
                        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-opacity"
                        style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
                      >
                        {shareAdding ? "Adding…" : `Add ${shareSelected.size > 0 ? shareSelected.size : ""} selected`}
                      </button>
                      <button onClick={() => { setShowSharePicker(false); setShareSelected(new Set()); }} className="text-[12px] text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors px-3 py-1.5">
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 5: Import goals ──────────────────────────────────────────── */}
      <div className={sectionCls}>
        <p className={labelCls}>Goals</p>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-(--color-text-secondary)">Import goals from your personal account.</p>
          <button
            onClick={() => setShowGoalImport(true)}
            className="flex items-center gap-1.5 text-[12px] text-(--color-accent) hover:opacity-80 transition-opacity shrink-0 ml-3"
          >
            <Target size={13} /> Import goals
          </button>
        </div>
      </div>

      {/* ── Section 6: Danger zone ───────────────────────────────────────────── */}
      <div className="border border-red-500/20 rounded-2xl p-4 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-red-400 font-medium">Danger zone</p>

        {/* Transfer ownership */}
        {isOwner && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-(--color-text-primary) font-medium">Transfer ownership</p>
              <p className="text-[11px] text-(--color-text-tertiary)">Hand off ownership to another member.</p>
            </div>
            <button
              onClick={() => setShowTransfer(true)}
              className="text-[12px] text-red-400 hover:text-red-300 transition-colors border border-red-500/30 rounded-xl px-3 py-1.5 shrink-0 ml-3"
            >
              Transfer
            </button>
          </div>
        )}

        {/* Leave team */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-(--color-text-primary) font-medium">Leave team</p>
            <p className="text-[11px] text-(--color-text-tertiary)">
              {isOwner ? "Transfer ownership before leaving." : "You'll lose access to team data."}
            </p>
          </div>
          <button
            onClick={() => !isOwner && setShowLeaveConfirm(true)}
            disabled={isOwner}
            title={isOwner ? "Transfer ownership before leaving" : undefined}
            className="text-[12px] text-red-400 hover:text-red-300 transition-colors border border-red-500/30 rounded-xl px-3 py-1.5 shrink-0 ml-3 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Leave
          </button>
        </div>

        {/* Delete team */}
        {isOwner && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-(--color-text-primary) font-medium">Delete team</p>
              <p className="text-[11px] text-(--color-text-tertiary)">Permanently delete {team?.name} and all its data.</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[12px] text-red-400 hover:text-red-300 transition-colors border border-red-500/30 rounded-xl px-3 py-1.5 shrink-0 ml-3"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm dialogs ──────────────────────────────────────────────────── */}

      {confirmRemoveMember && (
        <ConfirmDialog
          message={confirmRemoveMember.user_id === userId ? `Leave ${team?.name}?` : `Remove ${confirmRemoveMember.email ?? "this member"} from ${team?.name}?`}
          detail={confirmRemoveMember.user_id === userId ? "You'll lose access to team data." : "They'll lose access to team data."}
          confirmLabel={confirmRemoveMember.user_id === userId ? "Leave" : "Remove"}
          onCancel={() => setConfirmRemoveMember(null)}
          onConfirm={() => doRemoveMember(confirmRemoveMember)}
          loading={actionLoading}
        />
      )}

      {confirmCancelInvite && (
        <ConfirmDialog
          message={`Cancel invite to ${confirmCancelInvite.email}?`}
          detail="The invite link will stop working."
          confirmLabel="Cancel invite"
          onCancel={() => setConfirmCancelInvite(null)}
          onConfirm={() => doCancelInvite(confirmCancelInvite)}
          loading={actionLoading}
        />
      )}

      {confirmRemoveAccount && (
        <ConfirmDialog
          message={`Remove ${confirmRemoveAccount.institution_name ?? "this account"} from ${team?.name}?`}
          detail="Team members will lose access to this account's data."
          confirmLabel="Remove"
          onCancel={() => setConfirmRemoveAccount(null)}
          onConfirm={() => doRemoveAccount(confirmRemoveAccount)}
          loading={actionLoading}
        />
      )}

      {showLeaveConfirm && (
        <ConfirmDialog
          message={`Leave ${team?.name}?`}
          detail="You'll lose access to team data."
          confirmLabel="Leave"
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={doLeaveTeam}
          loading={dangerLoading}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-80 bg-black/50 px-4">
          <div className="bg-(--color-elevated) border border-(--color-border-default) rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-(--color-text-primary)">Delete {team?.name}?</p>
                <p className="text-[13px] text-(--color-text-secondary) mt-1">This will permanently delete the team and all its data. Type the team name to confirm.</p>
              </div>
            </div>
            <input
              className={`${inputCls} mb-4`}
              placeholder={team?.name ?? "Team name"}
              value={deleteNameInput}
              onChange={e => setDeleteNameInput(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteNameInput(""); }} className="px-4 py-2 text-[13px] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors border border-(--color-border-default) rounded-xl">
                Cancel
              </button>
              <button
                onClick={doDeleteTeam}
                disabled={dangerLoading || deleteNameInput !== team?.name}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors rounded-xl disabled:opacity-40"
              >
                {dangerLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <TransferDialog
          members={members}
          currentUserId={userId}
          onCancel={() => setShowTransfer(false)}
          onConfirm={doTransferOwnership}
          loading={transferLoading}
        />
      )}

      {/* Goal import modal — lazy */}
      {showGoalImport && (
        <GoalImportModalWrapper
          teamId={teamId}
          userId={userId}
          onClose={() => setShowGoalImport(false)}
        />
      )}
    </div>
  );
}

// Lazy wrapper so GoalImportModal isn't bundled until needed
function GoalImportModalWrapper({ teamId, userId, onClose }: { teamId: string; userId: string; onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType<{ teamId: string; userId: string; onClose: () => void; onImported: (n: number) => void }> | null>(null);

  useEffect(() => {
    import("./GoalImportModal").then(m => setComp(() => m.default));
  }, []);

  if (!Comp) return null;
  return <Comp teamId={teamId} userId={userId} onClose={onClose} onImported={() => {}} />;
}
