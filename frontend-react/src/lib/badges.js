// Achievements derived from profile numbers; nothing is stored.
export const computeBadges = ({ totalVinis = 0, totalTrocas = 0, seguidores = 0, totalPosts = 0 }) =>
    [
        totalVinis >= 1 && { id: 'primeiro-disco', icon: '💿', name: 'Primeiro Disco' },
        totalVinis >= 5 && { id: 'colecionador-ativo', icon: '🔥', name: 'Colecionador Ativo' },
        totalVinis >= 25 && { id: 'grande-acervo', icon: '🏆', name: 'Grande Acervo' },
        totalTrocas >= 1 && { id: 'trocador', icon: '🔁', name: 'Trocador' },
        seguidores >= 1 && { id: 'sociavel', icon: '🤝', name: 'Sociável' },
        totalPosts >= 1 && { id: 'narrador', icon: '📸', name: 'Narrador' }
    ].filter(Boolean);
