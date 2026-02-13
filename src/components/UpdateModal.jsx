import React from 'react';
import { Download, X } from 'lucide-react';

export default function UpdateModal({ updateInfo, onInstall, onDismiss }) {
    if (!updateInfo) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-cyan-500/30 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                            <Download size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Atualização Disponível</h2>
                            <p className="text-sm text-cyan-400">Versão {updateInfo.version}</p>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="mb-6">
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        Uma nova versão do VexCORE está disponível. Recomendamos atualizar para obter as últimas melhorias e correções.
                    </p>

                    {updateInfo.releaseNotes && (
                        <div className="bg-black/30 rounded-xl p-4 mb-4">
                            <p className="text-xs text-gray-400 font-semibold mb-2">Novidades:</p>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {updateInfo.releaseNotes}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>O sistema será reiniciado após a instalação</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onDismiss}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl font-bold text-white transition-all"
                    >
                        Mais Tarde
                    </button>
                    <button
                        onClick={onInstall}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 py-3 rounded-xl font-bold text-white transition-all shadow-lg shadow-cyan-500/30"
                    >
                        Atualizar Agora
                    </button>
                </div>
            </div>
        </div>
    );
}
