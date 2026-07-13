-- google_calendar_connections guarda tokens OAuth: acceso restringido al DUEÑO de la
-- conexión (profile_id = auth.uid()), no a "cualquier miembro de la org" como el resto de
-- las tablas de tenant_isolation — un compañero de equipo no debe poder leer los tokens de
-- otro. Mismo molde que own_candidate_read/own_interactions (migración 0023).
grant select, insert, update, delete on public.google_calendar_connections to authenticated;
--> statement-breakpoint

alter table public.google_calendar_connections enable row level security;
--> statement-breakpoint

create policy "own_connection" on public.google_calendar_connections
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());