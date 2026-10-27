import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSession, isStaff } from "@/lib/auth";

const NAV = [
  { href: "/#metodo", label: "Il metodo" },
  { href: "/#docenti", label: "Docenti" },
  { href: "/#corsi", label: "Corsi e prezzi" },
  { href: "/#domande", label: "Domande" },
];

export async function SiteHeader() {
  const { user, profile } = await getSession();
  const areaHref = isStaff(profile) ? "/docente" : "/area";

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
          {user ? (
            <Link href={areaHref} className="btn-primary btn-sm">
              {isStaff(profile) ? "Area docenti" : "La tua area"}
            </Link>
          ) : (
            <>
              <Link href="/accedi" className="btn-ghost btn-sm">
                Accedi
              </Link>
              <Link href="/#corsi" className="btn-primary btn-sm hidden sm:inline-flex">
                Scegli il corso
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
