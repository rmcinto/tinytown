# Navigate to the project root
Set-Location -Path "$PSScriptRoot\.."

# Set mode (default to "debug" if no argument is provided)
$MODE = if ($args.Length -gt 0) { $args[0] } else { "debug" }

# Load environment variables from .env
if (Test-Path "../.env") {
    Get-Content "../.env" | ForEach-Object {
        if ($_ -match "^(?!#)(.+?)=(.+)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Ensure dependencies are installed
Write-Output "Installing dependencies..."
npm install

if ($MODE -eq "release") {
    Write-Output "Starting server in RELEASE mode..."
    npm run build
    node ../dist/server.js
} else {
    Write-Output "Starting server in DEBUG mode..."
    npx ts-node ../src/server.ts
}
