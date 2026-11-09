@echo off
rem Start Strata local dev environment without Docker (see local-dev.ps1).
rem Usage: local-dev.cmd [args]   e.g. local-dev.cmd -Status / -Stop / -ResetDb
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-dev.ps1" %*
exit /b %ERRORLEVEL%
