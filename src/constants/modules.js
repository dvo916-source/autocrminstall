// === LISTA OFICIAL DE MÓDULOS DO SISTEMA ===
// Esta é a fonte única da verdade para todos os módulos disponíveis no VexCORE

export const SYSTEM_MODULES = [
    { id: 'crm', label: 'CRM (Gestão de Leads)', icon: 'Zap', description: 'Gestão completa de leads e pipeline de vendas' },
    { id: 'ia-agente', label: 'IA Agente (Em Desenvolvimento)', icon: 'Brain', description: 'Agente de IA para atendimento', disabled: true },
    { id: 'ia-chat', label: 'IA Chat', icon: 'MessageSquare', description: 'Chat com IA configurável' },
    { id: 'diario', label: 'Meu Diário', icon: 'BookOpen', description: 'Agenda diária de atividades' },
    { id: 'portais', label: 'Portais', icon: 'Globe', description: 'Configuração de integração com portais' },
    { id: 'tabela-virtual', label: 'Tabela Virtual (Em Desenvolvimento)', icon: 'Table', description: 'Tabela virtual de dados', disabled: true },
    { id: 'usuarios', label: 'Usuários', icon: 'Users', description: 'Gestão de usuários do sistema' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'Phone', description: 'Integração com WhatsApp' },
];

// Módulos que devem estar sempre ativos (não podem ser desabilitados)
export const CORE_MODULES = ['diario', 'crm', 'whatsapp', 'usuarios'];

// Módulos comerciais (que podem ser vendidos/ativados por loja)
export const COMMERCIAL_MODULES = SYSTEM_MODULES
    .filter(m => !CORE_MODULES.includes(m.id) && !m.disabled)
    .map(m => m.id);

// Helper para pegar módulo por ID
export const getModuleById = (id) => SYSTEM_MODULES.find(m => m.id === id);

// Helper para verificar se módulo existe
export const isValidModule = (id) => SYSTEM_MODULES.some(m => m.id === id);
