import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
    Database, Server, Shield, ArrowRight, Loader2,
    CheckCircle2, AlertTriangle, Save, Globe, Info, Search, Copy,
    Trash2, Sparkles, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const { ipcRenderer } = window.require('electron');

const MigracaoSupabase = () => {
    const { lojaId } = useParams();
    const navigate = useNavigate();

    const [loja, setLoja] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingStore, setFetchingStore] = useState(!!lojaId);
    const [status, setStatus] = useState('');
    const [config, setConfig] = useState({
        url: '',
        key: ''
    });
    const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' | 'info' }

    // 📡 Busca dados da loja se tiver ID
    useEffect(() => {
        if (lojaId) {
            const fetchStore = async () => {
                try {
                    const lojas = await ipcRenderer.invoke('get-stores');
                    const found = lojas.find(l => l.id === lojaId);
                    if (found) {
                        setLoja(found);
                        setConfig({
                            url: found.supabase_url || '',
                            key: found.supabase_anon_key || ''
                        });
                    }
                } catch (err) {
                    console.error("Erro ao buscar loja:", err);
                } finally {
                    setFetchingStore(false);
                }
            };
            fetchStore();
        }
    }, [lojaId]);

    const log = (msg) => setStatus(prev => prev + msg + '\n');

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // 💾 Salva configurações no SQLite
    const salvarConfig = async () => {
        if (!loja) return;
        setLoading(true);
        try {
            const updated = {
                ...loja,
                supabase_url: config.url,
                supabase_anon_key: config.key,
                modulos: typeof loja.modulos === 'string' ? JSON.parse(loja.modulos) : loja.modulos
            };
            await ipcRenderer.invoke('update-store', updated);
            showToast("Configurações salvas com sucesso!");
        } catch (err) {
            showToast("Erro ao salvar: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 📋 Copiar SQL para o Clipboard
    const copiarSQL = async () => {
        try {
            const sqlContent = await ipcRenderer.invoke('read-file-content', 'SQL_CRIAR_TABELAS_SIMPLES.sql');
            await navigator.clipboard.writeText(sqlContent);
            log('📋 SQL copiado para a área de transferência!');
            showToast("Script SQL copiado! Agora cole no Supabase.", 'info');
        } catch (err) {
            log('❌ Erro ao copiar SQL: ' + err.message);
            showToast("Erro ao copiar SQL", 'error');
        }
    };

    // 🛠️ Cria as tabelas do módulo IA no Supabase
    const criarTabelas = async () => {
        if (!config.url || !config.key) return showToast("Configure a URL e Key primeiro!", 'error');
        setLoading(true);
        setStatus('🛠️ Preparando estrutura de tabelas...\n');

        try {
            log('👉 Passo 1: Clique no botão azul "COPIAR ESTRUTURA SQL".');
            log('👉 Passo 2: Vá ao seu dashboard do Supabase.');
            log('👉 Passo 3: Abra o SQL Editor e cole o código.');
            log('👉 Passo 4: Clique em RUN.');
            log('\n✅ Após rodar o SQL lá, você pode prosseguir com o Stage 02 aqui.');
        } catch (err) {
            log(`❌ Erro: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 🚀 Migração Real: Banco Mestre -> Banco Dedicado
    // 🚀 Inicialização Limpa (Apenas Admin)
    const inicializarLimpo = async () => {
        if (!config.url || !config.key) return showToast("Configure o destino!", 'error');

        const confirm = window.confirm("⚠️ ATENÇÃO: Isso vai preparar o banco apenas com o usuário administrador. O estoque e outros dados ficarão vazios (Ideal para novos clientes). Continuar?");
        if (!confirm) return;

        setLoading(true);
        setStatus('🌱 Iniciando Setup para Novo Cliente...\n');

        const supabaseNEW = createClient(config.url, config.key);

        try {
            log('👤 Criando Perfil de Administrador...');

            // Buscamos o usuário admin vinculado a esta loja no SQLite
            const users = await ipcRenderer.invoke('get-list-users', loja.id);
            const admin = users.find(u => u.role === 'admin' || u.role === 'supervisor');

            if (admin) {
                const { error } = await supabaseNEW.from('usuarios').upsert([{
                    username: admin.username,
                    nome_completo: admin.nome_completo,
                    email: admin.email,
                    password_hash: admin.password_hash,
                    role: admin.role,
                    ativo: true
                }]);

                if (error) log(`   ❌ Erro ao criar admin: ${error.message}`);
                else log('   ✅ Administrador criado com sucesso!');
            } else {
                log('   ⚠️ Nenhum administrador encontrado para esta loja no banco local.');
            }

            log('\n✨ BANCO INICIALIZADO DO ZERO E PRONTO PARA O CLIENTE!');
            showToast("Banco inicializado com sucesso!", 'success');
        } catch (err) {
            log(`\n❌ ERRO: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 🚀 Migração de Dados (Para Transição de Lojas Existentes)
    const executarMigracao = async () => {
        if (!config.url || !config.key) return showToast("Configure o destino!", 'error');

        const confirm = window.confirm("🚨 PERIGO: Isso vai clonar TODO o estoque e histórico da loja local para o novo banco. Use APENAS se estiver migrando uma loja que já operava no seu sistema. Deseja clonar os dados?");
        if (!confirm) return;

        setLoading(true);
        setStatus('📦 Iniciando Migração de Dados Legados...\n');

        const supabaseNEW = createClient(config.url, config.key);

        try {
            // Tabelas para migrar
            const tables = ['estoque', 'vendedores', 'portais', 'scripts', 'visitas'];

            for (const table of tables) {
                log(`📦 Migrando ${table.toUpperCase()}...`);

                // Busca do banco mestre (env) filtrando por loja_id
                const { data, error: fetchErr } = await ipcRenderer.invoke('get-list', {
                    table,
                    lojaId: loja.id
                });

                if (fetchErr) {
                    log(`   ❌ Erro ao buscar: ${fetchErr.message}`);
                    continue;
                }

                if (!data || data.length === 0) {
                    log(`   ⚠️ Nenhum registro encontrado.`);
                    continue;
                }

                log(`   📊 Encontrados ${data.length} registros.`);

                // Remove o loja_id antes de enviar para o banco dedicado (pois o dedicado não tem a coluna)
                const cleanedData = data.map(({ loja_id, ...rest }) => rest);

                // Insere no banco novo
                const { error: pushErr } = await supabaseNEW.from(table).upsert(cleanedData);

                if (pushErr) {
                    log(`   ❌ Erro ao inserir no novo banco: ${pushErr.message}`);
                } else {
                    log(`   ✅ ${data.length} registros migrados com sucesso!`);
                }
            }

            log('\n✨ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
            showToast("Migration completed!", 'success');
        } catch (err) {
            log(`\n❌ ERRO FATAL: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (fetchingStore) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-cyan-500" size={48} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col w-full space-y-6">
            <div className="w-full">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1 text-cyan-400">
                            <Database size={20} />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Infrastructure Management</span>
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                            CENTRAL DE <span className="text-cyan-500 underline decoration-cyan-500/30 underline-offset-4">MIGRAÇÃO</span>
                        </h1>
                        {loja && (
                            <div className="flex items-center gap-3 mt-4 p-1.5 bg-white/5 rounded-xl border border-white/10 w-fit pr-4">
                                <div className="p-1.5 bg-cyan-500/20 rounded-lg text-cyan-400">
                                    <Globe size={16} />
                                </div>
                                <div>
                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">UNIDADE SELECIONADA</span>
                                    <span className="text-sm font-black text-white uppercase">{loja.nome}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/central-lojas')}
                        className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl font-black text-[10px] tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <ArrowRight size={14} className="rotate-180 text-cyan-500" />
                        VOLTAR PARA CENTRAL
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Painel de Configuração */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                        <section className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-[50px] rounded-full" />

                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shadow-inner">
                                    <Server className="text-cyan-400" size={20} />
                                </div>
                                <h3 className="text-base font-black uppercase tracking-[0.1em] text-white">Configuração Supabase</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black text-white uppercase tracking-[0.2em] ml-2 mb-2 block opacity-70">PROJECT URL (DEDICADO)</label>
                                    <input
                                        value={config.url}
                                        onChange={e => setConfig({ ...config, url: e.target.value })}
                                        className="w-full bg-black border-2 border-white/5 rounded-xl px-5 py-3.5 text-white text-xs font-mono outline-none focus:border-cyan-500 transition-all shadow-xl placeholder:text-slate-800"
                                        placeholder="https://xxxx.supabase.co"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-white uppercase tracking-[0.2em] ml-2 mb-2 block opacity-70">ANON PUBLIC KEY</label>
                                    <textarea
                                        value={config.key}
                                        onChange={e => setConfig({ ...config, key: e.target.value })}
                                        className="w-full bg-black border-2 border-white/5 rounded-xl px-5 py-3.5 text-slate-300 text-[10px] font-mono outline-none focus:border-cyan-500 transition-all shadow-xl h-32 resize-none leading-relaxed placeholder:text-slate-800"
                                        placeholder="Paste your Supabase Service/Anon Key here..."
                                    />
                                </div>

                                <button
                                    onClick={salvarConfig}
                                    disabled={loading}
                                    className="w-full bg-cyan-500 text-white hover:bg-cyan-400 py-4 rounded-2xl font-black text-[11px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    SALVAR CONFIGURAÇÃO
                                </button>
                            </div>
                        </section>

                        <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] flex items-start gap-5">
                            <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20 mt-1 shadow-inner">
                                <Info className="text-blue-400" size={18} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2">Diretriz de Segurança</h4>
                                <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
                                    A separação de bancos garante que cada unidade opere em um ambiente isolado. Isso resolve problemas de performance e aumenta a segurança total do ecossistema Crystal App.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Terminal de Migração */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-6 flex flex-col h-full">
                        <div className="flex-1 bg-black border-2 border-slate-900 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative">
                            <div className="bg-slate-900 px-8 py-3.5 flex items-center justify-between border-b border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                </div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">SYSTEM CONSOLE v2.6.0</span>
                                <div className="w-12" />
                            </div>

                            <div className="flex-1 p-8 font-mono text-[12px] text-emerald-400 overflow-y-auto whitespace-pre-wrap leading-relaxed custom-scrollbar bg-[radial-gradient(circle_at_center,_#0a0f1a_0%,_#000000_100%)]">
                                {status || '// Aguardando inicialização do sistema...\n// Pronto para operar.\n_'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={criarTabelas}
                                disabled={loading}
                                className="bg-slate-900 border border-white/5 hover:border-cyan-500/50 text-white p-4 rounded-2xl flex flex-col gap-2 transition-all group hover:bg-slate-800 shadow-lg"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-cyan-500/20 transition-all border border-white/5">
                                        <AlertTriangle size={14} className="text-slate-400 group-hover:text-cyan-400" />
                                    </div>
                                    <ArrowRight size={12} className="text-slate-800 group-hover:text-cyan-500 transition-transform group-hover:translate-x-1" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-0.5">STAGE 01</span>
                                    <span className="text-[11px] font-black uppercase tracking-tight leading-tight">PREPARAR<br /><span className="text-slate-500">TABELAS SQL</span></span>
                                </div>
                            </button>

                            <button
                                onClick={copiarSQL}
                                className="bg-blue-600/10 border border-blue-500/20 hover:border-blue-500 text-white p-4 rounded-2xl flex flex-col gap-2 transition-all group hover:bg-blue-600/20 shadow-lg"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                                        <Copy size={14} className="text-blue-400" />
                                    </div>
                                    <ArrowRight size={12} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5">AÇÃO RÁPIDA</span>
                                    <span className="text-[11px] font-black uppercase tracking-tight leading-tight text-blue-200">COPIAR<br /><span className="text-blue-500">ESTRUTURA SQL</span></span>
                                </div>
                            </button>

                            <div className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                <button
                                    onClick={inicializarLimpo}
                                    disabled={loading}
                                    className="bg-emerald-600/10 border border-emerald-500/20 hover:border-emerald-500 text-white p-4 rounded-2xl flex flex-col gap-2 transition-all group hover:bg-emerald-600/20 shadow-lg"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                                            <Sparkles size={14} className="text-emerald-400" />
                                        </div>
                                        <ArrowRight size={12} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-0.5">STAGE 02 • OPÇÃO A</span>
                                        <span className="text-[11px] font-black uppercase tracking-tight leading-tight">START ZERO<br /><span className="text-emerald-200/50">NOVO CLIENTE</span></span>
                                    </div>
                                </button>

                                <button
                                    onClick={executarMigracao}
                                    disabled={loading}
                                    className="bg-orange-600/10 border border-orange-500/20 hover:border-orange-500 text-white p-4 rounded-2xl flex flex-col gap-2 transition-all group hover:bg-orange-600/20 shadow-lg"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                                            <Flame size={14} className="text-orange-400" />
                                        </div>
                                        <ArrowRight size={12} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-[8px] font-black text-orange-500 uppercase tracking-[0.2em] mb-0.5">STAGE 02 • OPÇÃO B</span>
                                        <span className="text-[11px] font-black uppercase tracking-tight leading-tight">CLONAR DADOS<br /><span className="text-orange-200/50">MIGRAÇÃO INTERNA</span></span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] min-w-[320px]"
                    >
                        <div className={`
                            px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-4
                            ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}
                        `}>
                            <div className={`
                                p-2 rounded-xl border
                                ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/30' :
                                    toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30' :
                                        'bg-emerald-500/20 border-emerald-500/30'}
                            `}>
                                {toast.type === 'error' ? <AlertTriangle size={18} /> :
                                    toast.type === 'info' ? <Info size={18} /> :
                                        <CheckCircle2 size={18} />}
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MigracaoSupabase;
