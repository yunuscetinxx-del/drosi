@echo off
title Drosi - Local Server
cd /d "%~dp0.."
node scripts\start-local.mjs
echo.
echo Server stopped. Press any key to close this window...
pause >nul
