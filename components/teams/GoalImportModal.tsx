"use client";

import { useEffect, useState } from "react";
import { X, Check, Target } from "lucide-react";

interface GoalImportModalProps {
  teamId: string;
  userId: string;
  onClose: () => void;
  onImported: (count: number) => void;
}

interface PersonalGoal {
  id: string;
  name: string;
  icon: string;
  target_amount: number | null;
}

interface TeamGoal {
  imported_from_goal_id: string | null;
}

export default function GoalImportModal({ teamId, userId, onClose, onImported }: GoalImportModalProps) {
  const [personalGoals, setPersonalGoals]     = useState<PersonalGoal[]>([]);
  const [importedIds, setImportedIds]         = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());
  const [loading, setLoading]                 = useState(true);
  const [importing, setImporting]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/goals?context_type=personal&context_id=${userId}`).then(r => r.ok ? r.json() : { goals: [] }),
      fetch(`/api/goals?context_type=team&context_id=${teamId}`).then(r => r.ok ? r.json() : { goals: [] }),
    ])
      .then(([personalData, teamData]) => {
        setPersonalGoals((personalData.goals ?? []) as PersonalGoal[]);
        const already = new Set<string>(
          ((teamData.goals ?? []) as TeamGoal[])
            .map(g => g.imported_from_goal_id)
            .filter((id): id is string => id != null)
        );
        setImportedIds(already);
      })
      .catch(() => setError("Failed to load goals."))
      .finally(() => setLoading(false));
  }, [userId, teamId]);

  function toggle(id: string) {
    if (importedIds.has(id)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const available = personalGoals.filter(g => !importedIds.has(g.id));
    if (selectedIds.size === available.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(available.map(g => g.id)));
    }
  }

  async function doImport() {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      let imported = 0;
      for (const goalId of selectedIds) {
        const res = await fetch(`/api/teams/${teamId}/goals/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personal_goal_id: goalId }),
        });
        if (res.ok) imported++;
      }
      onImported(imported);
      onClose();
    } catch {
      setError("Some goals may not have imported.");
    } finally {
      setImporting(false);
    }
  }

  const available = personalGoals.filter(g => !importedIds.has(g.id));

  return (
    <div className="fixed inset-0 flex items-center justify-center z-60 bg-black/50 px-4">
      <div className="bg-(--color-elevated) border border-(--color-border-default) rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border-subtle)">
          <div className="flex items-center gap-2">
            <Target size={15} className="text-(--color-accent)" />
            <span className="text-[14px] font-semibold text-(--color-text-primary)">Import goals from personal</span>
          </div>
          <button onClick={onClose} className="text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && <p className="text-[13px] text-red-400">{error}</p>}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-11 skeleton rounded-xl" />)}
            </div>
          ) : personalGoals.length === 0 ? (
            <p className="text-[13px] text-(--color-text-tertiary) italic text-center py-8">No personal goals to import.</p>
          ) : (
            <>
              {available.length > 0 && (
                <button onClick={toggleAll} className="text-[12px] text-(--color-accent) hover:opacity-80 transition-opacity">
                  {selectedIds.size === available.length ? "Deselect all" : "Select all"}
                </button>
              )}
              <div className="space-y-2">
                {personalGoals.map(g => {
                  const alreadyIn = importedIds.has(g.id);
                  const checked   = selectedIds.has(g.id);
                  return (
                    <label
                      key={g.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                        alreadyIn
                          ? "bg-(--color-surface) border-(--color-border-subtle) opacity-60 cursor-default"
                          : "bg-(--color-surface) border-transparent hover:border-(--color-border-subtle) cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={alreadyIn ? true : checked}
                        disabled={alreadyIn}
                        onChange={() => toggle(g.id)}
                        className="accent-(--color-accent) w-4 h-4 shrink-0"
                      />
                      <span className="text-lg shrink-0">{g.icon}</span>
                      <span className="text-[13px] text-(--color-text-primary) flex-1 truncate">{g.name}</span>
                      {alreadyIn ? (
                        <span className="text-[10px] text-(--color-text-tertiary) bg-(--color-border-subtle) rounded px-1.5 py-0.5 shrink-0">Already in team</span>
                      ) : g.target_amount != null ? (
                        <span className="text-[12px] text-(--color-text-tertiary) shrink-0">${g.target_amount.toLocaleString()}</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-(--color-border-subtle)">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors border border-(--color-border-default) rounded-xl">
            Cancel
          </button>
          <button
            onClick={doImport}
            disabled={importing || selectedIds.size === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl disabled:opacity-40 transition-opacity"
            style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
          >
            {importing ? "Importing…" : (
              <><Check size={13} /> Import {selectedIds.size > 0 ? selectedIds.size : ""} selected</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
