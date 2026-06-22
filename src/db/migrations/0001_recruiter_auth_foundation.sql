-- Fundación auth + tenancy (Slice 0 del flujo Reclutador).
-- Implementa: sync de profiles desde auth.users, helper de pertenencia, RLS por tenant
-- y el bootstrap controlado de organization+owner. Ver docs/DATA_MODEL.md y database.md.
-- ZONA COMPARTIDA (src/db): coordinado antes de mergear.

-- =========================================================================
-- 1. Sync de profiles: cada usuario nuevo de Supabase Auth crea su profile.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
--> statement-breakpoint

drop trigger if exists on_auth_user_created on auth.users;
--> statement-breakpoint

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint

-- =========================================================================
-- 2. Helper de pertenencia. SECURITY DEFINER para que el chequeo NO dispare
--    RLS sobre memberships (evita recursión en las políticas).
-- =========================================================================
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = p_org
      and profile_id = auth.uid()
  );
$$;
--> statement-breakpoint

grant execute on function public.is_org_member(uuid) to authenticated;
--> statement-breakpoint

-- =========================================================================
-- 3. Privilegios base para el rol authenticated. RLS (abajo) acota las filas;
--    estos grants sólo habilitan que el rol pueda "alcanzar" las tablas.
-- =========================================================================
grant usage on schema public to authenticated;
--> statement-breakpoint
grant select, insert, update, delete on
  public.organizations, public.profiles, public.memberships,
  public.jobs, public.candidates, public.applications
  to authenticated;
--> statement-breakpoint

-- =========================================================================
-- 4. RLS por tenant. Patrón: sólo ves filas de organizations donde sos member.
-- =========================================================================
alter table public.organizations enable row level security;
--> statement-breakpoint
create policy "org_member_can_read" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));
--> statement-breakpoint

-- memberships: política NO recursiva (sin subquery a sí misma). Cada quien ve sus
-- propias membresías; ver al equipo de la org es una feature posterior (admin).
alter table public.memberships enable row level security;
--> statement-breakpoint
create policy "own_memberships" on public.memberships
  for select to authenticated
  using (profile_id = auth.uid());
--> statement-breakpoint

-- profiles: cada usuario ve y edita el suyo. El insert lo hace el trigger (definer).
alter table public.profiles enable row level security;
--> statement-breakpoint
create policy "own_profile_select" on public.profiles
  for select to authenticated
  using (id = auth.uid());
--> statement-breakpoint
create policy "own_profile_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
--> statement-breakpoint

-- jobs / candidates / applications: aislamiento total por organization.
alter table public.jobs enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.jobs
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

alter table public.candidates enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.candidates
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

alter table public.applications enable row level security;
--> statement-breakpoint
create policy "tenant_isolation" on public.applications
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

-- =========================================================================
-- 5. Bootstrap de tenancy: crea organization + membership(owner) atómicamente.
--    SECURITY DEFINER porque el usuario aún no tiene membership (las políticas
--    de arriba bloquearían los inserts). Sólo deja owner al PROPIO caller.
-- =========================================================================
create or replace function public.create_organization_with_owner(
  p_name text,
  p_slug text,
  p_owner uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null or auth.uid() <> p_owner then
    raise exception 'forbidden: el owner debe ser el usuario autenticado';
  end if;

  insert into public.organizations (name, slug)
  values (p_name, p_slug)
  returning id into v_org;

  insert into public.memberships (organization_id, profile_id, role)
  values (v_org, p_owner, 'owner');

  return v_org;
end;
$$;
--> statement-breakpoint

grant execute on function public.create_organization_with_owner(text, text, uuid) to authenticated;
