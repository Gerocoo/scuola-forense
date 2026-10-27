import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSession, isStaff } from "@/lib/auth";
import { AuthButtons } from "./AuthButtons";

const NAV = [
  { href: "/#metodo", label: "Il metodo" },
  { href: "/#docenti", label: "Docenti" },
  { href: "/#corsi", label: "Corsi e prezzi" },
  { href: "/#domande", label: "Domande" },
];

export async function SiteHeader() {
  const { user, profile } = await getSession();

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Sezioni" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-[15px] text-slate hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <AuthButtons initialLoggedIn={!!user} initialStaff={isStaff(profile)} />
        </div>
      </div>
    </header>
  );
}
