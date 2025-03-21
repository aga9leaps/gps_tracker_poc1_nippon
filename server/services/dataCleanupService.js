const config = require('../config/config');
const { getISTTime } = require('../utils/timeUtil');

// In-memory data store (shared with controllers)
const locationData = {};

// Clean old location data
function cleanOldData() {
    const now = new Date();
    const retentionThreshold = now.getTime() - config.dataRetentionPeriod;
    
    Object.entries(locationData).forEach(([id, locations]) => {
        // Remove old location points
        const filteredLocations = locations.locations.filter(loc => 
            new Date(loc.timestamp).getTime() > retentionThreshold
        );
        
        if (filteredLocations.length === 0) {
            // If no recent locations, remove the tracker entirely
            console.log(`[${getISTTime()}] 🗑️  Removing inactive tracker: ${id}`);
            delete locationData[id];
        } else if (filteredLocations.length < locations.locations.length) {
            // Update with only recent locations
            locationData[id].locations = filteredLocations;
            console.log(`[${getISTTime()}] 🧹 Cleaned old data for tracker: ${id} (Removed ${locations.locations.length - filteredLocations.length} points)`);
        }
    });
}

// Schedule regular cleanup
function startCleanupSchedule() {
    // Run cleanup every hour
    const ONE_HOUR = 60 * 60 * 1000;
    setInterval(cleanOldData, ONE_HOUR);
}

// Initial cleanup on server start
function performInitialCleanup() {
    cleanOldData();
}

module.exports = {
    locationData,
    cleanOldData,
    startCleanupSchedule,
    performInitialCleanup
};