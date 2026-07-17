CREATE TYPE "public"."language_level" AS ENUM('basico', 'intermedio', 'avanzado', 'nativo');--> statement-breakpoint
CREATE TABLE "candidate_languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"candidate_id" uuid,
	"language" text NOT NULL,
	"level" "language_level" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_languages_owner_check" CHECK (("candidate_languages"."profile_id" is not null) <> ("candidate_languages"."candidate_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_languages_profile_idx" ON "candidate_languages" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "candidate_languages_candidate_idx" ON "candidate_languages" USING btree ("candidate_id");--> statement-breakpoint

alter table public.candidate_languages enable row level security;
--> statement-breakpoint
create policy "own_via_profile" on public.candidate_languages
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
--> statement-breakpoint
create policy "own_via_candidate" on public.candidate_languages
  for all to authenticated
  using (public.is_org_member((select organization_id from public.candidates where id = candidate_id)))
  with check (public.is_org_member((select organization_id from public.candidates where id = candidate_id)));