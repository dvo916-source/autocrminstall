#!/usr/bin/env node

/**
 * VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE
 * 
 * Este script verifica se as variáveis necessárias estão configuradas
 * antes de fazer o build do aplicativo.
 * 
 * Uso: node check-env.js
 */

const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
];

const optionalVars = [
    'VITE_SUPABASE_SERVICE_KEY'
];

console.log('\n🔍 Verificando variáveis de ambiente...\n');

let allGood = true;
let warnings = [];

// Verifica variáveis obrigatórias
for (const varName of requiredVars) {
    if (process.env[varName]) {
        console.log(`✅ ${varName}: Configurada`);
    } else {
        // Tenta carregar do .env se não estiver no sistema (para builds locais)
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            if (content.includes(varName)) {
                console.log(`✅ ${varName}: Encontrada no .env`);
                continue;
            }
        }

        console.log(`❌ ${varName}: NÃO ENCONTRADA`);
        allGood = false;
    }
}

// Verifica variáveis opcionais
for (const varName of optionalVars) {
    if (process.env[varName]) {
        console.log(`✅ ${varName}: Configurada (opcional)`);
    } else {
        console.log(`⚠️  ${varName}: Não configurada (opcional)`);
        warnings.push(varName);
    }
}

console.log('\n' + '='.repeat(60) + '\n');

if (!allGood) {
    console.error('❌ ERRO: Variáveis obrigatórias não configuradas!\n');
    console.log('Por favor, configure as variáveis de ambiente antes de continuar.\n');
    console.log('Consulte o arquivo INSTALACAO_VARIAVEIS_AMBIENTE.md para instruções.\n');
    process.exit(1);
}

if (warnings.length > 0) {
    console.log('⚠️  AVISO: Algumas variáveis opcionais não estão configuradas:');
    warnings.forEach(v => console.log(`   - ${v}`));
    console.log('\nO app funcionará, mas algumas funcionalidades podem estar limitadas.\n');
}

console.log('✅ Todas as variáveis obrigatórias estão configuradas!\n');
console.log('Você pode prosseguir com o build.\n');

process.exit(0);
