# Determine the project root
# If the script is located in a folder that contains a "server" folder, use that as the project root.
# Otherwise, if the script is in a "bin" folder, assume the project root is one level up.
if (Test-Path (Join-Path $PSScriptRoot "server")) {
    $projectRoot = $PSScriptRoot
} elseif ($PSScriptRoot -match "[\\\/]bin$") {
    $projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
} else {
    # Fallback: use current directory and verify that it contains a "server" folder.
    $projectRoot = $PWD
    if (-not (Test-Path (Join-Path $projectRoot "server"))) {
        Write-Error "Server folder not found. Please run this script from the project root or from the bin folder."
        exit 1
    }
}

# Define the server folder path
$serverFolder = Join-Path $projectRoot "server"

# Ensure the server folder exists (it should exist if your project is structured correctly)
if (-not (Test-Path $serverFolder)) {
    Write-Output "Server folder not found. Creating folder: $serverFolder"
    New-Item -ItemType Directory -Path $serverFolder | Out-Null
}

# Change to the server folder so that the certificate files are created there and node commands run from there
Set-Location $serverFolder

# Certificate generation
$certFile = "server.cert"
$keyFile  = "server.key"

if ((-not (Test-Path $certFile)) -or (-not (Test-Path $keyFile))) {
    Write-Output "SSL certificate or key missing. Generating self-signed certificates..."
    & openssl req -x509 -newkey rsa:2048 -keyout $keyFile -out $certFile -days 365 -nodes -subj "/CN=localhost"
    Write-Output "Self-signed certificates generated."
} else {
    Write-Output "Certificates already exist."
}

# Set mode (default to "debug" if no argument is provided)
$mode = if ($args.Count -gt 0) { $args[0] } else { "debug" }

# Load environment variables from .env at the project root
$envFile = Join-Path $projectRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -and ($_ -notmatch "^\s*#")) {
            $parts = $_ -split "="
            if ($parts.Length -ge 2) {
                $key = $parts[0].Trim()
                $value = ($parts[1..($parts.Length-1)] -join "=").Trim()
                Set-Item -Path "Env:$key" -Value $value
            }
        }
    }
}

# Install Node dependencies from the server folder
Write-Output "Installing dependencies..."
& npm install

# Run the server commands from the server folder
if ($mode -eq "release") {
    Write-Output "Starting server in RELEASE mode..."
    & npm run build
    & node dist/server.js
} else {
    Write-Output "Starting server in DEBUG mode..."
    & npx ts-node src/server.ts
}
