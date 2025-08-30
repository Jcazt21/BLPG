# BLPG Docker Runner - PowerShell Version
param(
    [switch]$NoBuild,
    [switch]$Clean,
    [switch]$Dev,
    [switch]$Help
)

# Colors
$Green = "`e[92m"
$Red = "`e[91m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Cyan = "`e[96m"
$NC = "`e[0m"

function Write-ColorOutput {
    param($Color, $Message)
    Write-Host "$Color$Message$NC"
}

function Show-Help {
    Write-ColorOutput $Cyan "BLPG Docker Runner - PowerShell"
    Write-Host ""
    Write-Host "Usage: .\run-docker.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -NoBuild    Start without rebuilding images"
    Write-Host "  -Clean      Clean up containers and images before starting"
    Write-Host "  -Dev        Start in development mode with file watching"
    Write-Host "  -Help       Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\run-docker.ps1                # Normal start with build"
    Write-Host "  .\run-docker.ps1 -NoBuild       # Start without building"
    Write-Host "  .\run-docker.ps1 -Clean         # Clean and rebuild"
    Write-Host "  .\run-docker.ps1 -Dev           # Development mode"
}

if ($Help) {
    Show-Help
    exit 0
}

Write-ColorOutput $Blue "========================================"
Write-ColorOutput $Blue "  BLPG (Blackjack Multiplayer Game)    "
Write-ColorOutput $Blue "========================================"
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-ColorOutput $Yellow "Warning: .env file not found."
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-ColorOutput $Green "✓ .env file created from template"
    } else {
        Write-ColorOutput $Red "✗ Error: .env.example not found. Please create .env file manually."
        exit 1
    }
    Write-Host ""
}

# Check Docker
Write-ColorOutput $Blue "Checking Docker status..."
try {
    docker info | Out-Null
    Write-ColorOutput $Green "✓ Docker is running"
} catch {
    Write-ColorOutput $Red "✗ Error: Docker is not running. Please start Docker Desktop first."
    exit 1
}

# Check ports
Write-ColorOutput $Blue "Checking for port conflicts..."
$port5180 = Get-NetTCPConnection -LocalPort 5180 -ErrorAction SilentlyContinue
$port5185 = Get-NetTCPConnection -LocalPort 5185 -ErrorAction SilentlyContinue

if ($port5180) {
    Write-ColorOutput $Yellow "⚠ Warning: Port 5180 is already in use"
}
if ($port5185) {
    Write-ColorOutput $Yellow "⚠ Warning: Port 5185 is already in use"
}

# Clean up if requested
if ($Clean) {
    Write-ColorOutput $Blue "Cleaning up old containers and images..."
    docker-compose down --remove-orphans 2>$null
    docker system prune -f 2>$null
    Write-ColorOutput $Green "✓ Cleanup completed"
}

Write-Host ""
Write-ColorOutput $Blue "Starting the application..."
Write-ColorOutput $Green "Frontend: http://localhost:5180"
Write-ColorOutput $Green "Backend API: http://localhost:5185"
Write-ColorOutput $Green "Health check: http://localhost:5185/health"
Write-Host ""
Write-ColorOutput $Yellow "Press Ctrl+C to stop the application"
Write-Host ""

# Build command based on parameters
$dockerArgs = @("up")

if (-not $NoBuild) {
    $dockerArgs += "--build"
}

$dockerArgs += "--remove-orphans"

if ($Dev) {
    # Add development-specific flags if needed
    Write-ColorOutput $Cyan "Starting in development mode..."
}

# Start Docker Compose
try {
    & docker-compose $dockerArgs
    Write-ColorOutput $Green "✓ Application stopped successfully"
} catch {
    Write-ColorOutput $Red "✗ Application stopped with errors"
    Write-ColorOutput $Yellow "Check the logs above for details"
}

Write-Host ""
Write-ColorOutput $Blue "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")