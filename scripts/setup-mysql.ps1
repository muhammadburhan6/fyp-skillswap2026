$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env"

Write-Host "SkillSwap MySQL setup" -ForegroundColor Cyan

$mysqlOk = $false
try {
    $tcp = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue
    $mysqlOk = $tcp.TcpTestSucceeded
} catch {
    $mysqlOk = $false
}

if (-not $mysqlOk) {
    Write-Host ""
    Write-Host "MySQL is not running on port 3306." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Install and start MySQL using one of these:"
    Write-Host "  1. XAMPP (easiest): https://www.apachefriends.org -> start MySQL in XAMPP Control Panel"
    Write-Host "  2. Docker:          docker compose up -d mysql"
    Write-Host "                      then set MYSQL_PASSWORD=root in backend/.env"
    Write-Host "  3. MySQL Installer: https://dev.mysql.com/downloads/installer/"
    Write-Host ""
    exit 1
}

Write-Host "MySQL port 3306 is reachable." -ForegroundColor Green

Push-Location (Join-Path $root "backend")
try {
    & .\venv\Scripts\pip install -q -r requirements.txt
    & .\venv\Scripts\python -c "from database.mysql_setup import ensure_mysql_database; from database.models import init_db; ensure_mysql_database(); init_db(); print('Database ready: skillswap')"
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Next: run the app with  npm run dev" -ForegroundColor Green
