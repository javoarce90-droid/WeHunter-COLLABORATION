"use client";

import { type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant, type ButtonSize } from "./button";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function SubmitButton({ children, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}
