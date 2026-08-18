-- Fix de drift: la migración 0101 sumó `additional_comments` a las funciones SECURITY DEFINER
-- de Hiring Request (create/get/update_client_requisition) y el schema Drizzle ya declaraba
-- la columna, pero el ALTER TABLE nunca se ejecutó contra la base real. Resultado: el INSERT
-- de create_client_requisition fallaba con "column additional_comments does not exist" en
-- TODA solicitud de búsqueda del camino Cliente (no solo cuando se completaba el campo
-- comentarios — el INSERT incluye la columna sí o sí).
alter table public.requisitions add column if not exists additional_comments text;
