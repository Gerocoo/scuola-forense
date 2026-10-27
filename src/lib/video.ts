/** Converte un link YouTube/Vimeo nell'URL incorporabile; altrimenti null (si usa <video>). */
export function embedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&enablejsapi=1&playsinline=1` : null;
    }
    if (host === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?rel=0&enablejsapi=1&playsinline=1`;
    }
    if (host === "vimeo.com") {
      const [id, hash] = u.pathname.split("/").filter(Boolean);
      return `https://player.vimeo.com/video/${id}?api=1${hash ? `&h=${hash}` : ""}`;
    }
    if (host === "player.vimeo.com" || host.endsWith("mediadelivery.net")) return url;
    return null;
  } catch {
    return null;
  }
}
