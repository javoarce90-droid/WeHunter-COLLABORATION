-- Vincular candidato cargado a mano con una cuenta real (`profiles`), backlog §18. RLS de
-- profiles solo deja ver el propio perfil o el de un compañero de org (0016) — un recruiter
-- no puede buscar por email a cualquier cuenta. Función SECURITY DEFINER, mismo patrón que
-- get_linked_candidate_profile (0029) y apply_to_career_site_job (0030/0043): expone solo lo
-- necesario. La decisión de qué mostrar al recruiter (solo "existe / no existe", sin bio/CV)
-- antes de confirmar el vínculo vive en la capa de dominio (TypeScript), no acá.
create or replace function public.find_profile_for_candidate_link(p_email text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  if p_email is null or btrim(p_email) = '' then
    return null;
  end if;

  select id, bio, skills, cv_url
  into v_profile
  from public.profiles
  where lower(email) = lower(btrim(p_email))
  limit 1;

  if not found then
    return null;
  end if;

  return json_build_object(
    'profileId', v_profile.id,
    'bio', v_profile.bio,
    'skills', v_profile.skills,
    'cvUrl', v_profile.cv_url
  );
end;
$$;
--> statement-breakpoint

grant execute on function public.find_profile_for_candidate_link(text) to authenticated;
