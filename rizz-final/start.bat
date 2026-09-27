@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Starting Rizz...
npm start
pause
