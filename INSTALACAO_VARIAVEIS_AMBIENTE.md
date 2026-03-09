# 🔐 CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE - VexCORE

## ⚠️ IMPORTANTE: SEGURANÇA

O VexCORE **NÃO** empacota mais o arquivo `.env` no executável por questões de segurança.

As credenciais do Supabase devem ser configuradas no **sistema operacional** antes de rodar o app.

---

## 📋 DESENVOLVIMENTO (Programadores)

### Opção 1: Usar .env local (mais fácil)

1. Copie o arquivo `.env.example` para `.env`
2. Preencha com suas credenciais do Supabase
3. Rode `npm run dev`

**⚠️ NUNCA faça commit do arquivo .env!**

---

## 🚀 PRODUÇÃO (Instalação do App)

### Windows

#### Método 1: PowerShell (Recomendado)

```powershell
# Execute o PowerShell como Administrador
# Depois rode estes comandos:

setx VITE_SUPABASE_URL "https://mtbfzimnyactwhdonkgy.supabase.co" /M
setx VITE_SUPABASE_ANON_KEY "sua_chave_aqui" /M
```

**Importante:** O `/M` define a variável para TODOS os usuários (requer admin)

#### Método 2: Interface Gráfica

1. Aperte `Win + Pause/Break` ou pesquise "Variáveis de Ambiente"
2. Clique em "Variáveis de Ambiente..."
3. Em "Variáveis do Sistema", clique em "Novo..."
4. Adicione:
   - Nome: `VITE_SUPABASE_URL`
   - Valor: `https://mtbfzimnyactwhdonkgy.supabase.co`
5. Repita para `VITE_SUPABASE_ANON_KEY`

**Reinicie o computador após configurar**

---

### Linux / macOS

#### Método Permanente

Edite o arquivo `~/.bashrc` (ou `~/.zshrc` se usar Zsh):

```bash
nano ~/.bashrc
```

Adicione no final:

```bash
export VITE_SUPABASE_URL="https://mtbfzimnyactwhdonkgy.supabase.co"
export VITE_SUPABASE_ANON_KEY="sua_chave_aqui"
```

Salve e rode:

```bash
source ~/.bashrc
```

---

## 🧪 VERIFICAÇÃO

Para verificar se as variáveis foram configuradas:

### Windows (PowerShell)
```powershell
echo $env:VITE_SUPABASE_URL
```

### Linux/macOS
```bash
echo $VITE_SUPABASE_URL
```
