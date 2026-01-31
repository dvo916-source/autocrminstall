@echo off
title INSTALADOR UNIVERSAL SDR IRW MOTORS (V2.1)
color 0A

echo ========================================================
echo   INSTALADOR UNIVERSAL - SDR IRW MOTORS
echo ========================================================
echo.
echo Este assistente vai preparar o ambiente e instalar o sistema.
echo.

:: --- 1. VERIFICACAO DE REQUISITOS ---

echo [1/4] Verificando requisitos...

:: GIT
git --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO CRITICO: GIT NAO ENCONTRADO.
    echo.
    echo O computador precisa do GIT.
    echo Baixando...
    start https://git-scm.com/download/win
    pause
    exit
) else (
    echo [OK] GIT instalado.
)

:: NODE.JS
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] ERRO CRITICO: NODE.JS NAO ENCONTRADO.
    echo.
    echo O computador precisa do NODE.JS.
    echo Baixando...
    start https://nodejs.org/
    pause
    exit
) else (
    echo [OK] NODE.JS instalado.
)

echo.
echo ========================================================
echo [2/4] PREPARANDO CODIGO FONTE...
echo ========================================================
echo.

:: Verifica se ja estamos dentro da pasta do projeto (tem package.json?)
if exist "package.json" (
    echo [!] Estamos dentro da pasta do projeto.
    echo Atualizando codigo local...
    git pull
) else (
    :: Nao estamos no projeto, vamos clonar ou entrar na pasta
    if exist "sistemaautocrm" (
        echo A pasta 'sistemaautocrm' ja existe. Entrando...
        cd sistemaautocrm
        git pull
    ) else (
        echo Clonando repositorio oficial...
        git clone https://github.com/dvo916-source/sistemaautocrm.git
        cd sistemaautocrm
    )
)

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [X] ERRO AO BAIXAR CODIGO.
    echo Verifique sua internet.
    pause
    exit
)

echo.
echo ========================================================
echo [3/4] INSTALANDO DEPENDENCIAS...
echo ========================================================
echo.

call npm install --force

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [X] ERRO AO INSTALAR PACOTES.
    echo Tente rodar como Administrador.
    pause
    exit
)

:: Rebuild SQLite (Critico para evitar erros de DLL)
echo.
echo Otimizando banco de dados...
call npx electron-rebuild -f -w better-sqlite3

echo.
echo ========================================================
echo [4/4] GERANDO SISTEMA (.EXE)...
echo ========================================================
echo.

:: Limpa builds antigos para forcar codigo novo
if exist dist rmdir /s /q dist
mkdir dist

:: Executa o comando direto para nao depender do script no package.json
call npx vite build && npx electron-builder --win portable

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [X] ERRO NO BUILD.
    pause
    exit
)

echo.
echo ========================================================
echo    SUCESSO! INSTALACAO CONCLUIDA.
echo ========================================================
echo.
echo O arquivo executavel esta em:
echo   %CD%\dist\SDR_Crystal_Portable.exe
echo.
echo Pode fechar esta janela e usar o sistema.
echo.
pause
