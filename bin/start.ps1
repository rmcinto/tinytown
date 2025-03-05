# Ensure SSL certificate exists
$certFile = "server.cert"
$keyFile = "server.key"
$pfxFile = "server.pfx"

if (!(Test-Path $certFile) -or !(Test-Path $keyFile)) {
    Write-Host "Generating self-signed SSL certificate..."
    
    # Generate a self-signed certificate
    $cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "Cert:\CurrentUser\My"
    $certPath = "Cert:\CurrentUser\My\" + $cert.Thumbprint

    # Export the certificate as a PFX file with a password
    $password = ConvertTo-SecureString -String "password" -Force -AsPlainText
    Export-PfxCertificate -Cert $certPath -FilePath $pfxFile -Password $password

    # Convert PFX to PEM format using OpenSSL (if available)
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        openssl pkcs12 -in $pfxFile -nocerts -out $keyFile -nodes -password pass:password
        openssl pkcs12 -in $pfxFile -clcerts -nokeys -out $certFile -password pass:password
        Write-Host "SSL certificates generated successfully."
    } else {
        Write-Host "OpenSSL not found. Ensure OpenSSL is installed to convert the PFX file."
    }
}

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
