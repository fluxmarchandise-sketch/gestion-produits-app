// sw.js
const CACHE_NAME = 'dlc-pro-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/?utm_source=homescreen'
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installation terminée');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activation en cours...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation terminée');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[Service Worker] Ressource servie depuis le cache:', event.request.url);
          return response;
        }
        
        console.log('[Service Worker] Téléchargement de la ressource:', event.request.url);
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(error => {
        console.error('[Service Worker] Erreur de récupération:', error);
        // Retourner une page d'erreur ou une réponse par défaut
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

self.addEventListener('push', event => {
  console.log('[Service Worker] Notification push reçue:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Notification',
        body: event.data.text() || 'Nouvelle notification',
        icon: 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
        badge: 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
        tag: 'dlc-notification'
      };
    }
  }
  
  const options = {
    body: data.body || 'Nouvelle alerte DLC',
    icon: data.icon || 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
    badge: data.badge || 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
    vibrate: [200, 100, 200],
    data: data,
    tag: data.tag || 'dlc-notification',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Voir les produits'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '⚠️ ALERTE DLC', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification cliquée:', event.notification.tag);
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(windowClients => {
        for (let client of windowClients) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background Sync pour les vérifications périodiques
self.addEventListener('sync', event => {
  console.log('[Service Worker] Synchronisation en arrière-plan:', event.tag);
  
  if (event.tag === 'check-dlc-products') {
    event.waitUntil(
      checkExpiringProductsInBackground()
    );
  }
});

async function checkExpiringProductsInBackground() {
  console.log('[Service Worker] Vérification des produits expirants en arrière-plan');
  
  try {
    // Envoyer une requête pour vérifier les produits
    const response = await fetch('/api/check-expiring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'background-sync'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Service Worker] Produits expirants trouvés:', data.count);
      
      if (data.count > 0) {
        // Envoyer une notification locale
        self.registration.showNotification('⚠️ PRODUITS À SURVEILLER', {
          body: `${data.count} produit(s) approche(nt) de la date d'expiration`,
          icon: 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
          badge: 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
          vibrate: [200, 100, 200],
          tag: 'background-check',
          renotify: true
        });
      }
    }
  } catch (error) {
    console.error('[Service Worker] Erreur lors de la vérification:', error);
  }
}

// Message handler pour communiquer avec la page web
self.addEventListener('message', event => {
  console.log('[Service Worker] Message reçu:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CHECK_PRODUCTS') {
    event.ports[0].postMessage({
      type: 'PRODUCTS_CHECKED',
      timestamp: new Date().toISOString()
    });
  }
});