@echo off
title TradeSense - Stop

echo Stopping Frontend...
taskkill /f /fi "WINDOWTITLE eq Frontend" 2>nul

echo Stopping Backend...
taskkill /f /fi "WINDOWTITLE eq Backend" 2>nul

echo Stopping PostgreSQL...
taskkill /f /im postgres.exe 2>nul

echo All services stopped.
pause
