@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 18 或以上版本，再运行此文件。
  echo https://nodejs.org/
  pause
  exit /b 1
)
node scripts/server.mjs --open
pause
