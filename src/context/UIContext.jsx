import React, { createContext, useContext, useState, useEffect } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [performanceMode, setPerformanceMode] = useState(() => {
        const saved = localStorage.getItem('vexcore_performance_mode');

        if (saved !== null) {
            return saved === 'true';
        }

        // --- Lógica de Auto-Detecção (Primeira Execução) ---
        try {
            const logicalCores = navigator.hardwareConcurrency || 4;
            const ramGB = navigator.deviceMemory || 8; // navigator.deviceMemory retorna RAM em GB (Chrome/Edge)

            // Critério: CPU < 4 núcleos OU RAM <= 4GB
            const needsPerformance = logicalCores < 4 || ramGB <= 4;

            console.log(`🧬 [VexCORE Hardware Probe] CPU: ${logicalCores} cores | RAM: ~${ramGB}GB`);
            console.log(`🚀 Sugestão de Performance: ${needsPerformance ? 'ALTA PERFORMANCE (LITE)' : 'PREMIUM'}`);

            return needsPerformance;
        } catch (e) {
            return false; // Default para Premium se falhar a detecção
        }
    });

    useEffect(() => {
        localStorage.setItem('vexcore_performance_mode', performanceMode);

        // Aplica uma classe global no body para facilitar estilização CSS
        if (performanceMode) {
            document.body.classList.add('performance-mode');
        } else {
            document.body.classList.remove('performance-mode');
        }
    }, [performanceMode]);

    const togglePerformanceMode = () => setPerformanceMode(prev => !prev);

    return (
        <UIContext.Provider value={{ performanceMode, togglePerformanceMode }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI deve ser usado dentro de um UIProvider');
    }
    return context;
};
