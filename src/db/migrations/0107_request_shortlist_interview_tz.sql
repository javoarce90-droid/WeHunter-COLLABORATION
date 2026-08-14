-- request_shortlist_interview usaba p_slots timestamp[] (sin huso horario): tras convertir
-- shortlist_candidates.interview_requested_at/interview_requested_slots e interviews.scheduled_at
-- a timestamptz (bug real: postgres-js corrompe el round-trip de timestamp sin huso por el
-- offset del proceso servidor), la firma de la función también pasa a timestamptz[].
drop function if exists public.request_shortlist_interview(text, uuid, timestamp[]);
--> statement-breakpoint

create or replace function public.request_shortlist_interview(
  p_token text,
  p_shortlist_candidate_id uuid,
  p_slots timestamptz[]
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share_id uuid;
  v_shortlist_id uuid;
  v_org_id uuid;
  v_candidate_name text;
  v_job_id uuid;
  v_job_title text;
begin
  if p_slots is null or coalesce(array_length(p_slots, 1), 0) < 1
     or array_length(p_slots, 1) > 3 then
    raise exception 'invalid: elegí entre 1 y 3 horarios propuestos';
  end if;

  select id, shortlist_id into v_share_id, v_shortlist_id
  from public.shortlist_shares
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'forbidden: token inválido o vencido';
  end if;

  select sc.organization_id, c.full_name, sl.job_id, j.title
  into v_org_id, v_candidate_name, v_job_id, v_job_title
  from public.shortlist_candidates sc
  join public.applications a on a.id = sc.application_id
  join public.candidates c on c.id = a.candidate_id
  join public.shortlists sl on sl.id = sc.shortlist_id
  join public.jobs j on j.id = sl.job_id
  where sc.id = p_shortlist_candidate_id
    and sc.shortlist_id = v_shortlist_id;

  if not found then
    raise exception 'forbidden: el candidato no pertenece a este shortlist';
  end if;

  update public.shortlist_candidates
  set interview_requested_at = now(), interview_requested_slots = p_slots, updated_at = now()
  where id = p_shortlist_candidate_id;

  insert into public.notifications (organization_id, profile_id, type, title, link)
  select
    v_org_id,
    m.profile_id,
    'system',
    v_candidate_name || ' — el cliente solicitó una entrevista (' || v_job_title || ')',
    '/jobs/' || v_job_id || '/shortlists'
  from public.memberships m
  where m.organization_id = v_org_id
    and m.status = 'active';

  return true;
end;
$$;
--> statement-breakpoint

grant execute on function public.request_shortlist_interview(text, uuid, timestamptz[]) to anon, authenticated;
