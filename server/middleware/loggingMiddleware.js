const { getISTTime } = require('../utils/timeUtil');

// Request logging middleware
module.exports = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${getISTTime()}] ${req.method.padEnd(5)} ${req.path.padEnd(20)} ${res.statusCode} ${duration}ms`);
    });
    next();
};