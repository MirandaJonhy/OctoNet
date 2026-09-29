// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
const { getTopTechNews } = require('../news_service');

module.exports = {
    name: 'news',
    description: 'Mostra as principais notícias de tecnologia.',
    async execute(sock, msg, remoteJid, args) {
        const news = await getTopTechNews();
        await sock.sendMessage(remoteJid, { text: `🗞️ *TECH NEWS (HACKER NEWS)*\n\n${news}` }, { quoted: msg });
    }
};