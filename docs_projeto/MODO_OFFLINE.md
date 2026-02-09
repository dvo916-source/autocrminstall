# 📴 Modo Offline - SDR IRW Motors

## 🎯 Visão Geral

O sistema **SDR IRW Motors** foi desenvolvido com arquitetura **híbrida** (SQLite local + Supabase nuvem), permitindo que funcione **perfeitamente offline**.

---

## ✅ O que FUNCIONA Offline

### 1. **Autenticação e Login**
- ✅ Login de usuários já cadastrados
- ✅ Dados de sessão salvos localmente
- ✅ Permissões e roles funcionam normalmente

### 2. **Gestão de Visitas (CRM)**
- ✅ Cadastrar novas visitas
- ✅ Editar visitas existentes
- ✅ Atualizar status do pipeline
- ✅ Ver histórico completo
- ✅ Filtros e buscas

### 3. **Estoque de Veículos**
- ✅ Visualizar todos os veículos
- ✅ Buscar e filtrar
- ✅ Ver detalhes completos
- ✅ Fotos e informações

### 4. **Dashboard e Estatísticas**
- ✅ Gráficos de performance
- ✅ Metas e indicadores
- ✅ Ranking de vendedores
- ✅ Histórico de 30 dias

### 5. **Scripts e Mensagens**
- ✅ Criar novos scripts
- ✅ Editar scripts existentes
- ✅ Copiar para WhatsApp
- ✅ Organizar por ordem

### 6. **WhatsApp**
- ✅ Interface funciona normalmente
- ✅ Envio de mensagens
- ✅ Recebimento de mensagens
- ⚠️ Depende da conexão do WhatsApp Web

### 7. **Gestão de Usuários**
- ✅ Visualizar usuários
- ✅ Editar permissões
- ✅ Alterar senhas
- ⚠️ Novos usuários só sincronizam quando voltar online

---

## ❌ O que NÃO Funciona Offline

### 1. **Sincronização em Tempo Real**
- ❌ Dados de outros PCs não aparecem instantaneamente
- ❌ Alterações não são enviadas para a nuvem

### 2. **Backup Automático**
- ❌ Dados não são salvos na nuvem
- ⚠️ Risco de perda se o PC tiver problema

### 3. **Primeiro Login de Novos Usuários**
- ❌ Usuários que nunca fizeram login neste PC não conseguem entrar
- ✅ Usuários que já fizeram login antes conseguem

---

## 🔄 Sincronização Automática

### Quando Volta Online

O sistema **automaticamente**:

1. ✅ Detecta que a internet voltou
2. ✅ Envia todas as alterações para a nuvem
3. ✅ Baixa atualizações de outros PCs
4. ✅ Resolve conflitos (última alteração ganha)
5. ✅ Notifica o usuário

### Sincronização Manual

Você pode forçar a sincronização:
- **Atalho**: `Ctrl + R` (Refresh)
- **Botão**: Ícone de sincronização no topo

---

## 🎨 Indicador Visual

### Botão de Status (Canto Inferior Direito)

**🟢 Verde - "Online"**
- Internet OK
- Nuvem OK
- Sincronização ativa

**🟡 Amarelo - "Nuvem Offline"**
- Internet OK
- Nuvem inacessível
- Dados salvos localmente

**🔴 Vermelho - "Sem Internet"**
- Sem conexão
- Modo offline total
- Sincronização pausada

### Clique no Botão para Ver Detalhes

- Status da internet
- Status da nuvem (Supabase)
- Mensagem explicativa
- Botão "Verificar Novamente"

---

## 💡 Boas Práticas

### Para Evitar Problemas

1. **Sincronize Regularmente**
   - Mantenha a internet conectada quando possível
   - Força sincronização antes de desligar o PC

2. **Primeiro Login Sempre Online**
   - Novos usuários devem fazer o primeiro login com internet
   - Depois disso, podem usar offline

3. **Backup Manual**
   - Em áreas sem internet estável, faça backup do arquivo:
   - `C:\Users\[SEU_USUARIO]\AppData\Roaming\sdr-irw-motors\sistema_visitas.db`

4. **Evite Editar o Mesmo Registro em PCs Diferentes**
   - Se dois PCs editarem a mesma visita offline, a última sincronização ganha
   - Pode haver perda de dados

---

## 🛠️ Solução de Problemas

### "Erro ao conectar ao servidor local"

**Causa**: Banco de dados local corrompido ou bloqueado

**Solução**:
1. Feche o aplicativo
2. Vá em: `C:\Users\[SEU_USUARIO]\AppData\Roaming\sdr-irw-motors\`
3. Renomeie `sistema_visitas.db` para `sistema_visitas.db.backup`
4. Abra o app novamente (vai criar um banco novo)
5. Faça login com internet para sincronizar tudo

### "Dados não aparecem após sincronizar"

**Causa**: Conflito de sincronização

**Solução**:
1. Pressione `Ctrl + R` para forçar sincronização
2. Se não resolver, reinicie o aplicativo
3. Verifique o indicador de conexão (deve estar verde)

### "Não consigo fazer login offline"

**Causa**: Primeiro login ou dados não sincronizados

**Solução**:
1. Conecte à internet
2. Faça login normalmente
3. Aguarde sincronização completa
4. Depois disso, poderá usar offline

---

## 📊 Arquitetura Técnica

### Banco de Dados Local (SQLite)
- **Localização**: `AppData\Roaming\sdr-irw-motors\sistema_visitas.db`
- **Tamanho**: ~10-50 MB (dependendo do volume de dados)
- **Performance**: Instantânea (sem latência de rede)

### Banco de Dados Nuvem (Supabase)
- **Função**: Backup + Sincronização entre PCs
- **Sincronização**: Bidirecional (Local ↔ Nuvem)
- **Realtime**: Atualiza automaticamente quando online

### Estratégia de Conflito
- **Última Escrita Ganha** (Last Write Wins)
- Timestamp de modificação é usado para resolver conflitos
- Não há merge automático de campos

---

## ✅ Resumo

**O sistema funciona 100% offline para operações do dia a dia.**

Você pode:
- ✅ Cadastrar visitas
- ✅ Ver estoque
- ✅ Usar scripts
- ✅ Ver estatísticas
- ✅ Fazer login (se já logou antes)

**A sincronização acontece automaticamente quando a internet volta.**

**Indicador visual mostra o status em tempo real.**

---

**Desenvolvido com ❤️ para funcionar em qualquer situação!**
