"use client";

import { useRef } from "react";

/**
 * Alone di luce che segue il puntatore e leggera inclinazione 3D del riquadro.
 * Solo su dispositivi con mouse; con "riduci animazioni" resta fermo.
 */
export function Spotlight({
  children,
  className = "",
  tone = "light",
  tilt = true,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--sx", `${x * 100}%`);
      el.style.setProperty("--sy", `${y * 100}%`);
      if (tilt) {
        el.style.setProperty("--rx", `${(0.5 - y) * 5}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * 6}deg`);
      }
    });
  }

  function leave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`spotlight spotlight-${tone} ${className}`}>
      {children}
    </div>
  );
}
