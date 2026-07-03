"use client";

import { useActionState } from "react";
import {
  generarPerfilConIaAction,
  completarOnboardingAction,
  type GenerarPerfilConIaState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandidateProfileForm } from "@/features/candidate/profile/ui/CandidateProfileForm";

interface AiOnboardingFlowProps {
  fullName: string;
  email: string;
}

const initialState: GenerarPerfilConIaState = {};

export function AiOnboardingFlow({ fullName, email }: AiOnboardingFlowProps) {
  const [state, formAction, pending] = useActionState(generarPerfilConIaAction, initialState);

  if (state.draft) {
    return (
      <CandidateProfileForm
        initialFullName={fullName}
        initialEmail={email}
        initialHeadline={state.draft.headline}
        initialLocation={state.draft.location}
        initialLinkedinUrl={state.draft.linkedinUrl}
        initialSummary={state.draft.summary}
        initialSkills={state.draft.skills}
        initialCvUrl={null}
        initialCvDownloadUrl={null}
        action={completarOnboardingAction}
        submitLabel="Finalizar registro"
      />
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto border border-border/80 bg-surface animate-pop-in">
      <CardContent className="p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted">
              Pegá tu CV o tu perfil de LinkedIn
            </label>
            <textarea
              name="rawText"
              rows={10}
              placeholder="Pegá acá el texto de tu CV o de tu perfil de LinkedIn…"
              required
              className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {state.error && (
            <p className="text-xs font-medium text-danger bg-danger/5 p-3 rounded-[var(--radius)] border border-danger/10">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full font-bold py-3">
            {pending ? "Generando perfil…" : "Generar con IA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
