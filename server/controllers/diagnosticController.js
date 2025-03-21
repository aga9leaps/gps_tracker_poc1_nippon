const fs = require('fs');
const path = require('path');
const { getISTTime } = require('../utils/timeUtil');

// Store diagnostic logs
function storeDiagnosticLogs(req, res) {
    const { deviceId, timestamp, userAgent, screen, trackingLogs, successLogs, failureLogs, pendingFailureLogs } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: "Missing device ID" });
    }
    
    console.log(`[${getISTTime()}] 📊 Received diagnostic logs from ${deviceId}`);
    
    // Create a logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }
    
    // Create a device-specific log file
    const logFileName = `${deviceId.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(logsDir, logFileName);
    
    // Format the log entry
    const logEntry = `
========== DIAGNOSTIC LOG ${new Date().toISOString()} ==========
Device ID: ${deviceId}
User Agent: ${userAgent}
Screen: ${screen.width}x${screen.height}
Failure Logs: ${failureLogs.length}
Success Logs: ${successLogs.length}
Pending Failure Logs: ${pendingFailureLogs.length}

FAILURE DETAILS:
${JSON.stringify(failureLogs, null, 2)}

SUCCESS DETAILS:
${JSON.stringify(successLogs, null, 2)}

TRACKING DETAILS:
${JSON.stringify(trackingLogs, null, 2)}
==========================================================
`;

    // Append to the log file
    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
            console.error(`[${getISTTime()}] ❌ Error writing diagnostic logs:`, err);
            return res.status(500).json({ error: "Failed to save diagnostic logs" });
        }
        
        console.log(`[${getISTTime()}] ✅ Diagnostic logs saved for ${deviceId}`);
        res.sendStatus(200);
    });
}

module.exports = {
    storeDiagnosticLogs
};