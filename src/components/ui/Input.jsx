import React from 'react';

const Input = ({
    label, icon: Icon, value, onChange, placeholder,
    type = 'text', className = '', error, ...props
}) => {
    return (
        <div className={`relative group w-full ${className}`}>
            {label && (
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 block pl-3">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <Icon
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-400 transition-colors"
                        size={18}
                    />
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full bg-black/30 border rounded-2xl py-4 text-white font-black text-xs outline-none transition-all placeholder:text-slate-800 ${Icon ? 'pl-14 pr-5' : 'px-5'
                        } ${error ? 'border-red-500/50' : 'border-white/5 focus:border-blue-500/30 focus:bg-black/50'
                        }`}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-red-400 text-[8px] font-black mt-1 ml-3 uppercase tracking-widest animate-shake">
                    {error}
                </p>
            )}
        </div>
    );
};

export default Input;
