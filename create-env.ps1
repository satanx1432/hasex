# Script to create .env.local file
$envContent = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# NVIDIA NIM Configuration
NVIDIA_NIM_API_KEY=
NVIDIA_NIM_ENDPOINT=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host ".env.local file created successfully!" -ForegroundColor Green
Write-Host "Please edit the file and add your Supabase credentials." -ForegroundColor Yellow
Write-Host "Then restart the development server." -ForegroundColor Cyan
