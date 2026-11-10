@echo off
setlocal
chcp 65001 >nul
echo.
echo === Verification de la connexion Jira ===
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-jira.ps1"
echo.
pause
