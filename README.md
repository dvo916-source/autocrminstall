# 🦅 VexCORE - Sistema de Gestão e IA para IRW Motors

Sistema modular de CRM, Gestão de Visitas e Automação de WhatsApp integrado com Inteligência Artificial.

## 🏗️ Tecnologia
- **Frontend**: React 19 + Vite 7 + TailwindCSS 4
- **Desktop**: Electron 40
- **Banco de Dados**: Híbrido (SQLite Local + Supabase na Nuvem)
- **Animações**: Framer Motion 12
- **Ícones**: Lucide React

## 📂 Estrutura do Projeto
- `/electron`: Lógica do processo principal, banco de dados e drivers nativos.
- `/src`: Interface do usuário, contextos e componentes visuais premium.
- `/integrations`: Webhooks e conexões com serviços externos (n8n, etc).
- `/scripts`: Utilitários de manutenção e migração de dados.

## 🚀 Como Iniciar
1. Instale as dependências: `npm install`
2. Inicie o ambiente de desenvolvimento: `npm run dev`
3. Para build de produção: `npm run build`

## 🛠️ Manutenção
- Os dados locais ficam em `%APPDATA%/vexcore/sistema_visitas.db`.
- O app sincroniza em tempo real com o Supabase Dashboard.

---
**Desenvolvido por Diego (VexCORE Team)**
