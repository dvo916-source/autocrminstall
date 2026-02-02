@echo off
title GERADOR DE EXECUTAVEL FINAL - SDR IRW MOTORS
color 0B
cd ../..

echo ========================================================
echo   GERADOR DE VERSAO PORTATIL - SDR IRW MOTORS
echo ========================================================
echo.
echo Este script vai criar a versao FINAL para ser levada
echo via Pen Drive para outros computadores.
echo.

echo [1/3] Limpando arquivos antigos...
if exist dist rmdir /s /q dist
mkdir dist
if exist release rmdir /s /q release

echo.
echo [2/3] Compilando e Gerando .EXE...
echo Isso pode levar alguns minutos...
echo.

:: Força rebuild do sqlite para garantir compatibilidade
call npx electron-rebuild -f -w better-sqlite3

:: Gera o build portátil
call npx vite build && npx electron-builder --win portable

if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO AO GERAR EXECUTAVEL.
    pause
    exit
)

echo.
echo ========================================================
echo    SUCESSO! VERSAO PRONTA PARA PEN DRIVE.
echo ========================================================
echo.
echo O arquivo foi criado na pasta:
echo.
echo   %CD%\dist\SDR_Crystal_Portable.exe
echo.
echo COPIE ESTE ARQUIVO PARA O PEN DRIVE E LEVE PARA A OUTRA MAQUINA.
echo LA, BASTA CLICAR DUAS VEZES PARA RODAR.
echo.
pause
