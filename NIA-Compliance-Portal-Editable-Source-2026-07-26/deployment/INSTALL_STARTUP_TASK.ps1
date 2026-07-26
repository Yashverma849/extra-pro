$ErrorActionPreference = "Stop"
$portal = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Join-Path $portal "runtime\node.exe"
$server = Join-Path $portal "server.js"
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $server)) {
  throw "Run this script from the extracted NIA portal folder."
}
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$server`"" -WorkingDirectory $portal
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName "NIA Compliance Portal" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force | Out-Null
Write-Host "Startup task installed. Restart Windows or start it from Task Scheduler." -ForegroundColor Green
