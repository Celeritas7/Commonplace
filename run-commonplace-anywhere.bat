@echo off
title Commonplace local server
REM Launches the Commonplace app from ANYWHERE — no need to place this inside the Mechanical folder.
REM Easiest use: DRAG your Mechanical folder ONTO this .bat file.
REM Or: set the path on the next line once (keep the quotes), then just double-click.
set "MECH_DIR="

REM 1) Folder dragged onto the .bat
if not "%~1"=="" set "MECH_DIR=%~1"

REM 2) Auto-detect in common spots
if not defined MECH_DIR (
  for %%D in ("%~dp0Mechanical" "%USERPROFILE%\Mechanical" "%USERPROFILE%\Desktop\Mechanical" "%USERPROFILE%\Downloads\Mechanical" "%USERPROFILE%\Documents\Mechanical" "%USERPROFILE%\OneDrive\Desktop\Mechanical" "%USERPROFILE%\OneDrive\Documents\Mechanical") do (
    if not defined MECH_DIR if exist "%%~D\index.html" set "MECH_DIR=%%~D"
  )
)

REM 3) Ask
if not defined MECH_DIR (
  echo Could not find the Mechanical folder automatically.
  set /p "MECH_DIR=Paste the full path to your Mechanical folder and press Enter: "
)

if not exist "%MECH_DIR%\index.html" (
  echo.
  echo No index.html found in: "%MECH_DIR%"
  echo Tip: drag the Mechanical folder onto this .bat file and it will launch.
  pause & goto :eof
)

cd /d "%MECH_DIR%"
set "PORT=8137"
set "URL=http://localhost:%PORT%/"

REM --- Try Python first ---
set "PY="
for %%P in ("python.exe" "py.exe") do (
  if not defined PY (
    call %%~P --version >nul 2>nul && set "PY=%%~P"
  )
)
if defined PY (
  echo.
  echo   Commonplace - serving "%MECH_DIR%"
  echo   Open:    %URL%
  echo   ^(Close this window to stop.^)
  echo.
  start "" "%URL%"
  if /i "%PY%"=="py.exe" ( call py -m http.server %PORT% ) else ( call python -m http.server %PORT% )
  echo.
  echo Server stopped.
  pause & goto :eof
)

REM --- Fall back to Node ---
set "NPX="
for %%P in ("npx.cmd" "%ProgramFiles%\nodejs\npx.cmd" "%ProgramFiles(x86)%\nodejs\npx.cmd" "%LOCALAPPDATA%\Programs\nodejs\npx.cmd") do (
  if not defined NPX (
    call "%%~P" --version >nul 2>nul && set "NPX=%%~P"
  )
)
if defined NPX (
  echo.
  echo   Commonplace - serving "%MECH_DIR%"
  echo   Open:    %URL%
  echo   ^(Close this window to stop.^)
  echo.
  start "" "%URL%"
  call "%NPX%" --yes serve -l %PORT% .
  echo.
  echo Server stopped.
  pause & goto :eof
)

echo.
echo Could not find Python or Node.js. Install either one, then run this again:
echo   Python: https://www.python.org  ^(check "Add to PATH"^)
echo   Node:   https://nodejs.org
pause
