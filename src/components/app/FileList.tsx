import { dateShort, fileSize } from "@/lib/format";
import type { StoredFile } from "@/lib/types";

function ext(name: string) {
  return (name.split(".").pop() ?? "").toUpperCase().slice(0, 4);
}

export function FileIcon({ name }: { name: string }) {
  const e = ext(name);
  const tone = e === "PDF" ? "text-ceralacca" : e.startsWith("DOC") || e === "ODT" ? "text-codice" : "text-slate";
  return (
    <span aria-hidden className={`grid h-10 w-9 shrink-0 place-items-center rounded-[4px] border border-line bg-paper text-[10px] font-bold ${tone}`}>
      {e || "FILE"}
    </span>
  );
}

/** Elenco di file scaricabili tramite il download protetto. */
export function FileList({
  files,
  kind,
  empty,
  renderAction,
}: {
  files: StoredFile[];
  kind: "esercitazione" | "lezione";
  empty?: string;
  renderAction?: (f: StoredFile) => React.ReactNode;
}) {
  if (!files.length) return empty ? <p className="text-[15px] text-mute">{empty}</p> : null;
  return (
    <ul className="divide-y divide-line-soft rounded-[10px] border border-line bg-surface">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
          <FileIcon name={f.file_name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-ink">{f.file_name}</p>
            <p className="text-sm text-mute">
              {fileSize(f.size_bytes)}, caricato il {dateShort(f.created_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {f.file_name.toLowerCase().endsWith(".pdf") && (
              <a href={`/api/files/${kind}/${f.id}?apri=1`} target="_blank" rel="noopener" className="btn-ghost btn-sm">
                Apri
              </a>
            )}
            <a href={`/api/files/${kind}/${f.id}`} className="btn-secondary btn-sm">Scarica</a>
            {renderAction?.(f)}
          </div>
        </li>
      ))}
    </ul>
  );
}
