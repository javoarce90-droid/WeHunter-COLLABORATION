CREATE TYPE "public"."account_type" AS ENUM('recruiter', 'candidate');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "account_type" "account_type" DEFAULT 'candidate' NOT NULL;--> statement-breakpoint

-- Backfill de filas existentes: toda cuenta que YA tiene membership es recruiter (hoy no
-- hay ningún recruiter real sin membership que este backfill clasifique mal). De acá en
-- más, account_type lo fija handle_new_user de forma explícita, no se vuelve a inferir.
update public.profiles
set account_type = 'recruiter'
where id in (select profile_id from public.memberships);
--> statement-breakpoint

-- Redefine handle_new_user (0001) para setear account_type desde el metadata del signUp
-- (account_type: "recruiter" | "candidate", ver (auth)/actions.ts y c/actions.ts). Default
-- "candidate" si no viene — mínimo privilegio, nunca de arranque recruiter por omisión.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, account_type)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'account_type', 'candidate')::account_type
  )
  on conflict (id) do nothing;
  return new;
end;
$$;