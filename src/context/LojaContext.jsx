// --- CONTEXTO GLOBAL DE LOJAS (MULTITENANCY) ---
// O React Context API permite compartilhar dados entre vários componentes sem precisar passar "props" manualmente.
//
// 📦 ESTRUTURA DE MÓDULOS:
// Cada loja tem um campo `modulos` (JSONB) que define quais páginas estão ativas no plano dela.
// Exemplo: ['dashboard', 'whatsapp', 'estoque', 'visitas', 'metas', 'portais', 'ia-chat', 'usuarios']
//
// 🔐 HIERARQUIA DE PERMISSÕES:
// 1. DEVELOPER → Vê tudo, sem restrições
// 2. ADMIN da loja → Vê todos os módulos ativos no plano da loja
// 3. USUÁRIO comum → Vê apenas os módulos que o ADMIN liberou em suas permissões individuais
import React, { createContext, useContext, useState, useEffect } from 'react';

// Importamos o ipcRenderer para falar com o processo principal do Electron
const { ipcRenderer } = window.require('electron');

// Criamos o objeto do contexto (o recipiente dos dados)
const LojaContext = createContext();

// O "Provider" é um componente que envolve todo o aplicativo (no App.jsx)
export const LojaProvider = ({ children }) => {
    // Estado para a loja que o usuário está acessando no momento
    const [currentLoja, setCurrentLoja] = useState(null);
    // Lista de todas as lojas disponíveis (útil para o administrador)
    const [lojas, setLojas] = useState([]);
    const [loading, setLoading] = useState(true);

    // 📡 Função para carregar todas as lojas do banco de dados
    const loadLojas = async () => {
        try {
            console.log('🏪 [LojaContext] Carregando lojas...');
            const result = await ipcRenderer.invoke('get-stores');
            const resultList = result || [];
            setLojas(resultList);

            // Verifica se existe uma loja que ficou "salva" da última sessão
            const savedLojaId = localStorage.getItem('active_loja_id');
            if (savedLojaId && resultList.length > 0) {
                const found = resultList.find(l => l.id === savedLojaId);
                if (found) {
                    console.log('✅ [LojaContext] Loja recuperada:', found.nome);
                    setCurrentLoja(found);
                }
            }
        } catch (err) {
            console.error('❌ [LojaContext] Erro ao carregar lojas:', err);
        } finally {
            setLoading(false);
        }
    };

    // 🔄 Função para trocar a loja ativa (ex: quando o desenvolvedor entra na visão de um cliente)
    const switchLoja = (loja) => {
        console.log('🔄 [LojaContext] Trocando para:', loja?.nome);
        setCurrentLoja(loja);
        if (loja) {
            localStorage.setItem('active_loja_id', loja.id);
        } else {
            localStorage.removeItem('active_loja_id');
        }
        // Forçamos o reload para limpar caches de componentes da loja anterior
        window.location.reload();
    };

    // 🧹 Função para limpar a loja ativa (volta para o estado "Sem Loja Selecionada")
    // Essencial para o desenvolvedor voltar à Central de Lojas
    const clearLoja = () => {
        console.log('🧹 [LojaContext] Limpando loja ativa');
        setCurrentLoja(null);
        localStorage.removeItem('active_loja_id');
        // Não damos reload aqui para permitir navegação fluida de volta à central
    };

    // Carrega os dados assim que o Provider nasce
    useEffect(() => {
        loadLojas();
    }, []);

    // Disponibilizamos os dados e funções para todos os filhos
    return (
        <LojaContext.Provider value={{
            currentLoja,
            lojas,
            loading,
            switchLoja,
            clearLoja,
            refreshLojas: loadLojas
        }}>
            {children}
        </LojaContext.Provider>
    );
};

// 💡 Hook customizado para facilitar o acesso ao contexto
export const useLoja = () => {
    const context = useContext(LojaContext);
    if (!context) {
        // Ao invés de lançar erro, retorna valores padrão seguros
        console.warn('⚠️ useLoja sendo usado fora do LojaProvider. Retornando valores padrão.');
        return {
            currentLoja: null,
            lojas: [],
            loading: false,
            switchLoja: () => { },
            clearLoja: () => { },
            refreshLojas: () => Promise.resolve()
        };
    }
    return context;
};
