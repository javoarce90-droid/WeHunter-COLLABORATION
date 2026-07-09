"use client";

import type { DemoTabId } from "./DemoTabContext";
import { useDemoTab } from "./DemoTabContext";

export function GoDemoTabLink({
  tab,
  children,
}: {
  tab: DemoTabId;
  children: React.ReactNode;
}) {
  const { setActiveTab } = useDemoTab();

  return (
    <span
      className="sol-link"
      role="button"
      tabIndex={0}
      onClick={() => {
        setActiveTab(tab);
        document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setActiveTab(tab);
          document
            .getElementById("demo")
            ?.scrollIntoView({ behavior: "smooth" });
        }
      }}
    >
      {children}
    </span>
  );
}
