@echo off
echo ==========================================
echo      SALVANDO ALTERACOES NO GITHUB
echo ==========================================
echo.
cd /d "%~dp0"
cd ../..

echo 1. Adicionando arquivos...
"C:\Program Files\Git\cmd\git.exe" add .

echo.
echo 2. Registrando versao...
"C:\Program Files\Git\cmd\git.exe" commit -m "Atualizacao: %date% %time%"

echo.
echo 3. Enviando para a nuvem...
"C:\Program Files\Git\cmd\git.exe" push

echo.
echo ==========================================
echo      SUCESSO! TUDO SALVO NA NUVEM.
echo ==========================================
pause
