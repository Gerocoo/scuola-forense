"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { disconnectYoutube } from "@/app/docente/actions";

export function DisconnectYoutube() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Scollegare il canale? I video già inseriti nelle lezioni continuano a funzionare.")) return;
        start(async () => {
          await disconnectYoutube();
          router.refresh();
        });
      }}
    >
      {pending ? "Scollego…" : "Scollega"}
    </button>
  );
}
