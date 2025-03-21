#!/bin/bash

# Define the directory structure
mkdir -p server/{config,controllers,services,utils,middleware} \
         public/{css,js}

# Create empty files
touch server/config/config.js
touch server/controllers/locationController.js
touch server/controllers/diagnosticController.js
touch server/services/roadMatchingService.js
touch server/services/dataCleanupService.js
touch server/utils/timeUtil.js
touch server/middleware/loggingMiddleware.js
touch server/server.js

touch public/css/styles.css
touch public/js/browser-detection.js
touch public/js/tracking.js
touch public/js/location-services.js
touch public/js/ui-controller.js
touch public/js/diagnostics.js
touch public/js/pwa-installer.js
touch public/js/map-controller.js
touch public/service-worker.js
touch public/index.html
touch public/dashboard.html

touch .env
touch package.json
touch README.md

echo "Directory structure and files created successfully."

