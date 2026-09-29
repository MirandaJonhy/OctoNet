
// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

module.exports = {
    name: 'trending',
    description: 'Mostra repositórios em alta no GitHub.',
    async execute(sock, msg, remoteJid, args, { getTrendingRepos }) {
        const repos = await getTrendingRepos();
        await sock.sendMessage(remoteJid, { text: `🚀 *TRENDING REPOSITORIES*\n\n${repos}` }, { quoted: msg });
    }
};