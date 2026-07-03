@echo off
title TradeSense

echo Starting PostgreSQL...
start /min cmd /c ""C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "C:\Program Files\PostgreSQL\16\data" -c autovacuum=off"
timeout /t 5 /nobreak >nul

echo Starting servers with PM2...
cd /d C:\TradeSense
pm2 resurrect 2>nul || pm2 start ecosystem.config.cjs

echo.
echo Open http://localhost:5173 in your browser.
echo Run "pm2 stop all" to stop.
timeout /t 3 /nobreak >nul
exit
