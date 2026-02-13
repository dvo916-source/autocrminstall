# 🚀 Guia de Migração do Banco de Dados

## ⚠️ IMPORTANTE: Execute os passos na ordem

### Passo 1: Executar Migração SQL no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: `mtbfzimnyactwhdonkgy`
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo [`scripts/supabase_migration.sql`](file:///d:/VISITAS%20IRW/crystal_app/scripts/supabase_migration.sql)
6. Clique em **Run** (ou pressione `Ctrl+Enter`)
7. Aguarde a execução (deve levar alguns segundos)
8. Verifique se não há erros na saída

### Passo 2: Verificar Estrutura das Tabelas

Após executar a migração, verifique se as tabelas foram criadas corretamente:

```sql
-- Execute no SQL Editor do Supabase
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Você deve ver:
- ✅ `usuarios`
- ✅ `vendedores`
- ✅ `visitas`
- ✅ `portais`
- ✅ `scripts`
- ✅ `crm_settings`
- ✅ `estoque`
- ✅ `lojas`
- ✅ `config`
- ✅ `notas`

### Passo 3: Fazer Upload dos Dados Locais

**ATENÇÃO**: Este passo só deve ser executado APÓS o Passo 1 estar completo!

Execute o script de upload:

```powershell
node scripts/upload_local_data.js
```

Este script irá:
1. Ler todos os dados do banco SQLite local
2. Transformar os dados para o formato do Supabase
3. Fazer upload de:
   - Usuários
   - Vendedores
   - Portais
   - Scripts
   - Visitas
   - CRM Settings

### Passo 4: Executar Auditoria Final

Verifique se tudo está sincronizado:

```powershell
node scripts/audit_database_sync.js
```

Você deve ver:
- ✅ 0 campos faltando
- ✅ Todas as tabelas com dados
- ✅ Estrutura 100% compatível

### Passo 5: Testar Sincronização

1. Abra o aplicativo
2. Crie uma nova visita
3. Verifique no Supabase Dashboard se a visita foi criada
4. Edite a visita no Supabase
5. Reabra o aplicativo e verifique se a edição foi sincronizada

---

## 🔧 Troubleshooting

### Erro: "relation already exists"

Se você receber este erro ao executar a migração SQL, significa que a tabela já existe. Você pode:

1. **Opção A**: Remover o `DROP TABLE` do script SQL e executar apenas os `ALTER TABLE`
2. **Opção B**: Fazer backup dos dados e executar o script completo

### Erro: "permission denied"

Certifique-se de que está usando a chave correta do Supabase. Verifique o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://mtbfzimnyactwhdonkgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Upload falhou para algumas tabelas

Se o upload falhar, você pode executar novamente. O script usa `upsert`, então não haverá duplicação de dados.

---

## 📋 Checklist de Verificação

Após completar todos os passos:

- [ ] Migração SQL executada sem erros
- [ ] Todas as 10 tabelas existem no Supabase
- [ ] Upload de dados concluído com sucesso
- [ ] Auditoria mostra 0 campos faltando
- [ ] Teste de criação de visita funcionando
- [ ] Teste de edição sincronizando corretamente
- [ ] Aplicativo funcionando em múltiplas máquinas

---

## 🎯 Próximos Passos

Após a migração estar completa:

1. Incrementar versão do aplicativo para `1.1.14`
2. Testar em ambiente de produção
3. Fazer deploy da nova versão
4. Monitorar logs de sincronização
