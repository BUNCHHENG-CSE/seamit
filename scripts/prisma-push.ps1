# Prisma Schema Push Script for SeamIT
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SeamIT - Prisma DB Push (PostgreSQL Schema Sync)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$pythonScripts = "$env:APPDATA\Python\Python314\Scripts"
if (Test-Path $pythonScripts) {
    $env:PATH = "$pythonScripts;$env:PATH"
}

Write-Host "Synchronizing prisma/schema.prisma with PostgreSQL container (port 5437)..." -ForegroundColor Yellow
python -m prisma db push --schema=prisma/schema.prisma

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] PostgreSQL schema synchronized with Prisma schema!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Prisma db push failed with code $LASTEXITCODE." -ForegroundColor Red
}
