import "./landing.css";
import { instrumentSerif, manrope, pacifico } from "./fonts";
import { DemoTabProvider } from "./components/DemoTabContext";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { PainSection } from "./components/PainSection";
import { MoreThanAts } from "./components/MoreThanAts";
import { WhatChanges } from "./components/WhatChanges";
import { Audience } from "./components/Audience";
import { Solutions } from "./components/Solutions";
import { AiCopilot } from "./components/AiCopilot";
import { Comparativa } from "./components/Comparativa";
import { FinalCta } from "./components/FinalCta";
import { Footer } from "./components/Footer";

export function LandingPage() {
  return (
    <div
      className={`wh-landing ${instrumentSerif.variable} ${manrope.variable} ${pacifico.variable}`}
    >
      <div className="ambient" />
      <div className="guide-l" />
      <div className="guide-r" />

      <div className="page">
        <DemoTabProvider>
          <Nav />
          <Hero />

          <div className="divider-d" />
          <WhatChanges />
          <PainSection />
          <div className="divider-d" />
          <MoreThanAts />
          <div className="divider-d" />
          <Audience />
          <div className="divider-d" />

          {/* <Solutions /> */}

          <div className="divider-d" />
          <AiCopilot />
        </DemoTabProvider>

        <div className="divider-d" />
        <Comparativa />
        <FinalCta />
        <Footer />
      </div>
    </div>
  );
}
