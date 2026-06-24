import type { HTMLAttributes } from "react";
import type { Application } from "@/db/schema";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "muted"
  | "blue";

type StageVariant = Application["stage"];

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant | StageVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-[#D1FAE5] text-[#065F46]",
  warning: "bg-[#FEF3C7] text-[#92400E]",
  danger: "bg-[#FEE2E2] text-[#991B1B]",
  primary: "bg-primary-light text-primary-hover",
  muted: "bg-[#F3F4F6] text-[#374151]",
  blue: "bg-[#DBEAFE] text-[#1E40AF]",
};

const stageClasses: Record<StageVariant, string> = {
  new: "bg-[#F3F4F6] text-[#374151]",
  screening: "bg-[#DBEAFE] text-[#1E40AF]",
  interview: "bg-[#FEF3C7] text-[#92400E]",
  interview_hr: "bg-[#FEF3C7] text-[#92400E]",
  interview_tech: "bg-[#FDE68A] text-[#78350F]",
  interview_client: "bg-[#EDE9FE] text-[#5B21B6]",
  offer: "bg-primary-light text-primary-hover",
  hired: "bg-[#D1FAE5] text-[#065F46]",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
};

const stageKeys = new Set<string>([
  "new", "screening", "interview", "interview_hr", "interview_tech",
  "interview_client", "offer", "hired", "rejected",
]);

export function Badge({
  variant = "muted",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const colorClass = stageKeys.has(variant as string)
    ? stageClasses[variant as StageVariant]
    : variantClasses[variant as BadgeVariant];

  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
        colorClass,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
