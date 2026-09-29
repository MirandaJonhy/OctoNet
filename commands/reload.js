
// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

module.exports = {
    name: 'reload',
    description: 'Recarrega os comandos sem reiniciar o bot.',
    async execute(sock, msg, remoteJid, args, { commandHandler }) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const allowed = ['42679291396333@lid'];

        if (!allowed.includes(sender)) {
            console.log(`[!] Tentativa de reload negada para: ${sender}`);
            await sock.sendMessage(remoteJid, { text: "❌ You don't have permission to use this command." }, { quoted: msg });
            return;
        }

        try {
            commandHandler.loadCommands();

            // Se quiser recarregar o browser_agent também (CUIDADO: pode quebrar a sessão ativa do Playwright):
            // const browserAgentPath = require.resolve('../browser_agent.js');
            // delete require.cache[browserAgentPath];

            await sock.sendMessage(remoteJid, {
                text: "♻️ *RELOAD COMPLETE!* 🐙\n\nCommands updated successfully without restarting the browser."
            }, { quoted: msg });
            console.log(`[V] Reload ativado por ${sender}`);

        } catch (error) {
            console.error("[X] Erro no Reload:", error);
            await sock.sendMessage(remoteJid, { text: "❌ *ERROR DURING RELOAD:* " + error.message }, { quoted: msg });
        }
    }
};