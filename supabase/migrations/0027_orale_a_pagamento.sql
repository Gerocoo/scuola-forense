-- Orale a pagamento: modulo acquistabile solo da chi ha già frequentato un corso.
-- Finché il prodotto "modulo-orale" non è attivo, l'Orale resta chiuso ai discenti.

create or replace function public.has_oral_access()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.enrollments e join public.packages p on p.id = e.package_id
    where e.user_id = auth.uid() and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and p.slug = 'modulo-orale'
  )
$$;
revoke execute on function public.has_oral_access() from public, anon;
grant execute on function public.has_oral_access() to authenticated, service_role;

create or replace function public.has_active_enrollment()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments e join public.packages p on p.id = e.package_id
    where e.user_id = auth.uid() and e.status = 'active'
      and (e.ends_at is null or e.ends_at > now())
      and p.slug not in ('archivio-tracce', 'modulo-orale')
  )
$$;

alter policy "quiz: lettura iscritti e staff" on public.quiz_questions
  using (public.is_staff() or (active and public.has_oral_access()));
alter policy "orale: lettura" on public.oral_slots
  using (public.is_staff() or booked_by = auth.uid() or (booked_by is null and public.has_oral_access()));

create or replace function public.book_oral_slot(sid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_oral_access() then
    raise exception 'Serve il modulo Orale per prenotare';
  end if;
  if (select count(*) from public.oral_slots where booked_by = auth.uid() and starts_at > now()) >= 2 then
    raise exception 'Hai già due simulazioni in programma';
  end if;
  update public.oral_slots set booked_by = auth.uid(), booked_at = now()
   where id = sid and booked_by is null and starts_at > now() + interval '1 hour';
  if not found then
    raise exception 'Questo orario non è più disponibile';
  end if;
end $$;

insert into public.packages (slug, title, tagline, description, period_label, price_cents, features, active, sort)
values (
  'modulo-orale',
  'Modulo Orale',
  'Simulazioni d''orale individuali e quiz di deontologia, ordinamento e previdenza.',
  'Il modulo per preparare la prova orale, riservato a chi ha frequentato un corso: simulazioni individuali in videochiamata con i docenti e quiz di allenamento.',
  'Dopo lo scritto',
  9900,
  array['Simulazioni d''orale individuali', 'Quiz di deontologia, ordinamento e previdenza', 'Riservato a chi ha frequentato un corso'],
  false,
  998
)
on conflict (slug) do nothing;
