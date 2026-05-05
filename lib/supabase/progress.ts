import { createClient } from "./client";

export type ProgressRecord = {
  tabsVisited: string[];
  quizPassed: boolean;
  quizScore?: number;
};

export type AllProgress = Record<string, ProgressRecord>;

export function isChapterComplete(p: ProgressRecord): boolean {
  return p.quizPassed;
}

export async function loadAllProgress(): Promise<AllProgress> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  // Select only the columns that always exist.
  // quiz_score is loaded separately so a missing column never breaks load.
  const { data, error } = await supabase
    .from("chapter_progress")
    .select("chapter_id, tabs_visited, quiz_passed")
    .eq("user_id", user.id);

  if (error) {
    console.error("[progress] loadAllProgress failed:", error.message);
    return {};
  }
  if (!data) return {};

  const base = Object.fromEntries(
    data.map((row) => [
      row.chapter_id,
      {
        tabsVisited: row.tabs_visited ?? [],
        quizPassed: row.quiz_passed ?? false,
      },
    ])
  );

  // Try to load quiz scores; skip silently if column not yet added.
  const { data: scoreRows } = await supabase
    .from("chapter_progress")
    .select("chapter_id, quiz_score")
    .eq("user_id", user.id);

  if (scoreRows) {
    for (const row of scoreRows) {
      if (base[row.chapter_id] && row.quiz_score != null) {
        base[row.chapter_id].quizScore = row.quiz_score;
      }
    }
  }

  return base;
}

export async function saveProgress(
  chapterId: string,
  record: ProgressRecord
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // ── Step 1: save completion status (uses only columns that always exist) ──
  const { error } = await supabase.from("chapter_progress").upsert(
    {
      user_id: user.id,
      chapter_id: chapterId,
      tabs_visited: record.tabsVisited,
      quiz_passed: record.quizPassed,
      completed_at: record.quizPassed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chapter_id" }
  );

  if (error) {
    console.error("[progress] saveProgress failed:", error.message);
    return;
  }

  // ── Step 2: save score (requires quiz_score column — run SQL migration) ──
  if (record.quizScore !== undefined) {
    const { error: scoreError } = await supabase
      .from("chapter_progress")
      .update({ quiz_score: record.quizScore })
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId);

    if (scoreError) {
      console.warn(
        "[progress] quiz_score not saved — run: " +
          "ALTER TABLE chapter_progress ADD COLUMN IF NOT EXISTS quiz_score int;",
        scoreError.message
      );
    }
  }
}
