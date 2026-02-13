@echo off
title GERAR INSTALADOR v1.1.10 (NSIS)
color 0B

echo ===========================================
echo       GERADOR DE INSTALADOR VexCORE
echo           Versao: 1.1.10
echo ===========================================
echo.
echo Este script vai:
echo 1. Compilar o codigo (Vite)
echo 2. Gerar o instalador (.exe) que suporta atualizacao automatica
echo.
echo Aguarde, isso pode levar alguns minutos...
echo.

call npm run build:installer

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [X] ERRO AO GERAR INSTALADOR!
    echo Verifique as mensagens acima.
    pause
    exit
)

echo.
echo ===========================================
echo       SUCESSO! INSTALADOR GERADO.
echo ===========================================
echo.
echo O arquivo para subir no GitHub Release esta em:
echo   %CD%\dist\VexCORE_Setup_1.1.10.exe
echo.
explorer "%CD%\dist"
pause
