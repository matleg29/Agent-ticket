@echo off
setlocal
chcp 65001 >nul
echo.
echo === Prérequis Jira : vérification de la connexion du MCP Jira ===
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-jira.ps1"
echo.
pause
