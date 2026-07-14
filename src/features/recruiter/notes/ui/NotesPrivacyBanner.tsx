export function NotesPrivacyBanner() {
  return (
    <p className="flex items-center gap-1.5 rounded-[var(--radius)] bg-bg px-3 py-2 text-xs text-muted">
      <span aria-hidden>🔒</span>
      Estas notas solo las ves vos — no son visibles para la empresa ni el candidato.
    </p>
  );
}
