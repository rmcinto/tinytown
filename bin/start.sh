#!/bin/bash

# Navigate to the project root (assuming bin/ is inside the project folder)
cd "$(dirname "$0")/.."

# Set mode (default to "debug" if no argument is provided)
MODE=${1:-debug}

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Ensure dependencies are installed
echo "Installing dependencies..."
npm install

if [ "$MODE" = "release" ]; then
    echo "Starting server in RELEASE mode..."
    npm run build
    node dist/server.js
else
    echo "Starting server in DEBUG mode..."
    npx ts-node src/server.ts
fi
