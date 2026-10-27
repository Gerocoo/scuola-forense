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
                className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-[8px] px-3 py-2 text-[15px] ${
                  active ? "bg-codice-soft font-semibold text-codice" : "text-slate hover:bg-line-soft hover:text-ink"
                }`}
              >
                {it.label}
                {!!it.badge && (
                  <span className="min-w-5 rounded-full bg-ceralacca px-1.5 text-center text-xs font-semibold leading-5 text-white tabular-nums">
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
