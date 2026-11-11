@echo off
rem Pengquan Middle School 3D campus - local server launcher (optional; index.html can also be opened directly)
cd /d "%~dp0"
start "" http://127.0.0.1:8765/index.html
python -m http.server 8765 --bind 127.0.0.1
