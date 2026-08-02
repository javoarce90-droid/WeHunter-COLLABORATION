-- =========================================================================
-- Pipeline por búsqueda. Cada job pasa a tener sus propias etapas en `job_stages`;
-- `pipeline_stages` (config única por organización) queda como el molde del que se siembran
-- las búsquedas nuevas, no como la verdad del tablero.
--
-- Backfill: se materializa, para cada job existente, la configuración efectiva de su org
-- (defaults del código + overrides de pipeline_stages) y se apunta cada postulación a la
-- etapa equivalente de SU búsqueda.
--
-- Criterio para etapas desactivadas: se siembran igual si hay postulaciones paradas ahí
-- (si no, quedarían huérfanas); si están vacías, se respetan y no se crean.
-- =========================================================================

alter table "job_stages" enable row level security;
--> statement-breakpoint

-- `with check` desde el principio: sin él, con `grant all`, un miembro de la org A podría
-- insertar filas con el organization_id de la org B (mismo bug que corrigió la 0055).
create policy "tenant_isolation" on "job_stages"
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
--> statement-breakpoint

grant all on "job_stages" to authenticated;
--> statement-breakpoint

-- Siembra por búsqueda ---------------------------------------------------
with defs(stage_key, name, kind, position) as (
  values
    ('new'::application_stage,              'Postulados',      'inbox'::stage_kind,      0),
    ('screening'::application_stage,        'Screening',       'in_process'::stage_kind, 1),
    ('interview'::application_stage,        'Entrevista',      'in_process'::stage_kind, 2),
    ('interview_hr'::application_stage,     'Entrev. RH',      'in_process'::stage_kind, 3),
    ('interview_tech'::application_stage,   'Entrev. Técnica', 'in_process'::stage_kind, 4),
    ('interview_client'::application_stage, 'Entrev. Cliente', 'in_process'::stage_kind, 5),
    ('offer'::application_stage,            'Oferta',          'offer'::stage_kind,      6),
    ('hired'::application_stage,            'Contratado',      'hired'::stage_kind,      7),
    ('rejected'::application_stage,         'Descartado',      'rejected'::stage_kind,   8)
)
insert into public.job_stages
  (organization_id, job_id, name, position, sla_days, kind, legacy_stage)
select
  j.organization_id,
  j.id,
  coalesce(ps.label_override, d.name),
  d.position,
  ps.sla_days,
  d.kind,
  d.stage_key
from public.jobs j
cross join defs d
left join public.pipeline_stages ps
  on ps.organization_id = j.organization_id
 and ps.stage_key = d.stage_key
where coalesce(ps.is_active, true)
   or exists (
     select 1 from public.applications a
     where a.job_id = j.id and a.stage = d.stage_key
   );
--> statement-breakpoint

-- Cada postulación apunta a la etapa equivalente de su propia búsqueda.
update public.applications a
set stage_id = s.id
from public.job_stages s
where s.job_id = a.job_id
  and s.legacy_stage = a.stage
  and a.stage_id is null;
