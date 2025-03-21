// Configuration with environment variable support
module.exports = {
    updateFrequency: parseInt(process.env.UPDATE_FREQUENCY || '60000'),
    dashboardFrequency: parseInt(process.env.DASHBOARD_FREQUENCY || '30000'),
    inactiveThreshold: parseInt(process.env.INACTIVE_THRESHOLD || '300000'),
    dataRetentionPeriod: parseInt(process.env.DATA_RETENTION_PERIOD || '86400000'),  // 24 hours
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY'
};