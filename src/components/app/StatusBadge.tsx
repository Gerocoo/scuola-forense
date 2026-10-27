import type { AssignmentStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_LABEL_TEACHER } from "@/lib/format";

const STYLE: Record<AssignmentStatus, string> = {
  assegnato: "bg-ambra-soft text-ambra",
  consegnato: "bg-line-soft text-slate",
  in_correzione: "bg-line-soft text-slate",
  corretto: "bg-codice-soft text-codice",
};

const STYLE_TEACHER: Record<AssignmentStatus, string> = {
  assegnato: "bg-line-soft text-slate",
  consegnato: "bg-ceralacca-soft text-ceralacca",
  in_correzione: "bg-ambra-soft text-ambra",
  corretto: "bg-codice-soft text-codice",
};

export function StatusBadge({ status, view = "student" }: { status: AssignmentStatus; view?: "student" | "teacher" }) {
  const label = view === "teacher" ? STATUS_LABEL_TEACHER[status] : STATUS_LABEL[status];
  const style = view === "teacher" ? STYLE_TEACHER[status] : STYLE[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${style}`}>{label}</span>;
}
