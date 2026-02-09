# 📚 Sistema de Módulos e Permissões - Crystal App

## 🎯 Visão Geral

O sistema implementa **controle de acesso em 3 níveis**:

1. **Módulos da Loja** (Plano de Assinatura)
2. **Permissões do Usuário** (Definidas pelo ADMIN)
3. **Hierarquia de Roles** (Developer > Admin > Usuário Comum)

---

## 🏗️ Arquitetura

### 1. Cadastro de Loja (`StoreManagement.jsx`)

Quando você cadastra uma loja, seleciona quais módulos estão ativos:

```javascript
// Módulos disponíveis
const AVAILABLE_MODULES = [
    { id: 'diario', label: 'Meu Diário' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'estoque', label: 'Tabela/Estoque' },
    { id: 'visitas', label: 'Visitas' },
    { id: 'metas', label: 'Metas' },
    { id: 'portais', label: 'Portais' },
    { id: 'ia-chat', label: 'IA Chat' },
    { id: 'usuarios', label: 'Usuários' },
];
```

**Salvamento no Banco:**
```sql
-- Campo `modulos` na tabela `lojas` (JSONB)
modulos: '["dashboard", "whatsapp", "estoque", "visitas"]'
```

---

### 2. Contexto Global (`LojaContext.jsx`)

Carrega a loja selecionada e disponibiliza para toda a aplicação:

```javascript
const { currentLoja } = useLoja();

// currentLoja.modulos contém os módulos ativos
// Exemplo: ['dashboard', 'whatsapp', 'estoque']
```

---

### 3. Filtragem no Menu Lateral (`Shell.jsx`)

**Lógica de Filtragem:**

```javascript
const filteredNavItems = navItems.filter(item => {
    // 🔓 DEVELOPER: Vê tudo
    if (user.role === 'developer') return true;

    // 🏪 Verifica se o módulo está ativo na loja
    const enabledModules = JSON.parse(currentLoja.modulos);
    const moduleEnabled = enabledModules.includes(item.module);
    
    if (!moduleEnabled) return false; // Módulo não está no plano

    // 👑 ADMIN: Se módulo está ativo, ADMIN vê automaticamente
    if (user.role === 'admin' || user.role === 'master') return true;

    // 👤 USUÁRIO COMUM: Verifica permissão individual
    return hasPermission(item.to);
});
```

---

### 4. Gestão de Permissões (`Usuarios.jsx`)

**ADMIN define permissões individuais:**

```javascript
// Ao criar/editar usuário, ADMIN seleciona quais páginas ele pode acessar
const [newUser, setNewUser] = useState({
    permissions: ['/dashboard', '/whatsapp', '/estoque']
});

// Filtro: Só mostra módulos ativos na loja
AVAILABLE_PERMISSIONS.filter(p => {
    const storeModules = JSON.parse(currentLoja.modulos);
    const moduleName = p.id.replace('/', ''); // '/whatsapp' -> 'whatsapp'
    return storeModules.includes(moduleName);
})
```

---

## 🔐 Hierarquia de Acesso

### Nível 1: DEVELOPER
- ✅ Acesso total, sem restrições
- ✅ Vê todas as lojas
- ✅ Vê todos os módulos
- ✅ Pode criar/editar lojas

### Nível 2: ADMIN da Loja
- ✅ Vê **todos os módulos ativos** no plano da loja
- ✅ Define permissões dos usuários comuns
- ✅ Não pode ver módulos inativos no plano
- ❌ Não pode acessar outras lojas

### Nível 3: USUÁRIO COMUM (SDR)
- ✅ Vê apenas os módulos que o ADMIN liberou
- ❌ Não pode gerenciar permissões
- ❌ Não pode acessar outras lojas

---

## 📋 Fluxo Completo

### Exemplo Prático:

**1. Loja "IRW Motors Filial SP"**
```json
{
  "nome": "IRW Motors Filial SP",
  "modulos": ["dashboard", "whatsapp", "estoque", "visitas"]
}
```

**2. ADMIN "João Silva"**
- Role: `admin`
- Loja: `IRW Motors Filial SP`
- **Vê automaticamente**: Dashboard, WhatsApp, Estoque, Visitas
- **NÃO vê**: Metas, Portais, IA Chat (não estão no plano)

**3. Usuário "Maria Santos"**
- Role: `sdr`
- Loja: `IRW Motors Filial SP`
- Permissões: `['/dashboard', '/whatsapp']`
- **Vê**: Dashboard, WhatsApp
- **NÃO vê**: Estoque, Visitas (ADMIN não liberou)

---

## 🛠️ Como Testar

### 1. Cadastrar Loja com Módulos Limitados
```
1. Acesse "Central de Lojas"
2. Clique em "Cadastrar Loja"
3. Selecione apenas: Dashboard, WhatsApp, Estoque
4. Crie o ADMIN da loja
```

### 2. Logar como ADMIN
```
1. Faça login com o ADMIN criado
2. Verifique que só aparecem: Dashboard, WhatsApp, Estoque
3. Acesse "Usuários" e crie um novo usuário
4. Defina permissões: apenas Dashboard
```

### 3. Logar como Usuário Comum
```
1. Faça login com o usuário criado
2. Verifique que só aparece: Dashboard
```

---

## 🔧 Arquivos Modificados

### `Shell.jsx` (Linhas 160-195)
- ✅ Filtragem inteligente de menus
- ✅ Respeita módulos da loja
- ✅ Respeita hierarquia de roles

### `LojaContext.jsx` (Linhas 1-14)
- ✅ Documentação sobre estrutura de módulos
- ✅ Explicação da hierarquia de permissões

### `Usuarios.jsx` (Linhas 468-472, 731-736)
- ✅ Filtro de permissões baseado em módulos da loja
- ✅ ADMIN só pode liberar módulos ativos

---

## ✅ Checklist de Validação

- [x] Módulos são salvos no cadastro da loja
- [x] Menu lateral filtra baseado em módulos ativos
- [x] ADMIN vê todos os módulos do plano
- [x] Usuário comum vê apenas permissões liberadas
- [x] Developer vê tudo sem restrições
- [x] Página de usuários só mostra módulos ativos para seleção

---

## 📝 Notas Importantes

1. **Módulos sempre visíveis**: `diario`, `central-lojas`, `back-to-central`
2. **Formato de armazenamento**: JSONB no Supabase
3. **Parse automático**: String JSON → Array JavaScript
4. **Fallback**: Se não houver módulos definidos, mostra tudo (compatibilidade)

---

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar UI visual para mostrar "Módulo não disponível no plano"
- [ ] Criar página de upgrade de plano
- [ ] Implementar tooltips explicativos
- [ ] Adicionar logs de auditoria de acesso
