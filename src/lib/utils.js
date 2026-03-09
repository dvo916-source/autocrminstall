/**
 * Utilitários Compartilhados - VexCORE
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
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
    }).format(value);
};

/**
 * Retorna saudação baseada no horário
 */
export const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
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

// 🎭 MÁSCARA DE CPF
// Transforma "12345678900" em "123.456.789-00" enquanto digita
export const maskCPF = (value) => {
    if (!value) return '';
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};
