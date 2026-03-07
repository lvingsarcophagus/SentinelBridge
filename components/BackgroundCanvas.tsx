"use client";

import { CanvasRevealEffect } from "./CanvasRevealEffect";

export function BackgroundCanvas() {
  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <CanvasRevealEffect
        animationSpeed={0.5}
        containerClassName="absolute inset-0"
        colors={[
          [0, 255, 200],    // Cyan - Primary
          [59, 130, 246],   // Blue - Secondary
          [139, 92, 246],   // Purple - Accent
        ]}
        dotSize={3}
        opacities={[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1]}
        showGradient={true}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
    </div>
  );
}
