// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'define',
    description: 'Define um termo técnico ou comum.',
    async execute(sock, msg, remoteJid, args, { browserAgent }) {
        if (!args) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *Usage:* !define [Term]" }, { quoted: msg });
            return;
        }
        const prompt = `Define the technical or common term "${args}" in English. Provide a very simple explanation. |FIM|`;
        const response = await browserAgent.send(prompt);
        await sock.sendMessage(remoteJid, { text: `📚 *DEFINITION*\n\n${response.replace('|FIM|', '').trim()}` }, { quoted: msg });
    }
};