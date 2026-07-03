"use client";

import { useEffect, useState } from "react";
import { X, Check, Plus, Trash2, Users, Building2, Target } from "lucide-react";

interface TeamSetupWizardProps {
  onComplete: (team: { id: string; name: string }) => void;
  onClose: () => void;
  userId: string;
}

interface Invite { email: string; role: string }
interface PlaidItem { item_id: string; institution_name: string | null }
interface PersonalGoal { id: string; name: string; icon: string; target_amount: number | null }

const ROLE_OPTIONS = [
  { value: "team_member",  label: "Member"  },
  { value: "team_manager", label: "Manager" },
];

export default function TeamSetupWizard({ onComplete, onClose, userId }: TeamSetupWizardProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const [step, setStep]       = useState<1 | 2 | 3 | 4 | 5>(1);
  const [anim, setAnim]       = useState<"wizard-enter-forward" | "wizard-enter-back">("wizard-enter-forward");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Step 1
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId]     = useState<string | null>(null);

  // Step 2
  const [invites, setInvites]       = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("team_member");
  const [invitesSent, setInvitesSent] = useState(0);

  // Step 3 — goal import
  const [personalGoals, setPersonalGoals]     = useState<PersonalGoal[]>([]);
  const [goalsLoading, setGoalsLoading]       = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(new Set());
  const [goalsImported, setGoalsImported]     = useState(0);

  // Step 4 — accounts
  const [plaidItems, setPlaidItems]           = useState<PlaidItem[]>([]);
  const [itemsLoading, setItemsLoading]       = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [accountsShared, setAccountsShared]   = useState(0);

  // Fetch goals when entering step 3
  useEffect(() => {
    if (step !== 3 || !userId) return;
    setGoalsLoading(true);
    fetch(`/api/goals?context_type=personal&context_id=${userId}`)
      .then(r => r.ok ? r.json() : { goals: [] })
      .then(d => setPersonalGoals((d.goals ?? []) as PersonalGoal[]))
      .catch(() => setPersonalGoals([]))
      .finally(() => setGoalsLoading(false));
  }, [step, userId]);

  // Fetch plaid items when entering step 4
  useEffect(() => {
    if (step !== 4) return;
    setItemsLoading(true);
    fetch("/api/plaid/items")
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setPlaidItems((d.items ?? []) as PlaidItem[]))
      .catch(() => setPlaidItems([]))
      .finally(() => setItemsLoading(false));
  }, [step]);

  function advance() {
    setAnim("wizard-enter-forward");
    setStep(s => (s + 1) as 1 | 2 | 3 | 4 | 5);
    setError(null);
  }

  function back() {
    setAnim("wizard-enter-back");
    setStep(s => (s - 1) as 1 | 2 | 3 | 4 | 5);
    setError(null);
  }

  // Step 1 — create team
  async function handleStep1Next() {
    if (!teamName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to create team.");
      }
      const data = await res.json() as { team: { id: string; name: string } };
      setTeamId(data.team.id);
      advance();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create team.");
    } finally {
      setLoading(false);
    }
  }

  function addInvite() {
    if (!inviteEmail.trim()) return;
    setInvites(prev => [...prev, { email: inviteEmail.trim(), role: inviteRole }]);
    setInviteEmail("");
    setInviteRole("team_member");
  }

  // Step 2 — fire invites then advance
  async function handleStep2Next() {
    if (!teamId || invites.length === 0) { advance(); return; }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        invites.map(inv =>
          fetch(`/api/teams/${teamId}/invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: inv.email, role: inv.role }),
          })
        )
      );
      setInvitesSent(results.filter(r => r.status === "fulfilled").length);
      advance();
    } catch {
      setError("Some invites may not have sent.");
    } finally {
      setLoading(false);
    }
  }

  function toggleGoal(id: string) {
    setSelectedGoalIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllGoals() {
    if (selectedGoalIds.size === personalGoals.length) {
      setSelectedGoalIds(new Set());
    } else {
      setSelectedGoalIds(new Set(personalGoals.map(g => g.id)));
    }
  }

  // Step 3 — fire goal imports then advance
  async function handleStep3Next() {
    if (!teamId || selectedGoalIds.size === 0) { advance(); return; }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        [...selectedGoalIds].map(goalId =>
          fetch(`/api/teams/${teamId}/goals/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personal_goal_id: goalId }),
          })
        )
      );
      setGoalsImported(results.filter(r => r.status === "fulfilled").length);
      advance();
    } catch {
      setError("Some goals may not have imported.");
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(itemId: string) {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }

  // Step 4 — fire account shares then advance
  async function handleStep4Next() {
    if (!teamId || selectedItemIds.size === 0) { advance(); return; }
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        [...selectedItemIds].map(itemId =>
          fetch(`/api/teams/${teamId}/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plaid_item_id: itemId }),
          })
        )
      );
      setAccountsShared(results.filter(r => r.status === "fulfilled").length);
      advance();
    } catch {
      setError("Some accounts may not have shared.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "bg-(--color-elevated) border border-(--color-border-default) rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-(--color-accent)/60 text-(--color-text-primary) w-full placeholder:text-(--color-text-tertiary)";
  const selectCls = "bg-(--color-elevated) border border-(--color-border-default) rounded-xl px-2.5 py-2.5 text-[13px] outline-none text-(--color-text-primary) shrink-0";

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[28px] font-bold text-(--color-text-primary) leading-tight">What&apos;s your team called?</p>
              <p className="text-[14px] text-(--color-text-secondary) mt-2">A household, a business, any group working toward shared financial goals.</p>
            </div>
            <div>
              <p className="text-[10px] text-(--color-text-tertiary) uppercase tracking-widest mb-2">Team name</p>
              <input
                autoFocus
                className={inputCls}
                placeholder="Team name"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleStep1Next(); }}
              />
            </div>
            {error && <p className="text-[13px] text-red-400">{error}</p>}
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[28px] font-bold text-(--color-text-primary) leading-tight">Who&apos;s on this team?</p>
              <p className="text-[14px] text-(--color-text-secondary) mt-2">Invite by email. They&apos;ll get a link to join. Add more anytime in settings.</p>
            </div>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="email@example.com"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addInvite(); }}
              />
              <select className={selectCls} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                onClick={addInvite}
                className="bg-(--color-accent) text-(--color-base) rounded-xl px-3 py-2.5 text-[13px] font-semibold flex items-center gap-1 shrink-0 hover:opacity-90 transition-opacity"
              >
                <Plus size={14} />
              </button>
            </div>
            {invites.length > 0 ? (
              <div className="space-y-2">
                {invites.map((inv, i) => (
                  <div key={i} className="flex items-center justify-between bg-(--color-elevated) rounded-xl px-3 py-2.5 border border-(--color-border-subtle)">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] text-(--color-text-primary) truncate">{inv.email}</span>
                      <span className="text-[10px] text-(--color-text-tertiary) bg-(--color-border-subtle) rounded px-1.5 py-0.5 shrink-0">
                        {ROLE_OPTIONS.find(o => o.value === inv.role)?.label}
                      </span>
                    </div>
                    <button onClick={() => setInvites(prev => prev.filter((_, j) => j !== i))} className="text-(--color-text-tertiary) hover:text-red-400 transition-colors ml-2 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-(--color-text-tertiary) italic">No invites added yet.</p>
            )}
            {error && <p className="text-[13px] text-red-400">{error}</p>}
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[28px] font-bold text-(--color-text-primary) leading-tight">Share your goals with the team?</p>
              <p className="text-[14px] text-(--color-text-secondary) mt-2">A team copy will be created. Your personal goals stay untouched.</p>
            </div>
            {goalsLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
              </div>
            ) : personalGoals.length === 0 ? (
              <p className="text-[13px] text-(--color-text-tertiary) italic">No personal goals to import.</p>
            ) : (
              <div className="space-y-2">
                <button onClick={toggleAllGoals} className="text-[12px] text-(--color-accent) hover:opacity-80 transition-opacity self-start">
                  {selectedGoalIds.size === personalGoals.length ? "Deselect all" : "Select all"}
                </button>
                {personalGoals.map(g => (
                  <label key={g.id} className="flex items-center gap-3 bg-(--color-elevated) rounded-xl px-3 py-2.5 cursor-pointer border border-transparent hover:border-(--color-border-subtle) transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedGoalIds.has(g.id)}
                      onChange={() => toggleGoal(g.id)}
                      className="accent-(--color-accent) w-4 h-4 shrink-0"
                    />
                    <span className="text-lg shrink-0">{g.icon}</span>
                    <span className="text-[13px] text-(--color-text-primary) flex-1 truncate">{g.name}</span>
                    {g.target_amount != null && (
                      <span className="text-[12px] text-(--color-text-tertiary) shrink-0">
                        ${g.target_amount.toLocaleString()}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className="text-[12px] text-(--color-text-tertiary) bg-(--color-elevated) rounded-xl px-3 py-2.5 border border-(--color-border-subtle)">
              💡 Goals you share will appear in both personal and team accounts.
            </p>
            {error && <p className="text-[13px] text-red-400">{error}</p>}
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[28px] font-bold text-(--color-text-primary) leading-tight">Connect team finances</p>
              <p className="text-[14px] text-(--color-text-secondary) mt-2">Share an existing account or connect a new joint account.</p>
            </div>
            {itemsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
              </div>
            ) : plaidItems.length === 0 ? (
              <p className="text-[13px] text-(--color-text-tertiary) italic">No connected accounts found.</p>
            ) : (
              <div className="space-y-2">
                {plaidItems.map(item => (
                  <label key={item.item_id} className="flex items-center gap-3 bg-(--color-elevated) rounded-xl px-3 py-2.5 cursor-pointer border border-transparent hover:border-(--color-border-subtle) transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.item_id)}
                      onChange={() => toggleItem(item.item_id)}
                      className="accent-(--color-accent) w-4 h-4 shrink-0"
                    />
                    <Building2 size={14} className="text-(--color-text-tertiary) shrink-0" />
                    <span className="text-[13px] text-(--color-text-primary) flex-1 truncate">{item.institution_name ?? item.item_id}</span>
                  </label>
                ))}
              </div>
            )}
            {error && <p className="text-[13px] text-red-400">{error}</p>}
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-[28px] font-bold text-(--color-text-primary) leading-tight">{teamName} is ready</p>
              <p className="text-[14px] text-(--color-text-secondary) mt-2">Your team has been created.</p>
            </div>
            <div className="bg-(--color-elevated) rounded-xl border border-(--color-border-subtle) divide-y divide-(--color-border-subtle) overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-(--color-text-secondary)">Members invited</span>
                <span className="text-[13px] font-semibold text-(--color-text-primary)">{invitesSent}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-(--color-text-secondary)">Goals shared</span>
                <span className="text-[13px] font-semibold text-(--color-text-primary)">{goalsImported}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] text-(--color-text-secondary)">Accounts connected</span>
                <span className="text-[13px] font-semibold text-(--color-text-primary)">{accountsShared}</span>
              </div>
            </div>
          </div>
        );
    }
  }

  function renderRightPanel() {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="w-24 h-24 rounded-3xl bg-(--color-accent)/10 border border-(--color-accent)/20 flex items-center justify-center">
              <Users size={40} className="text-(--color-accent)" />
            </div>
            {teamName ? (
              <p className="text-[22px] font-bold text-(--color-text-primary)">{teamName}</p>
            ) : (
              <p className="text-[16px] text-(--color-text-tertiary)">Name your team to get started</p>
            )}
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="flex -space-x-3">
              {["A", "B", "C"].map((l, i) => (
                <div key={i} className="w-14 h-14 rounded-full border-2 border-(--color-elevated) bg-(--color-accent)/20 flex items-center justify-center">
                  <span className="text-[14px] font-bold text-(--color-accent)">{l}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[18px] font-bold text-(--color-text-primary)">{teamName}</p>
              <p className="text-[13px] text-(--color-text-tertiary) mt-1">{invites.length > 0 ? `${invites.length} invite${invites.length !== 1 ? "s" : ""} queued` : "Invite your team members"}</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-(--color-elevated) border border-(--color-border-default) flex items-center justify-center">
                <Target size={32} className="text-(--color-text-tertiary)" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-(--color-accent) flex items-center justify-center">
                <Users size={14} className="text-(--color-base)" />
              </div>
            </div>
            <div>
              <p className="text-[18px] font-bold text-(--color-text-primary)">Shared goals</p>
              <p className="text-[13px] text-(--color-text-tertiary) mt-1">Personal goals stay untouched</p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="flex gap-4">
              {["USAA", "Chase", "Vanguard"].map((name, i) => (
                <div key={i} className="w-14 h-14 rounded-2xl bg-(--color-elevated) border border-(--color-border-default) flex items-center justify-center">
                  <Building2 size={22} className="text-(--color-text-tertiary)" />
                </div>
              ))}
            </div>
            <div>
              <p className="text-[18px] font-bold text-(--color-text-primary)">Shared accounts</p>
              <p className="text-[13px] text-(--color-text-tertiary) mt-1">Team members see shared balances</p>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="w-24 h-24 rounded-full bg-(--color-accent)/15 border border-(--color-accent)/30 flex items-center justify-center">
              <Check size={40} className="text-(--color-accent)" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-(--color-text-primary)">{teamName}</p>
              <p className="text-[13px] text-(--color-text-tertiary) mt-1">Ready to go</p>
            </div>
          </div>
        );
    }
  }

  function renderCTA() {
    if (step === 1) return (
      <button
        onClick={handleStep1Next}
        disabled={loading || !teamName.trim()}
        className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-opacity disabled:opacity-30"
        style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
      >
        {loading ? "Creating…" : "Next →"}
      </button>
    );
    if (step === 2) return (
      <button
        onClick={handleStep2Next}
        disabled={loading}
        className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-opacity disabled:opacity-30"
        style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
      >
        {loading ? "Sending…" : "Next →"}
      </button>
    );
    if (step === 3) return (
      <button
        onClick={handleStep3Next}
        disabled={loading}
        className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-opacity disabled:opacity-30"
        style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
      >
        {loading ? "Importing…" : "Next →"}
      </button>
    );
    if (step === 4) return (
      <button
        onClick={handleStep4Next}
        disabled={loading}
        className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-opacity disabled:opacity-30"
        style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
      >
        {loading ? "Sharing…" : "Next →"}
      </button>
    );
    if (step === 5 && teamId) return (
      <>
        <button
          onClick={() => onComplete({ id: teamId, name: teamName })}
          className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-opacity"
          style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
        >
          Go to {teamName} →
        </button>
      </>
    );
  }

  const skipLabel = step === 2 ? "Skip — invite later" : step === 3 ? "Skip — set up goals later" : step === 4 ? "Skip — add accounts later" : null;

  return (
    <div className="fixed inset-0 grid grid-cols-1 md:grid-cols-2" style={{ zIndex: 70 }}>

      {/* LEFT — form + nav */}
      <div className="flex flex-col justify-between px-10 py-10 bg-(--color-base) overflow-y-auto">

        {/* Top — close + dots */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }, (_, i) => {
              const isActive = step === i + 1;
              const isDone   = step > i + 1;
              return (
                <div
                  key={i}
                  style={{
                    width:        isActive ? 8 : 6,
                    height:       isActive ? 8 : 6,
                    borderRadius: "50%",
                    background:   isActive || isDone ? "var(--color-accent)" : "transparent",
                    border:       isActive || isDone ? "none" : "1px solid var(--color-border-strong)",
                    transition:   "all 200ms",
                  }}
                />
              );
            })}
          </div>
          <button onClick={onClose} className="text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Animated step content */}
        <div key={step} className={`flex-1 flex flex-col justify-center py-8 ${anim}`}>
          {renderStep()}
        </div>

        {/* Nav */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            {step > 1 && step < 5 && (
              <button
                onClick={back}
                className="flex-1 py-2.5 rounded-xl text-[14px] border border-(--color-border-default) text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
              >
                ← Back
              </button>
            )}
            {renderCTA()}
          </div>
          {skipLabel && step < 5 && (
            <button
              onClick={advance}
              className="text-center text-[12px] text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"
            >
              {skipLabel}
            </button>
          )}
        </div>
      </div>

      {/* RIGHT — illustration */}
      <div className="hidden md:flex flex-col items-center justify-center h-full bg-(--color-elevated)">
        {renderRightPanel()}
      </div>
    </div>
  );
}
