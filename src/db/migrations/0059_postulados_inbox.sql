-- =========================================================================
-- Postulados como bandeja de entrada del aviso.
--
-- `applications.pipeline_entered_at` (columna agregada en la 0058) separa las dos
-- pantallas: null = la postulación sigue en la bandeja esperando decisión del recruiter,
-- con fecha = el recruiter la avanzó y aparece en el Kanban.
--
-- Backfill: todo lo que ya estaba fuera de la etapa inicial venía siendo trabajado en el
-- tablero, así que se marca como ya ingresado al pipeline (usando su fecha de creación,
-- que es lo más cercano a la verdad que tenemos). Lo que quedó en 'new' nunca recibió una
-- decisión: pasa a ser bandeja pendiente, que es exactamente lo que es.
-- =========================================================================

update public.applications
set pipeline_entered_at = created_at
where stage <> 'new'
  and pipeline_entered_at is null;
--> statement-breakpoint

-- Visitas al aviso público. El visitante del Career Site no tiene sesión, así que el
-- incremento va por una función SECURITY DEFINER acotada — mismo patrón que
-- get_career_site_job (0021). Solo cuenta avisos abiertos de un career site habilitado:
-- no se puede usar para sondear ids ni para tocar ninguna otra columna de `jobs`.
create or replace function public.record_career_site_job_view(p_slug text, p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs j
  set view_count = j.view_count + 1
  from public.organizations o
  where j.id = p_job_id
    and j.organization_id = o.id
    and o.slug = p_slug
    and o.career_site_enabled = true
    and j.status = 'open';
end;
$$;
--> statement-breakpoint

grant execute on function public.record_career_site_job_view(text, uuid) to anon, authenticated;
