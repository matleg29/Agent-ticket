@echo off
setlocal
chcp 65001 >nul
echo.
echo === Prérequis Jira : accès du MCP Jira (avant l'agent) ===
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\set-jira-credentials.ps1"
echo.
pause
