import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold">Pagina non trovata</h1>
      <p className="mt-3 leading-relaxed text-slate">
        Il link potrebbe essere sbagliato, oppure il contenuto non è più disponibile o non è visibile con il tuo account.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">Torna alla home</Link>
        <Link href="/area" className="btn-secondary">La tua area</Link>
      </div>
    </main>
  );
}
