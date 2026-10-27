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
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:h-auto lg:flex-col lg:items-start lg:gap-1 lg:px-5 lg:py-6">
          <Logo href={home} />
          <p className="hidden pl-[46px] text-sm text-mute lg:block">{areaLabel}</p>
          <form action="/auth/esci" method="post" className="lg:hidden">
            <button className="btn-ghost btn-sm">Esci</button>
          </form>
        </div>
        <NavLinks items={nav} />
        <div className="mt-auto hidden border-t border-line-soft p-4 lg:block">
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
      <main id="contenuto" className="min-w-0 px-4 py-8 sm:px-8 lg:py-10">
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
    <div className="mb-8">
      {back && (
        <a href={back.href} className="mb-3 inline-block text-[15px] text-slate hover:text-ink">
          {back.label}
        </a>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-[16px] leading-relaxed text-slate">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
