@echo off
cd /d "%~dp0"

set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"

if not exist "%~dp0cloudflared.exe" (
  echo cloudflared.exe not found in this folder.
  echo Download it from:
  echo https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  echo.
  pause
  exit /b 1
)

echo Starting Cloudflare Tunnel for http://127.0.0.1:%PORT%
echo.
echo Copy the trycloudflare.com URL shown below, then set LINE Webhook URL to:
echo   https://YOUR-TRYCLOUDFLARE-URL/webhook
echo.
echo Keep this window open while testing the LINE Bot.
echo.
"%~dp0cloudflared.exe" tunnel --url "http://127.0.0.1:%PORT%"
pause
