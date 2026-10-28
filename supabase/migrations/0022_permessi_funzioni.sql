-- Sicurezza: azioni che richiedono l'accesso non richiamabili da anonimi; funzioni dei trigger non esposte come API.
revoke execute on function public.book_lesson(uuid) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.book_oral_slot(uuid) from public, anon;
revoke execute on function public.cancel_oral_slot(uuid) from public, anon;
revoke execute on function public.mark_thread_read(uuid, uuid) from public, anon;
revoke execute on function public.submit_assignment(uuid) from public, anon;
revoke execute on function public.my_upcoming_exams() from public, anon;
revoke execute on function public.reassign_staff(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.audit_login() from public, anon, authenticated;
revoke execute on function public.copy_course_assignments() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.audit_login() to supabase_auth_admin;
grant execute on function public.audit_row() to supabase_auth_admin;
alter function public.touch_updated_at() set search_path = public;
