/**
 * Utilitários Compartilhados - SDR Crystal
 */

/**
 * Converte string de preço (ex: "R$ 35.900,00") em número
 */
export const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    // Remove centavos e caracteres não numéricos
    const clean = priceStr.split(',')[0].replace(/\D/g, '');
    return parseInt(clean) || 0;
};

/**
 * Formata um número para moeda BRL
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

/**
 * Formata data local para ISO String (YYYY-MM-DDTHH:mm) sem problemas de fuso
 */
export const toLocalISOString = (date) => {
    const d = date || new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Limpa número de telefone para formato WhatsApp (apenas dígitos)
 */
export const getCleanPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
};

/**
 * Extrai o primeiro nome de um e-mail ou nome completo
 */
export const getFirstName = (input) => {
    if (!input) return '';
    if (input.includes('@')) return input.split('@')[0].toUpperCase();
    return input.split(' ')[0].toUpperCase();
};

/**
 * Limpa nomes de veículos duplicados (ex: "Chevrolet TRACKER TRACKER")
 */
export const cleanVehicleName = (name) => {
    if (!name) return '';

    // Split por espaços
    const words = name.split(/\s+/);
    const uniqueWords = [];

    for (let i = 0; i < words.length; i++) {
        const current = words[i].trim();
        if (!current) continue;

        const previous = uniqueWords[uniqueWords.length - 1];

        // Se a palavra atual for igual à anterior (ignorando case), pula
        if (previous && current.toLowerCase() === previous.toLowerCase()) {
            continue;
        }

        uniqueWords.push(current);
    }

    return uniqueWords.join(' ');
};
