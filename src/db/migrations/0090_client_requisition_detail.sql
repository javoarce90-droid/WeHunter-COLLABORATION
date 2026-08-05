-- Detalle/edición de una solicitud del lado del Cliente (sin cuenta, por token). Mismo patrón
-- de seguridad que 0055 (get_client_portal/create_client_requisition): SECURITY DEFINER, la
-- autorización vive entera acá adentro. Edición solo mientras status='pending' — el guard vive
-- en SQL (no en TS) porque no hay contexto de usuario, solo el token.

create or replace function public.get_client_requisition(p_token text, p_requisition_id uuid)
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
  select s.client_id
  into v_share
  from public.client_shares s
  where s.token = p_token
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now());

  if not found then
    return null;
  end if;

  select json_build_object(
    'id', r.id,
    'title', r.title,
    'position', r.position,
    'status', r.status,
    'reason', r.reason,
    'jobArea', r.job_area,
    'location', r.location,
    'modality', r.modality,
    'seniority', r.seniority,
    'employmentType', r.employment_type,
    'skills', r.skills,
    'budget', r.budget,
    'estimatedStartDate', r.estimated_start_date,
    'objectives', r.objectives,
    'requirements', r.requirements,
    'responsibilities', r.responsibilities,
    'reviewNote', r.review_note,
    'reviewedAt', r.reviewed_at,
    'createdAt', r.created_at
  ) into v_result
  from public.requisitions r
  where r.id = p_requisition_id
    and r.client_id = v_share.client_id;

  return v_result;
end;
$$;
--> statement-breakpoint

grant execute on function public.get_client_requisition(text, uuid) to anon, authenticated;
--> statement-breakpoint

-- Actualiza una solicitud a nombre del cliente del token. Mismo casteo de payload que
-- create_client_requisition, pero UPDATE en vez de INSERT, y solo si sigue pending (si el
-- recruiter ya la revisó, o el id no es de este cliente, o el token no es válido: excepción).
-- organization_id/client_id/status nunca se tocan.
create or replace function public.update_client_requisition(
  p_token text,
  p_requisition_id uuid,
  p_payload json
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share record;
  v_updated int;
begin
  select id, client_id into v_share
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

  update public.requisitions
  set reason = (p_payload->>'reason')::requisition_reason,
      budget = nullif(btrim(coalesce(p_payload->>'budget', '')), ''),
      estimated_start_date = (p_payload->>'estimatedStartDate')::date,
      title = btrim(p_payload->>'title'),
      position = nullif(btrim(coalesce(p_payload->>'position', '')), ''),
      job_area = (p_payload->>'jobArea')::job_area,
      location = nullif(btrim(coalesce(p_payload->>'location', '')), ''),
      modality = (p_payload->>'modality')::job_modality,
      seniority = (p_payload->>'seniority')::job_seniority,
      employment_type = (p_payload->>'employmentType')::employment_type,
      skills = case
        when p_payload->'skills' is null or p_payload->>'skills' is null then null
        else (select array_agg(value::text) from json_array_elements_text(p_payload->'skills'))
      end,
      objectives = nullif(btrim(coalesce(p_payload->>'objectives', '')), ''),
      requirements = nullif(btrim(coalesce(p_payload->>'requirements', '')), ''),
      responsibilities = nullif(btrim(coalesce(p_payload->>'responsibilities', '')), ''),
      updated_at = now()
  where id = p_requisition_id
    and client_id = v_share.client_id
    and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
--> statement-breakpoint

grant execute on function public.update_client_requisition(text, uuid, json) to anon, authenticated;
