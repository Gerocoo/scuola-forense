export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      <p className="text-[17px] font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-slate">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
