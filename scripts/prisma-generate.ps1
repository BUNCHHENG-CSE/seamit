# Prisma Client Generator for Windows
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SeamIT - Prisma ORM Generator (Python Client)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Prepend Python Scripts path where prisma-client-py.exe lives
$pythonScripts = "$env:APPDATA\Python\Python314\Scripts"
if (Test-Path $pythonScripts) {
    $env:PATH = "$pythonScripts;$env:PATH"
}

Write-Host "Generating Prisma Python Client from prisma/schema.prisma..." -ForegroundColor Yellow
python -m prisma generate --schema=prisma/schema.prisma

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Prisma ORM Client generated and registered successfully!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Prisma generation failed with code $LASTEXITCODE." -ForegroundColor Red
}
