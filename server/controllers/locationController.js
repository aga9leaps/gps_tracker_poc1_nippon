const { locationData } = require('../services/dataCleanupService');
const roadMatchingService = require('../services/roadMatchingService');
const { getISTTime } = require('../utils/timeUtil');
const config = require('../config/config');

// Update a single location
async function updateLocation(req, res) {
    const { id, latitude, longitude, action, diagnostics } = req.body;
    
    if (!id || latitude === undefined || longitude === undefined) {
        console.log(`[${getISTTime()}] ❌ Invalid location update:`, req.body);
        return res.status(400).json({ 
            error: "Missing required data",
            required: ["id", "latitude", "longitude"],
            received: req.body
        });
    }

    // Log detailed connection info if available
    if (diagnostics) {
        console.log(`[${getISTTime()}] 📱 Device diagnostics for ${id}: 
        Network: ${diagnostics.network ? diagnostics.network.type : 'unknown'}, 
        Battery: ${diagnostics.battery ? `${diagnostics.battery.level}%, ${diagnostics.battery.charging ? 'charging' : 'not charging'}` : 'unknown'},
        Visibility: ${diagnostics.visibilityState}`);
    }

    if (!locationData[id]) {
        locationData[id] = {
            isActive: true,
            locations: []
        };
        console.log(`[${getISTTime()}] 🆕 New tracker registered: ${id}`);
    }
    
    const locationEntry = {
        latitude,
        longitude,
        timestamp: new Date()
    };

    // Get the previous 5 points (or fewer if not available)
    const recentPoints = [...locationData[id].locations.slice(-4), locationEntry];
    
    // Only perform road matching if we have API key and multiple points
    let processedPoints = [locationEntry];
    if (config.googleMapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && recentPoints.length > 1) {
        try {
            processedPoints = await roadMatchingService.snapToRoads(recentPoints);
            // Only take the last point which represents our current position
            locationEntry.latitude = processedPoints[processedPoints.length - 1].latitude;
            locationEntry.longitude = processedPoints[processedPoints.length - 1].longitude;
            console.log(`[${getISTTime()}] 🛣️ Road matched for ${id}`);
        } catch (error) {
            console.error(`[${getISTTime()}] ❌ Road matching error:`, error);
            // Keep the original point if road matching failed
        }
    }

    locationData[id].locations.push(locationEntry);
    locationData[id].isActive = true;
    locationData[id].lastUpdate = new Date();
    
    console.log(`[${getISTTime()}] 📍 Location update from ${id.padEnd(10)} LAT: ${locationEntry.latitude.toFixed(6)} LNG: ${locationEntry.longitude.toFixed(6)}`);
    res.sendStatus(200);
}

// Process a batch of location updates
async function processBatch(req, res) {
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
        console.log(`[${getISTTime()}] ❌ Invalid batch update:`, req.body);
        return res.status(400).json({ error: "Invalid location batch data" });
    }

    console.log(`[${getISTTime()}] 📦 Received batch of ${locations.length} locations`);
    
    // Process each location
    for (const location of locations) {
        const { id, latitude, longitude, timestamp, action } = location;
        
        if (!id || latitude === undefined || longitude === undefined) {
            console.log(`[${getISTTime()}] ⚠️ Skipping invalid location in batch:`, location);
            continue;
        }

        if (!locationData[id]) {
            locationData[id] = {
                isActive: true,
                locations: []
            };
            console.log(`[${getISTTime()}] 🆕 New tracker registered from batch: ${id}`);
        }
        
        const locationEntry = {
            latitude,
            longitude,
            timestamp: timestamp || new Date()
        };
        
        locationData[id].locations.push(locationEntry);
        locationData[id].isActive = true;
        locationData[id].lastUpdate = new Date();
        
        console.log(`[${getISTTime()}] 📍 Batch location for ${id.padEnd(10)} LAT: ${locationEntry.latitude.toFixed(6)} LNG: ${locationEntry.longitude.toFixed(6)} TIME: ${new Date(locationEntry.timestamp).toISOString()}`);
    }
    
    res.sendStatus(200);
}

// Get location for a specific ID
function getLocationById(req, res) {
    const id = req.params.id;
    if (locationData[id] && locationData[id].locations.length > 0) {
        console.log(`[${getISTTime()}] 📊 Sending data for tracker: ${id}`);
        res.json({
            isActive: locationData[id].isActive,
            locations: locationData[id].locations,
            lastUpdate: locationData[id].lastUpdate
        });
    } else {
        console.log(`[${getISTTime()}] ⚠️  No data found for tracker: ${id}`);
        res.json({
            isActive: false,
            locations: [],
            lastUpdate: null
        });
    }
}

// Get all locations
function getAllLocations(req, res) {
    const activeTrackers = Object.entries(locationData)
        .filter(([_, data]) => data.isActive)
        .length;
    console.log(`[${getISTTime()}] 📊 Sending data for ${activeTrackers} active trackers`);
    res.json(locationData);
}

// Delete a tracker
function deleteLocation(req, res) {
    const id = req.params.id;
    if (locationData[id]) {
        delete locationData[id];
        console.log(`[${getISTTime()}] 🗑️ Deleted tracker: ${id}`);
        res.sendStatus(200);
    } else {
        console.log(`[${getISTTime()}] ⚠️ No data found for tracker to delete: ${id}`);
        res.status(404).json({ error: "Tracker not found" });
    }
}

// Update tracking ID
function updateTrackingId(req, res) {
    const { oldId, newId } = req.body;
    
    if (!oldId || !newId) {
        return res.status(400).json({ error: "Missing ID information" });
    }

    if (locationData[oldId]) {
        // Transfer the location history to the new ID
        locationData[newId] = locationData[oldId];
        delete locationData[oldId];
        
        console.log(`[${getISTTime()}] 🔄 Tracking ID updated: ${oldId} → ${newId}`);
        res.sendStatus(200);
    } else {
        console.log(`[${getISTTime()}] ⚠️ No data found for old tracking ID: ${oldId}`);
        res.status(404).json({ error: "Original tracking ID not found" });
    }
}

// Update tracking status
function updateTrackingStatus(req, res) {
    const { id, action } = req.body;
    
    if (!locationData[id]) {
        locationData[id] = {
            isActive: true,
            locations: [],
            lastUpdate: new Date()
        };
    }
    
    if (action === 'stopped') {
        locationData[id].isActive = false;
        console.log(`[${getISTTime()}] 🛑 Tracking stopped for: ${id}`);
    } else if (action === 'tracking') {
        locationData[id].isActive = true;
        console.log(`[${getISTTime()}] ▶️ Tracking active for: ${id}`);
    }
    
    res.sendStatus(200);
}

module.exports = {
    updateLocation,
    processBatch,
    getLocationById,
    getAllLocations,
    deleteLocation,
    updateTrackingId,
    updateTrackingStatus
};