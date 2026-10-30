import { PageHeader } from "@/components/app/AppShell";
import { CopyField } from "./CopyField";
import { requireUser } from "@/lib/auth";
import { ensureReferralCode, REFERRAL_PERCENT, REFERRAL_REWARD_CORRECTIONS } from "@/lib/referrals";
import { siteUrl } from "@/lib/stripe";

export const metadata = { title: "Invita un amico" };

export default async function InvitaPage() {
  const { supabase, user, profile } = await requireUser();
  let code: string | null = null;
  try {
    code = await ensureReferralCode(user.id, profile.full_name || "");
  } catch (e) {
    console.error("[invita]", e);
  }
  const { count } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id);
  const link = `${siteUrl()}/?amico=${code ?? ""}`;

  return (
    <>
      <PageHeader
        title="Invita un amico"
        description={`Chi si iscrive con il tuo codice ha il ${REFERRAL_PERCENT}% di sconto sul primo acquisto${REFERRAL_REWARD_CORRECTIONS > 0 ? `; tu ricevi ${REFERRAL_REWARD_CORRECTIONS === 1 ? "una correzione gratuita" : `${REFERRAL_REWARD_CORRECTIONS} correzioni gratuite`}` : ""}.`}
      />
      <section className="panel max-w-2xl space-y-5 p-6">
        {code ? (
          <>
            <div>
              <p className="label">Il tuo codice</p>
              <CopyField value={code} big />
              <p className="hint">Va inserito alla pagina di pagamento, in «Aggiungi codice promozionale».</p>
            </div>
            <div>
              <p className="label">Oppure condividi il link</p>
              <CopyField value={link} />
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="btn-secondary btn-sm"
                target="_blank"
                rel="noopener"
                href={`https://wa.me/?text=${encodeURIComponent(`Mi sto preparando all'esame di avvocato con Pronao: con il codice ${code} hai il ${REFERRAL_PERCENT}% di sconto. ${link}`)}`}
              >
                Condividi su WhatsApp
              </a>
            </div>
          </>
        ) : (
          <p className="text-[15px] text-slate">Il codice non è disponibile in questo momento. Riprova più tardi.</p>
        )}
        <p className="border-t border-line-soft pt-4 text-[15px] text-slate">
          Amici iscritti con il tuo codice: <strong className="text-ink">{count ?? 0}</strong>
        </p>
      </section>
    </>
  );
}
