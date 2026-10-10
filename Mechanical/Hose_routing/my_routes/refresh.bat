@echo off
REM Re-packs route notes so index.html shows your latest saves when opened by double-click.
cd /d "%~dp0"
where python >nul 2>nul && (python build_bundle.py) || (py build_bundle.py)
timeout /t 2 >nul
