"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveAnnotations } from "@/app/docente/actions";

/* ------------------------------------------------------------------ */
/*  Tipi delle annotazioni (coordinate in unità: larghezza pagina = 1000) */
/* ------------------------------------------------------------------ */

type Pt = [number, number];
type Stroke = { id: string; tool: "pen" | "highlight"; color: string; width: number; points: Pt[] };
type Note = { id: string; x: number; y: number; text: string };
type PageAnn = { strokes: Stroke[]; notes: Note[]; margin?: string };
export type Annotations = { pages: Record<string, PageAnn> };

type Tool = "move" | "pen" | "highlight" | "note" | "eraser";

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const PDFLIB = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";

const PEN_COLORS = [
  { value: "#c0261b", label: "Rosso" },
  { value: "#1f4fbf", label: "Blu" },
  { value: "#1d7a4c", label: "Verde" },
];
// evidenziatore rosso tenue, come la penna del correttore nella vetrina
const HIGHLIGHT = "#d24a35";

/* eslint-disable @typescript-eslint/no-explicit-any */
const scripts = new Map<string, Promise<void>>();
function loadScript(src: string) {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          scripts.delete(src);
          reject(new Error("script"));
        };
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}

const uid = () => Math.random().toString(36).slice(2, 10);

// colonna a margine a righe: si scrive liberamente, rigo dopo rigo
const LH = 26; // altezza del rigo in px
const PAD = 8; // spazio sopra il primo rigo
const ruled = {
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${LH - 1}px, rgb(163 48 29 / 0.16) ${LH - 1}px, rgb(163 48 29 / 0.16) ${LH}px)`,
  backgroundPosition: `0 ${PAD}px`,
  backgroundAttachment: "local" as const,
  lineHeight: `${LH}px`,
  paddingTop: PAD,
};

/** Area a righe del margine: un clic su un rigo vuoto porta lì il cursore. */
function MarginWriter({
  value,
  onChange,
  readOnly,
  minHeight,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  minHeight: number;
  placeholder?: string;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [h, setH] = useState(minHeight);

  // altezza: almeno quanto la pagina, poi cresce con il testo
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    const prev = el.style.height;
    el.style.height = "0px";
    const need = el.scrollHeight + LH;
    el.style.height = prev;
    setH(Math.max(minHeight, need));
  }, [value, minHeight]);

  const cls = "block w-full resize-none bg-transparent px-1 font-serif text-[15px] italic text-ceralacca outline-none placeholder:text-ceralacca/35";

  if (readOnly) {
    return (
      <div className={`${cls} whitespace-pre-wrap break-words`} style={{ ...ruled, minHeight }}>
        {value}
      </div>
    );
  }

  return (
    <textarea
      ref={ta}
      value={value}
      spellCheck
      placeholder={placeholder}
      aria-label="Annotazioni a margine"
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const line = Math.floor((e.clientY - r.top + el.scrollTop - PAD) / LH);
        if (line < 0) return;
        // righe di testo già occupate (contando gli a capo automatici)
        const prev = el.style.height;
        el.style.height = "0px";
        const used = value ? Math.round((el.scrollHeight - PAD) / LH) : 0;
        el.style.height = prev;
        if (line < used) return; // clic dentro il testo: comportamento normale
        e.preventDefault();
        const add = value ? line - used + 1 : line;
        const next = value + "\n".repeat(Math.max(0, add));
        onChange(next);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(next.length, next.length);
        });
      }}
      className={`${cls} cursor-text`}
      style={{ ...ruled, height: h }}
    />
  );
}
const empty = (): PageAnn => ({ strokes: [], notes: [] });

function pathOf(points: Pt[]) {
  if (!points.length) return "";
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M${x} ${y} L${x + 0.1} ${y + 0.1}`;
  }
  // curva morbida passando per i punti medi
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }
  const last = points[points.length - 1];
  return d + ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

/* ------------------------------------------------------------------ */
/*  Pagina: PDF disegnato su canvas + livello delle annotazioni          */
/* ------------------------------------------------------------------ */

function PdfPage({
  pdf,
  index,
  width,
  ratio,
  ann,
  tool,
  color,
  readOnly,
  onChange,
  onText,
  margin,
  total,
  fileName,
}: {
  onText: (next: PageAnn) => void;
  margin: number;
  total: number;
  fileName: string;
  pdf: any;
  index: number;
  width: number;
  ratio: number;
  ann: PageAnn;
  tool: Tool;
  color: string;
  readOnly: boolean;
  onChange: (next: PageAnn) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<Stroke | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const H = 1000 * ratio;

  useEffect(() => {
    let task: any;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(index + 1);
      if (cancelled || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      task = page.render({ canvasContext: c.getContext("2d"), viewport });
      await task.promise.catch(() => {});
    })();
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [pdf, index, width]);

  const toPoint = (e: React.PointerEvent): Pt => {
    const r = svg.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 1000, ((e.clientY - r.top) / r.height) * H];
  };

  function down(e: React.PointerEvent<SVGSVGElement>) {
    if (readOnly) return;
    if (tool === "pen" || tool === "highlight") {
      e.preventDefault();
      svg.current!.setPointerCapture(e.pointerId);
      setDrawing({
        id: uid(),
        tool,
        color: tool === "highlight" ? HIGHLIGHT : color,
        width: tool === "highlight" ? 20 : 2.6,
        points: [toPoint(e)],
      });
    } else if (tool === "note") {
      const [x, y] = toPoint(e);
      const n: Note = { id: uid(), x, y, text: "" };
      onChange({ ...ann, notes: [...ann.notes, n] });
      setEditing(n.id);
    }
  }

  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    const p = toPoint(e);
    const last = drawing.points[drawing.points.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
    setDrawing({ ...drawing, points: [...drawing.points, p] });
  }

  function up() {
    if (!drawing) return;
    onChange({ ...ann, strokes: [...ann.strokes, drawing] });
    setDrawing(null);
  }

  const erase = (id: string) => onChange({ ...ann, strokes: ann.strokes.filter((s) => s.id !== id) });
  const removeNote = (id: string) => onChange({ ...ann, notes: ann.notes.filter((n) => n.id !== id) });
  const setNote = (id: string, text: string) => onChange({ ...ann, notes: ann.notes.map((n) => (n.id === id ? { ...n, text } : n)) });

  const drawingTool = !readOnly && (tool === "pen" || tool === "highlight");
  const cursor = readOnly || tool === "move" ? "default" : tool === "eraser" ? "pointer" : tool === "note" ? "copy" : "crosshair";

  // note numerate in ordine dall'alto
  const ordered = ann.notes.map((n, i) => ({ n, num: i + 1 })).sort((a, b) => a.n.y - b.n.y);
  const pageH = width * ratio;
  const setMargin = (v: string) => onText({ ...ann, margin: v });

  const noteBody = (n: Note, num: number) => (
    <div className="group/note">
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full bg-ceralacca text-[11px] font-semibold not-italic text-white">{num}</span>
        <div className="min-w-0 flex-1">
          {!readOnly && (editing === n.id || !n.text) ? (
            <textarea
              autoFocus
              rows={3}
              value={n.text}
              onChange={(e) => setNote(n.id, e.target.value)}
              onBlur={() => {
                setEditing(null);
                if (!n.text.trim()) removeNote(n.id);
              }}
              className="w-full resize-y rounded-[6px] border border-ceralacca/30 bg-white p-1.5 font-serif text-[15px] italic text-ceralacca outline-none focus:border-ceralacca/60"
              placeholder="Scrivi la nota…"
            />
          ) : (
            <p
              className={`whitespace-pre-wrap break-words font-serif text-[15px] italic leading-snug text-ceralacca ${readOnly ? "" : "cursor-text"}`}
              onClick={() => !readOnly && setEditing(n.id)}
            >
              {n.text}
            </p>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => removeNote(n.id)}
            className="shrink-0 text-[13px] text-ceralacca/50 opacity-100 hover:text-ceralacca sm:opacity-0 sm:group-hover/note:opacity-100"
            aria-label="Elimina la nota"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto rounded-[8px] bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12),0_12px_32px_-12px_rgb(0_0_0/0.25)]" style={{ width: width + margin + (margin ? 40 : 0) }}>
      {/* intestazione come un fascicolo */}
      <div className="flex items-baseline justify-between gap-3 border-b border-line-soft px-4 py-2.5 sm:px-5">
        <p className="truncate font-serif text-[15px] italic text-slate">{fileName.replace(/\.[^.]+$/, "")}</p>
        <p className="shrink-0 text-[13px] text-mute">pag. {index + 1} di {total}</p>
      </div>
      <div className="flex">
        <div className="relative shrink-0" style={{ width, height: pageH }}>
          <canvas ref={canvas} className="absolute inset-0 size-full" />
          <svg
            ref={svg}
            viewBox={`0 0 1000 ${H}`}
            className="absolute inset-0 size-full"
            style={{ cursor, touchAction: drawingTool ? "none" : "auto" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            {[...ann.strokes, ...(drawing ? [drawing] : [])].map((s) => (
              <path
                key={s.id}
                d={pathOf(s.points)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinecap={s.tool === "highlight" ? "butt" : "round"}
                strokeLinejoin="round"
                opacity={s.tool === "highlight" ? 0.22 : 0.95}
                style={{ mixBlendMode: s.tool === "highlight" ? "multiply" : "normal", pointerEvents: tool === "eraser" && !readOnly ? "stroke" : "none" }}
                className={tool === "eraser" && !readOnly ? "hover:opacity-30" : ""}
                onClick={() => tool === "eraser" && !readOnly && erase(s.id)}
              />
            ))}
          </svg>
          {/* richiami numerati sul testo */}
          {ann.notes.map((n, i) => (
            <span
              key={n.id}
              aria-hidden
              className="pointer-events-none absolute z-10 grid size-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ceralacca text-[11px] font-semibold text-white ring-2 ring-white"
              style={{ left: `${n.x / 10}%`, top: `${(n.y / H) * 100}%` }}
            >
              {i + 1}
            </span>
          ))}
        </div>
        {margin > 0 && (
          <div className="relative ml-5 mr-5 shrink-0 border-l border-dashed border-ceralacca/40 pl-3" style={{ width: margin }}>
            <MarginWriter
              value={ann.margin ?? ""}
              onChange={setMargin}
              readOnly={readOnly}
              minHeight={pageH}
              placeholder={index === 0 ? "Scrivi qui a margine: clicca su un rigo e scrivi…" : undefined}
            />
          </div>
        )}
      </div>
      {/* su telefono il margine va sotto la pagina */}
      {margin === 0 && (!readOnly || ann.margin) && (
        <div className="border-t border-dashed border-ceralacca/40 px-4 py-2">
          <MarginWriter value={ann.margin ?? ""} onChange={setMargin} readOnly={readOnly} minHeight={LH * 3 + PAD} placeholder="Annotazioni su questa pagina…" />
        </div>
      )}
      {/* note numerate, richiamate sul testo */}
      {ordered.length > 0 && (
        <div className="space-y-3 border-t border-dashed border-ceralacca/40 px-4 py-3 sm:px-5">
          {ordered.map((o) => (
            <div key={o.n.id}>{noteBody(o.n, o.num)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Correttore a schermo intero                                          */
/* ------------------------------------------------------------------ */

export function PdfAnnotator({
  fileId,
  fileName,
  initial,
  readOnly = false,
  onClose,
  verdict,
}: {
  fileId: string;
  fileName: string;
  initial: Annotations | null;
  readOnly?: boolean;
  onClose: () => void;
  /** Giudizio del docente, mostrato in fondo al documento (vista del discente). */
  verdict?: { grade: string | null; feedback: string; total: number | null } | null;
}) {
  const [pdf, setPdf] = useState<any>(null);
  const [sizes, setSizes] = useState<number[]>([]); // rapporto altezza/larghezza per pagina
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Apertura del documento…");
  const [ann, setAnn] = useState<Annotations>(initial?.pages ? initial : { pages: {} });
  const [history, setHistory] = useState<Annotations[]>([]);
  const [tool, setTool] = useState<Tool>(readOnly ? "move" : "pen");
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [avail, setAvail] = useState(820);
  // colonna delle note a margine quando c'è spazio, altrimenti le note vanno sotto la pagina
  const margin = avail >= 760 ? 230 : 0;
  const width = Math.max(300, Math.min(820, avail - (margin ? margin + 40 : 0)));
  const area = useRef<HTMLDivElement>(null);
  const bytes = useRef<ArrayBuffer | null>(null);
  const dirty = useRef(false);
  const annRef = useRef(ann);
  annRef.current = ann;
  const pendingSave = useRef(false);

  // caricamento: PDF (con conversione dei Word lato server) + pdf.js
  useEffect(() => {
    let alive = true;
    const slow = setTimeout(() => alive && setLoadingMsg("Conversione del documento in PDF… può richiedere qualche secondo."), 2500);
    (async () => {
      try {
        const [res] = await Promise.all([fetch(`/api/pdf/${fileId}`), loadScript(PDFJS)]);
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? "Impossibile aprire il documento.");
        }
        const buf = await res.arrayBuffer();
        bytes.current = buf.slice(0);
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        const doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
        const ratios: number[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const v = (await doc.getPage(i)).getViewport({ scale: 1 });
          ratios.push(v.height / v.width);
        }
        if (!alive) return;
        setSizes(ratios);
        setPdf(doc);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Impossibile aprire il documento.");
      } finally {
        clearTimeout(slow);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(slow);
    };
  }, [fileId]);

  // larghezza delle pagine in base allo schermo
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setAvail(Math.max(300, el.clientWidth - 32));
    measure();
    const ro = new ResizeObserver(() => {
      const next = Math.max(300, el.clientWidth - 32);
      setAvail((w) => (Math.abs(w - next) > 40 ? next : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // blocca lo scorrimento della pagina sotto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // salvataggio automatico
  useEffect(() => {
    if (readOnly || !dirty.current) return;
    setSave("saving");
    pendingSave.current = true;
    const t = setTimeout(async () => {
      pendingSave.current = false;
      const res = await saveAnnotations(fileId, ann);
      setSave(res.ok ? "saved" : "error");
    }, 1200);
    return () => clearTimeout(t);
  }, [ann, fileId, readOnly]);

  const updatePage = useCallback((i: number, next: PageAnn, typing = false) => {
    dirty.current = true;
    const prev = annRef.current;
    if (!typing) setHistory((h) => [...h.slice(-49), prev]);
    setAnn({ pages: { ...prev.pages, [String(i)]: next } });
  }, []);

  function undo() {
    if (!history.length) return;
    dirty.current = true;
    setAnn(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }

  // alla chiusura salva subito le ultime modifiche ancora in attesa
  async function close() {
    if (!readOnly && pendingSave.current) {
      pendingSave.current = false;
      setSave("saving");
      await saveAnnotations(fileId, annRef.current);
    }
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !readOnly) {
        const t = e.target as HTMLElement;
        if (t.tagName === "TEXTAREA") return;
        e.preventDefault();
        undo();
      }
      if (e.key === "Escape" && (e.target as HTMLElement).tagName !== "TEXTAREA") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function download() {
    if (!bytes.current) return;
    try {
      await loadScript(PDFLIB);
      const { PDFDocument, rgb, StandardFonts } = (window as any).PDFLib;
      const doc = await PDFDocument.load(bytes.current.slice(0));
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
      const safe = (t: string) => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E -ÿ\n]/g, "?");

      doc.getPages().forEach((page: any, i: number) => {
        const a = ann.pages[String(i)];
        if (!a) return;
        const { width: pw, height: ph } = page.getSize();
        const s = pw / 1000;
        for (const st of a.strokes) {
          page.drawSvgPath(pathOf(st.points), {
            x: 0,
            y: ph,
            scale: s,
            borderColor: hex(st.color),
            borderWidth: st.width * s,
            borderOpacity: st.tool === "highlight" ? 0.22 : 0.95,
            borderLineCap: st.tool === "highlight" ? 0 : 1,
          });
        }
        a.notes.forEach((n, k) => {
          const size = 9;
          const boxW = 170;
          const words = safe(n.text).split(/\s+/);
          const lines: string[] = [];
          let line = "";
          for (const w of words) {
            const t = line ? `${line} ${w}` : w;
            if (font.widthOfTextAtSize(t, size) > boxW - 12 && line) {
              lines.push(line);
              line = w;
            } else line = t;
          }
          if (line) lines.push(line);
          const boxH = 18 + lines.length * (size + 3);
          const x = Math.min(n.x * s, pw - boxW - 4);
          const top = ph - n.y * s;
          page.drawRectangle({ x, y: top - boxH, width: boxW, height: boxH, color: rgb(1, 0.97, 0.9), borderColor: hex("#c0261b"), borderWidth: 0.8, opacity: 0.96 });
          page.drawText(`NOTA ${k + 1}`, { x: x + 6, y: top - 11, size: 7, font: bold, color: hex("#c0261b") });
          lines.forEach((l, j) => page.drawText(l, { x: x + 6, y: top - 22 - j * (size + 3), size, font, color: hex("#5a1a12") }));
        });

        // annotazioni a margine: la pagina si allarga a destra e il testo segue i righi dello schermo
        if (a.margin?.trim()) {
          const k = pw / width; // unità PDF per pixel a schermo
          const extra = Math.round(pw * 0.32);
          page.setSize(pw + extra, ph);
          try {
            page.setCropBox(0, 0, pw + extra, ph);
          } catch {}
          page.drawRectangle({ x: pw, y: 0, width: extra, height: ph, color: rgb(1, 1, 1) });
          page.drawLine({ start: { x: pw + 6, y: 0 }, end: { x: pw + 6, y: ph }, thickness: 0.6, color: hex("#c0261b"), opacity: 0.35, dashArray: [3, 3] });
          const lh = LH * k;
          const size = Math.min(10, lh * 0.55);
          const maxW = extra - 20;
          const rows: string[] = [];
          for (const raw of safe(a.margin).split("\n")) {
            if (!raw.trim()) {
              rows.push("");
              continue;
            }
            let line = "";
            for (const w of raw.split(/\s+/)) {
              const t = line ? `${line} ${w}` : w;
              if (font.widthOfTextAtSize(t, size) > maxW && line) {
                rows.push(line);
                line = w;
              } else line = t;
            }
            rows.push(line);
          }
          rows.forEach((r, j) => {
            const base = ph - (PAD * k + (j + 1) * lh) + lh * 0.28;
            if (base < 4) return;
            page.drawLine({ start: { x: pw + 12, y: ph - (PAD * k + (j + 1) * lh) }, end: { x: pw + extra - 8, y: ph - (PAD * k + (j + 1) * lh) }, thickness: 0.4, color: hex("#c0261b"), opacity: 0.18 });
            if (r) page.drawText(r, { x: pw + 14, y: base, size, font, color: hex("#a3301d") });
          });
        }
      });

      const out = await doc.save();
      const url = URL.createObjectURL(new Blob([out], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.replace(/\.[^.]+$/, "")} - corretto.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      alert("Non è stato possibile creare il PDF annotato.");
    }
  }

  const ToolBtn = ({ t, label, children }: { t: Tool; label: string; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => setTool(t)}
      aria-pressed={tool === t}
      title={label}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors ${
        tool === t ? "bg-ink text-white" : "text-ink hover:bg-paper"
      }`}
    >
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  const noteCount = Object.values(ann.pages).reduce((n, p) => n + p.notes.length, 0);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#e8e5de]" role="dialog" aria-label={`Correzione di ${fileName}`}>
      {/* barra degli strumenti */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-surface/95 px-3 py-2 backdrop-blur sm:px-5">
        <div className="mr-2 min-w-0">
          <p className="truncate text-[14px] font-semibold">{fileName}</p>
          <p className="text-[13px] text-mute">
            {readOnly
              ? `Correzione del docente${noteCount ? ` · ${noteCount} note` : ""}`
              : save === "saving"
                ? "Salvataggio…"
                : save === "saved"
                  ? "Salvato"
                  : save === "error"
                    ? "Salvataggio non riuscito"
                    : "Le modifiche si salvano da sole"}
          </p>
        </div>

        {!readOnly && pdf && (
          <div className="flex flex-wrap items-center gap-1 rounded-full bg-paper/70 p-1">
            <ToolBtn t="move" label="Sposta">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path d="M12 3v18M3 12h18M12 3l-3 3m3-3 3 3M12 21l-3-3m3 3 3-3M3 12l3-3m-3 3 3 3M21 12l-3-3m3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </ToolBtn>
            <ToolBtn t="pen" label="Penna">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path d="M4 20l4-1 11-11-3-3L5 16z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </ToolBtn>
            {tool === "pen" && (
              <span className="flex items-center gap-1 px-1">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    aria-label={`Colore ${c.label}`}
                    aria-pressed={color === c.value}
                    onClick={() => setColor(c.value)}
                    className={`size-5 rounded-full ring-offset-2 ${color === c.value ? "ring-2 ring-ink" : ""}`}
                    style={{ background: c.value }}
                  />
                ))}
              </span>
            )}
            <ToolBtn t="highlight" label="Evidenzia">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path d="M4 18h16" stroke={HIGHLIGHT} strokeWidth="5" strokeLinecap="round" /><path d="M9 14l7-7 2 2-7 7H9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </ToolBtn>
            <ToolBtn t="note" label="Nota">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path d="M5 4h14v12H9l-4 4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </ToolBtn>
            <ToolBtn t="eraser" label="Gomma">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path d="M8 20h12M5 15l8-8 6 6-5 5H8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </ToolBtn>
            <button type="button" onClick={undo} disabled={!history.length} title="Annulla (Ctrl+Z)" className="rounded-full px-3 py-1.5 text-[14px] font-medium text-ink hover:bg-paper disabled:opacity-40">
              Annulla
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {pdf && (
            <button type="button" onClick={download} className="btn-secondary btn-sm">
              Scarica PDF {readOnly ? "corretto" : "annotato"}
            </button>
          )}
          <button type="button" onClick={() => void close()} className="btn-primary btn-sm">
            {readOnly ? "Chiudi" : "Fine"}
          </button>
        </div>
      </div>

      {/* documento */}
      <div ref={area} className="flex-1 overflow-auto px-4 py-6">
        {error ? (
          <div className="mx-auto mt-16 max-w-md rounded-[18px] bg-surface p-6 text-center">
            <p className="font-semibold text-ceralacca">Documento non disponibile</p>
            <p className="mt-2 text-[15px] text-slate">{error}</p>
          </div>
        ) : !pdf ? (
          <div className="mt-24 flex flex-col items-center gap-4 text-[15px] text-slate">
            <span className="size-8 animate-spin rounded-full border-[3px] border-codice/20 border-t-codice" aria-hidden />
            <p role="status">{loadingMsg}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sizes.map((ratio, i) => (
              <PdfPage
                key={i}
                pdf={pdf}
                index={i}
                width={width}
                ratio={ratio}
                ann={ann.pages[String(i)] ?? empty()}
                tool={tool}
                color={color}
                readOnly={readOnly}
                onChange={(next) => updatePage(i, next)}
                onText={(next) => updatePage(i, next, true)}
                margin={margin}
                total={sizes.length}
                fileName={fileName}
              />
            ))}
            {verdict && (verdict.grade || verdict.feedback || verdict.total != null) && (
              <div className="mx-auto flex gap-3 rounded-[14px] bg-ceralacca-soft p-4 sm:p-5" style={{ width: width + margin + (margin ? 40 : 0) }}>
                <span aria-hidden className="font-serif text-[26px] leading-none text-ceralacca">§</span>
                <p className="text-[16px] italic leading-relaxed text-ink">
                  <strong className="font-semibold">
                    Giudizio{verdict.grade ? `: ${verdict.grade.toLowerCase()}` : ""}
                    {verdict.total != null ? ` (${verdict.total}/30)` : ""}.
                  </strong>{" "}
                  {verdict.feedback}
                </p>
              </div>
            )}
            <p className="pb-8 text-center text-[13px] text-mute">
              {sizes.length} {sizes.length === 1 ? "pagina" : "pagine"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Pulsante che apre il correttore (docente) o la correzione sul documento (discente). */
export function AnnotateButton({
  fileId,
  fileName,
  initial,
  readOnly = false,
  label,
  className = "btn-primary btn-sm",
  verdict,
}: {
  fileId: string;
  fileName: string;
  initial: Annotations | null;
  readOnly?: boolean;
  label: string;
  className?: string;
  verdict?: { grade: string | null; feedback: string; total: number | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <PdfAnnotator
          fileId={fileId}
          fileName={fileName}
          initial={initial}
          readOnly={readOnly}
          verdict={verdict}
          onClose={() => {
            setOpen(false);
            if (!readOnly) router.refresh();
          }}
        />
      )}
    </>
  );
}
