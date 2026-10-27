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

/** Miniatura di anteprima di una lezione (YouTube o Bunny Stream); null se non disponibile. */
export function thumbnailFor(lesson: { video_url: string | null; bunny_video_id?: string | null; video_status?: string }) {
  if (lesson.bunny_video_id && lesson.video_status === "ready" && process.env.BUNNY_STREAM_CDN_HOSTNAME) {
    return `https://${process.env.BUNNY_STREAM_CDN_HOSTNAME}/${lesson.bunny_video_id}/thumbnail.jpg`;
  }
  if (!lesson.video_url) return null;
  try {
    const u = new URL(lesson.video_url);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null | undefined = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) id = u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop();
    return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
  } catch {
    return null;
  }
}
