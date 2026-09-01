@echo off
REM Helper launched by RUN_INNOVERSE.bat in its own window.
REM Always changes to its own folder first, so the relative venv and model
REM paths resolve no matter how this window was started.
cd /d "%~dp0"
title INNOVERSE Engine  -  KEEP THIS WINDOW OPEN
echo Starting the INNOVERSE engine from the virtual environment (.venv)...
echo (Loading the AI models can take a few minutes on the first run; then it is fast.)
echo.
".venv\Scripts\python.exe" innoverse_pipeline_final.py --serve --ui-dir . --model-path models\model_1 --model-path models\model_2 --model-path models\model_3
echo.
echo The engine has stopped. Press any key to close this window.
pause >nul
