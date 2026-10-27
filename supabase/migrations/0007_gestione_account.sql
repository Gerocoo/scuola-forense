-- Prima di eliminare un docente: le sue esercitazioni, i file di correzione e le conversazioni
-- passano a un altro membro dello staff, così i discenti non perdono nulla.
create or replace function public.reassign_staff(old_id uuid, new_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    raise exception 'Solo un amministratore può farlo';
  end if;
  update public.assignments set teacher_id = new_id where teacher_id = old_id;
  update public.assignment_files set uploaded_by = new_id where uploaded_by = old_id;
  update public.messages
     set teacher_id = new_id,
         sender_id = case when sender_id = old_id then new_id else sender_id end
   where teacher_id = old_id;
end $$;

revoke all on function public.reassign_staff(uuid, uuid) from public, anon;
