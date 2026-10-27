"use client";

import { useId, useRef, useState } from "react";
import { ACCEPT, validateFile } from "@/lib/upload";

/** Area di trascinamento file, accessibile anche da tastiera. */
export function Dropzone({
  onFiles,
  disabled,
  label = "Trascina qui i file o scegli dal computer",
  multiple = true,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  multiple?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function take(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list);
    const errs = files.map(validateFile).filter(Boolean) as string[];
    setError(errs.length ? errs.join(" ") : null);
    const ok = files.filter((f) => !validateFile(f));
    if (ok.length) onFiles(ok);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) take(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed px-6 py-8 text-center transition-colors ${
          disabled ? "cursor-not-allowed opacity-60" : over ? "border-codice bg-codice-soft" : "border-line bg-surface hover:border-slate"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-7 text-codice">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="mt-2 text-[15px] font-medium text-ink">{label}</span>
        <span className="mt-1 text-sm text-mute">PDF, Word, ODT, RTF, TXT o immagini. Massimo 50 MB per file.</span>
        <input
          id={id}
          ref={input}
          type="file"
          className="sr-only"
          accept={ACCEPT}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => take(e.target.files)}
        />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-ceralacca">{error}</p>}
    </div>
  );
}
