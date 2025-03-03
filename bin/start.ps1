# Navigate to the project root (where bin/ is located)
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PROJECT_ROOT = Resolve-Path "$SCRIPT_DIR\.."

# Move into the 'server' directory since the server files are inside it
$SERVER_DIR = Resolve-Path "$PROJECT_ROOT\server"
Set-Location -Path $SERVER_DIR

# Set mode (default to "debug" if no argument is provided)
$MODE = if ($args.Length -gt 0) { $args[0] } else { "debug" }

# Load environment variables if .env exists
if (Test-Path "$PROJECT_ROOT\.env") {
    Get-Content "$PROJECT_ROOT\.env" | ForEach-Object {
        if ($_ -match "^(?!#)(.+?)=(.+)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} else {
    Write-Output "Warning: .env file not found in $PROJECT_ROOT! Environment variables may be missing."
}

# Ensure dependencies are installed
Write-Output "Installing dependencies..."
npm install

if ($MODE -eq "release") {
    Write-Output "Starting server in RELEASE mode..."
    npm run build
    node dist/server.js
} else {
    Write-Output "Starting server in DEBUG mode..."
    npx ts-node src/server.ts
}
