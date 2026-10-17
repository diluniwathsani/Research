@echo off
TITLE Research System - Complete Runner
COLOR 0A
echo ====================================================
echo    STARTING ALL RESEARCH SYSTEM SERVICES
echo ====================================================
echo.
echo  1. Express Node Backend  (http://localhost:3000)
echo  2. Flask AI API          (http://localhost:8082)
echo  3. Flask ML Service      (http://localhost:5001)
echo  4. React Vite Frontend   (http://localhost:5173)
echo.
echo Press Ctrl+C at any time to stop all services.
echo ====================================================
echo.

node "%~dp0run_all.js"

pause
