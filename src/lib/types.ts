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
}

export interface Enrollment {
  id: string;
  user_id: string;
  package_id: string;
  status: "active" | "expired" | "refunded";
  amount_cents: number;
  currency: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
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
