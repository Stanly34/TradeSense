$serverDir = Join-Path $PSScriptRoot "server"
$clientDir = Join-Path $PSScriptRoot "client"

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$serverLog = Join-Path $logDir "server.log"
$clientLog = Join-Path $logDir "client.log"

$serverJob = Start-Job -ScriptBlock {
  Set-Location $using:serverDir
  npx tsx watch src/server.ts 2>&1 | Out-File -FilePath $using:serverLog -Append
}

$clientJob = Start-Job -ScriptBlock {
  Set-Location $using:clientDir
  npx vite --host 2>&1 | Out-File -FilePath $using:clientLog -Append
}

Write-Host "TradeSense started in background."
Write-Host "  Server: http://localhost:5000"
Write-Host "  Client: http://localhost:5173"
Write-Host ""
Write-Host "To stop: Get-Job | Stop-Job"
Write-Host "To view logs: Get-Content $serverLog -Tail 10"
