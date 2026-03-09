import React, { memo } from 'react';
import { Calendar, Gauge, Image as ImageIcon, ListCheck } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { cleanVehicleName } from '../../lib/utils';

const CarCard = memo(({ car, onSendPhotos, onSendInfo, onPasteLink, loadingCar }) => {
    const { performanceMode } = useUI();
    let fotosCount = 0;
    try {
        const parsed = JSON.parse(car.fotos || '[]');
        fotosCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
        console.warn("Erro fotos:", car?.nome, e);
    }

    return (
        <div className={`relative group overflow-hidden rounded-[1.5rem] border border-white/5 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-1 ${performanceMode ? '' : 'shadow-lg hover:shadow-cyan-500/10'} transition-all duration-300`}>
            {!performanceMode && (
                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}

            <div className="relative z-10 p-3 flex flex-col gap-3">
                <div className="flex gap-3">
                    <div className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-white/20 transition-colors">
                        {car.foto ? (
                            <img src={car.foto} className={`w-full h-full object-cover transition-transform duration-500 ${performanceMode ? '' : 'group-hover:scale-110'}`} loading="lazy" alt="Carro" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-700 bg-black/40">
                                <ImageIcon size={24} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <h4 className="text-sm font-bold text-white leading-tight tracking-tight line-clamp-2 group-hover:text-cyan-400 transition-colors">
                            {cleanVehicleName(car.nome).split('#')[0]}
                        </h4>

                        <div className="flex flex-col items-start gap-1">
                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight drop-shadow-sm">
                                {car.valor || 'R$ 0,00'}
                            </span>

                            <div className="flex flex-wrap gap-1.5">
                                {car.ano && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10 shadow-sm transition-colors group-hover:border-amber-500/30">
                                        <Calendar size={12} className="text-amber-500" />
                                        <span className="text-[11px] font-bold text-gray-300 font-rajdhani tracking-wider">
                                            {car.ano}
                                        </span>
                                    </div>
                                )}
                                {car.km && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10 shadow-sm transition-colors group-hover:border-cyan-500/30">
                                        <Gauge size={12} className="text-cyan-400" />
                                        <span className="text-[11px] font-bold text-gray-300 font-rajdhani tracking-wider lowercase">
                                            {car.km}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
                    <button
                        onClick={() => onSendPhotos(car)}
                        disabled={loadingCar === car.nome}
                        className={`btn-cyber-primary w-full flex items-center justify-center gap-2 text-[11px] py-3.5 rounded-2xl
                            ${loadingCar === car.nome ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        {loadingCar === car.nome ? (
                            <ImageIcon className="animate-spin" size={14} />
                        ) : (
                            <ImageIcon size={14} className="group-hover:scale-110 transition-transform" />
                        )}
                        <span className="font-black tracking-widest">{loadingCar === car.nome ? 'BUSCANDO...' : `ENVIAR FOTOS (${fotosCount})`}</span>
                    </button>

                    <button
                        onClick={(e) => { e.currentTarget.blur(); onSendInfo(car); }}
                        className="btn-cyber-primary w-full text-[11px] py-3.5 flex items-center justify-center gap-2 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
                    >
                        <ListCheck size={14} className="group-hover:text-cyan-400 transition-colors" />
                        <span className="font-black tracking-widest">ENVIAR INFORMAÇÕES</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

export default CarCard;
