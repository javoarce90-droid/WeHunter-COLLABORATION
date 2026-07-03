CREATE TABLE "candidate_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"candidate_id" uuid,
	"name" text NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_certifications_owner_check" CHECK (("candidate_certifications"."profile_id" is not null) <> ("candidate_certifications"."candidate_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "candidate_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"candidate_id" uuid,
	"institution" text NOT NULL,
	"degree" text NOT NULL,
	"field_of_study" text,
	"start_date" date,
	"end_date" date,
	"description" text,
	"grade" text,
	"activities" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_education_owner_check" CHECK (("candidate_education"."profile_id" is not null) <> ("candidate_education"."candidate_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "candidate_work_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"candidate_id" uuid,
	"company" text NOT NULL,
	"position" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"description" text,
	"employment_type" "employment_type",
	"modality" "job_modality",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_work_experiences_owner_check" CHECK (("candidate_work_experiences"."profile_id" is not null) <> ("candidate_work_experiences"."candidate_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "candidate_certifications" ADD CONSTRAINT "candidate_certifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_certifications" ADD CONSTRAINT "candidate_certifications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_education" ADD CONSTRAINT "candidate_education_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_education" ADD CONSTRAINT "candidate_education_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_work_experiences" ADD CONSTRAINT "candidate_work_experiences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_work_experiences" ADD CONSTRAINT "candidate_work_experiences_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_certifications_profile_idx" ON "candidate_certifications" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "candidate_certifications_candidate_idx" ON "candidate_certifications" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "candidate_education_profile_idx" ON "candidate_education" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "candidate_education_candidate_idx" ON "candidate_education" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "candidate_work_experiences_profile_idx" ON "candidate_work_experiences" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "candidate_work_experiences_candidate_idx" ON "candidate_work_experiences" USING btree ("candidate_id");--> statement-breakpoint

-- =========================================================================
-- RLS: cada fila es dueña de un profile_id (currículum global del candidato) o de un
-- candidate_id (nota de sourcing del recruiter, por organization) — nunca ambos, ya
-- garantizado por el CHECK. Nunca se fusionan ni se muestran juntas en la misma consulta;
-- cada lado (candidato vs recruiter) filtra por su propia columna de dueño.
-- =========================================================================
alter table public.candidate_work_experiences enable row level security;
--> statement-breakpoint
create policy "own_via_profile" on public.candidate_work_experiences
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
--> statement-breakpoint
create policy "own_via_candidate" on public.candidate_work_experiences
  for all to authenticated
  using (public.is_org_member((select organization_id from public.candidates where id = candidate_id)))
  with check (public.is_org_member((select organization_id from public.candidates where id = candidate_id)));
--> statement-breakpoint

alter table public.candidate_education enable row level security;
--> statement-breakpoint
create policy "own_via_profile" on public.candidate_education
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
--> statement-breakpoint
create policy "own_via_candidate" on public.candidate_education
  for all to authenticated
  using (public.is_org_member((select organization_id from public.candidates where id = candidate_id)))
  with check (public.is_org_member((select organization_id from public.candidates where id = candidate_id)));
--> statement-breakpoint

alter table public.candidate_certifications enable row level security;
--> statement-breakpoint
create policy "own_via_profile" on public.candidate_certifications
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
--> statement-breakpoint
create policy "own_via_candidate" on public.candidate_certifications
  for all to authenticated
  using (public.is_org_member((select organization_id from public.candidates where id = candidate_id)))
  with check (public.is_org_member((select organization_id from public.candidates where id = candidate_id)));