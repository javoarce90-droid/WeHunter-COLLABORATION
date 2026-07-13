"use client";

export function NoopLink({
  children,
  className,
  message,
}: {
  children: React.ReactNode;
  className?: string;
  message?: string;
}) {
  return (
    <a
      href="#"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        if (message) alert(message);
      }}
    >
      {children}
    </a>
  );
}
