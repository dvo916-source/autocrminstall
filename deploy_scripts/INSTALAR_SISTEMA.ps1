# ==========================================
# SCRIPT DE INSTALAÇÃO - SDR IRW SYSTEM
# ==========================================

$RepoURL = "https://github.com/dvo91/sistemaautocrm.git"
$InstallDir = "C:\SDR_Sistema"

Write-Host "🚀 INICIANDO INSTALAÇÃO DO SISTEMA SDR..." -ForegroundColor Cyan

# 1. Verificar Permissões de Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "⚠️  Por favor, execute este script como ADMINISTRADOR!"
    Write-Warning "   (Clique com botão direito > Executar com PowerShell como Administrador)"
    Pause
    Exit
}

# 2. Verificar/Instalar Git e Node.js (Requer Winget - Padrão no Windows 10/11 atualizado)
Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow

try {
    git --version
} catch {
    Write-Host "⚠️  Git não encontrado. Instalando..." -ForegroundColor Magenta
    winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

try {
    node --version
} catch {
    Write-Host "⚠️  Node.js não encontrado. Instalando..." -ForegroundColor Magenta
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 3. Clonar Repositório
if (Test-Path $InstallDir) {
    Write-Host "⚠️  A pasta $InstallDir já existe. Atualizando em vez de instalar..." -ForegroundColor Yellow
    Set-Location $InstallDir
    git pull
} else {
    Write-Host "📥 Baixando arquivos do sistema..." -ForegroundColor Cyan
    git clone $RepoURL $InstallDir
}

# 4. Instalar Dependências do Projeto
if (Test-Path $InstallDir) {
    Set-Location $InstallDir
    Write-Host "📚 Instalando bibliotecas do sistema (isso pode demorar um pouco)..." -ForegroundColor Cyan
    npm install
    
    # Opcional: Instalar Electron globalmente se necessário, mas geralmente local basta
    # npm install -g electron
} else {
    Write-Error "❌ Falha ao criar diretório ou clonar repositório."
    Pause
    Exit
}

# 5. Criar Atalho na Área de Trabalho
$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\SDR IRW.lnk")
$Shortcut.TargetPath = "npm.cmd"
$Shortcut.Arguments = "run dev"  # Ou 'start' se configurado para produção
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$InstallDir\public\favicon.ico" # Tenta usar o ícone se existir
$Shortcut.Description = "Sistema SDR IRW Motors"
$Shortcut.Save()

Write-Host "✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
Write-Host "   Um atalho foi criado na sua Área de Trabalho."
Write-Host ""
Pause
