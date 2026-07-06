-- El candidato solo puede autogestionar el retiro de una postulación en las etapas
-- tempranas (new/screening) — una vez que arrancó el proceso de entrevistas (o ya se
-- resolvió con oferta/contratación/rechazo) el retiro deja de estar disponible. Esto era
-- hasta ahora solo un límite de UI (el botón se ocultaba/deshabilitaba en el cliente); se
-- refuerza acá porque la autorización real tiene que vivir en la función SECURITY DEFINER,
-- no confiarse del cliente (mismo criterio que el resto de las funciones de postulación).
create or replace function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage public.application_stage;
begin
  if auth.uid() is null then
    raise exception 'forbidden: se requiere sesión para retirar una postulación';
  end if;

  select stage into v_stage
  from public.applications
  where id = p_application_id
    and public.is_own_candidate(candidate_id);

  if not found then
    raise exception 'invalid: la postulación no existe o no te pertenece';
  end if;

  if v_stage not in ('new', 'screening') then
    raise exception 'invalid: ya no podés retirarte de esta postulación en su etapa actual';
  end if;

  delete from public.applications
  where id = p_application_id
    and public.is_own_candidate(candidate_id);
end;
$$;
--> statement-breakpoint

grant execute on function public.withdraw_application(uuid) to authenticated;
