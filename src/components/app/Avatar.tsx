import { initials } from "@/lib/format";

export function Avatar({
  name,
  email,
  url,
  size = "md",
}: {
  name: string;
  email?: string;
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const cls = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-12 text-base" : size === "xl" ? "size-20 text-2xl ring-4 ring-white shadow-[0_8px_24px_-12px_rgb(29_29_31/0.4)]" : "size-10 text-sm";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${cls} shrink-0 rounded-full object-cover`} referrerPolicy="no-referrer" />;
  }
  return (
    <span aria-hidden className={`${cls} grid shrink-0 place-items-center rounded-full bg-codice-soft font-semibold text-codice`}>
      {initials(name, email)}
    </span>
  );
}
