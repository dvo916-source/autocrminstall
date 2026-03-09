import React from 'react';
import { motion } from 'framer-motion';

const variants = {
    primary: 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30',
    purple: 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/30',
    secondary: 'bg-white/5 hover:bg-white/10 border border-white/10 text-white',
    danger: 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30',
    success: 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30',
};

const Button = ({
    children,
    variant = 'primary',
    icon: Icon,
    onClick,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            onClick={onClick}
            disabled={disabled}
            className={`
                px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider 
                transition-all flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
                ${className}
            `}
            {...props}
        >
            {Icon && <Icon size={16} className={disabled && Icon.name === 'Loader2' ? 'animate-spin' : ''} />}
            {children}
        </motion.button>
    );
};

export default Button;
