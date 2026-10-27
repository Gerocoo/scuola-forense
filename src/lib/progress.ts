import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assignment, Lesson, LessonProgress } from "./types";

/** Un'esercitazione conta come completata quando il discente l'ha consegnata. */
export const DONE_STATUSES: Assignment["status"][] = ["consegnato", "in_correzione", "corretto"];

export const BUCKETS = 100;
export const EMPTY_BUCKETS = "0".repeat(BUCKETS);

export function countBuckets(b: string) {
  let n = 0;
  for (const c of b) if (c === "1") n++;
  return n;
}

/** Unione di due mappe di visione: un tratto visto resta visto. */
export function mergeBuckets(a: string, b: string) {
  let out = "";
  for (let i = 0; i < BUCKETS; i++) out += a[i] === "1" || b[i] === "1" ? "1" : "0";
  return out;
}

export type PathStep = {
  lesson: Lesson;
  index: number;
  percent: number;
  buckets: string;
  position: number;
  hasVideo: boolean;
  videoDone: boolean;
  exercises: Pick<Assignment, "id" | "title" | "status">[];
  exercisesDone: number;
  completed: boolean;
  unlocked: boolean;
  /** se bloccata: la lezione da completare prima */
  blockedBy: PathStep | null;
};

/**
 * Percorso a tappe delle lezioni registrate, nell'ordine stabilito dal docente.
 * Una lezione è completata quando il video è visto al 100% e tutte le esercitazioni
 * collegate sono consegnate. La successiva si apre solo se la precedente è completata,
 * a meno che il docente abbia disattivato lo sblocco progressivo per quella lezione.
 */
export function buildPath(
  lessons: Lesson[],
  progress: LessonProgress[],
  assignments: Pick<Assignment, "id" | "title" | "status" | "lesson_id">[],
): PathStep[] {
  const ordered = lessons
    .filter((l) => l.kind === "registrata")
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));

  const steps: PathStep[] = [];
  for (const [index, lesson] of ordered.entries()) {
    const p = progress.find((x) => x.lesson_id === lesson.id);
    const hasVideo = !!lesson.video_url || !!lesson.bunny_video_id;
    const percent = p?.percent ?? 0;
    const videoDone = !hasVideo || !!p?.completed_at || percent >= 100;
    const exercises = assignments.filter((a) => a.lesson_id === lesson.id);
    const exercisesDone = exercises.filter((a) => DONE_STATUSES.includes(a.status)).length;
    const prev = steps[index - 1];
    const unlocked = index === 0 || !lesson.sequential || !!prev?.completed;
    steps.push({
      lesson,
      index,
      percent: hasVideo ? percent : 100,
      buckets: p?.buckets ?? EMPTY_BUCKETS,
      position: p?.position_seconds ?? 0,
      hasVideo,
      videoDone,
      exercises,
      exercisesDone,
      completed: videoDone && exercisesDone === exercises.length,
      unlocked,
      blockedBy: unlocked ? null : firstIncomplete(steps),
    });
  }
  return steps;
}

function firstIncomplete(steps: PathStep[]) {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].completed) return steps[i + 1] ?? null;
  }
  return steps[0] ?? null;
}

/** Carica lezioni visibili, progresso ed esercitazioni del discente e costruisce il percorso. */
export async function loadPath(supabase: SupabaseClient, userId: string) {
  const [{ data: lessons }, { data: progress }, { data: assignments }] = await Promise.all([
    supabase.from("lessons").select("*").eq("kind", "registrata").eq("published", true).returns<Lesson[]>(),
    supabase.from("lesson_progress").select("*").eq("user_id", userId).returns<LessonProgress[]>(),
    supabase
      .from("assignments")
      .select("id, title, status, lesson_id")
      .eq("student_id", userId)
      .not("lesson_id", "is", null)
      .returns<Pick<Assignment, "id" | "title" | "status" | "lesson_id">[]>(),
  ]);
  return buildPath(lessons ?? [], progress ?? [], assignments ?? []);
}
