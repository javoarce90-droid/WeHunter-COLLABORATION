CREATE TABLE "shortlist_candidate_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shortlist_candidate_id" uuid NOT NULL,
	"author_membership_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shortlist_candidates" ADD COLUMN "interview_requested_slots" timestamp[];--> statement-breakpoint
ALTER TABLE "shortlist_candidate_comments" ADD CONSTRAINT "shortlist_candidate_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_candidate_comments" ADD CONSTRAINT "shortlist_candidate_comments_shortlist_candidate_id_shortlist_candidates_id_fk" FOREIGN KEY ("shortlist_candidate_id") REFERENCES "public"."shortlist_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortlist_candidate_comments" ADD CONSTRAINT "shortlist_candidate_comments_author_membership_id_memberships_id_fk" FOREIGN KEY ("author_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shortlist_candidate_comments_org_idx" ON "shortlist_candidate_comments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "shortlist_candidate_comments_candidate_idx" ON "shortlist_candidate_comments" USING btree ("shortlist_candidate_id");--> statement-breakpoint

-- =========================================================================
-- shortlist_candidate_comments: mismo patrón "tenant_isolation" que el resto de shortlists
-- (ver 0004). Comentario de Recruiting sobre un candidato compartido — visible para el
-- Cliente (vía get_shared_shortlist, token) y el Hiring Manager (vía RLS, con sesión).
-- =========================================================================
ALTER TABLE "shortlist_candidate_comments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "shortlist_candidate_comments"
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "shortlist_candidate_comments" TO authenticated;
--> statement-breakpoint

-- =========================================================================
-- Ampliación del detalle que ve el Cliente externo (por token): perfil completo, respuestas
-- de screening, historial de entrevistas (sin notas internas) y comentarios de Recruiting.
-- Mismo shape que ahora ve internamente el Hiring Manager vía RLS (queries normales), para
-- que ambos caminos terminen en el mismo componente de detalle en la UI.
-- =========================================================================
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
          'phone', c.phone,
          'location', c.location,
          'linkedinUrl', c.linkedin_url,
          'summary', c.summary,
          'skills', c.skills,
          'cvUrl', c.cv_url,
          'stage', a.stage,
          'feedbackDecision', f.decision,
          'feedbackComment', f.comment,
          'interviewRequestedAt', sc.interview_requested_at,
          'interviewRequestedSlots', sc.interview_requested_slots,
          'experiences', coalesce((
            select json_agg(
              json_build_object(
                'id', we.id,
                'company', we.company,
                'position', we.position,
                'startDate', we.start_date,
                'endDate', we.end_date,
                'description', we.description
              ) order by we.start_date desc nulls last
            )
            from public.candidate_work_experiences we
            where we.candidate_id = c.id
          ), '[]'::json),
          'education', coalesce((
            select json_agg(
              json_build_object(
                'id', ed.id,
                'institution', ed.institution,
                'degree', ed.degree,
                'fieldOfStudy', ed.field_of_study
              ) order by ed.start_date desc nulls last
            )
            from public.candidate_education ed
            where ed.candidate_id = c.id
          ), '[]'::json),
          'languages', coalesce((
            select json_agg(
              json_build_object('id', lg.id, 'language', lg.language, 'level', lg.level)
            )
            from public.candidate_languages lg
            where lg.candidate_id = c.id
          ), '[]'::json),
          'screening', coalesce((
            select json_agg(
              json_build_object('questionId', sa.question_id, 'label', sq.label, 'value', sa.value)
              order by sq.position
            )
            from public.screening_answers sa
            join public.screening_questions sq on sq.id = sa.question_id
            where sa.application_id = a.id
          ), '[]'::json),
          'interviews', coalesce((
            select json_agg(
              json_build_object(
                'id', iv.id,
                'scheduledAt', iv.scheduled_at,
                'mode', iv.mode,
                'type', iv.type,
                'status', iv.status
              ) order by iv.scheduled_at desc
            )
            from public.interviews iv
            where iv.application_id = a.id
          ), '[]'::json),
          'comments', coalesce((
            select json_agg(
              json_build_object(
                'id', cm.id,
                'body', cm.body,
                'createdAt', cm.created_at,
                'authorName', p.full_name
              ) order by cm.created_at
            )
            from public.shortlist_candidate_comments cm
            left join public.memberships mb on mb.id = cm.author_membership_id
            left join public.profiles p on p.id = mb.profile_id
            where cm.shortlist_candidate_id = sc.id
          ), '[]'::json)
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

-- submit_shortlist_feedback ahora también avisa al equipo del reclutador (antes solo
-- request_shortlist_interview notificaba — el feedback del cliente pasaba en silencio).
create or replace function public.submit_shortlist_feedback(
  p_token text,
  p_shortlist_candidate_id uuid,
  p_decision text,
  p_comment text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share record;
  v_sc record;
begin
  select id, shortlist_id into v_share
  from public.shortlist_shares
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'forbidden: token inválido o vencido';
  end if;

  if p_decision not in ('approved', 'rejected', 'maybe') then
    raise exception 'invalid: decisión inválida';
  end if;

  select sc.id, sc.organization_id, c.full_name as candidate_name, sl.job_id, j.title as job_title
  into v_sc
  from public.shortlist_candidates sc
  join public.applications a on a.id = sc.application_id
  join public.candidates c on c.id = a.candidate_id
  join public.shortlists sl on sl.id = sc.shortlist_id
  join public.jobs j on j.id = sl.job_id
  where sc.id = p_shortlist_candidate_id
    and sc.shortlist_id = v_share.shortlist_id;

  if not found then
    raise exception 'forbidden: el candidato no pertenece a este shortlist';
  end if;

  insert into public.shortlist_feedback
    (organization_id, shortlist_candidate_id, share_id, decision, comment)
  values
    (v_sc.organization_id, p_shortlist_candidate_id, v_share.id,
     p_decision::feedback_decision, nullif(btrim(p_comment), ''))
  on conflict (shortlist_candidate_id)
  do update set
    decision = excluded.decision,
    comment = excluded.comment,
    share_id = excluded.share_id,
    updated_at = now();

  insert into public.notifications (organization_id, profile_id, type, title, link)
  select
    v_sc.organization_id,
    m.profile_id,
    'system',
    v_sc.candidate_name || ' — el cliente dejó feedback (' || v_sc.job_title || ')',
    '/jobs/' || v_sc.job_id || '/shortlists'
  from public.memberships m
  where m.organization_id = v_sc.organization_id
    and m.status = 'active';

  return true;
end;
$$;
--> statement-breakpoint

-- request_shortlist_interview cambia de firma (agrega p_slots): dropeamos el overload viejo
-- de 2 parámetros para no dejarlo huérfano (mismo gotcha que 0083).
drop function if exists public.request_shortlist_interview(text, uuid);
--> statement-breakpoint

create or replace function public.request_shortlist_interview(
  p_token text,
  p_shortlist_candidate_id uuid,
  p_slots timestamp[]
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

grant execute on function public.request_shortlist_interview(text, uuid, timestamp[]) to anon, authenticated;