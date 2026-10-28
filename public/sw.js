/* Service worker di Pronao: rende il sito installabile e mostra le notifiche push. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// nessuna cache delle pagine: i contenuti dell'area riservata restano sempre aggiornati
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = { title: "Pronao", body: "Hai una novità nella tua area.", url: "/area" };
      try {
        const res = await fetch("/api/push/ultima", { credentials: "include", cache: "no-store" });
        if (res.ok) data = await res.json();
      } catch (e) {
        /* senza rete si mostra il testo generico */
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/brand/pronao-192.png",
        badge: "/brand/pronao-badge.png",
        data: { url: data.url || "/area" },
        tag: "pronao",
        renotify: true,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/area", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          await c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
