@echo off
setlocal
title SavingDuit - Catatan Keuangan
cd /d "%~dp0"

set PORT=8765

rem ---- cari Node.js ----
set NODE=
where node >nul 2>nul && set NODE=node
if not defined NODE if exist "%LOCALAPPDATA%\pi-node\current\node.exe" set NODE=%LOCALAPPDATA%\pi-node\current\node.exe
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set NODE=%ProgramFiles%\nodejs\node.exe
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set NODE=%ProgramFiles(x86)%\nodejs\node.exe
if not defined NODE if exist "%APPDATA%\npm\node.exe" set NODE=%APPDATA%\npm\node.exe

if not defined NODE goto NONODE

echo.
echo   SavingDuit - menyalakan server lokal...
echo   Browser akan terbuka otomatis sebentar lagi.
echo.
echo   JANGAN tutup jendela ini selama memakai aplikasi.
echo   Tekan Ctrl+C atau tutup jendela ini untuk mematikan.
echo.

start "" cmd /c "timeout /t 2 >nul & start """" http://localhost:%PORT%"
"%NODE%" worker\server.js %PORT%
goto END

:NONODE
echo.
echo   ============================================
echo    Node.js tidak ditemukan di komputer ini.
echo   ============================================
echo.
echo   Cara 1 (paling gampang):
echo     Buka "index.html" langsung dengan klik dua kali.
echo     Semua fitur jalan, kecuali backup ke Google Drive.
echo.
echo   Cara 2:
echo     Pasang Node.js dari https://nodejs.org  (pilih LTS),
echo     lalu jalankan lagi buka.bat ini.
echo.
echo   Cara 3:
echo     Kalau Node.js ada tapi tidak terdeteksi,
echo     jalankan lewat Command Prompt:
echo         node "%~dp0worker\server.js"
echo.
pause

:END
endlocal