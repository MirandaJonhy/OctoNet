
// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

module.exports = {
    name: 'test',
    description: 'Comando de teste que exibe no console o texto enviado',
    async execute(sock, msg, remoteJid, args) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const userId = sender.split('@')[0];

        const textToLog = args.trim() || '(nenhum texto fornecido)';

        console.log(`[TEST COMMAND] Usuário: ${userId} | Texto: ${textToLog}`);

        await sock.sendMessage(remoteJid, {
            text: `✅ Comando test executado!\n📝 Texto recebido: "${textToLog}"\n📊 Verifique o console do bot para mais detalhes.`
        }, { quoted: msg });
    }
};