const https = require('https');
const querystring = require('querystring');
const config = require('../config/config');
const { getISTTime } = require('../utils/timeUtil');

// Function to snap points to roads using Google Roads API
async function snapToRoads(points) {
  // Skip if we don't have enough points
  if (!points || points.length < 2) {
    return points;
  }
  
  // Create path parameter (formatted as lat,lng|lat,lng|...)
  const path = points.map(p => `${p.latitude},${p.longitude}`).join('|');
  
  // Prepare query parameters
  const params = {
    interpolate: true,
    key: config.googleMapsApiKey
  };
  
  // Construct the URL
  const url = `https://roads.googleapis.com/v1/snapToRoads?${querystring.stringify(params)}&path=${path}`;
  
  try {
    // Make the API request
    const response = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }).on('error', (e) => {
        reject(e);
      });
    });

    // Parse the response
    if (response.statusCode !== 200) {
      console.error(`Road matching API error: ${response.statusCode}`, response.body);
      return points; // Return original points if there's an error
    }
    
    const result = JSON.parse(response.body);
    
    // Check if we got snapped points
    if (!result.snappedPoints || result.snappedPoints.length === 0) {
      return points; // Return original points if no snapped points
    }
    
    // Convert to our format
    const snappedPoints = result.snappedPoints.map(point => ({
      latitude: point.location.latitude,
      longitude: point.location.longitude,
      timestamp: points[0].timestamp // Use original timestamp
    }));
    
    return snappedPoints;
  } catch (error) {
    console.error('Error in road matching:', error);
    return points; // Return original points if there's an error
  }
}

module.exports = {
    snapToRoads
};