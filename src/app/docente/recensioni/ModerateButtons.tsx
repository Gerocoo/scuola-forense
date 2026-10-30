"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { moderateReview } from "@/app/actions/community";

export function ModerateButtons({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (a: "approve" | "hide" | "delete") =>
    start(async () => {
      if (a === "delete" && !confirm("Eliminare la recensione?")) return;
      await moderateReview(id, a);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      {approved ? (
        <button type="button" className="btn-secondary btn-sm" disabled={pending} onClick={() => act("hide")}>Togli dalla vetrina</button>
      ) : (
        <button type="button" className="btn-primary btn-sm" disabled={pending} onClick={() => act("approve")}>Pubblica</button>
      )}
      <button type="button" className="btn-ghost btn-sm text-mute hover:text-ceralacca" disabled={pending} onClick={() => act("delete")}>Elimina</button>
    </div>
  );
}
