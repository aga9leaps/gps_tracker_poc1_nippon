require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Import configuration
const CONFIG = require('./config/config');

// Import controllers
const locationController = require('./controllers/locationController');
const diagnosticController = require('./controllers/diagnosticController');

// Import middleware
const loggingMiddleware = require('./middleware/loggingMiddleware');

// Import services
const dataCleanupService = require('./services/dataCleanupService');

// Apply middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(loggingMiddleware);

// Location routes
app.post('/location-update', locationController.updateLocation);
app.post('/location-batch', locationController.processBatch);
app.get('/locations/:id', locationController.getLocationById);
app.get('/locations', locationController.getAllLocations);
app.delete('/locations/:id', locationController.deleteLocation);
app.post('/update-tracking-id', locationController.updateTrackingId);
app.post('/tracking-status', locationController.updateTrackingStatus);

// Diagnostic routes
app.post('/diagnostic-logs', diagnosticController.storeDiagnosticLogs);

// Config route
app.get('/config', (req, res) => {
    res.json(CONFIG);
});

// Utility routes
app.post('/ping', (req, res) => {
    res.sendStatus(200);
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Initialize data cleanup
dataCleanupService.startCleanupSchedule();
dataCleanupService.performInitialCleanup();

// Start server
app.listen(port, () => {
    const { getISTDateTime } = require('./utils/timeUtil');
    console.log('\n=== Location Tracking Server ===');
    console.log(`📅 Started at: ${getISTDateTime()}`);
    console.log(`🚀 Server running on port ${port}`);
    console.log('===============================\n');
});