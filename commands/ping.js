// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'ping',
    description: 'Mostra a latência do bot.',
    async execute(sock, msg, remoteJid, args) {
        const start = Date.now();
        
        // Envia a primeira mensagem
        const { key } = await sock.sendMessage(remoteJid, { text: '🏓 Testing ping...' }, { quoted: msg });
        
        const end = Date.now();
        const latency = end - start;

        // Edita a mensagem com o resultado (no Baileys usamos edit com a key da mensagem anterior)
        await sock.sendMessage(remoteJid, { 
            text: `🏓 *Pong!*\n\n• *Latency:* ${latency}ms\n• *Status:* Online 🚀`,
            edit: key 
        });
    }
};