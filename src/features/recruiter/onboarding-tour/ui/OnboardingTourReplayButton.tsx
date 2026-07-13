"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OnboardingTour } from "./OnboardingTour";

/** Vuelve a mostrar el tour on-demand, sin tocar el estado persistido de descarte. */
export function OnboardingTourReplayButton() {
  const [show, setShow] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setShow(true)}>
        Ver el tour de nuevo
      </Button>
      {show && <OnboardingTour onDismiss={() => setShow(false)} />}
    </>
  );
}
