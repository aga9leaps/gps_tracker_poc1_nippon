// UI controller module
const uiController = {
    // Show status message
    showStatus(message, type = 'info') {
      const statusDiv = document.getElementById('status');
      if (!statusDiv) {
        const div = document.createElement('div');
        div.id = 'status';
        document.body.appendChild(div);
      }
      
      const div = document.getElementById('status');
      div.className = `status ${type}`;
      div.textContent = message;
      div.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        div.style.display = 'none';
      }, 5000);
    },
    
    // Reset tracking button
    resetTrackingButton() {
      const trackingButton = document.getElementById('trackingButton');
      trackingButton.textContent = 'Start Tracking';
      trackingButton.style.background = 'var(--nippon-red)';
      trackingButton.onclick = tracking.startTracking.bind(tracking);
    },
    
    // Update tracking UI when tracking starts
    updateTrackingUI(trackingId) {
      const trackingButton = document.getElementById('trackingButton');
      trackingButton.textContent = 'Stop Tracking';
      trackingButton.style.background = '#666';
      trackingButton.onclick = tracking.stopTracking.bind(tracking);
      
      // Show tracking info
      document.getElementById('trackingInfo').style.display = 'block';
      document.getElementById('currentId').textContent = trackingId;
      
      this.showStatus('Tracking started successfully', 'success');
      this.addTrackingIndicator();
    },
    
    // Update location display with latest position
    updateLocationDisplay(position) {
      document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
      document.getElementById('locationInfo').textContent = 
        `Lat: ${position.coords.latitude.toFixed(6)}, Long: ${position.coords.longitude.toFixed(6)}`;
    },
    
    // Add a visible tracking indicator
    addTrackingIndicator() {
      if (document.getElementById('tracking-indicator')) return;
      
      const indicator = document.createElement('div');
      indicator.id = 'tracking-indicator';
      indicator.innerHTML = `
        <div class="pulse"></div>
        <span>Tracking Active</span>
      `;
      document.body.appendChild(indicator);
    },
    
    // Remove tracking indicator
    removeTrackingIndicator() {
      const indicator = document.getElementById('tracking-indicator');
      if (indicator) {
        indicator.remove();
      }
    }
  };