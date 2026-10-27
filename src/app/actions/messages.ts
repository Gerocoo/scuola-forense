"use server";

import { revalidatePath } from "next/cache";
import { requireUser, isStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, escapeHtml, notify } from "@/lib/notify";
import { siteUrl } from "@/lib/stripe";

export type MessageState = { ok: boolean; error?: string; sentAt?: number };

export async function sendMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const { supabase, user, profile } = await requireUser();
  const other = String(formData.get("other") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const assignmentId = String(formData.get("assignment_id") ?? "") || null;

  if (!body) return { ok: false, error: "Scrivi un messaggio prima di inviarlo." };
  if (body.length > 8000) return { ok: false, error: "Il messaggio è troppo lungo (massimo 8000 caratteri)." };

  const staff = isStaff(profile);
  const studentId = staff ? other : user.id;
  const teacherId = staff ? user.id : other;

  // Evita di inviare un'email per ogni messaggio: solo se il destinatario ha già letto i precedenti.
  const { count: pendingUnread } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("sender_id", user.id)
    .is("read_at", null);

  const { error } = await supabase.from("messages").insert({
    student_id: studentId,
    teacher_id: teacherId,
    sender_id: user.id,
    assignment_id: assignmentId,
    body,
  });

  if (error) {
    console.error("[sendMessage]", error);
    return {
      ok: false,
      error: staff
        ? "Messaggio non inviato. Riprova."
        : "Messaggio non inviato. Per scrivere ai docenti serve un corso attivo.",
    };
  }

  if (!pendingUnread) {
    const { data: recipient } = await createAdminClient().from("profiles").select("email, full_name").eq("id", other).single();
    if (recipient?.email) {
      const href = staff ? `${siteUrl()}/area/messaggi/${user.id}` : `${siteUrl()}/docente/messaggi/${user.id}`;
      const preview = body.length > 280 ? `${body.slice(0, 280)}…` : body;
      await notify({
        to: recipient.email,
        subject: `Nuovo messaggio da ${profile.full_name || profile.email}`,
        html: emailLayout(
          `Hai un nuovo messaggio`,
          `<p><strong>${escapeHtml(profile.full_name || profile.email)}</strong> ti ha scritto:</p>
           <blockquote style="margin:12px 0;padding:12px 16px;background:#F3F5F7;border-radius:8px;white-space:pre-wrap">${escapeHtml(preview)}</blockquote>`,
          { label: "Rispondi", href },
        ),
      });
    }
  }

  revalidatePath(staff ? `/docente/messaggi/${other}` : `/area/messaggi/${other}`);
  revalidatePath(staff ? "/docente/messaggi" : "/area/messaggi");
  return { ok: true, sentAt: Date.now() };
}
