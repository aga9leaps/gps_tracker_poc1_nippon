// Diagnostics module for logging and error tracking
const diagnostics = {
    // Log a location update attempt
    logLocationAttempt(locationData) {
      try {
        // Store in local diagnostics log
        const logs = JSON.parse(localStorage.getItem('tracking_logs') || '[]');
        logs.push({
          type: 'location_attempt',
          data: locationData,
          timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 entries to avoid storage limits
        if (logs.length > 100) logs.shift();
        localStorage.setItem('tracking_logs', JSON.stringify(logs));
      } catch (e) {
        console.error('Error logging to localStorage:', e);
      }
    },
    
    // Log successful connections
    logConnectionSuccess() {
      try {
        const successLogs = JSON.parse(localStorage.getItem('connection_success_logs') || '[]');
        successLogs.push({
          timestamp: new Date().toISOString(),
          networkInfo: navigator.connection ? {
            type: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink
          } : null
        });
        
        // Keep only last 20 success logs
        if (successLogs.length > 20) successLogs.shift();
        localStorage.setItem('connection_success_logs', JSON.stringify(successLogs));
      } catch (e) {
        console.error('Error logging success:', e);
      }
    },
    
    // Log connection failures
    logConnectionFailure(errorMsg) {
      try {
        const failureLogs = JSON.parse(localStorage.getItem('connection_failure_logs') || '[]');
        failureLogs.push({
          timestamp: new Date().toISOString(),
          error: errorMsg,
          networkInfo: navigator.connection ? {
            type: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink
          } : null,
          visibilityState: document.visibilityState
        });
        
        // Keep only last 50 failure logs
        if (failureLogs.length > 50) failureLogs.shift();
        localStorage.setItem('connection_failure_logs', JSON.stringify(failureLogs));
        
        // Send these logs on next connection if we have more than 5 failures
        if (failureLogs.length >= 5) {
          // Store for next successful connection
          localStorage.setItem('pending_failure_logs', JSON.stringify(failureLogs));
        }
      } catch (e) {
        console.error('Error logging failure:', e);
      }
    },
    
    // Log ping successes
    logPingSuccess() {
      try {
        const pingLogs = JSON.parse(localStorage.getItem('ping_logs') || '[]');
        pingLogs.push({
          type: 'success',
          timestamp: new Date().toISOString()
        });
        
        // Keep only last 20 ping logs
        if (pingLogs.length > 20) pingLogs.shift();
        localStorage.setItem('ping_logs', JSON.stringify(pingLogs));
      } catch (e) {
        console.error('Error logging ping success:', e);
      }
    },
    
    // Log ping failures
  logPingFailure(errorMsg) {
    try {
      const pingLogs = JSON.parse(localStorage.getItem('ping_logs') || '[]');
      pingLogs.push({
        type: 'failure',
        timestamp: new Date().toISOString(),
        error: errorMsg,
        networkInfo: navigator.connection ? {
          type: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink
        } : null
      });
      
      // Keep only last 20 ping logs
      if (pingLogs.length > 20) pingLogs.shift();
      localStorage.setItem('ping_logs', JSON.stringify(pingLogs));
    } catch (e) {
      console.error('Error logging ping failure:', e);
    }
  },
  
  // Log location errors
  logLocationError(message, code) {
    try {
      const locationErrorLogs = JSON.parse(localStorage.getItem('location_error_logs') || '[]');
      locationErrorLogs.push({
        timestamp: new Date().toISOString(),
        message,
        code,
        visibilityState: document.visibilityState
      });
      
      // Keep only last 20 location error logs
      if (locationErrorLogs.length > 20) locationErrorLogs.shift();
      localStorage.setItem('location_error_logs', JSON.stringify(locationErrorLogs));
    } catch (e) {
      console.error('Error logging location error:', e);
    }
  },
  
  // Log wake lock failures
  logWakeLockFailure(message) {
    try {
      const wakeLockLogs = JSON.parse(localStorage.getItem('wake_lock_logs') || '[]');
      wakeLockLogs.push({
        timestamp: new Date().toISOString(),
        error: message,
        visibilityState: document.visibilityState
      });
      
      // Keep only last 20 wake lock logs
      if (wakeLockLogs.length > 20) wakeLockLogs.shift();
      localStorage.setItem('wake_lock_logs', JSON.stringify(wakeLockLogs));
    } catch (e) {
      console.error('Error logging wake lock failure:', e);
    }
  },
  
  // Log visibility state changes
  logVisibilityChange(state) {
    try {
      const visibilityLogs = JSON.parse(localStorage.getItem('visibility_logs') || '[]');
      visibilityLogs.push({
        timestamp: new Date().toISOString(),
        state
      });
      
      // Keep only last 20 visibility logs
      if (visibilityLogs.length > 20) visibilityLogs.shift();
      localStorage.setItem('visibility_logs', JSON.stringify(visibilityLogs));
    } catch (e) {
      console.error('Error logging visibility change:', e);
    }
  },
  
  // Log when tracking is started
  logTrackingStarted(trackingId) {
    try {
      const trackingStatusLogs = JSON.parse(localStorage.getItem('tracking_status_logs') || '[]');
      trackingStatusLogs.push({
        type: 'started',
        trackingId,
        timestamp: new Date().toISOString(),
        networkInfo: navigator.connection ? {
          type: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink
        } : null
      });
      
      // Keep only last 20 tracking status logs
      if (trackingStatusLogs.length > 20) trackingStatusLogs.shift();
      localStorage.setItem('tracking_status_logs', JSON.stringify(trackingStatusLogs));
    } catch (e) {
      console.error('Error logging tracking start:', e);
    }
  },
  
  // Log when tracking start fails
  logTrackingStartFailed(errorMsg) {
    try {
      const trackingStatusLogs = JSON.parse(localStorage.getItem('tracking_status_logs') || '[]');
      trackingStatusLogs.push({
        type: 'start_failed',
        error: errorMsg,
        timestamp: new Date().toISOString(),
        networkInfo: navigator.connection ? {
          type: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink
        } : null
      });
      
      // Keep only last 20 tracking status logs
      if (trackingStatusLogs.length > 20) trackingStatusLogs.shift();
      localStorage.setItem('tracking_status_logs', JSON.stringify(trackingStatusLogs));
    } catch (e) {
      console.error('Error logging tracking start failure:', e);
    }
  },
  
  // Upload diagnostic logs to server
  uploadDiagnosticLogs() {
    try {
      // Get all logs
      const trackingLogs = JSON.parse(localStorage.getItem('tracking_logs') || '[]');
      const successLogs = JSON.parse(localStorage.getItem('connection_success_logs') || '[]');
      const failureLogs = JSON.parse(localStorage.getItem('connection_failure_logs') || '[]');
      const pendingFailureLogs = JSON.parse(localStorage.getItem('pending_failure_logs') || '[]');
      const pingLogs = JSON.parse(localStorage.getItem('ping_logs') || '[]');
      const locationErrorLogs = JSON.parse(localStorage.getItem('location_error_logs') || '[]');
      const wakeLockLogs = JSON.parse(localStorage.getItem('wake_lock_logs') || '[]');
      const visibilityLogs = JSON.parse(localStorage.getItem('visibility_logs') || '[]');
      const trackingStatusLogs = JSON.parse(localStorage.getItem('tracking_status_logs') || '[]');
      
      // Only upload if we have something
      if (trackingLogs.length || successLogs.length || failureLogs.length || pendingFailureLogs.length) {
        const diagnosticData = {
          deviceId: document.getElementById('vehicleId').value.trim() || 'unknown_device',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          screen: {
            width: window.screen.width,
            height: window.screen.height
          },
          trackingLogs: trackingLogs.slice(-20), // Last 20 tracking attempts
          successLogs,
          failureLogs,
          pendingFailureLogs,
          pingLogs,
          locationErrorLogs,
          wakeLockLogs,
          visibilityLogs,
          trackingStatusLogs
        };
        
        fetch('/diagnostic-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diagnosticData)
        })
        .then(response => {
          if (response.ok) {
            // Clear pending failure logs after successful upload
            localStorage.removeItem('pending_failure_logs');
            console.log('Diagnostic logs uploaded successfully');
          }
        })
        .catch(error => {
          console.error('Failed to upload diagnostic logs:', error);
        });
      }
    } catch (e) {
      console.error('Error processing logs for upload:', e);
    }
  }
};

// Add listeners to automatically upload logs when connection is available
window.addEventListener('online', () => {
  console.log('Device online, uploading diagnostic logs');
  diagnostics.uploadDiagnosticLogs();
});

// Upload logs periodically if tracking is active
setInterval(() => {
  if (document.getElementById('trackingButton').textContent === 'Stop Tracking') {
    diagnostics.uploadDiagnosticLogs();
  }
}, 10 * 60 * 1000); // Every 10 minutes