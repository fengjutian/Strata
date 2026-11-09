@echo off
rem 一键启动 Strata 本地开发环境（不使用 Docker）。
rem 用法：local-dev.cmd            启动
rem       local-dev.cmd -Status    查看状态
rem       local-dev.cmd -Stop      停止
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-dev.ps1" %*
exit /b %ERRORLEVEL%
