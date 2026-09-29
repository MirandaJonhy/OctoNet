
// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

module.exports = {
    name: 'tip',
    description: 'Dá uma dica rápida de inglês.',
    async execute(sock, msg, remoteJid, args, { browserAgent }) {
        const prompt = "Provide a random quick English grammar or vocabulary tip for Brazilian learners. |FIM|";
        const response = await browserAgent.send(prompt);
        await sock.sendMessage(remoteJid, { text: `💡 *QUICK TIP*\n\n${response.replace('|FIM|', '').trim()}` }, { quoted: msg });
    }
};