@echo off
setlocal
cd /d "%~dp0"
if not exist "backups" mkdir "backups"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "stamp=%%i"
if exist "data\portal.json" (
  tar.exe -a -c -f "backups\NIA-Compliance-Backup-%stamp%.zip" "data"
  if errorlevel 1 (
    echo BACKUP FAILED. Check permissions and available disk space.
    exit /b 1
  )
  echo Backup completed: backups\NIA-Compliance-Backup-%stamp%.zip
  echo Copy this encrypted/protected backup to the approved internal backup location.
) else (
  echo No portal data exists yet. Start and sign in to the portal first.
)
pause
