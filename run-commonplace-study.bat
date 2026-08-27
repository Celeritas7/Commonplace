@echo off
title Commonplace study server
REM Launches Commonplace WITH the study layer (bookmarks, highlights, annotations).
REM Requires Python OR Node.js (either one).
REM Easiest use: DRAG your Commonplace ROOT folder (the one with index.html) ONTO this .bat.
set "MECH_DIR="

if not "%~1"=="" set "MECH_DIR=%~1"

if not defined MECH_DIR (
  for %%D in ("%~dp0." "%~dp0.." "%~dp0commonplace" "%~dp0Commonplace" "%USERPROFILE%\commonplace" "%USERPROFILE%\Desktop\commonplace" "%USERPROFILE%\Documents\commonplace" "%USERPROFILE%\Downloads\commonplace" "%USERPROFILE%\OneDrive\Desktop\commonplace" "%USERPROFILE%\OneDrive\Documents\commonplace" "%~dp0Mechanical" "%~dp0..\Mechanical" "%USERPROFILE%\Desktop\Mechanical" "%USERPROFILE%\Documents\Mechanical") do (
    if not defined MECH_DIR if exist "%%~D\index.html" set "MECH_DIR=%%~D"
  )
)

if not defined MECH_DIR (
  echo Could not find your Commonplace folder automatically.
  set /p "MECH_DIR=Paste the full path to your Commonplace folder ^(the one with index.html^) and press Enter: "
)

if not exist "%MECH_DIR%\index.html" (
  echo.
  echo No index.html found in: "%MECH_DIR%"
  echo Tip: drag your Commonplace root folder onto this .bat file.
  pause & goto :eof
)

set "PY="
for %%P in ("python.exe" "py.exe") do (
  if not defined PY (
    call %%~P --version >nul 2>nul && set "PY=%%~P"
  )
)
if defined PY (
  echo.
  echo   Commonplace study server ^(Python^) - serving "%MECH_DIR%"
  echo   Open:    http://localhost:8137/
  echo   ^(Close this window to stop.^)
  echo.
  start "" "http://localhost:8137/"
  if /i "%PY%"=="py.exe" ( call py "%~dp0serve.py" "%MECH_DIR%" ) else ( call python "%~dp0serve.py" "%MECH_DIR%" )
  echo.
  echo Server stopped.
  pause & goto :eof
)

REM --- Fall back to Node ---
set "NODE="
for %%P in ("node.exe" "%ProgramFiles%\nodejs\node.exe" "%ProgramFiles(x86)%\nodejs\node.exe" "%LOCALAPPDATA%\Programs\nodejs\node.exe") do (
  if not defined NODE (
    call "%%~P" --version >nul 2>nul && set "NODE=%%~P"
  )
)
if defined NODE (
  echo.
  echo   Commonplace study server ^(Node^) - serving "%MECH_DIR%"
  echo   Open:    http://localhost:8137/
  echo   ^(Close this window to stop.^)
  echo.
  start "" "http://localhost:8137/"
  call "%NODE%" "%~dp0serve.js" "%MECH_DIR%"
  echo.
  echo Server stopped.
  pause & goto :eof
)

echo Could not find Python or Node.js.
echo Install either one, then double-click this again:
echo   Python: https://www.python.org  ^(check "Add to PATH"^)
echo   Node:   https://nodejs.org
pause
