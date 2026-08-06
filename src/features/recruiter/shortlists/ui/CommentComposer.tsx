"use client";

import { useActionState, useRef } from "react";
import { postearComentarioAction } from "../actions";
import type { PostearComentarioState } from "../actions";

type Props = {
  shortlistCandidateId: string;
  shortlistId: string;
  jobId: string;
};

const initialState: PostearComentarioState = {};

/** Composer del hilo de comentarios — solo Recruiting escribe acá (es también el canal para
 *  responder al feedback que dejó el Cliente/HM). */
export function CommentComposer({ shortlistCandidateId, shortlistId, jobId }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, isPending] = useActionState<PostearComentarioState, FormData>(
    async (prev, formData) => {
      const result = await postearComentarioAction(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    initialState,
  );

  return (
    <form ref={formRef} action={dispatch} className="flex flex-col gap-2 border-t border-border pt-4">
      <input type="hidden" name="shortlistCandidateId" value={shortlistCandidateId} />
      <input type="hidden" name="shortlistId" value={shortlistId} />
      <input type="hidden" name="jobId" value={jobId} />
      <textarea
        name="body"
        rows={2}
        placeholder="Responder o comentar para el Cliente/Hiring Manager…"
        className="w-full resize-none rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
      />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit self-end rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Comentar"}
      </button>
    </form>
  );
}
