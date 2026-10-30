"use client";

import { useState } from "react";

export function CopyField({ value, big }: { value: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <input readOnly value={value} className={`field ${big ? "font-mono text-[20px] font-semibold tracking-wider" : "text-[14px]"}`} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn-secondary shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          } catch {}
        }}
      >
        {done ? "Copiato" : "Copia"}
      </button>
    </div>
  );
}
