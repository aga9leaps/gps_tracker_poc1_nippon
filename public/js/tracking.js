// Main tracking module
const tracking = {
    // Configuration
    CONFIG: {
      highAccuracyInterval: 5000,   // Get high-accuracy position every 5 seconds
      lowAccuracyInterval: 15000,   // Fallback to low-accuracy every 15 seconds
      minDistance: 10,              // Minimum distance (meters) to record new position
      maxAge: 3000,                 // Maximum age of cached position (ms)
      timeout: 10000                // Timeout for position acquisition (ms)
    },
    
    // State variables
    watchId: null,
    currentTrackingId: null,
    wakeLock: null,
    keepAliveInterval: null,
    manualTrackingInterval: null,
    lastPosition: null,
    
    // Start tracking process
    async startTracking() {
      const trackingId = document.getElementById('vehicleId').value.trim();
      if (!trackingId) {
        uiController.showStatus('Please enter a vehicle ID', 'error');
        return;
      }
  
      // Store the current tracking ID
      this.currentTrackingId = trackingId;

      // Store tracking ID for background sync
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Send tracking ID to service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'STORE_TRACKING_ID',
              trackingId: trackingId
            });
          }
          
          // Register for periodic background sync if supported
          if ('periodicSync' in registration) {
            try {
              // Request permission for background sync
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync',
              });
              
              if (status.state === 'granted') {
                await registration.periodicSync.register('location-sync', {
                  minInterval: 15 * 60 * 1000 // 15 minutes minimum
                });
                console.log('Registered for periodic background sync');
              } else {
                console.log('Background sync permission not granted');
              }
            } catch (error) {
              console.error('Error registering for background sync:', error);
            }
          }
        } catch (err) {
          console.error('Error setting up background sync:', err);
        }
      }
      
      // Show permission request UI first
      document.getElementById('location-permission').style.display = 'block';
      
      // Request wake lock
      try {
        this.wakeLock = await this.requestWakeLock();
      } catch (err) {
        console.log('Wake Lock error:', err);
      }
  
      // Start keep-alive ping
      this.startKeepAlive();
      
      // Upload any pending diagnostic logs
      diagnostics.uploadDiagnosticLogs();
    },
    
    // Stop tracking process
    async stopTracking() {
      if (this.watchId) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
      
      if (this.manualTrackingInterval) {
        clearInterval(this.manualTrackingInterval);
        this.manualTrackingInterval = null;
      }
      
      if (this.wakeLock) {
        try {
          await this.wakeLock.release();
          this.wakeLock = null;
        } catch (err) {
          console.error('Error releasing wake lock:', err);
        }
      }
      
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }

      // Unregister background sync
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if ('periodicSync' in registration) {
            await registration.periodicSync.unregister('location-sync');
            console.log('Unregistered periodic background sync');
          }
          
          // Clear tracking ID from cache
          const cache = await caches.open('location-cache');
          await cache.delete('tracking-id');
        } catch (error) {
          console.error('Error unregistering background sync:', error);
        }
      }
  
      // Notify server that tracking has stopped
      const trackingId = this.currentTrackingId || document.getElementById('vehicleId').value.trim();
      try {
        const locationData = {
          id: trackingId,
          action: 'stopped'
        };
  
        await fetch('/tracking-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData)
        });
      } catch (error) {
        console.error('Error updating tracking status:', error);
        diagnostics.logConnectionFailure(error.message);
      }
  
      // Remove event listeners
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('focus', this.handleFocus);
  
      // Reset UI
      uiController.resetTrackingButton();
      
      // Remove tracking indicator
      uiController.removeTrackingIndicator();
  
      // Hide tracking info
      document.getElementById('trackingInfo').style.display = 'none';
      
      uiController.showStatus('Tracking stopped', 'info');
      
      // Upload final diagnostic logs
      diagnostics.uploadDiagnosticLogs();
    },
  
    // Wake lock to prevent device sleep
    async requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock is active');
          
          // Set up auto-renewal
          lock.addEventListener('release', () => {
            console.log('Wake lock released');
            // Try to reacquire after a short delay
            setTimeout(async () => {
              try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake lock reacquired');
              } catch (err) {
                console.error('Failed to reacquire wake lock:', err);
                diagnostics.logWakeLockFailure(err.message);
              }
            }, 1000);
          });
          
          return lock;
        } catch (err) {
          console.log('Wake Lock error:', err);
          diagnostics.logWakeLockFailure(err.message);
        }
      }
      return null;
    },
    
    // Keep-alive mechanism to maintain connection
    startKeepAlive() {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
      }
      
      // Send a ping every 30 seconds
      this.keepAliveInterval = setInterval(() => {
        fetch('/ping', { method: 'POST' })
          .then(() => diagnostics.logPingSuccess())
          .catch(err => {
            console.log('Keep-alive error:', err);
            diagnostics.logPingFailure(err.message);
          });
        
        // Reacquire wake lock if needed
        if (this.wakeLock === null) {
          this.requestWakeLock().then(lock => {
            this.wakeLock = lock;
          });
        }
        
        // Force a location update even when in background (helps with some browsers)
        if (this.currentTrackingId) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Create background location update with diagnostic info
              const locationData = {
                id: this.currentTrackingId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                action: 'tracking',
                source: 'keep-alive',
                diagnostics: {
                  visibilityState: document.visibilityState,
                  battery: null,
                  network: navigator.connection ? {
                    type: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt,
                    saveData: navigator.connection.saveData
                  } : null
                }
              };
              
              // Try to get battery info if available
              if ('getBattery' in navigator) {
                navigator.getBattery().then(battery => {
                  locationData.diagnostics.battery = {
                    level: battery.level * 100,
                    charging: battery.charging
                  };
                  
                  // Store for background sync
                  if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                      type: 'STORE_LOCATION',
                      payload: locationData
                    });
                  }
                  
                  // Send directly too
                  locationServices.sendLocationWithRetry(locationData);
                });
              } else {
                // Store for background sync
                if (navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({
                    type: 'STORE_LOCATION',
                    payload: locationData
                  });
                }
                
                // Send directly too
                locationServices.sendLocationWithRetry(locationData);
              }
            },
            (error) => {
              console.log('Keep-alive location error:', error);
            },
            { 
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 10000
            }
          );
        }
      }, 30000);
  
      // Listen for visibility change
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      window.addEventListener('focus', this.handleFocus.bind(this));
    },
    
    // Handle page visibility change
    async handleVisibilityChange() {
      diagnostics.logVisibilityChange(document.visibilityState);
      
      if (document.visibilityState === 'visible') {
        console.log('Page became visible');
        this.wakeLock = await this.requestWakeLock();
        
        // Check if tracking should be active
        if (document.getElementById('trackingButton').textContent === 'Stop Tracking') {
          // We were tracking, so make sure we still are
          if (!this.manualTrackingInterval) {
            locationServices.startManualTracking();
          }
        }
      } else {
        console.log('Page hidden');
        
        // If we're tracking, take a location reading before the page goes to background
        if (this.currentTrackingId && document.getElementById('trackingButton').textContent === 'Stop Tracking') {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              locationServices.handleLocationUpdate(position);
            },
            (error) => console.log('Background transition location error:', error),
            { 
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 5000
            }
          );
        }
      }
    },
    
    // Handle window focus
    async handleFocus() {
      if (!this.wakeLock) {
        this.wakeLock = await this.requestWakeLock();
      }
    }
  };
  
  // Initialize config from any server settings
  fetch('/config')
    .then(response => response.json())
    .then(config => {
      // Merge server config with defaults
      tracking.CONFIG = { ...tracking.CONFIG, ...config };
      console.log('Config loaded:', tracking.CONFIG);
    })
    .catch(err => console.error('Failed to load config:', err));