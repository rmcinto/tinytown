#!/bin/bash

# Navigate to the project root (assuming bin/ is inside the project folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT/server"

# Check if SSL certificates exist, if not, generate them
CERT_FILE="server.cert"
KEY_FILE="server.key"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "SSL certificate or key missing. Generating self-signed certificates..."
    openssl req -x509 -newkey rsa:2048 -keyout "$KEY_FILE" -out "$CERT_FILE" -days 365 -nodes \
        -subj "/CN=localhost"
    echo "Self-signed certificates generated."
fi

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