@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLICAR-CORRECAO.ps1"
echo.
echo Processo terminado. Le o resultado acima.
pause
