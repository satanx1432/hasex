# Behavioral OS Environment Setup Script
# Run this script to create your .env.local file

Write-Host "Setting up Behavioral Operating System environment..." -ForegroundColor Green

# Check if .env.local exists
if (Test-Path .env.local) {
    Write-Host ".env.local already exists. Please update it manually." -ForegroundColor Yellow
} else {
    # Create .env.local from template
    Copy-Item .env.template .env.local
    Write-Host "Created .env.local file from template." -ForegroundColor Green
}

Write-Host ""
Write-Host "Please update .env.local with your actual credentials:" -ForegroundColor Yellow
Write-Host "1. SUPABASE: Get your URL and anon key from https://supabase.com" -ForegroundColor Cyan
Write-Host "2. NVIDIA NIM: Get your API key from https://build.nvidia.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "After updating credentials, run: npm run dev" -ForegroundColor Green
