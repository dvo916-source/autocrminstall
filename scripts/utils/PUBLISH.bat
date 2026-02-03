@echo off
setlocal
echo ==========================================
echo      BUILD E PUBLICACAO SDR IRW MOTORS
echo ==========================================
echo.

cd /d "%~dp0"
cd ../..

:: Verifica se o GH_TOKEN existe
if "%GH_TOKEN%"=="" (
    echo [ERRO] Variavel GH_TOKEN nao encontrada!
    echo Você precisa configurar seu Personal Access Token do GitHub.
    echo Ex: setx GH_TOKEN "seu_token_aqui"
    pause
    exit /b
)

echo 1. Limpando pastas antigas...
if exist dist rmdir /s /q dist

echo.
echo 2. Instalando dependencias (se necessario)...
call npm install

echo.
echo 3. Compilando o Frontend (Vite)...
call npm run build

echo.
echo 4. Validando Token do GitHub...
node scripts/utils/test-token.cjs
if %errorlevel% neq 0 (
    echo [ERRO] Falha na validacao do Token. O processo de publicação sera ignorado.
    pause
    exit /b
)

echo.
echo 5. Gerando Instalador e Enviando para GitHub...
echo Aguarde, isso pode levar alguns minutos...
set ELECTRON_BUILDER_ALLOW_HANDLE_APPLE_ID_AND_PASSWORD=true
call npx electron-builder --win --publish always

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O Electron-Builder falhou ao publicar!
    echo Verifique as mensagens acima para entender o erro.
    pause
    exit /b
)

echo.
echo ==========================================
echo      SUCESSO! VERSAO PUBLICADA NO GITHUB.
echo ==========================================
echo O instalador ja deve estar como 'Latest' no GitHub.
pause
