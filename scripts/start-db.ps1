# ==============================================================================
# SeamIT - Windows PowerShell script to start WSL Docker PostgreSQL
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   Starting SeamIT Production-Tuned PostgreSQL in WSL Docker" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# Check if WSL is available
try {
    $wslCheck = wsl --status
} catch {
    Write-Host "[ERROR] WSL is not available on this machine." -ForegroundColor Red
    exit 1
}

# Run docker compose in WSL
Write-Host "Invoking 'wsl docker compose up -d seamit_postgres'..." -ForegroundColor Yellow
wsl docker compose -f docker-compose.yml up -d seamit_postgres

# Wait for healthy state
Write-Host "Checking health status..." -ForegroundColor Yellow
$maxAttempts = 15
$attempt = 0
$isHealthy = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $status = wsl docker compose ps seamit_postgres
    if ($status -match "\(healthy\)") {
        $isHealthy = $true
        break
    }
    $attempt++
}

if ($isHealthy) {
    Write-Host "[SUCCESS] SeamIT PostgreSQL is HEALTHY and listening on port 5437!" -ForegroundColor Green
    Write-Host "Connection URL: postgresql://seamit:seamit_secure_password@127.0.0.1:5437/seamit_db" -ForegroundColor White
} else {
    Write-Host "[WARNING] Container started, but healthcheck is still pending." -ForegroundColor Yellow
    wsl docker compose ps seamit_postgres
}
