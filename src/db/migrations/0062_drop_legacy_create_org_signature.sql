-- La 0061 agregó `create_organization_with_owner` con un cuarto parámetro, pero
-- `create or replace` con una firma distinta crea un OVERLOAD en vez de reemplazar. Con el
-- default del cuarto parámetro, una llamada de tres argumentos queda ambigua y Postgres la
-- rechaza ("function is not unique"). Se elimina la firma vieja: ya nadie la llama.

drop function if exists public.create_organization_with_owner(text, text, uuid);
