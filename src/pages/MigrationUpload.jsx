import React, { useState } from 'react';

const { ipcRenderer } = window.require('electron');

export default function MigrationPage() {
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleUpload = async () => {
        setStatus('uploading');
        setError(null);
        setResults(null);

        try {
            const result = await ipcRenderer.invoke('upload-data-to-supabase');

            if (result.success) {
                setStatus('success');
                setResults(result.results);
            } else {
                setStatus('error');
                setError(result.error);
            }
        } catch (err) {
            setStatus('error');
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        🚀 Migração de Dados
                    </h1>
                    <p className="text-gray-300 mb-8">
                        Faça upload de todos os dados locais para o Supabase
                    </p>

                    {/* Instruções */}
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                        <h3 className="text-yellow-300 font-semibold mb-2">⚠️ Antes de continuar:</h3>
                        <ol className="text-yellow-100 text-sm space-y-1 list-decimal list-inside">
                            <li>Execute o script SQL no Supabase Dashboard primeiro</li>
                            <li>Verifique se todas as tabelas foram criadas</li>
                            <li>Clique no botão abaixo para fazer upload dos dados</li>
                        </ol>
                    </div>

                    {/* Botão de Upload */}
                    {status === 'idle' && (
                        <button
                            onClick={handleUpload}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                        >
                            📤 Iniciar Upload de Dados
                        </button>
                    )}

                    {/* Loading */}
                    {status === 'uploading' && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                            <p className="text-white text-lg">Enviando dados para o Supabase...</p>
                            <p className="text-gray-400 text-sm mt-2">Isso pode levar alguns minutos</p>
                        </div>
                    )}

                    {/* Success */}
                    {status === 'success' && results && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6">
                            <h3 className="text-green-300 font-bold text-xl mb-4">✅ Upload Concluído!</h3>

                            <div className="space-y-2">
                                {Object.entries(results).map(([table, result]) => (
                                    <div key={table} className="flex justify-between items-center bg-white/5 rounded p-3">
                                        <span className="text-white capitalize">{table}</span>
                                        <span className={`font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.success ? `✅ ${result.count} registros` : `❌ Erro`}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {status === 'error' && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
                            <h3 className="text-red-300 font-bold text-xl mb-4">❌ Erro no Upload</h3>
                            <p className="text-red-100 mb-4">{error}</p>

                            <button
                                onClick={() => setStatus('idle')}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    )}

                    {/* Informações Adicionais */}
                    <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <h4 className="text-blue-300 font-semibold mb-2">ℹ️ Informações</h4>
                        <ul className="text-blue-100 text-sm space-y-1">
                            <li>• O upload envia: Usuários, Vendedores, Portais, Scripts, Visitas e Configurações</li>
                            <li>• Dados existentes no Supabase serão atualizados (upsert)</li>
                            <li>• Você pode executar o upload múltiplas vezes sem problemas</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
