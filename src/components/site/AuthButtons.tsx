"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { UserMenu, type MenuUser } from "@/components/UserMenu";

/**
 * Pulsanti dell'intestazione. Lo stato di accesso si legge nel browser e si aggiorna
 * da solo a login e logout: così non resta mai "Accedi" per colpa di una pagina in cache.
 * `/area` porta automaticamente i docenti nella loro area.
 */
export function AuthButtons({
  initialLoggedIn,
  initialStaff,
  initialUser,
}: {
  initialLoggedIn: boolean;
  initialStaff: boolean;
  initialUser: MenuUser | null;
}) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [staff, setStaff] = useState(initialStaff);
  const [user, setUser] = useState<MenuUser | null>(initialUser);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function sync(session: Session | null) {
      if (!active) return;
      const u = session?.user ?? null;
      setLoggedIn(!!u);
      if (!u) {
        setUser(null);
        return setStaff(false);
      }
      const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
      const { data } = await supabase.from("profiles").select("role, full_name, avatar_url").eq("id", u.id).maybeSingle();
      if (!active) return;
      setStaff(data?.role === "teacher" || data?.role === "admin");
      setUser({
        name: data?.full_name || meta.full_name || meta.name || "",
        email: u.email ?? "",
        avatar: data?.avatar_url || meta.avatar_url || meta.picture || null,
      });
    }

    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => sync(res.data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e: AuthChangeEvent, session: Session | null) => {
      void sync(session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loggedIn) {
    const home = staff ? "/docente" : "/area";
    return (
      <>
        <Link href={home} className="btn-primary btn-sm btn-shine hidden sm:inline-flex">
          {staff ? "Area docenti" : "La tua area"}
        </Link>
        {user && (
          <UserMenu
            user={user}
            links={[
              { href: home, label: staff ? "Area docenti" : "La tua area" },
              { href: `${home}/profilo`, label: "Profilo e foto" },
        { href: `${home}/profilo#password`, label: "Cambia password" },
            ]}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Link href="/accedi" className="btn-ghost btn-sm">
        Accedi
      </Link>
      <Link href="/#corsi" className="btn-primary btn-sm hidden sm:inline-flex">
        Scegli il corso
      </Link>
    </>
  );
}
