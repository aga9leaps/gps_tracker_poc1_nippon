// Helper functions for time handling

// Format time in IST with time only
function getISTTime() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Format date and time in IST
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

module.exports = {
    getISTTime,
    getISTDateTime
};