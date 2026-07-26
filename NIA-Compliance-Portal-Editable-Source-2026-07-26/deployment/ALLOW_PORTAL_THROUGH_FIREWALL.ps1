$ErrorActionPreference = "Stop"
$ruleName = "NIA Compliance Portal TCP 3000"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Domain,Private | Out-Null
}
Write-Host "Firewall access is ready for the NIA Compliance Portal." -ForegroundColor Green

