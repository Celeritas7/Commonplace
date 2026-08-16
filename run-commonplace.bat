@echo off
title Commonplace local server
REM Double-click to run the Commonplace app locally (static file server).
REM Put this .bat in the Mechanical folder (next to index.html).
REM Leave this window open while browsing.
cd /d "%~dp0"

if not exist "index.html" (
  echo Could not find index.html here.
  echo Put this .bat in the Mechanical folder, next to index.html.
  echo Current folder: %CD%
  pause & goto :eof
)

set "PORT=8137"
set "URL=http://localhost:%PORT%/"

REM --- Try Python first (bundled http.server, no install step) ---
set "PY="
for %%P in ("python.exe" "py.exe") do (
  if not defined PY (
    call %%~P --version >nul 2>nul && set "PY=%%~P"
  )
)
if defined PY (
  echo.
  echo   Commonplace - local server ^(Python^)
  echo   Open:    %URL%
  echo   ^(Close this window to stop.^)
  echo.
  start "" "%URL%"
  if /i "%PY%"=="py.exe" (
    call py -m http.server %PORT%
  ) else (
    call python -m http.server %PORT%
  )
  echo.
  echo Server stopped.
  pause & goto :eof
)

REM --- Fall back to Node: npx serve ---
set "NPX="
for %%P in (
  "npx.cmd"
  "%ProgramFiles%\nodejs\npx.cmd"
  "%ProgramFiles(x86)%\nodejs\npx.cmd"
  "%LOCALAPPDATA%\Programs\nodejs\npx.cmd"
) do (
  if not defined NPX (
    call "%%~P" --version >nul 2>nul && set "NPX=%%~P"
  )
)
if defined NPX (
  echo.
  echo   Commonplace - local server ^(Node^)
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
echo Could not find Python or Node.js automatically.
echo Install either one, then double-click this again:
echo   Python: https://www.python.org  ^(check "Add to PATH"^)
echo   Node:   https://nodejs.org
echo Or open a terminal, cd to this folder, and run one of:
echo     python -m http.server %PORT%
echo     npx serve -l %PORT% .
echo.
pause
