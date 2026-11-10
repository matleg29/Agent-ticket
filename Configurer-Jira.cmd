@echo off
setlocal
chcp 65001 >nul
echo.
echo === Configuration du jeton Jira de l'agent ===
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\set-jira-credentials.ps1"
echo.
pause
