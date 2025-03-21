// Enhanced service-worker.js
const CACHE_NAME = 'nippon-tracker-v1';
const LOCATION_CACHE = 'location-cache';

// Files to cache for offline use
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/browser-detection.js',
  '/js/diagnostics.js',
  '/js/location-services.js',
  '/js/map-controller.js',
  '/js/pwa-installer.js',
  '/js/tracking.js',
  '/js/ui-controller.js',
  '/images/Nippon-Taglines_Nippon-Paint-250x71.jpg',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME && cacheName !== LOCATION_CACHE;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Register for periodic background sync if supported
self.addEventListener('periodicsync', event => {
  if (event.tag === 'location-sync') {
    event.waitUntil(sendLocationUpdate());
  }
});

// Function to get location and send update
async function sendLocationUpdate() {
  try {
    // Try to get cached tracking ID
    const cache = await caches.open(LOCATION_CACHE);
    const idResponse = await cache.match('tracking-id');
    
    if (!idResponse) return; // Not tracking
    
    const trackingId = await idResponse.text();
    
    // Try to get position
    const position = await getPosition();
    
    // Send to server
    if (position) {
      await fetch('/location-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trackingId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
          action: 'tracking',
          source: 'background'
        })
      });
      console.log('Background location sent for', trackingId);
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

// Promisify geolocation API
function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

// Handle fetch events for network-first strategy
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For API requests, always go to network
  if (event.request.url.includes('/location-update') || 
      event.request.url.includes('/locations') ||
      event.request.url.includes('/ping') ||
      event.request.url.includes('/tracking-status') ||
      event.request.url.includes('/diagnostic-logs')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response for caching
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
          
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background sync when connection is restored
self.addEventListener('sync', event => {
  if (event.tag === 'location-update') {
    event.waitUntil(Promise.all([
      sendCachedLocation(),
      sendLocationBatch()
    ]));
  }
});

// Add message handler to receive location data from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'STORE_LOCATION') {
    const locationData = event.data.payload;
    storeLocation(locationData);
    storeLocationBatch(locationData);
  } else if (event.data && event.data.type === 'STORE_TRACKING_ID') {
    storeTrackingId(event.data.trackingId);
  }
});

// Store tracking ID for background sync
async function storeTrackingId(trackingId) {
  try {
    const cache = await caches.open(LOCATION_CACHE);
    await cache.put('tracking-id', new Response(trackingId));
    console.log('Tracking ID stored for background sync:', trackingId);
  } catch (error) {
    console.error('Error storing tracking ID:', error);
  }
}

// Store single location for immediate sending
async function storeLocation(locationData) {
  try {
    const cache = await caches.open(LOCATION_CACHE);
    await cache.put('last-position', new Response(JSON.stringify(locationData)));
    console.log('Location stored in cache:', locationData);
  } catch (error) {
    console.error('Error storing location:', error);
  }
}

// Store up to 100 locations when offline
async function storeLocationBatch(locationData) {
  try {
    const cache = await caches.open(LOCATION_CACHE);
    
    // Get existing batch of locations
    let batchResponse = await cache.match('location-batch');
    let batch = [];
    
    if (batchResponse) {
      batch = await batchResponse.json();
    }
    
    // Add new location to batch
    batch.push({
      ...locationData,
      stored_at: new Date().toISOString()
    });
    
    // Keep only last 100 locations to avoid storage limits
    if (batch.length > 100) {
      batch = batch.slice(-100);
    }
    
    // Store updated batch
    await cache.put('location-batch', new Response(JSON.stringify(batch)));
    console.log('Location added to batch. Batch size:', batch.length);
  } catch (error) {
    console.error('Error storing location batch:', error);
  }
}

// Send most recent location
async function sendCachedLocation() {
  try {
    const cache = await caches.open(LOCATION_CACHE);
    const response = await cache.match('last-position');
    
    if (response) {
      const locationData = await response.json();
      console.log('Sending cached location from service worker:', locationData);
      
      const serverResponse = await fetch('/location-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      });
      
      if (serverResponse.ok) {
        console.log('Cached location sent successfully');
      }
    }
  } catch (error) {
    console.error('Error sending cached location:', error);
    throw error; // Re-throw to ensure sync is retried
  }
}

// Send batch of locations
async function sendLocationBatch() {
  try {
    const cache = await caches.open(LOCATION_CACHE);
    const batchResponse = await cache.match('location-batch');
    
    if (batchResponse) {
      const batch = await batchResponse.json();
      
      if (batch.length > 0) {
        console.log('Sending batch of', batch.length, 'cached locations');
        
        const response = await fetch('/location-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations: batch })
        });
        
        if (response.ok) {
          console.log('Batch sent successfully, clearing cache');
          await cache.put('location-batch', new Response(JSON.stringify([])));
        }
      }
    }
  } catch (error) {
    console.error('Error sending location batch:', error);
    throw error; // Re-throw to ensure sync is retried
  }
}