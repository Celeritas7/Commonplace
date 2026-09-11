@echo off
title Commonplace study server
REM Launches Commonplace WITH the study layer (bookmarks, highlights, annotations).
REM Requires Python OR Node.js (either one).
REM It serves the TOP-LEVEL Commonplace root, so EVERY app gets the study layer.
REM To force a different folder, drag that folder onto this .bat.
set "HERE=%~dp0"
set "MECH_DIR="

if not "%~1"=="" set "MECH_DIR=%~1"
if not defined MECH_DIR call :findroot

if not defined MECH_DIR (
  echo Could not find your Commonplace folder automatically.
  set /p "MECH_DIR=Paste the full path to your Commonplace ROOT folder ^(the top one with index.html^) and press Enter: "
)

if not exist "%MECH_DIR%\index.html" (
  echo.
  echo No index.html found in: "%MECH_DIR%"
  echo Tip: drag your top-level Commonplace root folder onto this .bat file.
  pause & goto :eof
)

echo.
echo   Serving root: "%MECH_DIR%"
echo   Apps covered by the study layer:
for /d %%A in ("%MECH_DIR%\*") do if exist "%%~A\index.html" echo      - %%~nxA
echo.
echo   If an app you use is NOT listed above, it lives outside this root.
echo   Drag the folder that CONTAINS all your apps onto this .bat instead.
echo.

set "PY="
for %%P in ("python.exe" "py.exe") do (
  if not defined PY (
    call %%~P --version >nul 2>nul && set "PY=%%~P"
  )
)
if defined PY (
  echo   Commonplace study server ^(Python^)
  echo   Open:    http://localhost:8137/
  echo   ^(Close this window to stop.^)
  echo.
  start "" "http://localhost:8137/"
  if /i "%PY%"=="py.exe" ( call py "%HERE%serve.py" "%MECH_DIR%" ) else ( call python "%HERE%serve.py" "%MECH_DIR%" )
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
  echo   Commonplace study server ^(Node^)
  echo   Open:    http://localhost:8137/
  echo   ^(Close this window to stop.^)
  echo.
  start "" "http://localhost:8137/"
  call "%NODE%" "%HERE%serve.js" "%MECH_DIR%"
  echo.
  echo Server stopped.
  pause & goto :eof
)

echo Could not find Python or Node.js.
echo Install either one, then double-click this again:
echo   Python: https://www.python.org  ^(check "Add to PATH"^)
echo   Node:   https://nodejs.org
pause
goto :eof

REM ---------------------------------------------------------------------------
REM Climb from this .bat up to the drive root, remembering the HIGHEST folder
REM that has an index.html. A folder that also has _lib\ wins outright: every
REM app links ../../_lib/, so _lib marks the true Commonplace root.
REM ---------------------------------------------------------------------------
:findroot
set "BEST="
set "BEST_LIB="
pushd "%HERE%" 2>nul || goto :findroot_done
:findroot_loop
if exist "index.html" (
  set "BEST=%CD%"
  if exist "_lib\" set "BEST_LIB=%CD%"
)
set "FR_PREV=%CD%"
cd .. 2>nul
if /i not "%CD%"=="%FR_PREV%" goto findroot_loop
popd
if defined BEST_LIB (
  set "MECH_DIR=%BEST_LIB%"
) else (
  if defined BEST set "MECH_DIR=%BEST%"
)
:findroot_done
if defined MECH_DIR goto :eof
for %%D in ("%USERPROFILE%\Desktop\commonplace" "%USERPROFILE%\Documents\commonplace" "%USERPROFILE%\OneDrive\Desktop\commonplace" "%USERPROFILE%\OneDrive\Documents\commonplace") do (
  if not defined MECH_DIR if exist "%%~D\index.html" set "MECH_DIR=%%~D"
)
goto :eof
