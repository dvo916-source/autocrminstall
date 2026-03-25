import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, ChevronDown, Phone, Car, AlertTriangle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLoja } from '../../context/LojaContext';
import { parseVehicleInfo, getPhotoUrl, findCarInEstoque, formatPhone, getFirstName } from '../../lib/vehicleUtils';
import { electronAPI } from '@/lib/electron-api';

const TEMP_CONFIG = {
    'Quente': { icon: '🔥', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    'Morno': { icon: '🌡️', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    'Frio': { icon: '❄️', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
};

export default function KanbanCard({ lead, isDragging, onClick, estoque, usuarios }) {
    const navigate = useNavigate();
    const { currentLoja } = useLoja();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } = useSortable({
        id: lead.id, data: { type: 'Task', lead }
    });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isSorting ? 0.3 : 1, zIndex: isSorting ? 10 : 1 };

    const isSlaRisk = lead.isSlaRisk;
    const [sdrDropdown, setSdrDropdown] = useState(false);
    const [vendedorDropdown, setVendedorDropdown] = useState(false);

    const sdrObj = (usuarios || []).find(u => u.username?.toLowerCase() === (lead.vendedor_sdr || '').toLowerCase());
    const vendedorObj = (usuarios || []).find(u => u.username?.toLowerCase() === (lead.vendedor || '').toLowerCase());
    const sdrName = sdrObj ? getFirstName(sdrObj.nome_completo || sdrObj.nome || sdrObj.username) : getFirstName(lead.vendedor_sdr?.split('@')[0]);
    const vendedorName = vendedorObj ? getFirstName(vendedorObj.nome_completo || vendedorObj.nome || vendedorObj.username) : (lead.vendedor ? getFirstName(lead.vendedor.split('@')[0]) : null);
    const sdrList = (usuarios || []).filter(u => ['sdr', 'vendedor', 'admin', 'master', 'developer'].includes(u.role));
    const vendedorList = (usuarios || []).filter(u => ['vendedor', 'admin', 'master'].includes(u.role));

    const handleReassign = async (e, field, value) => {
        e.stopPropagation();

        await electronAPI.updateVisitaSdrQuick({ id: lead.id, field, value, lojaId: lead.loja_id || currentLoja?.id });
        setSdrDropdown(false);
        setVendedorDropdown(false);
        window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Atribuído com sucesso!', type: 'success' } }));
    };

    const targetCar = findCarInEstoque(estoque, lead.veiculo_interesse);
    const photoUrl = getPhotoUrl(targetCar) || lead.foto_veiculo;
    const finalPrice = targetCar?.valor || lead.valor_proposta || null;
    const rawInteresse = (lead.veiculo_interesse || '').split(' #')[0].trim();
    const cleanInteresse = rawInteresse.split(/\s+/).filter((w, i, arr) => w.toLowerCase() !== arr[i - 1]?.toLowerCase()).join(' ');
    const tempStyle = TEMP_CONFIG[lead.temperatura] || null;
    const fmtPhone = formatPhone(lead.telefone);

    const handleWhatsAppClick = (e) => {
        e.stopPropagation();
        if (!lead.telefone) return;
        let n = lead.telefone.replace(/\D/g, '');
        if (n.length >= 8) {
            if (!n.startsWith('55')) n = '55' + n;
            navigate('/whatsapp', { state: { action: 'open-chat', phone: n } });
            window.dispatchEvent(new CustomEvent('show-notification', { detail: { message: 'Encaminhando ao WhatsApp...', type: 'info' } }));
        }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className={`relative ${isDragging ? 'z-50' : ''}`}>
            <div
                onClick={onClick}
                className={`rounded-2xl cursor-pointer transition-all duration-300 border overflow-hidden flex flex-row
                ${isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.9)] border-cyan-500 scale-105 bg-[#1e293b]' : ''}
                ${isSlaRisk
                        ? 'border-red-500/60 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        : 'border-white/[0.07] bg-[#0d1526] hover:border-cyan-500/30 hover:bg-[#111e35] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
                    }`}
            >
                {/* FOTO ESQUERDA com blur */}
                <div className="w-32 shrink-0 relative overflow-hidden">
                    {photoUrl && <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-50 pointer-events-none" />}
                    {!photoUrl && <div className="absolute inset-0 bg-slate-900/80" />}
                    <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                    <div className="relative z-10 w-full h-full flex items-center justify-center p-1">
                        {photoUrl
                            ? <img src={photoUrl} alt="Veiculo" className="w-full h-auto object-contain drop-shadow-xl rounded" />
                            : <Car size={28} strokeWidth={1} className="text-slate-600" />
                        }
                    </div>
                    {finalPrice && (
                        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-4 pb-2 px-2 flex justify-center">
                            <span className={`text-[12px] font-black tabular-nums drop-shadow-lg ${isSlaRisk ? 'text-red-300' : 'text-green-400'}`}>{finalPrice}</span>
                        </div>
                    )}
                </div>

                {/* CONTEÚDO DIREITA */}
                <div className="flex-1 min-w-0 p-3 flex flex-col gap-2">

                    {/* Portal + drag + temperatura */}
                    <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                            <div {...listeners} className="cursor-grab p-0.5 hover:bg-white/10 rounded" onClick={e => e.stopPropagation()}>
                                <GripVertical size={11} className="text-slate-600" />
                            </div>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${isSlaRisk ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                                {lead.portal || 'Manual'}
                            </span>
                        </div>
                        {tempStyle && (
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${tempStyle.bg} ${tempStyle.border} ${tempStyle.text}`}>
                                {tempStyle.icon} {lead.temperatura}
                            </span>
                        )}
                    </div>

                    {/* Nome + veículo */}
                    <div>
                        <h4 className={`text-[14px] font-black leading-tight truncate ${isSlaRisk ? 'text-red-100' : 'text-white'}`}>
                            {lead.cliente || 'Sem nome'}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {lead.temperatura === 'Quente' && <span className="text-[11px]">🔥</span>}
                            {lead.temperatura === 'Frio' && <span className="text-[11px]">🧊</span>}
                            <p className="text-[11px] text-slate-400 truncate">{cleanInteresse || 'Carro não definido'}</p>
                            {targetCar?.placa && (
                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                    {targetCar.placa}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Telefone */}
                    {lead.status_pipeline === 'Perdido' && (
                        <div className="mt-1 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1 leading-none">
                                MOTIVO DA PERDA
                            </p>
                            <p className="text-[10px] font-bold text-red-200 leading-tight">
                                {lead.motivo_perda || 'Não informado'}
                            </p>
                            {lead.detalhes_perda && (
                                <p className="text-[9px] text-red-400/70 italic mt-1 line-clamp-2 leading-tight">
                                    {lead.detalhes_perda}
                                </p>
                            )}
                        </div>
                    )}

                    {fmtPhone && (
                        <button onClick={handleWhatsAppClick} className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 px-2 py-1 rounded-lg transition-all w-fit">
                            <Phone size={10} />
                            <span className="text-[9px] font-bold tracking-wider">{fmtPhone}</span>
                        </button>
                    )}

                    {/* SDR + Vendedor */}
                    <div className="flex items-center gap-2 pt-1.5 border-t border-white/[0.04] mt-auto" onClick={e => e.stopPropagation()}>

                        {/* SDR */}
                        <div className="relative flex-1">
                            <button onClick={(e) => { e.stopPropagation(); setSdrDropdown(v => !v); setVendedorDropdown(false); }}
                                className="flex flex-col items-center w-full hover:bg-white/5 rounded-lg p-1 transition-all group">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.15em] text-center mb-0.5">SDR</span>
                                <div className="flex items-center justify-center gap-1.5 w-full">
                                    <div className="w-4 h-4 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-[7px] font-black text-cyan-400 shrink-0">{sdrName.charAt(0)}</div>
                                    <span className="text-[10px] font-bold text-slate-200 truncate">{sdrName}</span>
                                    <ChevronDown size={8} className="text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                                </div>
                            </button>
                            {sdrDropdown && (
                                <div className="absolute bottom-full left-0 mb-1 w-44 bg-[#0b101e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="px-3 py-2 border-b border-white/5">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trocar SDR</p>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto">
                                        {sdrList.map(u => (
                                            <button key={u.id} onClick={(e) => handleReassign(e, 'vendedor_sdr', u.username)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold transition-all hover:bg-cyan-500/10 hover:text-cyan-400 ${(lead.vendedor_sdr || '') === u.username ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-400'}`}>
                                                <div className="w-5 h-5 rounded-full bg-cyan-600/50 flex items-center justify-center text-[8px] font-black text-white shrink-0">{getFirstName(u.nome_completo || u.nome || u.username).charAt(0)}</div>
                                                {getFirstName(u.nome_completo || u.nome || u.username)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="w-px h-7 bg-white/[0.05] shrink-0" />

                        {/* Vendedor */}
                        <div className="relative flex-1">
                            <button onClick={(e) => { e.stopPropagation(); setVendedorDropdown(v => !v); setSdrDropdown(false); }}
                                className="flex flex-col items-center w-full hover:bg-white/5 rounded-lg p-1 transition-all group">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.15em] text-center mb-0.5">Vendedor</span>
                                <div className="flex items-center justify-center gap-1.5 w-full">
                                    <div className="w-4 h-4 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[7px] font-black text-slate-400 shrink-0">{vendedorName ? vendedorName.charAt(0) : '?'}</div>
                                    <span className="text-[10px] font-bold text-slate-400 truncate">{vendedorName || '— atribuir'}</span>
                                    <ChevronDown size={8} className="text-slate-600 group-hover:text-slate-300 transition-colors shrink-0" />
                                </div>
                            </button>
                            {vendedorDropdown && (
                                <div className="absolute bottom-full left-0 mb-1 w-44 bg-[#0b101e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="px-3 py-2 border-b border-white/5">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Trocar Vendedor</p>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto">
                                        {vendedorList.map(u => (
                                            <button key={u.id} onClick={(e) => handleReassign(e, 'vendedor', u.username)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold transition-all hover:bg-white/5 hover:text-white ${(lead.vendedor || '') === u.username ? 'text-white bg-white/5' : 'text-slate-400'}`}>
                                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-black text-white shrink-0">{getFirstName(u.nome_completo || u.nome || u.username).charAt(0)}</div>
                                                {getFirstName(u.nome_completo || u.nome || u.username)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {isSlaRisk && <AlertTriangle size={10} className="text-red-400 shrink-0" />}
                        {lead.veiculo_troca && (
                            <span className="text-[7px] font-black text-amber-400 px-1 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 uppercase shrink-0">Troca</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
