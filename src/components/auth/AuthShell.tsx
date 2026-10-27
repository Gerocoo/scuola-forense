import { Logo } from "@/components/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_520px]">
      <div className="hidden flex-col justify-between bg-codice p-12 text-white lg:flex">
        <Logo href="/" />
        <blockquote className="max-w-md">
          <p className="font-serif text-[28px] leading-snug">
            &laquo;Ogni elaborato torna con le note a margine e un giudizio motivato. È lì che si impara a scrivere
            l&apos;atto.&raquo;
          </p>
          <footer className="mt-4 text-white/70">Il metodo della scuola</footer>
        </blockquote>
        <p className="text-sm text-white/60">Area riservata a discenti e docenti</p>
      </div>
      <div className="flex flex-col justify-center px-4 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-10 text-3xl font-semibold text-ink lg:mt-0">{title}</h1>
          {subtitle && <p className="mt-2 text-slate">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
