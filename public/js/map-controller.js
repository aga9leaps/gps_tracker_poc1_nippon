// Map controller module
const mapController = {
    map: null,
    marker: null,
    
    // Initialize the map
    init() {
      this.map = L.map('map').setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);
      this.marker = L.marker([0, 0]).addTo(this.map);
    },
    
    // Update map with current position
    updateMap(position) {
      if (!this.map || !this.marker) {
        this.init();
      }
      
      const coords = [position.coords.latitude, position.coords.longitude];
      this.marker.setLatLng(coords);
      this.map.setView(coords, 15);
    }
  };
  
  // Initialize map when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    mapController.init();
  });