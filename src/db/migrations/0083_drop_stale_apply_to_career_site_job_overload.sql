-- La migración 0074 agregó p_expected_salary/p_expected_salary_currency a
-- apply_to_career_site_job. `create or replace function` no reemplaza si cambia la firma —
-- creó un segundo overload y dejó huérfana la versión vieja de 7 parámetros (sin esos dos
-- campos, y sin self_applied de la 0082). El único caller en el código (apply.data.ts) llama
-- siempre con los 9 parámetros, así que este overload de 7 nunca se ejecuta: se pide
-- expected_salary/currency al candidato al autopostularse, y con la firma vieja se perdería
-- ese dato silenciosamente si alguna vez se llamara. Se dropea explícito por firma para no
-- tocar el overload de 9 parámetros que sí está en uso.
drop function if exists public.apply_to_career_site_job(
  uuid, text, text, text, text, text, jsonb
);
