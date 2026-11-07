# Prisma Studio Launcher for SeamIT
param(
    [int]$Port = 5555
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SeamIT - Prisma Studio Database Visualizer" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Prepend Python Scripts path where prisma CLI lives
$pythonScripts = "$env:APPDATA\Python\Python314\Scripts"
if (Test-Path $pythonScripts) {
    $env:PATH = "$pythonScripts;$env:PATH"
}

Write-Host "Starting Prisma Studio on http://localhost:$Port ..." -ForegroundColor Yellow
Write-Host "Browse and edit Assets, Automation Rules, Audit Logs, and Discrepancies visually." -ForegroundColor Gray
Write-Host "Press Ctrl+C to terminate.`n" -ForegroundColor DarkGray

python -m prisma studio --port $Port --schema=prisma/schema.prisma
