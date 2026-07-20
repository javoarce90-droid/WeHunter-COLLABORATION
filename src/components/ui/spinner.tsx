export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-block h-[1em] w-[1em] shrink-0 animate-spin rounded-full align-[-0.125em]",
        "border-2 border-current border-r-transparent",
        className,
      ].join(" ")}
    />
  );
}
