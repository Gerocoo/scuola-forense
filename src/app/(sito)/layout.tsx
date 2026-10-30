import { SiteHeader } from "@/components/site/SiteHeader";
import { ReferralCapture } from "@/components/site/ReferralCapture";
import { SiteFooter } from "@/components/site/SiteFooter";

// La vetrina dipende da chi è collegato: niente pagine in cache condivise tra utenti.
export const dynamic = "force-dynamic";

export default function SitoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#contenuto" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn-secondary">
        Vai al contenuto
      </a>
      <SiteHeader />
      <ReferralCapture />
      <main id="contenuto">{children}</main>
      <SiteFooter />
    </>
  );
}
