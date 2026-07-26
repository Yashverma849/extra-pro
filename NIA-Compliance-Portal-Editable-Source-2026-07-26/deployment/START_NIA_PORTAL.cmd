@echo off
setlocal
cd /d "%~dp0"
set "HOSTNAME=0.0.0.0"
set "PORT=3000"
echo.
echo NIA Compliance Portal is starting...
echo.
echo On this computer: http://localhost:3000
echo Other NIA computers: http://THIS-COMPUTER-IP:3000
echo.
echo Keep this window open while the portal is in use.
echo Press Ctrl+C to stop the portal.
echo.
"%~dp0runtime\node.exe" "%~dp0server.js"
pause
