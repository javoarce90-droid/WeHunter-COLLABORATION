import type { HTMLAttributes } from "react";

type CardVariant = "default" | "kpi";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface border border-border rounded-[var(--radius)] shadow-[var(--shadow)]",
  kpi: "bg-surface border border-border rounded-xl shadow-[var(--shadow)] transition hover:border-primary/35 hover:shadow-md",
};

export function Card({
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[variantClasses[variant], className].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["p-5 border-b border-border", className].join(" ")} {...props} />;
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["p-5", className].join(" ")} {...props} />;
}

export function CardFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["p-5 border-t border-border", className].join(" ")} {...props} />;
}
