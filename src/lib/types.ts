export type Role = "student" | "teacher" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: Role;
  bio: string | null;
  created_at: string;
  /** Gestore tecnico della piattaforma: non può essere modificato né eliminato dal sito. */
  is_super?: boolean;
  exam_subject?: "civile" | "penale" | "amministrativo" | null;
}

export interface Package {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  period_label: string;
  starts_on: string | null;
  ends_on: string | null;
  access_until: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  promo_label: string | null;
  promo_until: string | null;
  features: string[];
  highlight: boolean;
  seats: number | null;
  active: boolean;
  sort: number;
  subject?: "civile" | "penale" | "amministrativo" | null;
  promise_recorded_month?: number | null;
  promise_live_month?: number | null;
  promise_exercises_month?: number | null;
  product?: "corso" | "lezioni" | "correzioni" | "simulazione" | "abbonamento" | "accessorio";
  credit_minutes?: number;
  credit_corrections?: number;
  includes_oral?: boolean;
  includes_archive?: boolean;
  duration_days?: number | null;
}

export interface Enrollment {
  id: string;
  user_id: string;
  package_id: string;
  status: "active" | "expired" | "refunded" | "pending";
  amount_cents: number;
  currency: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  payment_method?: "stripe" | "bonifico" | "contanti" | "pos" | "gratuito" | "altro" | null;
  payment_reference?: string | null;
  paid_at?: string | null;
  payment_note?: string | null;
  package?: Pick<Package, "title" | "period_label" | "slug"> | null;
}

export type LessonKind = "registrata" | "in_presenza";

export interface Lesson {
  id: string;
  kind: LessonKind;
  title: string;
  summary: string;
  video_url: string | null;
  scheduled_at: string | null;
  location: string | null;
  meeting_url: string | null;
  duration_min: number | null;
  package_ids: string[];
  published: boolean;
  teacher_id: string | null;
  sort: number;
  created_at: string;
  bunny_video_id: string | null;
  video_status: VideoStatus;
  capacity: number | null;
  booking_enabled: boolean;
  reminder_sent_at: string | null;
  sequential: boolean;
}

export type VideoStatus = "none" | "uploading" | "processing" | "ready" | "error";

export interface Booking {
  id: string;
  lesson_id: string;
  user_id: string;
  status: "confermato" | "annullato";
  created_at: string;
}

export interface StoredFile {
  id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
}

export type AssignmentKind = "parere" | "atto" | "esercizio" | "documento";
export type AssignmentStatus = "assegnato" | "consegnato" | "in_correzione" | "corretto";
export type FileRole = "traccia" | "svolgimento" | "correzione";

export interface Assignment {
  id: string;
  batch_id: string;
  teacher_id: string;
  student_id: string;
  kind: AssignmentKind;
  title: string;
  instructions: string;
  due_at: string | null;
  status: AssignmentStatus;
  submitted_at: string | null;
  corrected_at: string | null;
  created_at: string;
  lesson_id: string | null;
  package_id?: string | null;
  opens_at?: string | null;
  timed?: boolean;
}

export interface CourseExercise {
  id: string;
  package_id: string;
  teacher_id: string | null;
  kind: AssignmentKind;
  title: string;
  instructions: string;
  due_at: string | null;
  lesson_id: string | null;
  files: UploadedMeta[];
  created_at: string;
  opens_at?: string | null;
  timed?: boolean;
  solution?: string;
  common_errors?: string;
  review_url?: string | null;
  solution_files?: UploadedMeta[];
  collective_published?: boolean;
}

export interface AssignmentFile extends StoredFile {
  assignment_id: string;
  role: FileRole;
  uploaded_by: string;
}

export interface Review {
  assignment_id: string;
  feedback: string;
  grade: string | null;
  updated_at: string;
  scores?: Record<string, number> | null;
  total?: number | null;
}

export interface Message {
  id: string;
  student_id: string;
  teacher_id: string;
  sender_id: string;
  assignment_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface UploadedMeta {
  path: string;
  name: string;
  size: number;
  type: string;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export interface LessonProgress {
  lesson_id: string;
  user_id: string;
  buckets: string;
  percent: number;
  position_seconds: number;
  duration_seconds: number | null;
  completed_at: string | null;
  updated_at: string;
}
