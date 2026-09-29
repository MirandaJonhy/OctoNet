// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'challenge',
    description: 'Mostra o desafio semanal.',
    async execute(sock, msg, remoteJid, args, { browserAgent }) {
        const prompt = "Provide a weekly English practice challenge for Brazilian tech students. Keep it short. |FIM|";
        const response = await browserAgent.send(prompt);
        await sock.sendMessage(remoteJid, { text: `🎯 *WEEKLY CHALLENGE*\n\n${response.replace('|FIM|', '').trim()}` }, { quoted: msg });
    }
};