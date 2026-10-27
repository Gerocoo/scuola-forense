"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Pulsanti dell'intestazione. Lo stato di accesso si legge nel browser e si aggiorna
 * da solo a login e logout: così non resta mai "Accedi" per colpa di una pagina in cache.
 * `/area` porta automaticamente i docenti nella loro area.
 */
export function AuthButtons({ initialLoggedIn, initialStaff }: { initialLoggedIn: boolean; initialStaff: boolean }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [staff, setStaff] = useState(initialStaff);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function sync(userId: string | null) {
      if (!active) return;
      setLoggedIn(!!userId);
      if (!userId) return setStaff(false);
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (active) setStaff(data?.role === "teacher" || data?.role === "admin");
    }

    supabase.auth.getSession().then(({ data }) => sync(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => sync(session?.user.id ?? null));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loggedIn) {
    return (
      <Link href={staff ? "/docente" : "/area"} className="btn-primary btn-sm">
        {staff ? "Area docenti" : "La tua area"}
      </Link>
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
