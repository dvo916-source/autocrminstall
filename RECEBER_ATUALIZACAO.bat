@echo off
title ATUALIZADOR AUTOMATICO
color 0B
echo ===================================================
echo   BUSCANDO ATUALIZACOES NA NUVEM...
echo ===================================================
echo.
cd /d "%~dp0"

echo 1. Baixando novidades do GitHub...
git pull

echo.
echo 2. Verificando dependencias...
call npm install

echo.
echo 3. Recriando Executavel Atualizado...
call npm run build:portable

echo.
echo ===================================================
echo ATUALIZACAO CONCLUIDA!
echo Novo executavel disponivel na pasta 'dist'.
echo ===================================================
pause
