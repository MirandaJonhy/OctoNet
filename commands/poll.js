
// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

module.exports = {
    name: 'poll',
    description: 'Cria uma enquete.',
    async execute(sock, msg, remoteJid, args) {
        if (!args) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *Usage:* !poll Question | Option 1 | Option 2 [| Option 3...]" }, { quoted: msg });
            return;
        }
        const parts = args.split('|').map(p => p.trim());
        if (parts.length < 3) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *Usage:* !poll Question | Option 1 | Option 2 [| Option 3...]" }, { quoted: msg });
        } else {
            const question = parts[0];
            const options = parts.slice(1);
            
            await sock.sendMessage(remoteJid, {
                poll: {
                    name: question,
                    values: options,
                    selectableCount: 1
                }
            });
        }
    }
};