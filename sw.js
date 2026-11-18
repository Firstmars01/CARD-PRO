/**
 * sw.js
 * Service worker de désactivation : les anciennes versions de Card Pro
 * installaient un service worker avec cache. Celui-ci le remplace, vide
 * les caches, se désinscrit et recharge les pages ouvertes.
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.map((cle) => caches.delete(cle)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.navigate(client.url));
  })());
});
