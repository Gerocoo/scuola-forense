import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import seed from "@/content/past-tracks.json";

export const ARCHIVE_SLUG = "archivio-tracce";
const SEED_FLAG = "archivio_seed_v1";

export type ArchiveTrack = {
  id: string;
  year: number;
  session: string;
  subject: "civile" | "penale" | "amministrativo";
  kind: "parere" | "atto";
  title: string;
  body: string; // vuoto se la traccia è bloccata
  file: { name: string } | null;
  free: boolean;
  locked: boolean;
};

export type ArchiveFilters = { materia?: string; tipo?: string; anno?: string };

/** Importa una sola volta le tracce ufficiali degli anni passati (le eliminate non vengono ricreate). */
async function ensureSeeded() {
  const admin = createAdminClient();
  const { data: flag } = await admin.from("app_flags").select("key").eq("key", SEED_FLAG).maybeSingle();
  if (flag) return;
  const { data: claimed } = await admin.from("app_flags").insert({ key: SEED_FLAG }).select("key").maybeSingle();
  if (!claimed) return; // un'altra richiesta sta già importando
  const { data: existing } = await admin.from("past_tracks").select("year, title");
  const have = new Set((existing ?? []).map((t: { year: number; title: string }) => `${t.year}|${t.title}`));
  const rows = (seed as Omit<ArchiveTrack, "id" | "file" | "locked">[]).filter((t) => !have.has(`${t.year}|${t.title}`));
  if (rows.length) {
    const { error } = await admin.from("past_tracks").insert(rows);
    if (error) {
      console.error("[archivio] importazione non riuscita", error);
      await admin.from("app_flags").delete().eq("key", SEED_FLAG);
    }
  }
}

/** L'utente vede tutto l'archivio? (staff, oppure un corso o l'archivio acquistato; la prova gratuita no) */
export async function hasArchiveAccess(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("has_archive_access");
  return data === true;
}

/** Elenco completo: le tracce bloccate mostrano titolo e dati, ma non il testo. */
export async function loadArchive(supabase: SupabaseClient, f: ArchiveFilters) {
  try {
    await ensureSeeded();
  } catch (e) {
    console.error("[archivio]", e);
  }
  const access = await hasArchiveAccess(supabase);
  const admin = createAdminClient();

  let q = admin
    .from("past_tracks")
    .select("id, year, session, subject, kind, title, body, file, free")
    .order("year", { ascending: false })
    .order("subject")
    .order("kind", { ascending: false })
    .order("created_at");
  if (f.materia) q = q.eq("subject", f.materia);
  if (f.tipo) q = q.eq("kind", f.tipo);
  if (f.anno && /^\d{4}$/.test(f.anno)) q = q.eq("year", Number(f.anno));

  const [{ data }, { data: all }, { data: pkg }] = await Promise.all([
    q.limit(500),
    admin.from("past_tracks").select("year, free"),
    admin.from("packages").select("price_cents, promo_price_cents, promo_until, active").eq("slug", ARCHIVE_SLUG).maybeSingle(),
  ]);

  const tracks: ArchiveTrack[] = (data ?? []).map(
    (t: Omit<ArchiveTrack, "locked" | "file"> & { file: { name: string; path?: string } | null }) => {
      const locked = !access && !t.free;
      return {
        ...t,
        body: locked ? "" : t.body,
        file: t.file ? { name: t.file.name } : null,
        locked,
      };
    },
  );
  const years = [...new Set((all ?? []).map((y: { year: number }) => y.year))].sort((a, b) => b - a);
  const total = (all ?? []).length;
  const freeCount = (all ?? []).filter((t: { free: boolean }) => t.free).length;
  const now = Date.now();
  const price = pkg?.active
    ? pkg.promo_price_cents && (!pkg.promo_until || new Date(pkg.promo_until).getTime() > now)
      ? pkg.promo_price_cents
      : pkg.price_cents
    : null;

  return { tracks, years, access, total, freeCount, price: price as number | null };
}
