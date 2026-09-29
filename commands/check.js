// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'check',
    description: 'Verifica erros gramaticais.',
    async execute(sock, msg, remoteJid, args, { browserAgent }) {
        if (!args) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *Usage:* !check [English sentence]" }, { quoted: msg });
            return;
        }
        const prompt = `Check this English sentence for grammatical errors and suggest improvements: "${args}". Be brief and professional. |FIM|`;
        const response = await browserAgent.send(prompt);
        await sock.sendMessage(remoteJid, { text: `🔍 *GRAMMAR CHECK*\n\n${response.replace('|FIM|', '').trim()}` }, { quoted: msg });
    }
};