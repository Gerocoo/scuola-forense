import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSession, isStaff } from "@/lib/auth";
import { AuthButtons } from "./AuthButtons";

const NAV = [
  { href: "/esame-avvocato-2026", label: "Esame 2026" },
  { href: "/#docenti", label: "Docenti" },
  { href: "/#corsi", label: "Corsi" },
  { href: "/servizi", label: "Servizi" },
  { href: "/guide", label: "Guide" },
  { href: "/prova-gratuita", label: "Prova gratis" },
];

/** Barra in vetro sfocato, sottile come quella di apple.com */
export async function SiteHeader() {
  const { user, profile } = await getSession();

  return (
    <header className="header-scroll sticky top-0 z-40 border-b border-black/[0.06] bg-[rgb(245_243_238/0.72)] backdrop-blur-xl backdrop-saturate-150">
      {/* avanzamento della lettura della pagina */}
      <span aria-hidden className="scroll-progress absolute inset-x-0 bottom-[-1px] h-[2px] bg-codice" />
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Sezioni" className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[14px] text-ink/80 transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <AuthButtons
            initialLoggedIn={!!user}
            initialStaff={isStaff(profile)}
            initialUser={
              user
                ? {
                    name: profile?.full_name || (user.user_metadata?.full_name as string | undefined) || "",
                    email: user.email ?? "",
                    avatar: profile?.avatar_url || (user.user_metadata?.avatar_url as string | undefined) || (user.user_metadata?.picture as string | undefined) || null,
                  }
                : null
            }
          />
        </div>
      </div>
    </header>
  );
}
