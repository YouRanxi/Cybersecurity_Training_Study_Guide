@echo off
chcp 65001 > nul
echo ========================================================
echo   WebSec 交互式可视化学习平台 - 启动器
echo   基于《Web安全工程师特训班第23期》体系化知识库
echo ========================================================
echo.
echo 正在启动本地 HTTP 服务器并在浏览器中打开平台...
echo.

start "" "http://127.0.0.1:8000/index.html"
python -m http.server 8000

pause
