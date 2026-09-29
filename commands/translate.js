
// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

module.exports = {
    name: 'translate',
    description: 'Traduz texto e explica o contexto.',
    async execute(sock, msg, remoteJid, args, { browserAgent }) {
        if (!args) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *Usage:* !translate [Text]" }, { quoted: msg });
            return;
        }
        const prompt = `Translate the following text to English (if it is in Portuguese) or to Portuguese (if it is in English). Also, explain the context or provide a usage tip: "${args}". |FIM|`;
        const response = await browserAgent.send(prompt);
        await sock.sendMessage(remoteJid, { text: `🌐 *TRANSLATION & CONTEXT*\n\n${response.replace('|FIM|', '').trim()}` }, { quoted: msg });
    }
};