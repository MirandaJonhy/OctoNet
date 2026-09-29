// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'word',
    description: 'Mostra a palavra do dia.',
    async execute(sock, msg, remoteJid, args, { browserAgent }) {
        const prompt = "Give me a 'Word of the Day' in English. Include its definition, a phonetic transcription, and an example sentence. Keep it short. |FIM|";
        const response = await browserAgent.send(prompt);
        await sock.sendMessage(remoteJid, { text: `📖 *WORD OF THE DAY*\n\n${response.replace('|FIM|', '').trim()}` }, { quoted: msg });
    }
};