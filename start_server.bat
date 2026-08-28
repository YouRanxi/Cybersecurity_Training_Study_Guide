@echo off
chcp 65001 > nul
echo ====================================================================
echo   ⚡ WebSec 交互式学习平台 ^& 本地真实可渗透靶机引擎启动器
echo   基于《Web安全工程师特训班第23期》体系化知识库
echo ====================================================================
echo.
echo 正在启动本地靶场 HTTP 服务器并在浏览器中打开平台...
echo 主平台地址: http://127.0.0.1:8888/index.html
echo 靶机服务端口: http://127.0.0.1:8888/targets/
echo.

start "" "http://127.0.0.1:8888/index.html"

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo 正在使用 Node.js 启动全功能本地可渗透靶机引擎...
    node server.js
) else (
    echo [提示] 未检测到 Node.js，正在降级使用 Python 启动静态服务器 (端口 8888)...
    python -m http.server 8888
)

pause
