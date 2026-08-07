-- Habilita Supabase Realtime (postgres_changes) sobre `notifications`: la campana del
-- reclutador escucha inserts en vivo para acciones lentas (IA/lote) que terminan mientras
-- el usuario ya navegó a otra pantalla. RLS de la tabla ya acota lo que cada quien recibe
-- (profile_id = auth.uid()); esto solo la suma a la publicación que Realtime replica.
alter publication supabase_realtime add table notifications;
