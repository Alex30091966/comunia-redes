import React from "react";
import { Composition } from "remotion";
import { Reel, Portada, duracionTotal } from "./Reel";
import plan from "./plan.json";

export const Root: React.FC = () => (
  <>
    <Composition id="reel" component={Reel} durationInFrames={duracionTotal(plan as any)} fps={30} width={1080} height={1920} defaultProps={{ plan: plan as any }} />
    <Composition id="portada" component={Portada} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ plan: plan as any }} />
  </>
);
