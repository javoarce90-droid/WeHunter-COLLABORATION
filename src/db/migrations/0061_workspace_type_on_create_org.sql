-- =========================================================================
-- El tipo de workspace (freelance / team / enterprise) se elige en el onboarding, en el
-- mismo paso que el nombre. Tiene que entrar por la función SECURITY DEFINER para que la
-- organización nazca completa: crear la org y después actualizarla dejaría una ventana con
-- el tipo en null, y es el dato del que dependen §11 y §17.
--
-- Se agrega un parámetro con default para no romper llamadas viejas mientras se despliega.
-- =========================================================================

create or replace function public.create_organization_with_owner(
  p_name text,
  p_slug text,
  p_owner uuid,
  p_workspace_type public.workspace_type default null
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

  insert into public.organizations (name, slug, workspace_type)
  values (p_name, p_slug, p_workspace_type)
  returning id into v_org;

  insert into public.memberships (organization_id, profile_id, role)
  values (v_org, p_owner, 'owner');

  return v_org;
end;
$$;
--> statement-breakpoint

grant execute on function public.create_organization_with_owner(text, text, uuid, public.workspace_type) to authenticated;
