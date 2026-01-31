# ==========================================
# SCRIPT DE ATUALIZAÇÃO - SDR IRW SYSTEM
# ==========================================

$InstallDir = "C:\SDR_Sistema"

Write-Host "🔄 INICIANDO ATUALIZAÇÃO DO SISTEMA..." -ForegroundColor Cyan

# 1. Verificar se a pasta existe
if (!(Test-Path $InstallDir)) {
    Write-Error "❌ O sistema não foi encontrado em $InstallDir."
    Write-Host "   Execute o script de INSTALAÇÃO primeiro."
    Pause
    Exit
}

# 2. Entrar na pasta e Atualizar
Set-Location $InstallDir

Write-Host "📥 Baixando atualizações do GitHub..." -ForegroundColor Yellow
try {
    # Garante que não haja conflitos locais forçando o estado da nuvem
    git reset --hard
    git pull origin master
} catch {
    Write-Error "❌ Falha ao baixar atualizações. Verifique sua internet."
    Pause
    Exit
}

# 3. Reinstalar/Atualizar Dependências
Write-Host "📚 Verificando novas dependências..." -ForegroundColor Yellow
npm install

Write-Host "✅ SISTEMA ATUALIZADO COM SUCESSO!" -ForegroundColor Green
Write-Host "   Você pode abrir o sistema normalmente agora."
Write-Host ""
Pause
