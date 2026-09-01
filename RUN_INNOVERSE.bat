@echo off
setlocal EnableExtensions EnableDelayedExpansion
title INNOVERSE - Akkadian Encyclopedia + Translation Engine
cd /d "%~dp0"
set "VPY=.venv\Scripts\python.exe"

echo.
echo  ============================================================
echo   INNOVERSE  -  Akkadian Encyclopedia + Translation Engine
echo  ============================================================
echo.

REM --- find a base Python 3 to build the virtual environment ---
set "PY="
for %%P in ("py -3" "python" "python3") do if not defined PY ( %%~P -c "import sys" >nul 2>&1 && set "PY=%%~P" )
if not defined PY goto :nopython
echo  [ok]   Base Python: !PY!

if not exist "innoverse_pipeline_final.py" goto :nofile

REM --- the AI models are hosted on Google Drive (too large to ship); check they were downloaded ---
REM (checks that each model folder exists and has *something* in it, regardless of
REM  internal layout, since model_2 nests its files inside a subfolder)
for %%M in (model_1 model_2 model_3) do (
    dir /b "models\%%M" >nul 2>&1
    if errorlevel 1 goto :nomodels
)

REM --- create the virtual environment once ---
if exist "%VPY%" goto :havevenv
echo  [..]   Creating virtual environment (.venv) ...
!PY! -m venv .venv
if not exist "%VPY%" goto :venvfail
echo  [ok]   Virtual environment created.
:havevenv

REM --- install dependencies into the venv (first run only) ---
"%VPY%" -c "import numpy, pandas, torch, transformers, plotly" >nul 2>&1
if not errorlevel 1 goto :havereqs
echo  [..]   Installing dependencies into the venv (first run; can take a few minutes)...
"%VPY%" -m pip install --upgrade pip --disable-pip-version-check
"%VPY%" -m pip install -r requirements.txt --disable-pip-version-check
"%VPY%" -c "import numpy, pandas, torch, transformers, plotly" >nul 2>&1
if errorlevel 1 goto :reqfail
echo  [ok]   Dependencies installed inside the venv.
goto :startengine
:havereqs
echo  [ok]   Dependencies already present in the venv.
:startengine

REM --- start the engine window (the helper cd's to this folder, then runs the venv engine) ---
echo  [..]   Opening the engine window...
start "INNOVERSE Engine  -  KEEP THIS WINDOW OPEN" "%~dp0_engine.bat"

REM --- wait until the engine is ready, then open the browser ---
echo  [..]   Waiting for the AI models to load (first run: a few minutes; then fast)...
set /a n=0
:wait
timeout /t 3 /nobreak >nul
powershell -NoProfile -Command "try{ if((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/health -TimeoutSec 3).StatusCode -eq 200){exit 0} }catch{}; exit 1"
if not errorlevel 1 goto :ready
set /a n+=1
if !n! lss 300 goto :wait
echo  [warn] Engine not ready within ~15 minutes; opening the site anyway.
:ready
echo  [ok]   Opening the website:  http://127.0.0.1:3000
start "" http://127.0.0.1:3000
echo.
echo    The website should now be open in your browser.
echo    To STOP the demo, close the "INNOVERSE Engine" window.
echo.
pause
exit /b 0

:nopython
echo  [ERROR] Python 3 was not found. Install Python 3.10+ from https://www.python.org/downloads/
echo          and tick "Add python.exe to PATH", then run this file again.
pause
exit /b 1
:nofile
echo  [ERROR] innoverse_pipeline_final.py not found next to this file.
echo          Keep RUN_INNOVERSE.bat inside the project folder.
pause
exit /b 1
:venvfail
echo  [ERROR] Could not create the virtual environment.
pause
exit /b 1
:reqfail
echo  [ERROR] Dependency install failed. Read the messages above.
pause
exit /b 1
:nomodels
echo.
echo  [ERROR] The AI models were not found in the "models" folder.
echo.
echo  They are too large to ship with the project, so they are hosted on Google Drive.
echo  Download the model archive from:
echo.
echo     https://drive.google.com/file/d/126gJDxXO2XYFLlok8JBMDueTiD9rFuNV/view?usp=drive_link
echo.
echo  Then extract it here so the paths are exactly:
echo     models\model_1
echo     models\model_2
echo     models\model_3
echo.
echo  After that, run RUN_INNOVERSE.bat again.
echo.
pause
exit /b 1
