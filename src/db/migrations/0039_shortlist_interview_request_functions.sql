-- =========================================================================
-- Cliente externo: solicitar entrevista para un candidato del shortlist compartido.
-- Mismo patrón que submit_shortlist_feedback (0004): toda la autorización vive acá
-- dentro (token vigente + pertenencia al shortlist). Ver backlog §9 "Participación
-- de Clientes Externos".
-- =========================================================================

-- get_shared_shortlist ahora también expone si ya se pidió entrevista, para que la UI
-- del cliente refleje el estado al recargar la página.
create or replace function public.get_shared_shortlist(p_token text)
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
  select s.id as share_id, s.shortlist_id, sl.name as shortlist_name, j.title as job_title
  into v_share
  from public.shortlist_shares s
  join public.shortlists sl on sl.id = s.shortlist_id
  join public.jobs j on j.id = sl.job_id
  where s.token = p_token
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now());

  if not found then
    return null;
  end if;

  select json_build_object(
    'shareId', v_share.share_id,
    'shortlistName', v_share.shortlist_name,
    'jobTitle', v_share.job_title,
    'candidates', coalesce((
      select json_agg(
        json_build_object(
          'shortlistCandidateId', sc.id,
          'fullName', c.full_name,
          'email', c.email,
          'cvUrl', c.cv_url,
          'stage', a.stage,
          'feedbackDecision', f.decision,
          'feedbackComment', f.comment,
          'interviewRequestedAt', sc.interview_requested_at
        ) order by c.full_name
      )
      from public.shortlist_candidates sc
      join public.applications a on a.id = sc.application_id
      join public.candidates c on c.id = a.candidate_id
      left join public.shortlist_feedback f on f.shortlist_candidate_id = sc.id
      where sc.shortlist_id = v_share.shortlist_id
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;
--> statement-breakpoint

-- Marca el pedido de entrevista y avisa al equipo del reclutador (fan-out a cada miembro
-- activo de la org, mismo criterio que notifyOrg en TypeScript — acá se hace directo en
-- SQL porque el caller es anónimo y no puede pasar por el cliente RLS).
create or replace function public.request_shortlist_interview(
  p_token text,
  p_shortlist_candidate_id uuid
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
  set interview_requested_at = now(), updated_at = now()
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

grant execute on function public.request_shortlist_interview(text, uuid) to anon, authenticated;