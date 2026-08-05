import Link from "next/link";
import type { ReactNode } from "react";

const chipBase =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold outline-none transition-[transform,color,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] active:scale-[0.97]";

function chipClass(active: boolean, tone?: "danger") {
  if (active)
    return `${chipBase} border-primary bg-primary-light text-primary-hover`;
  const text =
    tone === "danger"
      ? "text-danger hover:text-danger"
      : "text-muted hover:text-text";
  return `${chipBase} border-border ${text}`;
}

export function FilterChipGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-2"
    >
      {children}
    </div>
  );
}

type BaseProps = {
  active: boolean;
  count?: number;
  tone?: "danger";
  children: ReactNode;
};

export function FilterChip(
  props: BaseProps & ({ href: string } | { onClick: () => void }),
) {
  const { active, count, tone, children } = props;
  const cls = chipClass(active, tone);
  const inner = (
    <>
      {children}
      {count !== undefined && (
        <span className="tabular-nums opacity-70">{count}</span>
      )}
    </>
  );

  if ("href" in props) {
    return (
      <Link
        href={props.href}
        aria-current={active ? "page" : undefined}
        className={cls}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={active}
      className={cls}
    >
      {inner}
    </button>
  );
}
