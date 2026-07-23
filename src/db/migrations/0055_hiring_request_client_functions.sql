-- =========================================================================
-- Hiring Request — camino Cliente (§17 backlog). Acceso del Cliente SIN cuenta por
-- token de `client_shares`: pide búsquedas y ve el estado de sus solicitudes.
-- Mismo patrón que las funciones de shortlists (0004/0039): toda la autorización vive
-- dentro de las funciones SECURITY DEFINER, que validan el token vigente y exponen solo
-- los campos permitidos (nunca notas internas ni datos de otros clientes de la org).
-- =========================================================================

-- Las políticas de la 0054 quedaron sin `with check`: con `grant all` a authenticated,
-- un miembro de la org A podía INSERTAR filas con el organization_id de la org B (no las
-- vería después, pero las escribiría). Se recrean como el resto de las tablas del schema.
drop policy if exists "tenant_isolation" on public.requisitions;
--> statement-breakpoint
create policy "tenant_isolation" on public.requisitions
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

drop policy if exists "tenant_isolation" on public.client_shares;
--> statement-breakpoint
create policy "tenant_isolation" on public.client_shares
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

-- Portal del Cliente: datos del cliente + sus solicitudes. NULL si el token no existe,
-- está revocado o venció. `review_note` sí se expone: es el mensaje que el recruiter le
-- escribe al cliente al aprobar/rechazar. Solo devuelve requisitions de ESE client_id.
create or replace function public.get_client_portal(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_share record;
  v_result json;
begin
  select s.id as share_id, s.client_id, c.name as client_name, o.name as organization_name
  into v_share
  from public.client_shares s
  join public.clients c on c.id = s.client_id
  join public.organizations o on o.id = s.organization_id
  where s.token = p_token
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now());

  if not found then
    return null;
  end if;

  select json_build_object(
    'shareId', v_share.share_id,
    'clientName', v_share.client_name,
    'organizationName', v_share.organization_name,
    'requisitions', coalesce((
      select json_agg(
        json_build_object(
          'id', r.id,
          'title', r.title,
          'position', r.position,
          'status', r.status,
          'reason', r.reason,
          'location', r.location,
          'seniority', r.seniority,
          'reviewNote', r.review_note,
          'reviewedAt', r.reviewed_at,
          'createdAt', r.created_at
        ) order by r.created_at desc
      )
      from public.requisitions r
      where r.client_id = v_share.client_id
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_client_portal(text) to anon, authenticated;
--> statement-breakpoint

-- Crea una solicitud a nombre del cliente del token. El payload viene como json porque son
-- ~15 campos de JD; los enums se castean acá y un valor inválido aborta con excepción (el
-- input ya viene validado con Zod del lado de la app). organization_id y client_id NUNCA
-- vienen del payload: se derivan del share, para que el token no pueda escribir en otra org.
create or replace function public.create_client_requisition(p_token text, p_payload json)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share record;
  v_id uuid;
begin
  select id, organization_id, client_id into v_share
  from public.client_shares
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'forbidden: token inválido o vencido';
  end if;

  if coalesce(btrim(p_payload->>'title'), '') = '' then
    raise exception 'invalid: falta el título';
  end if;

  insert into public.requisitions (
    organization_id, client_id, status, reason, budget, estimated_start_date,
    title, position, job_area, location, modality, seniority, employment_type,
    skills, objectives, requirements, responsibilities, benefits
  )
  values (
    v_share.organization_id,
    v_share.client_id,
    'pending',
    (p_payload->>'reason')::requisition_reason,
    nullif(btrim(coalesce(p_payload->>'budget', '')), ''),
    (p_payload->>'estimatedStartDate')::date,
    btrim(p_payload->>'title'),
    nullif(btrim(coalesce(p_payload->>'position', '')), ''),
    (p_payload->>'jobArea')::job_area,
    nullif(btrim(coalesce(p_payload->>'location', '')), ''),
    (p_payload->>'modality')::job_modality,
    (p_payload->>'seniority')::job_seniority,
    (p_payload->>'employmentType')::employment_type,
    case
      when p_payload->'skills' is null or p_payload->>'skills' is null then null
      else (select array_agg(value::text) from json_array_elements_text(p_payload->'skills'))
    end,
    nullif(btrim(coalesce(p_payload->>'objectives', '')), ''),
    nullif(btrim(coalesce(p_payload->>'requirements', '')), ''),
    nullif(btrim(coalesce(p_payload->>'responsibilities', '')), ''),
    case
      when p_payload->'benefits' is null then null
      else (p_payload->'benefits')::jsonb
    end
  )
  returning id into v_id;

  return v_id;
end;
$$;
--> statement-breakpoint

grant execute on function public.create_client_requisition(text, json) to anon, authenticated;
