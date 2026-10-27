"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Area riservata" className="overflow-x-auto px-2 pb-2 lg:px-3 lg:pb-0">
      <ul className="flex gap-1 lg:flex-col">
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
