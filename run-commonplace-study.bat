@echo off
title Commonplace study server
REM Launches Commonplace WITH the study layer (bookmarks, highlights, annotations).
REM Requires Python (https://www.python.org - check "Add to PATH" when installing).
REM Easiest use: DRAG your Mechanical folder ONTO this .bat.
set "MECH_DIR="

if not "%~1"=="" set "MECH_DIR=%~1"

if not defined MECH_DIR (
  for %%D in ("%~dp0Mechanical" "%~dp0..\Mechanical" "%USERPROFILE%\Mechanical" "%USERPROFILE%\Desktop\Mechanical" "%USERPROFILE%\Downloads\Mechanical" "%USERPROFILE%\Documents\Mechanical" "%USERPROFILE%\OneDrive\Desktop\Mechanical" "%USERPROFILE%\OneDrive\Documents\Mechanical") do (
    if not defined MECH_DIR if exist "%%~D\index.html" set "MECH_DIR=%%~D"
  )
)

if not defined MECH_DIR (
  echo Could not find the Mechanical folder automatically.
  set /p "MECH_DIR=Paste the full path to your Mechanical folder and press Enter: "
)

if not exist "%MECH_DIR%\index.html" (
  echo.
  echo No index.html found in: "%MECH_DIR%"
  echo Tip: drag the Mechanical folder onto this .bat file.
  pause & goto :eof
)

set "PY="
for %%P in ("python.exe" "py.exe") do (
  if not defined PY (
    call %%~P --version >nul 2>nul && set "PY=%%~P"
  )
)
if not defined PY (
  echo Python is required for the study layer.
  echo Install it from https://www.python.org ^(check "Add to PATH"^), then run this again.
  pause & goto :eof
)

echo.
echo   Commonplace study server - serving "%MECH_DIR%"
echo   Open:    http://localhost:8137/
echo   ^(Close this window to stop.^)
echo.
start "" "http://localhost:8137/"
if /i "%PY%"=="py.exe" ( call py "%~dp0serve.py" "%MECH_DIR%" ) else ( call python "%~dp0serve.py" "%MECH_DIR%" )
echo.
echo Server stopped.
pause
