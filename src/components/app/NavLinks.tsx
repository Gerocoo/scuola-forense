"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type NavItem = { href: string; label: string; badge?: number; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  // su telefono porta in vista la sezione aperta
  useEffect(() => {
    const el = nav.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: active.offsetLeft - el.clientWidth / 2 + active.clientWidth / 2, behavior: "smooth" });
  }, [pathname]);

  return (
    <nav
      ref={nav}
      aria-label="Area riservata"
      className="overflow-x-auto overscroll-x-contain px-2 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(90deg,transparent,#000_12px,#000_calc(100%-24px),transparent)] lg:px-3 lg:pb-0 lg:[mask-image:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max gap-1 pr-4 lg:w-auto lg:flex-col lg:pr-0">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 py-2 text-[15px] transition-colors ${
                  active ? "bg-codice font-medium text-white" : "text-ink/80 hover:bg-black/[0.04] hover:text-ink"
                }`}
              >
                {it.label}
                {!!it.badge && (
                  <span className={`min-w-5 rounded-full px-1.5 text-center text-xs font-semibold leading-5 tabular-nums ${active ? "bg-white text-codice" : "bg-ceralacca text-white"}`}>
                    {it.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
