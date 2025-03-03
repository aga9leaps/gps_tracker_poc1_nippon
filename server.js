const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Helper function to format IST timestamp
function getISTTime() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Helper function for full IST date and time
function getISTDateTime() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Configuration
const CONFIG = {
    updateFrequency: 60000,      // GPS sampling every 1 minute
    dashboardFrequency: 30000,   // Dashboard updates every 30 seconds
    inactiveThreshold: 300000,   // Mark as inactive after 5 minutes
    dataRetentionPeriod: 24 * 60 * 60 * 1000  // Keep data for 24 hours
};

// In-memory store for location data
const locationData = {};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${getISTTime()}] ${req.method.padEnd(5)} ${req.path.padEnd(20)} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// Endpoint to receive location updates
app.post('/location-update', (req, res) => {
    const { id, latitude, longitude, action } = req.body;
    
    if (!id || latitude === undefined || longitude === undefined) {
        console.log(`[${getISTTime()}] ❌ Invalid location update:`, req.body);
        return res.status(400).json({ 
            error: "Missing required data",
            required: ["id", "latitude", "longitude"],
            received: req.body
        });
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

    locationData[id].locations.push(locationEntry);
    locationData[id].isActive = true;
    locationData[id].lastUpdate = new Date();
    
    console.log(`[${getISTTime()}] 📍 Location update from ${id.padEnd(10)} LAT: ${latitude.toFixed(6)} LNG: ${longitude.toFixed(6)}`);
    res.sendStatus(200);
});

// Get locations for specific ID
app.get('/locations/:id', (req, res) => {
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
});

// Get all locations
app.get('/locations', (req, res) => {
    const activeTrackers = Object.entries(locationData)
        .filter(([_, data]) => data.isActive)
        .length;
    console.log(`[${getISTTime()}] 📊 Sending data for ${activeTrackers} active trackers`);
    res.json(locationData);
});

// Get config
app.get('/config', (req, res) => {
    console.log(`[${getISTTime()}] ⚙️  Config requested`);
    res.json(CONFIG);
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
    console.log(`[${getISTTime()}] 🖥️  Dashboard accessed`);
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Add this function to clean old data
function cleanOldData() {
    const now = new Date();
    const retentionThreshold = now.getTime() - CONFIG.dataRetentionPeriod;
    
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

// Run cleanup every hour
setInterval(cleanOldData, 60 * 60 * 1000);

// Also clean on server start
cleanOldData();

// Add this endpoint to handle tracking ID updates
app.post('/update-tracking-id', (req, res) => {
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
});

// Add this endpoint to delete a tracker
app.delete('/locations/:id', (req, res) => {
    const id = req.params.id;
    if (locationData[id]) {
        delete locationData[id];
        console.log(`[${getISTTime()}] 🗑️ Deleted tracker: ${id}`);
        res.sendStatus(200);
    } else {
        console.log(`[${getISTTime()}] ⚠️ No data found for tracker to delete: ${id}`);
        res.status(404).json({ error: "Tracker not found" });
    }
});

// Add keep-alive endpoint
app.post('/ping', (req, res) => {
    res.sendStatus(200);
});

// Add tracking status endpoint
app.post('/tracking-status', (req, res) => {
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
});

// Start server
app.listen(port, () => {
    console.log('\n=== Location Tracking Server ===');
    console.log(`📅 Started at: ${getISTDateTime()}`);
    console.log(`🚀 Server running on port ${port}`);
    console.log('===============================\n');
});
