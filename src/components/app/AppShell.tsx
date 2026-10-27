import { Logo } from "@/components/Logo";
import { NavLinks, type NavItem } from "./NavLinks";
import { UserMenu } from "@/components/UserMenu";
import { NotificationBell } from "./NotificationBell";
import type { Notice } from "@/lib/notifications";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  nav,
  home,
  areaLabel,
  notices = [],
  children,
}: {
  profile: Profile;
  nav: NavItem[];
  home: string;
  areaLabel: string;
  notices?: Notice[];
  children: React.ReactNode;
}) {
  const menu = (
    <div className="flex items-center gap-3">
      <NotificationBell items={notices} />
      <UserMenu
      user={{ name: profile.full_name, email: profile.email, avatar: profile.avatar_url }}
      links={[
        { href: home, label: areaLabel },
        { href: `${home}/profilo`, label: "Profilo" },
      ]}
      />
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-black/[0.06] bg-[rgb(255_255_255/0.72)] backdrop-blur-xl backdrop-saturate-150 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:h-auto lg:flex-col lg:items-start lg:gap-1 lg:px-5 lg:py-6">
          <Logo href="/" />
          <p className="mt-2 hidden rounded-full bg-paper px-3 py-1 text-[12px] font-medium text-slate lg:block">{areaLabel}</p>
          <div className="lg:hidden">{menu}</div>
        </div>
        <NavLinks items={nav} />
      </aside>
      <main id="contenuto" className="relative min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:pb-12 lg:pt-20">
        <div className="absolute right-8 top-6 z-20 hidden lg:block">{menu}</div>
        <div className="mx-auto max-w-6xl">{children}</div>
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
