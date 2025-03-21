// Location services module
const locationServices = {
    // Approve location permission and start tracking
    async approveLocation() {
      const trackingId = document.getElementById('vehicleId').value.trim();
      
      try {
        // First try to get a single location
        const highAccuracyOptions = {
          enableHighAccuracy: true,
          maximumAge: tracking.CONFIG.maxAge,
          timeout: tracking.CONFIG.timeout
        };
        
        // Get initial position
        const initialPosition = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, highAccuracyOptions);
        });
        
        // Process initial position
        this.handleLocationUpdate(initialPosition);
        tracking.lastPosition = initialPosition;
        
        // Use a combination approach for reliable tracking
        // 1. Use watchPosition for continuous updates
        tracking.watchId = navigator.geolocation.watchPosition(
          this.handleLocationUpdate.bind(this),
          this.handleLocationError.bind(this),
          highAccuracyOptions
        );
        
        // 2. Also use a manual polling interval as backup
        this.startManualTracking();
        
        // Notify server that tracking has started
        await fetch('/tracking-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: trackingId,
            action: 'tracking'
          })
        });
  
        // Update UI
        document.getElementById('location-permission').style.display = 'none';
        uiController.updateTrackingUI(trackingId);
        
        // Setup browser-specific handling if needed
        if (browserDetection.isIOS || browserDetection.isSafari) {
          this.setupSafari();
        }
  
        // Register for background sync
        this.registerBackgroundSync();
  
        // Log successful tracking start
        diagnostics.logTrackingStarted(trackingId);
      } catch (error) {
        console.error('Location error:', error);
        this.handleLocationError(error);
        document.getElementById('location-permission').style.display = 'none';
        uiController.resetTrackingButton();
        
        // Log failed tracking start
        diagnostics.logTrackingStartFailed(error.message);
      }
    },
    
    // Deny location permission
    denyLocation() {
      document.getElementById('location-permission').style.display = 'none';
      document.getElementById('trackingButton').style.display = 'block';
      uiController.showStatus('Location access denied by user', 'error');
    },
    
    // Start manual tracking as fallback
    startManualTracking() {
      // Clear any existing interval
      if (tracking.manualTrackingInterval) {
        clearInterval(tracking.manualTrackingInterval);
      }
      
      // Start a new interval
      tracking.manualTrackingInterval = setInterval(() => {
        // Use high accuracy for more precise location
        const options = {
          enableHighAccuracy: true,
          maximumAge: tracking.CONFIG.maxAge,
          timeout: tracking.CONFIG.timeout
        };
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (this.shouldUpdatePosition(position)) {
              this.handleLocationUpdate(position);
              tracking.lastPosition = position;
            }
          },
          (error) => {
            console.log('Manual tracking error, trying low accuracy:', error);
            diagnostics.logLocationError(error.message, 'high-accuracy');
            
            // If high accuracy failed, try with low accuracy
            navigator.geolocation.getCurrentPosition(
              this.handleLocationUpdate.bind(this),
              this.handleLocationError.bind(this),
              { 
                enableHighAccuracy: false,
                maximumAge: tracking.CONFIG.maxAge * 2,
                timeout: tracking.CONFIG.timeout * 2
              }
            );
          },
          options
        );
      }, tracking.CONFIG.highAccuracyInterval);
    },
    
    // Handle location update
    handleLocationUpdate(position) {
      // Create location data with diagnostic info
      const locationData = {
        id: document.getElementById('vehicleId').value.trim(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
        action: 'tracking',
        diagnostics: {
          battery: null,
          network: navigator.connection ? {
            type: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
          } : null,
          userAgent: navigator.userAgent,
          visibilityState: document.visibilityState
        }
      };
  
      // Try to get battery info if available
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          locationData.diagnostics.battery = {
            level: battery.level * 100,
            charging: battery.charging
          };
          this.sendLocationWithRetry(locationData);
        }).catch(err => {
          // If battery API fails, just send without it
          this.sendLocationWithRetry(locationData);
        });
      } else {
        this.sendLocationWithRetry(locationData);
      }
  
      // Update UI immediately
      uiController.updateLocationDisplay(position);
  
      // Update map
      mapController.updateMap(position);
    },
    
    // Send location with retry logic
    sendLocationWithRetry(locationData, retries = 3) {
      // Store for background sync
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'STORE_LOCATION',
          payload: locationData
        });
      }
  
      // Log attempts in diagnostics
      diagnostics.logLocationAttempt(locationData);
      
      // Send to server directly
      fetch('/location-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Log success
        diagnostics.logConnectionSuccess();
        return response;
      })
      .catch(error => {
        console.error('Error sending location:', error);
        
        // Log failure
        diagnostics.logConnectionFailure(error.message);
        
        // Retry if we have retries left
        if (retries > 0) {
          setTimeout(() => {
            this.sendLocationWithRetry(locationData, retries - 1);
          }, 2000); // Wait 2 seconds before retry
        } else {
          // Register for background sync when retries are exhausted
          this.registerBackgroundSync();
        }
      });
    },
    
    // Register for background sync
    registerBackgroundSync() {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('location-update')
            .then(() => console.log('Background sync registered'))
            .catch(err => console.error('Background sync registration failed:', err));
        });
      }
    },
    
    // Handle location errors
    handleLocationError(error) {
      let message;
      switch(error.code) {
        case error.PERMISSION_DENIED:
          message = "Location permission denied. Please enable location services in your device settings.";
          break;
        case error.POSITION_UNAVAILABLE:
          message = "Location information unavailable. Please check your device's GPS.";
          break;
        case error.TIMEOUT:
          message = "Location request timed out. Please try again.";
          break;
        default:
          message = "An unknown error occurred while getting location.";
      }
      
      document.getElementById('locationInfo').textContent = message;
      uiController.showStatus(message, 'error');
      uiController.resetTrackingButton();
      
      // Log error for diagnostics
      diagnostics.logLocationError(message, error.code);
    },
    
    // Only update if position has changed significantly
    shouldUpdatePosition(newPosition) {
      if (!tracking.lastPosition) return true;
      
      // Calculate distance between points using Haversine formula
      const distance = this.calculateDistance(
        tracking.lastPosition.coords.latitude,
        tracking.lastPosition.coords.longitude,
        newPosition.coords.latitude,
        newPosition.coords.longitude
      );
      
      return distance >= tracking.CONFIG.minDistance;
    },
    
    // Haversine formula to calculate distance between two points
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
  
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      
      return R * c; // Distance in meters
    },
    
    // Safari-specific setup
    setupSafari() {
      if (!browserDetection.isIOS && !browserDetection.isSafari) return;
      
      console.log('Setting up Safari-specific handling');
      
      // More aggressive keep-alive for Safari
      if (tracking.keepAliveInterval) {
        clearInterval(tracking.keepAliveInterval);
      }
      
      tracking.keepAliveInterval = setInterval(() => {
        console.log('Safari keep-alive ping');
        fetch('/ping', { 
          method: 'POST',
          headers: {'Cache-Control': 'no-cache'}
        }).catch(err => console.log('Keep-alive error:', err));
        
        // Reacquire wake lock if needed
        if (tracking.wakeLock === null) {
          tracking.requestWakeLock().then(lock => {
            tracking.wakeLock = lock;
          });
        }
        
        // For iOS: force a location refresh to prevent background throttling
        if (browserDetection.isIOS) {
          navigator.geolocation.getCurrentPosition(
            this.handleLocationUpdate.bind(this),
            (err) => console.log('iOS location refresh error:', err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }
      }, window.SAFARI_CONFIG?.keepAliveInterval || 15000);
      
      // Add a visibility change detector specific for Safari
      this.setupVisibilityChangeDetection();
    },
    
    // More robust visibility detection for Safari
    setupVisibilityChangeDetection() {
      let visibilityInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          console.log('Safari: Page is visible, ensuring tracking is active');
          
          // If we're supposed to be tracking but it might have been paused
          if (document.getElementById('trackingButton').textContent === 'Stop Tracking') {
            tracking.requestWakeLock().then(lock => {
              tracking.wakeLock = lock;
            });
            
            // Restart tracking if needed
            if (!tracking.manualTrackingInterval) {
              this.startManualTracking();
            }
          }
        }
      }, window.SAFARI_CONFIG?.visibilityCheckInterval || 5000);
      
      // Clean up the interval when tracking stops
      const originalStopTracking = tracking.stopTracking;
      tracking.stopTracking = async function() {
        clearInterval(visibilityInterval);
        await originalStopTracking.call(tracking);
      };
    }
  };