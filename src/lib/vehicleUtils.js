export function parseVehicleInfo(name, car) {
    if (!name) return { marcaModelo: 'Não definido', motor: '', cambio: '' };
    const words = name.trim().split(/\s+/);
    const deduped = words.filter((w, i) => w.toLowerCase() !== words[i - 1]?.toLowerCase());
    const clean = deduped.join(' ');
    const motorMatch = clean.match(/\b\d\.\d+[A-Za-z]*/);
    const motor = motorMatch ? motorMatch[0] : '';
    let cambio = '';
    if (car?.cambio) {
        cambio = car.cambio.toLowerCase().includes('aut') ? 'Automático' : 'Manual';
    } else if (/aut/i.test(clean)) {
        cambio = 'Automático';
    } else if (/man/i.test(clean)) {
        cambio = 'Manual';
    }
    return { marcaModelo: deduped.slice(0, 2).join(' '), motor, cambio };
}

export function getPhotoUrl(targetCar) {
    if (!targetCar) return null;
    try {
        const fotos = typeof targetCar.fotos === 'string' ? JSON.parse(targetCar.fotos) : targetCar.fotos;
        if (Array.isArray(fotos) && fotos.length > 0) return fotos[0];
        if (targetCar.foto) return targetCar.foto;
    } catch (e) { return targetCar.foto || null; }
    return null;
}

export function findCarInEstoque(estoque, veiculo_interesse) {
    if (!estoque || !veiculo_interesse) return null;

    const normalize = (str) => {
        const base = (str || '').split(' #')[0].toLowerCase().trim();
        const words = base.split(/\s+/);
        return [...new Set(words)].join(' '); // Remove termos duplicados
    };

    const searchName = normalize(veiculo_interesse);

    // Tentativa 1: Match Exato após normalização
    let found = (estoque || []).find(car => normalize(car.nome) === searchName);
    if (found) return found;

    // Tentativa 2: Match Parcial por intersecção de palavras
    return (estoque || []).find(car => {
        const carName = normalize(car.nome);
        const searchWords = searchName.split(' ');
        return searchWords.every(word => carName.includes(word));
    });
}

export function formatPhone(telefone) {
    const digits = (telefone || '').replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return telefone || '';
}

export function getFirstName(fullName) {
    if (!fullName) return '?';
    const first = fullName.trim().split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
