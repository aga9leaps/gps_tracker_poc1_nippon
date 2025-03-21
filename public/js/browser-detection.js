// Browser detection utilities
const browserDetection = {
    // Check if running on iOS Safari
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    
    // Check if running on Safari
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    
    // Configuration for Safari browsers
    SAFARI_CONFIG: {
      keepAliveInterval: 15000,      // 15 seconds for keep-alive pings
      locationRefreshInterval: 5000, // 5 seconds location refresh
      maxRetries: 3,                 // Maximum retries on location failure
      visibilityCheckInterval: 5000  // Check visibility every 5 seconds
    }
  };
  
  // Set up Safari config if needed
  if (browserDetection.isIOS || browserDetection.isSafari) {
    // Set Safari-specific settings
    window.SAFARI_CONFIG = browserDetection.SAFARI_CONFIG;
  }