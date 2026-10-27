import { Logo } from "@/components/Logo";
import { Avatar } from "./Avatar";
import { NavLinks, type NavItem } from "./NavLinks";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  nav,
  home,
  areaLabel,
  children,
}: {
  profile: Profile;
  nav: NavItem[];
  home: string;
  areaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-black/[0.06] bg-[rgb(255_255_255/0.72)] backdrop-blur-xl backdrop-saturate-150 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:h-auto lg:flex-col lg:items-start lg:gap-1 lg:px-5 lg:py-6">
          <Logo href={home} />
          <p className="mt-2 hidden rounded-full bg-paper px-3 py-1 text-[12px] font-medium text-slate lg:block">{areaLabel}</p>
          <form action="/auth/esci" method="post" className="lg:hidden">
            <button className="btn-ghost btn-sm">Esci</button>
          </form>
        </div>
        <NavLinks items={nav} />
        <div className="mt-auto hidden border-t border-black/[0.06] p-4 lg:block">
          <div className="flex items-center gap-3">
            <Avatar name={profile.full_name} email={profile.email} url={profile.avatar_url} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{profile.full_name || profile.email}</p>
              <p className="truncate text-xs text-mute">{profile.email}</p>
            </div>
          </div>
          <form action="/auth/esci" method="post" className="mt-3">
            <button className="btn-ghost btn-sm w-full justify-start px-2">Esci</button>
          </form>
        </div>
      </aside>
      <main id="contenuto" className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-10">
      {back && (
        <a href={back.href} className="mb-3 inline-flex items-center gap-1 text-[15px] font-medium text-codice hover:underline">
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {back.label}
        </a>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[40px]">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-[16px] leading-relaxed text-slate">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
