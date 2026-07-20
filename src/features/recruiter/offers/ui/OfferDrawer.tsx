"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, fieldClasses, fieldLabelClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import {
  crearOfertaAction,
  editarOfertaAction,
  loadOfferDetailAction,
  draftOfferAction,
} from "../actions";
import { OFFER_TEMPLATES } from "../schema";
import type { OfferDetail } from "../data/offers.queries";

export type ApplicationOption = { applicationId: string; candidateName: string };

type Props = {
  jobId: string;
  jobTitle: string;
  applications: ApplicationOption[];
  /** offerId a editar, "new" para crear, o null (cerrado). */
  editing: string | "new" | null;
  onClose: () => void;
  onSaved: () => void;
};

/** Foco visible estándar para botones de texto sin fondo (gap WCAG AA de PRODUCT.md). */
const focusRing =
  "rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

export function OfferDrawer({ jobId, jobTitle, applications, editing, onClose, onSaved }: Props) {
  const isNew = editing === "new";

  // Detalle cargado en modo edición. setState solo en el callback async (no sincrónico):
  // así no disparamos renders en cascada dentro del efecto.
  const [loaded, setLoaded] = useState<{ id: string; detail: OfferDetail | null } | null>(null);

  useEffect(() => {
    if (!editing || editing === "new") return;
    let active = true;
    loadOfferDetailAction(editing).then((d) => {
      if (active) setLoaded({ id: editing, detail: d });
    });
    return () => {
      active = false;
    };
  }, [editing]);

  const loading = editing !== null && !isNew && loaded?.id !== editing;
  const detail = loaded?.id === editing ? loaded.detail : null;

  return (
    <OfferDrawerShell
      open={editing !== null}
      isNew={isNew}
      loading={loading}
      onClose={onClose}
    >
      {/* key por editing: remonta el form con defaultValue fresco al cambiar de oferta. */}
      {!loading && editing !== null && (
        <OfferForm
          key={String(editing)}
          jobId={jobId}
          jobTitle={jobTitle}
          applications={applications}
          isNew={isNew}
          offerId={isNew ? null : editing}
          detail={detail}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </OfferDrawerShell>
  );
}

function OfferDrawerShell({
  open,
  isNew,
  loading,
  onClose,
  children,
}: {
  open: boolean;
  isNew: boolean;
  loading: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="right"
      className="max-w-[460px]"
      header={
        <p className="font-display text-base font-bold text-text">
          {isNew ? "Nueva oferta" : "Editar oferta"}
        </p>
      }
    >
      {loading ? <p className="py-8 text-center text-sm text-muted">Cargando…</p> : children}
    </Dialog>
  );
}

function OfferForm({
  jobId,
  jobTitle,
  applications,
  isNew,
  offerId,
  detail,
  onClose,
  onSaved,
}: {
  jobId: string;
  jobTitle: string;
  applications: ApplicationOption[];
  isNew: boolean;
  offerId: string | null;
  detail: OfferDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [drafting, startDraft] = useTransition();

  const action = isNew ? crearOfertaAction : editarOfertaAction.bind(null, jobId);
  const [state, dispatch, isPending] = useActionState<{ error?: string }, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result.error) onSaved();
      return result;
    },
    {},
  );

  function applyTemplate(id: string) {
    const tpl = OFFER_TEMPLATES.find((t) => t.id === id);
    if (!tpl || !bodyRef.current) return;
    bodyRef.current.value = tpl.body.replaceAll("{puesto}", detail?.title || jobTitle);
  }

  function generateWithAi() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    const applicationId = String(fd.get("applicationId") ?? "");
    const candidateName = isNew
      ? (applications.find((a) => a.applicationId === applicationId)?.candidateName ?? "")
      : (detail?.candidateName ?? "");
    const amount = String(fd.get("salaryAmount") ?? "").trim();
    const currency = String(fd.get("salaryCurrency") ?? "").trim();
    const salary = amount ? `${currency ? currency + " " : ""}${amount}` : null;

    startDraft(async () => {
      const res = await draftOfferAction(title, candidateName, salary);
      if (!res.ok || !res.body) {
        toast({ message: res.error ?? "No se pudo generar.", variant: "danger" });
        return;
      }
      if (bodyRef.current) bodyRef.current.value = res.body;
    });
  }

  return (
    <form ref={formRef} action={dispatch} className="flex flex-col gap-4">
      {isNew ? (
        <>
          <input type="hidden" name="jobId" value={jobId} />
          <Select
            label="Candidato finalista"
            id="applicationId"
            name="applicationId"
            required
            defaultValue=""
          >
            <option value="">Seleccioná un candidato…</option>
            {applications.map((a) => (
              <option key={a.applicationId} value={a.applicationId}>
                {a.candidateName}
              </option>
            ))}
          </Select>
        </>
      ) : (
        <input type="hidden" name="offerId" value={offerId ?? ""} />
      )}

      <Input label="Puesto *" id="title" name="title" required defaultValue={detail?.title ?? jobTitle} />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Salario"
          id="salaryAmount"
          name="salaryAmount"
          type="number"
          min={1}
          defaultValue={detail?.salaryAmount ?? ""}
        />
        <Input
          label="Moneda"
          id="salaryCurrency"
          name="salaryCurrency"
          placeholder="ARS, USD…"
          defaultValue={detail?.salaryCurrency ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fecha de inicio"
          id="startDate"
          name="startDate"
          type="date"
          defaultValue={detail?.startDate ?? ""}
        />
        <Input
          label="Válida hasta"
          id="validUntil"
          name="validUntil"
          type="date"
          defaultValue={detail?.validUntil ?? ""}
        />
      </div>

      <Input
        label="Beneficios"
        id="benefits"
        name="benefits"
        placeholder="Prepaga, home office, bonus…"
        defaultValue={detail?.benefits ?? ""}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="body" className={fieldLabelClass}>
            Carta de oferta
          </label>
          <div className="flex items-center gap-2">
            <select
              aria-label="Aplicar template"
              defaultValue=""
              onChange={(e) => {
                applyTemplate(e.target.value);
                e.target.selectedIndex = 0;
              }}
              className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-muted outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <option value="">Template…</option>
              {OFFER_TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <AiButton type="button" onClick={generateWithAi} loading={drafting}>
              Generar
            </AiButton>
          </div>
        </div>
        <textarea
          id="body"
          name="body"
          ref={bodyRef}
          rows={5}
          defaultValue={detail?.body ?? ""}
          className={`${fieldClasses()} resize-y`}
        />
      </div>

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className={`text-sm font-semibold text-muted hover:text-text ${focusRing}`}
        >
          Cancelar
        </button>
        <Button type="submit" loading={isPending}>
          {isNew ? "Crear oferta" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
