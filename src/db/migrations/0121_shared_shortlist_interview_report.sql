-- =========================================================================
-- get_shared_shortlist: agrega `interviewReport` por candidato — el informe de entrevista con
-- IA de su postulación a esta búsqueda (el más reciente si hay varios). El informe es apto
-- para el cliente por diseño (se presenta siempre como informe profesional de WeHunter, sin
-- exponer la fuente interna ni las notas del recruiter). `null` si no hay informe generado.
-- Solo cambia esta función; sin cambios de schema. Copia textual de la definición de 0097 +
-- la subquery nueva.
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
          ), '[]'::json),
          'interviewReport', (
            select json_build_object(
              'content', ir.content,
              'recommendation', ir.recommendation,
              'recommendationJustification', ir.recommendation_justification,
              'interviewDate', iv.scheduled_at
            )
            from public.interview_reports ir
            join public.interviews iv on iv.id = ir.interview_id
            where iv.application_id = a.id
            order by iv.scheduled_at desc
            limit 1
          )
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
