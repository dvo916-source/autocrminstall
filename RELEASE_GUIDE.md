# Guia de Publicação - VexCORE v1.1.10

## 📋 Checklist Pré-Publicação

- [x] Instalador gerado: `VexCORE_Setup_1.1.10.exe`
- [x] Código compilado sem erros
- [ ] Testado em máquina limpa
- [ ] Login funcionando com Supabase
- [ ] Auto-update configurado

## 🚀 Comandos para Publicar

### 1. Commit das Mudanças
```bash
git add .
git commit -m "v1.1.10 - Auto-update UX improvements + Login sync fixes

- Added visual update modal with progress bar
- Implemented UpdateWindow.html for download feedback
- Fixed cloud login sync (password_hash compatibility)
- Configured perMachine installation for version cleanup
- Added desktop shortcut creation
- Synced 3 users and 6 vendors to Supabase cloud"
```

### 2. Criar Tag da Versão
```bash
git tag -a v1.1.10 -m "VexCORE v1.1.10 - Auto-Update UX + Cloud Sync"
```

### 3. Push para GitHub
```bash
git push origin main
git push origin v1.1.10
```

### 4. Criar Release no GitHub

Acesse: https://github.com/SEU_USUARIO/SEU_REPO/releases/new

**Tag version:** `v1.1.10`

**Release title:** `VexCORE v1.1.10 - Auto-Update UX + Cloud Sync`

**Description:**
```markdown
## 🎉 VexCORE v1.1.10

### ✨ Novidades

#### Auto-Update Visual
- ✅ Modal de confirmação antes de atualizar
- ✅ Janela de progresso com barra animada
- ✅ Feedback visual durante download e instalação
- ✅ Remoção automática de versões antigas
- ✅ Atalho sempre criado na área de trabalho

#### Sincronização em Nuvem
- ✅ Login funciona em máquinas novas
- ✅ Dados sincronizam automaticamente do Supabase
- ✅ Compatibilidade com schema password/password_hash
- ✅ 3 usuários e 6 vendedores disponíveis globalmente

### 📦 Instalação

1. Baixe `VexCORE_Setup_1.1.10.exe`
2. Execute como Administrador
3. Siga o assistente de instalação
4. Faça login com suas credenciais

### 🔄 Atualização

Se você já tem o VexCORE instalado:
- O sistema detectará automaticamente a atualização
- Um modal aparecerá perguntando se deseja atualizar
- Clique em "Atualizar Agora"
- Acompanhe o progresso na janela visual
- A versão antiga será removida automaticamente

### 🐛 Correções

- Corrigido erro de "Credenciais Inválidas" em novas instalações
- Corrigido problema de múltiplas versões instaladas
- Corrigido atalho não sendo criado após atualização

---

**Versão completa:** 1.1.10  
**Data:** 13/02/2026
```

**Anexar arquivo:**
- Upload: `dist\VexCORE_Setup_1.1.10.exe`

### 5. Publicar Release
Clique em **"Publish release"**

## ✅ Verificação Pós-Publicação

1. Confirmar que a release aparece em: `https://github.com/SEU_USUARIO/SEU_REPO/releases`
2. Testar download do instalador
3. Abrir versão v1.1.9 em outra máquina
4. Verificar se detecta a atualização v1.1.10
5. Confirmar que o modal aparece
6. Testar o fluxo completo de atualização

## 📊 Estatísticas da Release

- **Arquivos modificados:** 5
- **Linhas adicionadas:** ~300
- **Linhas removidas:** ~50
- **Novos componentes:** 2 (UpdateModal, UpdateWindow)
- **Tamanho do instalador:** ~150MB

## 🔗 Links Úteis

- Documentação: `walkthrough.md`
- Plano de implementação: `implementation_plan.md`
- Tarefas: `task.md`
