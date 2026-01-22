# FirstPR Docker Startup Script
# Simple script to build and run the application with Docker

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      FirstPR - Docker Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nChecking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker is running" -ForegroundColor Green

Write-Host "`nBuilding and starting containers..." -ForegroundColor Yellow
docker-compose up --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Application is running!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend:  http://localhost:8080" -ForegroundColor Cyan
} else {
    Write-Host "`n✗ Failed to start application" -ForegroundColor Red
    exit 1
}
