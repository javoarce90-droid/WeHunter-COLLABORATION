-- El Career Site deja de ser opcional (Trello [48]: obligatorio para todo workspace). El toggle
-- "Publicar el Career Site" se saca de Settings; cualquier organization que lo hubiera
-- desactivado antes queda republicada. La columna career_site_enabled se conserva (default true,
-- ya la usan get_career_site / get_career_site_job / apply_to_career_site_job como chequeo de
-- defensa en profundidad), simplemente deja de ser editable desde la app.
update public.organizations set career_site_enabled = true where career_site_enabled = false;