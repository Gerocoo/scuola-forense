"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MenuUser = { name: string; email: string; avatar: string | null };

function initialsOf(name: string, email: string) {
  const src = name.trim() || email;
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Foto del profilo (quella di Google se disponibile) con menu a tendina. */
export function UserMenu({
  user,
  links,
  size = 32,
}: {
  user: MenuUser;
  links: { href: string; label: string }[];
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const face =
    user.avatar && !broken ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-full rounded-full object-cover"
      />
    ) : (
      <span className="grid size-full place-items-center rounded-full bg-codice text-[12px] font-semibold text-white">
        {initialsOf(user.name, user.email)}
      </span>
    );

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account di ${user.name || user.email}`}
        style={{ width: size, height: size }}
        className="block rounded-full ring-2 ring-white shadow-[0_0_0_1px_rgb(29_29_31/0.1),0_4px_12px_-4px_rgb(29_29_31/0.3)] transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-codice"
      >
        {face}
      </button>

      {open && (
        <div
          role="menu"
          className="menu-in absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-[18px] bg-surface p-1.5 shadow-[0_0_0_1px_rgb(29_29_31/0.06),0_24px_48px_-16px_rgb(29_29_31/0.35)]"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="size-10 shrink-0">{face}</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">{user.name || "Il tuo account"}</p>
              <p className="truncate text-[13px] text-mute">{user.email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line-soft" />
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-[12px] px-3 py-2 text-[14px] text-ink transition-colors hover:bg-paper"
            >
              {l.label}
            </Link>
          ))}
          <form action="/auth/esci" method="post">
            <button role="menuitem" className="block w-full rounded-[12px] px-3 py-2 text-left text-[14px] text-ceralacca transition-colors hover:bg-ceralacca-soft">
              Esci
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
